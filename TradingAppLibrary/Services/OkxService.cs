using System.Collections.Concurrent;
using System.Globalization;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using TradingAppLibrary.Constants;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingAppLibrary.Services;

/// <summary>
/// OKX-adapter til offentlige SPOT-market data.
/// Autentificering er ikke nødvendig for instruments, tickers, historiske candles eller offentlige candle-streams.
/// </summary>
public sealed class OkxService : IExchangeService
{
    private readonly HttpClient _httpClient;
    private readonly string _businessWebSocketUrl;
    private readonly ConcurrentDictionary<string, long> _listingTimeCache = new(StringComparer.OrdinalIgnoreCase);

    public string ExchangeCode => ExchangeCodes.Okx;
    public DateTime HistoricalDataStartUtc => new(2017, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public OkxService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress ??= new Uri("https://www.okx.com");
        _businessWebSocketUrl = configuration["Exchanges:OKX:BusinessWebSocketUrl"]
            ?? "wss://ws.okx.com:8443/ws/v5/business";
    }

    // Henter symbols.
    public async Task<IReadOnlyList<ExchangeSymbolDto>> GetSymbolsAsync(CancellationToken cancellationToken = default)
    {
        using var document = await GetDocumentAsync("/api/v5/public/instruments?instType=SPOT", cancellationToken);
        var data = GetDataArray(document.RootElement);
        var result = new List<ExchangeSymbolDto>();

        foreach (var item in data.EnumerateArray())
        {
            var instId = GetString(item, "instId");
            var baseAsset = GetString(item, "baseCcy");
            var quoteAsset = GetString(item, "quoteCcy");
            var state = GetString(item, "state");

            if (string.IsNullOrWhiteSpace(instId) ||
                string.IsNullOrWhiteSpace(baseAsset) ||
                !quoteAsset.Equals("USDT", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (item.TryGetProperty("listTime", out var listTimeElement) &&
                long.TryParse(listTimeElement.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var listTime))
            {
                _listingTimeCache[instId] = listTime;
            }

            result.Add(new ExchangeSymbolDto(
                instId.ToUpperInvariant(),
                baseAsset.ToUpperInvariant(),
                quoteAsset.ToUpperInvariant(),
                state.Equals("live", StringComparison.OrdinalIgnoreCase)));
        }

        return result;
    }

    // Henter top popular symbols.
    public async Task<IReadOnlyList<string>> GetTopPopularSymbolsAsync(
        int topCount = 50,
        CancellationToken cancellationToken = default)
    {
        if (topCount <= 0) return Array.Empty<string>();

        using var document = await GetDocumentAsync("/api/v5/market/tickers?instType=SPOT", cancellationToken);
        var data = GetDataArray(document.RootElement);

        return data.EnumerateArray()
            .Select(item => new
            {
                Symbol = GetString(item, "instId"),
                QuoteVolume = ParseDecimal(item, "volCcy24h")
            })
            .Where(x => x.Symbol.EndsWith("-USDT", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(x => x.QuoteVolume)
            .Take(topCount)
            .Select(x => x.Symbol.ToUpperInvariant())
            .ToList();
    }

    // Henter historical candles.
    public async Task<IReadOnlyList<ExchangeCandleDto>> GetHistoricalCandlesAsync(
        string symbol,
        string interval,
        int limit = 500,
        long? startTime = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(symbol) || string.IsNullOrWhiteSpace(interval))
            return Array.Empty<ExchangeCandleDto>();

        var normalizedSymbol = symbol.Trim().ToUpperInvariant();
        var normalizedInterval = interval.Trim().ToLowerInvariant();
        var bar = ToOkxBar(normalizedInterval);
        var intervalMs = GetIntervalMilliseconds(normalizedInterval);
        var requestedLimit = Math.Clamp(limit, 1, 1000);

        // Den eksisterende market-data-synkronisering paginerer fremad fra startTime.
        // OKX bruger cursor-grænser i den modsatte retning, så adapteren anmoder om
        // afgrænsede vinduer og returnerer dem stigende for at efterligne Binances fremadgående kontrakt.
        var cursor = startTime ?? Math.Max(
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - (requestedLimit * intervalMs),
            new DateTimeOffset(HistoricalDataStartUtc).ToUnixTimeMilliseconds());

        var listingTime = await GetListingTimeAsync(normalizedSymbol, cancellationToken);
        if (listingTime.HasValue && cursor < listingTime.Value)
            cursor = listingTime.Value;

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var candles = new SortedDictionary<long, ExchangeCandleDto>();
        var requestCount = 0;

        while (candles.Count < requestedLimit && cursor < now && requestCount < 30)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var remaining = requestedLimit - candles.Count;
            var pageSize = Math.Min(100, remaining);
            var windowEnd = Math.Min(now + intervalMs, cursor + (pageSize * intervalMs));

            var url = $"/api/v5/market/history-candles?instId={Uri.EscapeDataString(normalizedSymbol)}" +
                      $"&bar={Uri.EscapeDataString(bar)}&limit={pageSize}" +
                      $"&after={windowEnd}&before={Math.Max(0, cursor - 1)}";

            using var document = await GetDocumentAsync(url, cancellationToken);
            var data = GetDataArray(document.RootElement);
            requestCount++;

            var page = ParseCandles(data, normalizedSymbol, normalizedInterval)
                .Where(c => c.Time >= cursor && c.Time < windowEnd)
                .OrderBy(c => c.Time)
                .ToList();

            foreach (var candle in page)
                candles[candle.Time] = candle;

            // Flyt cursoren efter det afgrænsede vindue og ikke efter antallet af returnerede rækker. Det håndterer også
            // gyldige perioder uden handler uden at sidde fast på den samme cursor.
            cursor = windowEnd;

            if (requestCount % 10 == 0)
                await Task.Delay(120, cancellationToken);
        }

        return candles.Values.Take(requestedLimit).ToList();
    }

    // Behandler stream real time candles.
    public async Task StreamRealTimeCandlesAsync(
        IReadOnlyCollection<string> symbols,
        string interval,
        Func<ExchangeCandleDto, Task> onCandleReceived,
        CancellationToken cancellationToken)
    {
        var cleanSymbols = symbols
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim().ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (cleanSymbols.Length == 0) return;

        using var socket = new ClientWebSocket();
        await socket.ConnectAsync(new Uri(_businessWebSocketUrl), cancellationToken);

        var channel = "candle" + ToOkxBar(interval.Trim().ToLowerInvariant());

        foreach (var chunk in cleanSymbols.Chunk(100))
        {
            var subscribeMessage = JsonSerializer.Serialize(new
            {
                op = "subscribe",
                args = chunk.Select(symbol => new { channel, instId = symbol }).ToArray()
            });

            var bytes = Encoding.UTF8.GetBytes(subscribeMessage);
            await socket.SendAsync(bytes, WebSocketMessageType.Text, true, cancellationToken);
        }

        var buffer = new byte[32 * 1024];
        var builder = new StringBuilder();

        while (socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
        {
            builder.Clear();
            WebSocketReceiveResult result;

            do
            {
                result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);
                if (result.MessageType == WebSocketMessageType.Close) break;
                builder.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
            }
            while (!result.EndOfMessage);

            if (result.MessageType == WebSocketMessageType.Close) break;
            if (result.MessageType != WebSocketMessageType.Text) continue;

            var payload = builder.ToString();
            if (payload.Equals("pong", StringComparison.OrdinalIgnoreCase)) continue;

            using var document = JsonDocument.Parse(payload);
            var root = document.RootElement;
            if (!root.TryGetProperty("arg", out var arg) || !root.TryGetProperty("data", out var data))
                continue;

            var symbol = GetString(arg, "instId").ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(symbol)) continue;

            foreach (var candle in ParseCandles(data, symbol, interval.Trim().ToLowerInvariant()))
                await onCandleReceived(candle);
        }
    }

    // Henter listing time.
    private async Task<long?> GetListingTimeAsync(string symbol, CancellationToken cancellationToken)
    {
        if (_listingTimeCache.TryGetValue(symbol, out var cached))
            return cached;

        var url = $"/api/v5/public/instruments?instType=SPOT&instId={Uri.EscapeDataString(symbol)}";
        using var document = await GetDocumentAsync(url, cancellationToken);
        var data = GetDataArray(document.RootElement);

        foreach (var item in data.EnumerateArray())
        {
            if (!GetString(item, "instId").Equals(symbol, StringComparison.OrdinalIgnoreCase))
                continue;

            if (item.TryGetProperty("listTime", out var listTimeElement) &&
                long.TryParse(listTimeElement.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var listTime))
            {
                _listingTimeCache[symbol] = listTime;
                return listTime;
            }
        }

        return null;
    }

    // Henter document.
    private async Task<JsonDocument> GetDocumentAsync(string url, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        var root = document.RootElement;
        var code = root.TryGetProperty("code", out var codeElement) ? codeElement.GetString() : "0";
        if (!string.Equals(code, "0", StringComparison.Ordinal))
        {
            var message = root.TryGetProperty("msg", out var msgElement) ? msgElement.GetString() : "Unknown OKX error";
            document.Dispose();
            throw new HttpRequestException($"OKX API error. Code={code}, Message={message}");
        }

        return document;
    }

    // Henter data array.
    private static JsonElement GetDataArray(JsonElement root)
    {
        if (!root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
            throw new InvalidOperationException("OKX response does not contain a valid data array.");
        return data;
    }

    // Fortolker candles.
    private static IEnumerable<ExchangeCandleDto> ParseCandles(
        JsonElement data,
        string symbol,
        string interval)
    {
        foreach (var row in data.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array || row.GetArrayLength() < 9)
                continue;

            if (!long.TryParse(row[0].GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var time))
                continue;

            yield return new ExchangeCandleDto(
                time,
                ParseDecimal(row[1]),
                ParseDecimal(row[2]),
                ParseDecimal(row[3]),
                ParseDecimal(row[4]),
                ParseDecimal(row[5]),
                symbol,
                interval,
                string.Equals(row[8].GetString(), "1", StringComparison.Ordinal));
        }
    }

    // Behandler to okx bar.
    private static string ToOkxBar(string interval) => interval switch
    {
        "1m" => "1m",
        "3m" => "3m",
        "5m" => "5m",
        "15m" => "15m",
        "30m" => "30m",
        "1h" => "1H",
        "2h" => "2H",
        "4h" => "4H",
        "1d" => "1Dutc",
        "1w" => "1Wutc",
        "1mon" => "1Mutc",
        _ => throw new ArgumentException($"OKX için desteklenmeyen interval: {interval}")
    };

    // Henter interval milliseconds.
    private static long GetIntervalMilliseconds(string interval) => interval switch
    {
        "1m" => 60_000L,
        "3m" => 3 * 60_000L,
        "5m" => 5 * 60_000L,
        "15m" => 15 * 60_000L,
        "30m" => 30 * 60_000L,
        "1h" => 60 * 60_000L,
        "2h" => 2 * 60 * 60_000L,
        "4h" => 4 * 60 * 60_000L,
        "1d" => 24 * 60 * 60_000L,
        "1w" => 7 * 24 * 60 * 60_000L,
        "1mon" => 31 * 24 * 60 * 60_000L,
        _ => throw new ArgumentException($"OKX için desteklenmeyen interval: {interval}")
    };

    // Henter string.
    private static string GetString(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out var property) ? property.GetString() ?? string.Empty : string.Empty;

    // Fortolker decimal.
    private static decimal ParseDecimal(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out var property) ? ParseDecimal(property) : 0m;

    // Fortolker decimal.
    private static decimal ParseDecimal(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Number)
            return element.GetDecimal();

        return decimal.TryParse(
            element.GetString(),
            NumberStyles.Any,
            CultureInfo.InvariantCulture,
            out var value)
            ? value
            : 0m;
    }
}
