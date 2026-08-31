using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using TradingAppLibrary.Data;
using TradingAppLibrary.Hubs;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Mappings;
using TradingAppLibrary.Models;
using TradingAppLibrary.Runtime;
using TradingAppLibrary.Validators;

namespace TradingAppLibrary.Services;

public class MarketDataSyncService : IMarketDataSyncService
{
    private readonly IExchangeServiceFactory _exchangeServiceFactory;
    private readonly ISymbolRepository _symbolRepository;
    private readonly ICandleRepository _candleRepository;
    private readonly ICandleValidator _candleValidator;
    private readonly AppDbContext _dbContext;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<MarketDataHub> _hubContext;
    private readonly ILogger<MarketDataSyncService> _logger;
    private readonly IMarketDataRuntimeState _runtimeState;

    // Bagudkompatibel constructor: eksisterende host-projekter behøver ikke at registrere
    // ICandleValidator med det samme. Hvis DI-registreringen findes, bruges den fulde constructor nedenfor.
    public MarketDataSyncService(
        IExchangeServiceFactory exchangeServiceFactory,
        ISymbolRepository symbolRepository,
        ICandleRepository candleRepository,
        AppDbContext dbContext,
        IServiceScopeFactory scopeFactory,
        IHubContext<MarketDataHub> hubContext)
        : this(
            exchangeServiceFactory,
            symbolRepository,
            candleRepository,
            new CandleValidator(),
            dbContext,
            scopeFactory,
            hubContext,
            NullLogger<MarketDataSyncService>.Instance,
            new MarketDataRuntimeState())
    {
    }

    public MarketDataSyncService(
        IExchangeServiceFactory exchangeServiceFactory,
        ISymbolRepository symbolRepository,
        ICandleRepository candleRepository,
        ICandleValidator candleValidator,
        AppDbContext dbContext,
        IServiceScopeFactory scopeFactory,
        IHubContext<MarketDataHub> hubContext,
        ILogger<MarketDataSyncService> logger,
        IMarketDataRuntimeState runtimeState)
    {
        _exchangeServiceFactory = exchangeServiceFactory;
        _symbolRepository = symbolRepository;
        _candleRepository = candleRepository;
        _candleValidator = candleValidator;
        _dbContext = dbContext;
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
        _runtimeState = runtimeState;
    }

    // Synkroniserer symboler fra den valgte exchange med databasen.
    public async Task SyncExchangeSymbolsAsync(
        string exchangeCode,
        CancellationToken cancellationToken = default)
    {
        var normalizedCode = exchangeCode.Trim().ToUpperInvariant();
        var exchange = await _dbContext.Exchanges
            .FirstOrDefaultAsync(e => e.Code == normalizedCode, cancellationToken)
            ?? throw new InvalidOperationException($"Exchange bulunamadı: {normalizedCode}");

        var exchangeService = _exchangeServiceFactory.GetExchange(exchange.Code);
        var remoteSymbols = await exchangeService.GetSymbolsAsync(cancellationToken);
        var existingSymbols = (await _symbolRepository.GetSymbolsByExchangeAsync(exchange.Id))
            .ToDictionary(s => s.Name, StringComparer.OrdinalIgnoreCase);

        var newSymbols = new List<Symbol>();
        foreach (var remote in remoteSymbols)
        {
            if (existingSymbols.TryGetValue(remote.Name, out var existing))
            {
                existing.UpdateFromExchange(remote);
            }
            else
            {
                // Nye symboler er bevidst inaktive. IsActive styres af applikationen eller brugeren.
                newSymbols.Add(remote.ToEntity(exchange.Id));
            }
        }

        if (newSymbols.Count > 0)
            await _symbolRepository.AddRangeAsync(newSymbols);

        await _symbolRepository.SaveChangesAsync();
    }

