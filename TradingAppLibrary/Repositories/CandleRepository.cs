using Microsoft.EntityFrameworkCore;
using TradingAppLibrary.Data;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Repositories;

public class CandleRepository : ICandleRepository
{
    private readonly AppDbContext _context;

    public CandleRepository(AppDbContext context) => _context = context;

    // Henter candles for det valgte symbol og interval.
    public async Task<IEnumerable<Candle>> GetCandlesAsync(int symbolId, string interval, int limit = 1000, long? endTime = null)
    {
        var cleanInterval = interval.Trim().ToLowerInvariant();
        var endDate = endTime.HasValue
            ? DateTimeOffset.FromUnixTimeMilliseconds(endTime.Value).UtcDateTime
            : (DateTime?)null;

        if (cleanInterval == "1m")
        {
            var query = _context.Candles.AsNoTracking()
                .Where(c => c.SymbolId == symbolId && c.Interval == "1m");

            if (endDate.HasValue)
                query = query.Where(c => c.OpenTime < endDate.Value);

            return await query.OrderByDescending(c => c.OpenTime)
                .Take(limit).OrderBy(c => c.OpenTime).ToListAsync();
        }

        var viewName = GetViewNameForInterval(cleanInterval);
        if (string.IsNullOrEmpty(viewName))
            throw new ArgumentException($"Desteklenmeyen zaman dilimi: {interval}");

        string sqlQuery;
        var parameters = new List<object> { symbolId };

        if (endDate.HasValue)
        {
            parameters.Add(endDate.Value);
            parameters.Add(limit);
            sqlQuery = $@"
                SELECT
                    0 AS ""Id"",
                    ""SymbolId"",
                    '{cleanInterval}' AS ""Interval"",
                    ""OpenTime"",
                    ""Open"",
                    ""High"",
                    ""Low"",
                    ""Close"",
                    ""Volume""
                FROM public.{viewName}
                WHERE ""SymbolId"" = {{0}} AND ""OpenTime"" < {{1}}
                ORDER BY ""OpenTime"" DESC
                LIMIT {{2}}";
        }
        else
        {
            parameters.Add(limit);
            sqlQuery = $@"
                SELECT
                    0 AS ""Id"",
                    ""SymbolId"",
                    '{cleanInterval}' AS ""Interval"",
                    ""OpenTime"",
                    ""Open"",
                    ""High"",
                    ""Low"",
                    ""Close"",
                    ""Volume""
                FROM public.{viewName}
                WHERE ""SymbolId"" = {{0}}
                ORDER BY ""OpenTime"" DESC
                LIMIT {{1}}";
        }

        var result = await _context.Candles.FromSqlRaw(sqlQuery, parameters.ToArray())
            .AsNoTracking().ToListAsync();

        return result.OrderBy(c => c.OpenTime).ToList();
    }

    // Henter first candle.
    public async Task<Candle?> GetFirstCandleAsync(int symbolId, string interval)
    {
        var cleanInterval = interval.Trim().ToLowerInvariant();
        return await _context.Candles
            .AsNoTracking()
            .Where(c => c.SymbolId == symbolId && c.Interval == cleanInterval)
            .OrderBy(c => c.OpenTime)
            .FirstOrDefaultAsync();
    }

    // Finder det første manglende tidspunkt i den gemte 1m-historik.
    public async Task<DateTime?> GetFirstMissingOpenTimeAsync(int symbolId, string interval)
    {
        var cleanInterval = interval.Trim().ToLowerInvariant();
        if (cleanInterval != "1m")
            throw new ArgumentException("Gap detection currently supports only 1m candles.", nameof(interval));

        // Find det første interne hul mellem to gemte candles.
        // Den sidste candle ignoreres bevidst, fordi den ikke har en LEAD-række;
        // derfor bliver en åben/realtime afslutning aldrig fejlagtigt tolket som et historisk gap.
        const string sql = """
            WITH ordered AS (
                SELECT
                    "OpenTime",
                    LEAD("OpenTime") OVER (ORDER BY "OpenTime") AS next_time
                FROM "Candles"
                WHERE "SymbolId" = @symbolId
                  AND "Interval" = @interval
            )
            SELECT "OpenTime" + INTERVAL '1 minute'
            FROM ordered
            WHERE next_time IS NOT NULL
              AND next_time > "OpenTime" + INTERVAL '1 minute'
            ORDER BY "OpenTime"
            LIMIT 1;
            """;

        var connection = _context.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;

        if (shouldClose)
            await connection.OpenAsync();

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = sql;

            var symbolParameter = command.CreateParameter();
            symbolParameter.ParameterName = "@symbolId";
            symbolParameter.Value = symbolId;
            command.Parameters.Add(symbolParameter);

            var intervalParameter = command.CreateParameter();
            intervalParameter.ParameterName = "@interval";
            intervalParameter.Value = cleanInterval;
            command.Parameters.Add(intervalParameter);

            var result = await command.ExecuteScalarAsync();
            if (result is null || result is DBNull)
                return null;

            var value = (DateTime)result;
            return value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
                : value.ToUniversalTime();
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }

