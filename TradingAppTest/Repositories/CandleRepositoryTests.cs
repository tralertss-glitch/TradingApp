using TradingAppLibrary.Models;
using TradingAppLibrary.Repositories;
using TradingAppTest.Helpers;

namespace TradingAppTest.Repositories;

public class CandleRepositoryTests
{
    // Kontrollerer den forventede adfærd for dette testscenarie.
    private static Candle Candle(int symbolId, DateTime openTime, decimal close) => new()
    {
        SymbolId = symbolId,
        Interval = "1m",
        OpenTime = openTime,
        Open = close - 1,
        High = close + 1,
        Low = close - 2,
        Close = close,
        Volume = 10
    };

    // Kontrollerer, at de seneste candles returneres i kronologisk rækkefølge.
    [Fact]
    public async Task GetCandlesAsync_OneMinute_ReturnsLatestLimitInAscendingOrder()
    {
        await using var db = TestDbContextFactory.Create();
        var symbol = new Symbol { ExchangeId = 1, Name = "BTCUSDT", BaseAsset = "BTC", QuoteAsset = "USDT" };
        db.Symbols.Add(symbol);
        await db.SaveChangesAsync();
        var start = new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc);
        for (var i = 0; i < 5; i++) db.Candles.Add(Candle(symbol.Id, start.AddMinutes(i), 100 + i));
        await db.SaveChangesAsync();

        var repo = new CandleRepository(db);
        var result = (await repo.GetCandlesAsync(symbol.Id, "1m", 3)).ToList();

        Assert.Equal(3, result.Count);
        Assert.Equal(start.AddMinutes(2), result[0].OpenTime);
        Assert.Equal(start.AddMinutes(4), result[2].OpenTime);
    }

    // Kontrollerer, at lazy loading kun returnerer candles før endTime.
    [Fact]
    public async Task GetCandlesAsync_EndTime_ReturnsOnlyCandlesBeforeEndTime()
    {
        await using var db = TestDbContextFactory.Create();
        var symbol = new Symbol { ExchangeId = 1, Name = "BTCUSDT", BaseAsset = "BTC", QuoteAsset = "USDT" };
        db.Symbols.Add(symbol);
        await db.SaveChangesAsync();
        var start = new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc);
        for (var i = 0; i < 4; i++) db.Candles.Add(Candle(symbol.Id, start.AddMinutes(i), 100 + i));
        await db.SaveChangesAsync();
        var endMs = new DateTimeOffset(start.AddMinutes(2)).ToUnixTimeMilliseconds();

        var repo = new CandleRepository(db);
        var result = (await repo.GetCandlesAsync(symbol.Id, "1m", 100, endMs)).ToList();

        Assert.Equal(2, result.Count);
        Assert.All(result, c => Assert.True(c.OpenTime < start.AddMinutes(2)));
    }

    // Kontrollerer, at en eksisterende candle opdateres i stedet for at blive duplikeret.
    [Fact]
    public async Task AddOrUpdateCandleAsync_UpdatesExistingCandleInsteadOfDuplicating()
    {
        await using var db = TestDbContextFactory.Create();
        var symbol = new Symbol { ExchangeId = 1, Name = "BTCUSDT", BaseAsset = "BTC", QuoteAsset = "USDT" };
        db.Symbols.Add(symbol);
        await db.SaveChangesAsync();
        var time = new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc);
        var repo = new CandleRepository(db);
        await repo.AddOrUpdateCandleAsync(Candle(symbol.Id, time, 100));

        var replacement = Candle(symbol.Id, time, 125);
        replacement.Interval = "15m"; // Repository-lagringen skal normalisere til 1m.
        await repo.AddOrUpdateCandleAsync(replacement);

        var all = db.Candles.Where(c => c.SymbolId == symbol.Id).ToList();
        var saved = Assert.Single(all);
        Assert.Equal("1m", saved.Interval);
        Assert.Equal(125, saved.Close);
    }
}