    // Synkroniserer historical candles.
    public async Task SyncHistoricalCandlesAsync(
        int symbolId,
        string interval = "1m",
        CancellationToken cancellationToken = default)
    {
        if (!string.Equals(interval, "1m", StringComparison.OrdinalIgnoreCase))
        {
            throw new NotSupportedException(
                "Market data sync veritabanına yalnızca 1m candle kaydeder. " +
                "Üst timeframe verileri TimescaleDB aggregate viewlarından okunmalıdır.");
        }

        var symbol = await _symbolRepository.GetByIdAsync(symbolId)
            ?? throw new InvalidOperationException($"Symbol bulunamadı. Id: {symbolId}");

        if (!symbol.IsActive || !symbol.Exchange.IsActive)
            return;

        var exchangeService = _exchangeServiceFactory.GetExchange(symbol.Exchange.Code);
        var exchangeHistoryBaseline = new DateTimeOffset(exchangeService.HistoricalDataStartUtc)
            .ToUnixTimeMilliseconds();

        // HistoricalDataStartUtc gælder for hele exchangen. Et symbol kan være blevet listet langt senere.
        // Spørg exchangen efter symbolets første rigtige candle, så vi kan skelne en komplet
        // historik fra en database, der kun indeholder nyere realtime-candles.
        var firstRemotePage = await exchangeService.GetHistoricalCandlesAsync(
            symbol.Name,
            interval,
            1,
            exchangeHistoryBaseline,
            cancellationToken);

        if (firstRemotePage.Count == 0)
        {
            _logger.LogWarning(
                "No historical baseline candle returned. Exchange={Exchange}, Symbol={Symbol}",
                symbol.Exchange.Code,
                symbol.Name);
            return;
        }

        var remoteFirst = firstRemotePage.OrderBy(c => c.Time).First();
        var remoteFirstValidation = _candleValidator.Validate(remoteFirst, symbol.Name, interval);
        if (!remoteFirstValidation.IsValid)
        {
            _runtimeState.RecordValidationError(symbol.Exchange.Code, remoteFirstValidation.Errors.Count);
            _logger.LogWarning(
                "Historical baseline candle is invalid. Exchange={Exchange}, Symbol={Symbol}, Errors={Errors}",
                symbol.Exchange.Code,
                symbol.Name,
                string.Join(" | ", remoteFirstValidation.Errors));
            return;
        }

        var actualHistoricalStart = remoteFirst.Time;

        // Normal historical sync tilføjer kun data fremad:
        // - Hvis databasen allerede har 1m-candles, fortsættes fra candlen efter MAX(OpenTime).
        // - Hvis symbolet endnu ikke har gemte candles, startes der fra exchangens historiske udgangspunkt.
        // Reparation af historiske gaps bør, hvis det bliver nødvendigt, håndteres af et separat vedligeholdelsesflow
        // i stedet for at lade hver applikationsstart gennemgå gammel historik igen.
        var startTime = await GetNextStartTimeAsync(symbol.Id, interval)
            ?? actualHistoricalStart;

        var nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        _logger.LogInformation(
            "Historical candle sync started. Exchange={Exchange}, Symbol={Symbol}, StartTime={StartTime}",
            symbol.Exchange.Code,
            symbol.Name,
            DateTimeOffset.FromUnixTimeMilliseconds(startTime));

        while (startTime < nowMs && !cancellationToken.IsCancellationRequested)
        {
            var remoteCandles = await exchangeService.GetHistoricalCandlesAsync(
                symbol.Name,
                interval,
                1000,
                startTime,
                cancellationToken);

            if (remoteCandles.Count == 0)
                break;

            var batchValidation = _candleValidator.ValidateBatch(
                remoteCandles,
                symbol.Name,
                interval);

            if (batchValidation.Errors.Count > 0)
            {
                _logger.LogWarning(
                    "Historical candle batch contains {ErrorCount} validation errors. Exchange={Exchange}, Symbol={Symbol}. FirstErrors={Errors}",
                    batchValidation.Errors.Count,
                    symbol.Exchange.Code,
                    symbol.Name,
                    string.Join(" | ", batchValidation.Errors.Take(5)));
            }

            if (batchValidation.Warnings.Count > 0)
            {
                _runtimeState.RecordValidationWarning(symbol.Exchange.Code, batchValidation.Warnings.Count);
                _logger.LogWarning(
                    "Historical candle batch contains {WarningCount} temporal warnings. Exchange={Exchange}, Symbol={Symbol}. FirstWarnings={Warnings}",
                    batchValidation.Warnings.Count,
                    symbol.Exchange.Code,
                    symbol.Name,
                    string.Join(" | ", batchValidation.Warnings.Take(5)));
            }

            var validClosedCandles = new List<Candle>(remoteCandles.Count);
            foreach (var remoteCandle in remoteCandles)
            {
                if (!remoteCandle.IsClosed)
                    continue;

                var validation = _candleValidator.Validate(remoteCandle, symbol.Name, interval);
                if (!validation.IsValid)
                {
                    _runtimeState.RecordValidationError(symbol.Exchange.Code, validation.Errors.Count);
                    _logger.LogWarning(
                        "Invalid historical candle ignored. Exchange={Exchange}, Symbol={Symbol}, Time={Time}, Errors={Errors}",
                        symbol.Exchange.Code,
                        symbol.Name,
                        remoteCandle.Time,
                        string.Join(" | ", validation.Errors));
                    continue;
                }

                validClosedCandles.Add(remoteCandle.ToEntity(symbol.Id));
            }

            if (validClosedCandles.Count > 0)
                await _candleRepository.AddOrUpdateRangeAsync(validClosedCandles);

            // Flyt cursoren ud fra det eksterne batch og ikke kun gyldige/lukkede rækker, da en ugyldig række ellers
            // kan medføre, at den samme API-side bliver hentet igen og igen.
            var last = remoteCandles.OrderBy(c => c.Time).Last();
            var nextStart = GetNextOpenTime(last.Time, interval);
            if (nextStart <= startTime)
            {
                _logger.LogWarning(
                    "Historical sync stopped because start time did not advance. Exchange={Exchange}, Symbol={Symbol}, StartTime={StartTime}, NextStart={NextStart}",
                    symbol.Exchange.Code,
                    symbol.Name,
                    startTime,
                    nextStart);
                break;
            }

            startTime = nextStart;

            if (remoteCandles.Count < 1000)
                break;

            await Task.Delay(50, cancellationToken);
        }

        _logger.LogInformation(
            "Historical candle sync finished. Exchange={Exchange}, Symbol={Symbol}",
            symbol.Exchange.Code,
            symbol.Name);
    }