    // Gemmer en candle eller opdaterer den eksisterende candle med samme åbningstid.
    public async Task AddOrUpdateCandleAsync(Candle candle)
    {
        candle.Interval = "1m";
        var existing = await _context.Candles.FirstOrDefaultAsync(c =>
            c.SymbolId == candle.SymbolId && c.Interval == "1m" && c.OpenTime == candle.OpenTime);

        if (existing == null)
            await _context.Candles.AddAsync(candle);
        else
        {
            existing.Open = candle.Open;
            existing.High = candle.High;
            existing.Low = candle.Low;
            existing.Close = candle.Close;
            existing.Volume = candle.Volume;
        }

        await _context.SaveChangesAsync();
    }

    // Gemmer en samling candles og opdaterer eksisterende rækker uden at oprette dubletter.
    public async Task AddOrUpdateRangeAsync(IEnumerable<Candle> candles)
    {
        var list = candles.ToList();
        if (list.Count == 0) return;

        foreach (var candle in list)
            candle.Interval = "1m";

        var grouped = list.GroupBy(c => new { c.SymbolId, c.Interval });
        foreach (var group in grouped)
        {
            var minTime = group.Min(c => c.OpenTime);
            var maxTime = group.Max(c => c.OpenTime);

            var existing = await _context.Candles
                .Where(c => c.SymbolId == group.Key.SymbolId && c.Interval == group.Key.Interval &&
                            c.OpenTime >= minTime && c.OpenTime <= maxTime)
                .ToDictionaryAsync(c => c.OpenTime);

            foreach (var candle in group)
            {
                if (existing.TryGetValue(candle.OpenTime, out var current))
                {
                    current.Open = candle.Open;
                    current.High = candle.High;
                    current.Low = candle.Low;
                    current.Close = candle.Close;
                    current.Volume = candle.Volume;
                }
                else
                {
                    await _context.Candles.AddAsync(candle);
                }
            }
        }

        await _context.SaveChangesAsync();
    }

    // Tilføjer range.
    public async Task AddRangeAsync(IEnumerable<Candle> candles)
    {
        await _context.Candles.AddRangeAsync(candles);
        await _context.SaveChangesAsync();
    }

    // Henter alerts by user id.
    public async Task<List<Alert>> GetAlertsByUserIdAsync(string userId) =>
        await _context.Alerts.AsNoTracking()
            .Include(a => a.Symbol).ThenInclude(s => s.Exchange)
            .Where(a => a.UserId == userId).OrderByDescending(a => a.CreatedAt).ToListAsync();

    // Henter active alerts by symbol.
    public async Task<List<Alert>> GetActiveAlertsBySymbolAsync(int symbolId) =>
        await _context.Alerts.Include(a => a.Symbol).ThenInclude(s => s.Exchange)
            .Where(a => a.SymbolId == symbolId && a.IsActive && !a.IsTriggered).ToListAsync();

    // Henter alert by id.
    public async Task<Alert?> GetAlertByIdAsync(string id) =>
        await _context.Alerts.Include(a => a.Symbol).ThenInclude(s => s.Exchange)
            .FirstOrDefaultAsync(a => a.Id == id);

    // Opretter alert.
    public async Task<Alert> CreateAlertAsync(Alert alert)
    {
        await _context.Alerts.AddAsync(alert);
        await _context.SaveChangesAsync();
        return alert;
    }

    // Sletter alert.
    public async Task<bool> DeleteAlertAsync(string id, string userId)
    {
        var alert = await _context.Alerts.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        if (alert == null) return false;
        _context.Alerts.Remove(alert);
        await _context.SaveChangesAsync();
        return true;
    }

    // Opdaterer alert.
    public async Task UpdateAlertAsync(Alert alert)
    {
        _context.Alerts.Update(alert);
        await _context.SaveChangesAsync();
    }

    // Henter view name for interval.
    private static string GetViewNameForInterval(string interval) => interval switch
    {
        "3m" => "candles_3m",
        "5m" => "candles_5m",
        "15m" => "candles_15m",
        "30m" => "candles_30m",
        "1h" => "candles_1h",
        "2h" => "candles_2h",
        "4h" => "candles_4h",
        "1d" or "1day" => "candles_1d",
        "1w" or "1week" => "candles_1w",
        "1mon" or "1month" => "candles_1mon",
        "1y" or "1year" => "candles_1y",
        _ => string.Empty
    };
}
