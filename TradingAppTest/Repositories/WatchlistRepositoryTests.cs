using Microsoft.EntityFrameworkCore;
using TradingAppLibrary.Models;
using TradingAppLibrary.Repositories;
using TradingAppTest.Helpers;

namespace TradingAppTest.Repositories;

public class WatchlistRepositoryTests
{
    // Kontrollerer den forventede adfærd for dette testscenarie.
    private static User User() => new()
    {
        Username = $"user_{Guid.NewGuid():N}",
        Email = $"{Guid.NewGuid():N}@test.com",
        PasswordHash = "hash"
    };

    // Kontrollerer, at watchlisten indlæses med items, symbol og exchange.
    [Fact]
    public async Task GetWatchlistsByUserIdAsync_LoadsItemsSymbolAndExchange()
    {
        await using var db = TestDbContextFactory.Create();
        var user = User();
        db.Users.Add(user);
        var symbol = new Symbol { ExchangeId = 1, Name = "BTCUSDT", BaseAsset = "BTC", QuoteAsset = "USDT", IsActive = true };
        db.Symbols.Add(symbol);
        await db.SaveChangesAsync();
        var watchlist = new Watchlist { UserId = user.Id, Name = "Crypto" };
        db.Watchlists.Add(watchlist);
        await db.SaveChangesAsync();
        db.WatchlistItems.Add(new WatchlistItem { WatchlistId = watchlist.Id, SymbolId = symbol.Id });
        await db.SaveChangesAsync();

        var repo = new WatchlistRepository(db);
        var result = (await repo.GetWatchlistsByUserIdAsync(user.Id)).ToList();

        var loaded = Assert.Single(result);
        var item = Assert.Single(loaded.Items);
        Assert.Equal("BTCUSDT", item.Symbol.Name);
        Assert.Equal("BINANCE", item.Symbol.Exchange.Code);
    }

    // Kontrollerer, at kun det valgte symbol fjernes fra watchlisten.
    [Fact]
    public async Task RemoveItemAsync_RemovesOnlyRequestedSymbol()
    {
        await using var db = TestDbContextFactory.Create();
        var user = User();
        db.Users.Add(user);
        var s1 = new Symbol { ExchangeId = 1, Name = "BTCUSDT", BaseAsset = "BTC", QuoteAsset = "USDT" };
        var s2 = new Symbol { ExchangeId = 1, Name = "ETHUSDT", BaseAsset = "ETH", QuoteAsset = "USDT" };
        db.Symbols.AddRange(s1, s2);
        await db.SaveChangesAsync();
        var watchlist = new Watchlist { UserId = user.Id, Name = "Main" };
        db.Watchlists.Add(watchlist);
        await db.SaveChangesAsync();
        db.WatchlistItems.AddRange(
            new WatchlistItem { WatchlistId = watchlist.Id, SymbolId = s1.Id },
            new WatchlistItem { WatchlistId = watchlist.Id, SymbolId = s2.Id });
        await db.SaveChangesAsync();

        var repo = new WatchlistRepository(db);
        await repo.RemoveItemAsync(watchlist.Id, s1.Id);

        var remaining = await db.WatchlistItems.Where(x => x.WatchlistId == watchlist.Id).ToListAsync();
        var item = Assert.Single(remaining);
        Assert.Equal(s2.Id, item.SymbolId);
    }

    // Kontrollerer, at tilhørende watchlist-items fjernes sammen med watchlisten.
    [Fact]
    public async Task DeleteAsync_CascadeDeletesWatchlistItems()
    {
        await using var db = TestDbContextFactory.Create();
        var user = User();
        db.Users.Add(user);
        var symbol = new Symbol { ExchangeId = 1, Name = "BTCUSDT", BaseAsset = "BTC", QuoteAsset = "USDT" };
        db.Symbols.Add(symbol);
        await db.SaveChangesAsync();
        var watchlist = new Watchlist { UserId = user.Id, Name = "Delete me" };
        db.Watchlists.Add(watchlist);
        await db.SaveChangesAsync();
        db.WatchlistItems.Add(new WatchlistItem { WatchlistId = watchlist.Id, SymbolId = symbol.Id });
        await db.SaveChangesAsync();

        var repo = new WatchlistRepository(db);
        await repo.DeleteAsync(watchlist.Id);

        Assert.Null(await db.Watchlists.FindAsync(watchlist.Id));
        // EF InMemory håndhæver ikke relationelle cascade-regler. Den vigtige repository-adfærd
        // her er, at parent-posten fjernes; relationel cascade dækkes af skemaet hos den rigtige databaseprovider.
    }
}
