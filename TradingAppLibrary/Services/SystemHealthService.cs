using Microsoft.EntityFrameworkCore;
using System.Data;
using TradingAppLibrary.Data;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Runtime;

namespace TradingAppLibrary.Services;

public sealed class SystemHealthService : ISystemHealthService
{
    private static readonly TimeSpan RealtimeHealthyThreshold = TimeSpan.FromMinutes(3);

    private readonly AppDbContext _dbContext;
    private readonly IMarketDataRuntimeState _runtimeState;

    public SystemHealthService(AppDbContext dbContext, IMarketDataRuntimeState runtimeState)
    {
        _dbContext = dbContext;
        _runtimeState = runtimeState;
    }

    // Henter health.
    public async Task<SystemHealthDto> GetHealthAsync(CancellationToken cancellationToken = default)
    {
        var checkedAt = DateTime.UtcNow;
        var runtime = _runtimeState.GetSnapshot();

        var databaseHealthy = await CanConnectAsync(cancellationToken);
        var timescaleHealthy = false;
        var candlesHypertableHealthy = false;

        if (databaseHealthy)
        {
            timescaleHealthy = await IsTimescaleInstalledAsync(cancellationToken);
            if (timescaleHealthy)
                candlesHypertableHealthy = await IsCandlesHypertableAsync(cancellationToken);
        }

        var exchanges = databaseHealthy
            ? await _dbContext.Exchanges
                .AsNoTracking()
                .OrderBy(e => e.Code)
                .Select(e => new ExchangeHealthProjection(
                    e.Id,
                    e.Code,
                    e.Name,
                    e.IsActive,
                    e.Symbols.Count(s => s.IsActive),
                    e.Symbols
                        .SelectMany(s => s.Candles)
                        .Max(c => (DateTime?)c.OpenTime)))
                .ToListAsync(cancellationToken)
            : new List<ExchangeHealthProjection>();

        var exchangeHealth = exchanges
            .Select(exchange => BuildExchangeHealth(exchange, runtime, checkedAt))
            .ToList();

        var activeExchangeCount = exchangeHealth.Count(x => x.IsActive);
        var activeSymbolCount = exchangeHealth.Sum(x => x.ActiveSymbolCount);
        var lastCandle = exchangeHealth
            .Where(x => x.LastCandleTimeUtc.HasValue)
            .Select(x => x.LastCandleTimeUtc)
            .Max();

        var validationErrors = runtime.Exchanges.Values.Sum(x => x.ValidationErrorCount);
        var validationWarnings = runtime.Exchanges.Values.Sum(x => x.ValidationWarningCount);

        var status = ResolveOverallStatus(databaseHealthy, timescaleHealthy, candlesHypertableHealthy, exchangeHealth);

        return new SystemHealthDto
        {
            Status = status,
            DatabaseHealthy = databaseHealthy,
            TimescaleHealthy = timescaleHealthy,
            CandlesHypertableHealthy = candlesHypertableHealthy,
            ActiveExchangeCount = activeExchangeCount,
            ActiveSymbolCount = activeSymbolCount,
            LastCandleTimeUtc = lastCandle,
            LastCandleAgeSeconds = GetAgeSeconds(lastCandle, checkedAt),
            ValidationErrorCount = validationErrors,
            ValidationWarningCount = validationWarnings,
            StartedAtUtc = runtime.StartedAtUtc,
            Uptime = checkedAt - runtime.StartedAtUtc,
            CheckedAtUtc = checkedAt,
            Exchanges = exchangeHealth
        };
    }

    // Behandler can connect.
    private async Task<bool> CanConnectAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await _dbContext.Database.CanConnectAsync(cancellationToken);
        }
        catch
        {
            return false;
        }
    }

    // Kontrollerer om timescale installed.
    private async Task<bool> IsTimescaleInstalledAsync(CancellationToken cancellationToken)
    {
        return await ExecuteBooleanScalarAsync("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb');", cancellationToken);
    }

    // Kontrollerer om candles hypertable.
    private async Task<bool> IsCandlesHypertableAsync(CancellationToken cancellationToken)
    {
        return await ExecuteBooleanScalarAsync("SELECT EXISTS (SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_schema = 'public' AND hypertable_name = 'Candles');", cancellationToken);
    }

    // Kører boolean scalar.
    private async Task<bool> ExecuteBooleanScalarAsync(string sql, CancellationToken cancellationToken)
    {
        try
        {
            var connection = _dbContext.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync(cancellationToken);

            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = sql;
                var result = await command.ExecuteScalarAsync(cancellationToken);
                return result is bool value && value;
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }
        catch
        {
            return false;
        }
    }

    // Opbygger exchange health.
    private static ExchangeHealthDto BuildExchangeHealth(ExchangeHealthProjection exchange, MarketDataRuntimeSnapshot runtime, DateTime checkedAt)
    {
        runtime.Exchanges.TryGetValue(exchange.Code, out var state);

        var lastMessage = state?.LastRealtimeMessageAtUtc;
        var realtimeFresh = lastMessage.HasValue && checkedAt - lastMessage.Value <= RealtimeHealthyThreshold;
        var realtimeConnected = state?.RealtimeConnected == true && realtimeFresh;

        var status = !exchange.IsActive
            ? "Disabled"
            : exchange.ActiveSymbolCount == 0
                ? "Idle"
                : state?.LastError is not null
                    ? "Degraded"
                    : realtimeConnected || state?.HistoricalSyncRunning == true
                        ? "Healthy"
                        : "Degraded";

        return new ExchangeHealthDto
        {
            ExchangeCode = exchange.Code,
            ExchangeName = exchange.Name,
            IsActive = exchange.IsActive,
            ActiveSymbolCount = exchange.ActiveSymbolCount,
            LastCandleTimeUtc = exchange.LastCandleTimeUtc,
            LastCandleAgeSeconds = GetAgeSeconds(exchange.LastCandleTimeUtc, checkedAt),
            HistoricalSyncRunning = state?.HistoricalSyncRunning ?? false,
            HistoricalSyncStartedAtUtc = state?.HistoricalSyncStartedAtUtc,
            HistoricalSyncCompletedAtUtc = state?.HistoricalSyncCompletedAtUtc,
            RealtimeConnected = realtimeConnected,
            RealtimeConnectedAtUtc = state?.RealtimeConnectedAtUtc,
            LastRealtimeMessageAtUtc = lastMessage,
            LastError = state?.LastError,
            LastErrorAtUtc = state?.LastErrorAtUtc,
            ValidationErrorCount = state?.ValidationErrorCount ?? 0,
            ValidationWarningCount = state?.ValidationWarningCount ?? 0,
            Status = status
        };
    }

    // Finder overall status.
    private static string ResolveOverallStatus(bool databaseHealthy, bool timescaleHealthy, bool candlesHypertableHealthy, IReadOnlyCollection<ExchangeHealthDto> exchanges)
    {
        if (!databaseHealthy || !timescaleHealthy || !candlesHypertableHealthy)
            return "Unhealthy";

        if (exchanges.Any(x => x.IsActive && x.Status == "Degraded"))
            return "Degraded";

        return "Healthy";
    }

    // Henter age seconds.
    private static double? GetAgeSeconds(DateTime? value, DateTime nowUtc)
    {
        if (!value.HasValue)
            return null;

        var utc = value.Value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
            : value.Value.ToUniversalTime();

        return Math.Max(0, (nowUtc - utc).TotalSeconds);
    }

    // Behandler exchange health projection.
    private sealed record ExchangeHealthProjection(int Id, string Code, string Name, bool IsActive, int ActiveSymbolCount, DateTime? LastCandleTimeUtc);
}