    // Synkroniserer historiske candles for aktive symboler på den valgte exchange.
    public async Task SyncExchangeHistoricalDataAsync(
        string exchangeCode,
        string interval = "1m",
        CancellationToken cancellationToken = default)
    {
        var normalizedCode = exchangeCode.Trim().ToUpperInvariant();
        var exchange = await _dbContext.Exchanges.FirstOrDefaultAsync(
            e => e.Code == normalizedCode && e.IsActive,
            cancellationToken);

        if (exchange == null)
            return;

        var symbols = await _symbolRepository.GetAllActiveSymbolsAsync(exchange.Id);
        foreach (var symbol in symbols)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await SyncHistoricalCandlesAsync(symbol.Id, interval, cancellationToken);
        }
    }

    // Starter realtime-streamen for aktive symboler på den valgte exchange.
    public async Task StartRealtimeStreamAsync(
        string exchangeCode,
        string interval,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(interval, "1m", StringComparison.OrdinalIgnoreCase))
            throw new NotSupportedException("Realtime persistence yalnızca 1m candle için desteklenir.");

        var normalizedCode = exchangeCode.Trim().ToUpperInvariant();
        var exchange = await _dbContext.Exchanges.FirstOrDefaultAsync(
            e => e.Code == normalizedCode && e.IsActive,
            cancellationToken)
            ?? throw new InvalidOperationException($"Exchange aktif değil veya bulunamadı: {normalizedCode}");

        var symbols = (await _symbolRepository.GetAllActiveSymbolsAsync(exchange.Id)).ToList();
        if (symbols.Count == 0)
            return;

        var symbolMap = symbols.ToDictionary(
            s => s.Name,
            s => new { s.Id, s.Name },
            StringComparer.OrdinalIgnoreCase);

        var exchangeService = _exchangeServiceFactory.GetExchange(exchange.Code);

        await exchangeService.StreamRealTimeCandlesAsync(
            symbols.Select(s => s.Name).ToArray(),
            interval,
            async remoteCandle =>
            {
                if (!symbolMap.TryGetValue(remoteCandle.Symbol, out var symbol))
                    return;

                _runtimeState.TouchRealtimeMessage(exchange.Code);
                _runtimeState.ClearError(exchange.Code);

                var validation = _candleValidator.Validate(remoteCandle, symbol.Name, interval);
                if (!validation.IsValid)
                {
                    _runtimeState.RecordValidationError(exchange.Code, validation.Errors.Count);
                    _logger.LogWarning(
                        "Invalid realtime candle ignored. Exchange={Exchange}, Symbol={Symbol}, Time={Time}, Errors={Errors}",
                        exchange.Code,
                        symbol.Name,
                        remoteCandle.Time,
                        string.Join(" | ", validation.Errors));
                    return;
                }

                var responseDto = remoteCandle.ToResponseDto(
                    symbol.Id,
                    symbol.Name,
                    exchange.Code);

                await _hubContext.Clients
                    .Group(MarketDataHub.GetSymbolGroup(exchange.Code, symbol.Name))
                    .SendAsync("ReceiveMarketData", responseDto, cancellationToken);

                using var scope = _scopeFactory.CreateScope();
                var candleService = scope.ServiceProvider.GetRequiredService<ICandleService>();
                var triggeredAlerts = await candleService.CheckAndTriggerAlertsAsync(
                    symbol.Id,
                    remoteCandle.Close);

                foreach (var alert in triggeredAlerts)
                {
                    await _hubContext.Clients
                        .Group($"User_{alert.UserId}")
                        .SendAsync("ReceiveAlertTriggered", alert, cancellationToken);
                }

                if (!remoteCandle.IsClosed)
                    return;

                var candleRepository = scope.ServiceProvider.GetRequiredService<ICandleRepository>();
                await candleRepository.AddOrUpdateCandleAsync(remoteCandle.ToEntity(symbol.Id));
            },
            cancellationToken);
    }

    // Henter next start time.
    private async Task<long?> GetNextStartTimeAsync(int symbolId, string interval)
    {
        var last = (await _candleRepository.GetCandlesAsync(symbolId, interval, 1))
            .OrderByDescending(c => c.OpenTime)
            .FirstOrDefault();

        if (last == null)
            return null;

        var utc = last.OpenTime.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(last.OpenTime, DateTimeKind.Utc)
            : last.OpenTime.ToUniversalTime();

        return GetNextOpenTime(
            new DateTimeOffset(utc).ToUnixTimeMilliseconds(),
            interval);
    }

    // Henter next open time.
    private static long GetNextOpenTime(long currentOpenTime, string interval)
    {
        var milliseconds = interval.Trim().ToLowerInvariant() switch
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
            _ => throw new ArgumentException($"Desteklenmeyen interval: {interval}")
        };

        return currentOpenTime + milliseconds;
    }
}
