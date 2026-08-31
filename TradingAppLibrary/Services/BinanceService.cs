using System.Globalization;
using System.Net.Http.Json;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using TradingAppLibrary.Constants;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingAppLibrary.Services;

public class BinanceService : IExchangeService
{
    private readonly HttpClient _httpClient;
    public string ExchangeCode => ExchangeCodes.Binance;
    public DateTime HistoricalDataStartUtc => new(2017, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public BinanceService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress ??= new Uri("https://api.binance.com");
    }

    // Henter symbols.
    public async Task<IReadOnlyList<ExchangeSymbolDto>> GetSymbolsAsync(CancellationToken cancellationToken = default)
    {
        using var response = await _httpClient.GetAsync("/api/v3/exchangeInfo", cancellationToken);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        if (!document.RootElement.TryGetProperty("symbols", out var symbolsElement))
            return Array.Empty<ExchangeSymbolDto>();

        var symbols = new List<ExchangeSymbolDto>();
        foreach (var item in symbolsElement.EnumerateArray())
        {
            var name = item.GetProperty("symbol").GetString() ?? string.Empty;
            var baseAsset = item.GetProperty("baseAsset").GetString() ?? string.Empty;
            var quoteAsset = item.GetProperty("quoteAsset").GetString() ?? string.Empty;
            var status = item.GetProperty("status").GetString() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(name) || !quoteAsset.Equals("USDT", StringComparison.OrdinalIgnoreCase))
                continue;

            symbols.Add(new ExchangeSymbolDto(
                name.ToUpperInvariant(),
                baseAsset.ToUpperInvariant(),
                quoteAsset.ToUpperInvariant(),
                status.Equals("TRADING", StringComparison.OrdinalIgnoreCase)));
        }

        return symbols;
    }

    // Henter top popular symbols.
    public async Task<IReadOnlyList<string>> GetTopPopularSymbolsAsync(int topCount = 50, CancellationToken cancellationToken = default)
    {
        if (topCount <= 0) return Array.Empty<string>();
        var rawList = await _httpClient.GetFromJsonAsync<List<JsonElement>>("/api/v3/ticker/24hr", cancellationToken);
        if (rawList == null) return Array.Empty<string>();

        return rawList
            .Where(x => x.TryGetProperty("symbol", out var p) &&
                        (p.GetString() ?? string.Empty).EndsWith("USDT", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(x => x.TryGetProperty("quoteVolume", out var p) &&
                                     decimal.TryParse(p.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var v) ? v : 0m)
            .Take(topCount)
            .Select(x => x.GetProperty("symbol").GetString()!.ToUpperInvariant())
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

        limit = Math.Clamp(limit, 1, 1000);
        var formattedSymbol = symbol.Trim().ToUpperInvariant();
        var formattedInterval = interval.Trim();
        var url = $"/api/v3/klines?symbol={Uri.EscapeDataString(formattedSymbol)}&interval={Uri.EscapeDataString(formattedInterval)}&limit={limit}";
        if (startTime.HasValue) url += $"&startTime={startTime.Value}";

        var raw = await _httpClient.GetFromJsonAsync<List<List<JsonElement>>>(url, cancellationToken);
        if (raw == null || raw.Count == 0) return Array.Empty<ExchangeCandleDto>();

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        return raw.Where(x => x.Count >= 7).Select(item => new ExchangeCandleDto(
            item[0].GetInt64(),
            ParseDecimal(item[1]),
            ParseDecimal(item[2]),
            ParseDecimal(item[3]),
            ParseDecimal(item[4]),
            ParseDecimal(item[5]),
            formattedSymbol,
            formattedInterval,
            item[6].GetInt64() < now)).ToList();
    }

    // Behandler stream real time candles.
    public async Task StreamRealTimeCandlesAsync(
        IReadOnlyCollection<string> symbols,
        string interval,
        Func<ExchangeCandleDto, Task> onCandleReceived,
        CancellationToken cancellationToken)
    {
        var streams = string.Join('/', symbols.Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => $"{s.Trim().ToLowerInvariant()}@kline_{interval}"));
        if (string.IsNullOrWhiteSpace(streams)) return;

        var uri = new Uri($"wss://stream.binance.com:9443/stream?streams={streams}");

        using var socket = new ClientWebSocket();
        await socket.ConnectAsync(uri, cancellationToken);

        var buffer = new byte[16 * 1024];
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
            } while (!result.EndOfMessage);

            if (result.MessageType == WebSocketMessageType.Close) break;
            if (result.MessageType != WebSocketMessageType.Text) continue;

            using var doc = JsonDocument.Parse(builder.ToString());
            var root = doc.RootElement;
            var data = root.TryGetProperty("data", out var dataProperty) ? dataProperty : root;
            if (!data.TryGetProperty("k", out var kline)) continue;

            var symbol = data.TryGetProperty("s", out var symbolProperty)
                ? symbolProperty.GetString() ?? string.Empty
                : string.Empty;
            if (string.IsNullOrWhiteSpace(symbol)) continue;

            await onCandleReceived(new ExchangeCandleDto(
                kline.GetProperty("t").GetInt64(),
                ParseDecimal(kline.GetProperty("o")),
                ParseDecimal(kline.GetProperty("h")),
                ParseDecimal(kline.GetProperty("l")),
                ParseDecimal(kline.GetProperty("c")),
                ParseDecimal(kline.GetProperty("v")),
                symbol.ToUpperInvariant(),
                kline.GetProperty("i").GetString() ?? interval,
                kline.GetProperty("x").GetBoolean()));
        }
    }

    // Fortolker decimal.
    private static decimal ParseDecimal(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Number) return element.GetDecimal();
        return decimal.TryParse(element.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var value) ? value : 0m;
    }
}
