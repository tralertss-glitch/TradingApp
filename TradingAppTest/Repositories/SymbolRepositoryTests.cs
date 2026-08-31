using TradingAppLibrary.Models;
using TradingAppLibrary.Repositories;
using TradingAppTest.Helpers;

namespace TradingAppTest.Repositories;

public class SymbolRepositoryTests
{
    // Kontrollerer, at symbolfelter normaliseres før lagring.
    [Fact]
    public async Task AddAsync_NormalizesSymbolFields()
    {
        await using var db = TestDbContextFactory.Create();
        var repo = new SymbolRepository(db);

        var symbol = new Symbol
        {
            ExchangeId = 1,
            Name = " btcusdt ",
            BaseAsset = " btc ",
            QuoteAsset = " usdt ",
            IsActive = true
        };

        await repo.AddAsync(symbol);

        var saved = await repo.GetByIdAsync(symbol.Id);
        Assert.NotNull(saved);
        Assert.Equal("BTCUSDT", saved!.Name);
        Assert.Equal("BTC", saved.BaseAsset);
        Assert.Equal("USDT", saved.QuoteAsset);
    }

    // Kontrollerer, at kun aktive symboler fra aktive exchanges returneres.
    [Fact]
    public async Task GetAllActiveSymbolsAsync_ReturnsOnlyActiveSymbolsFromActiveExchange()
    {
        await using var db = TestDbContextFactory.Create();
        db.Exchanges.Add(new Exchange { Id = 2, Code = "OKX", Name = "OKX", IsActive = false });
        db.Symbols.AddRange(
            new Symbol { ExchangeId = 1, Name = "BTCUSDT", BaseAsset = "BTC", QuoteAsset = "USDT", IsActive = true },
            new Symbol { ExchangeId = 1, Name = "ETHUSDT", BaseAsset = "ETH", QuoteAsset = "USDT", IsActive = false },
            new Symbol { ExchangeId = 2, Name = "BTC-USDT", BaseAsset = "BTC", QuoteAsset = "USDT", IsActive = true });
        await db.SaveChangesAsync();

        var repo = new SymbolRepository(db);
        var result = (await repo.GetAllActiveSymbolsAsync()).ToList();

        var symbol = Assert.Single(result);
        Assert.Equal("BTCUSDT", symbol.Name);
        Assert.Equal("BINANCE", symbol.Exchange.Code);
    }

    // Kontrollerer, at symbolsøgning ikke returnerer symboler fra en anden exchange.
    [Fact]
    public async Task SearchAsync_WithExchangeId_DoesNotLeakSymbolsFromOtherExchange()
    {
        await using var db = TestDbContextFactory.Create();
        db.Exchanges.Add(new Exchange { Id = 2, Code = "OKX", Name = "OKX", IsActive = true });
        db.Symbols.AddRange(
            new Symbol { ExchangeId = 1, Name = "BTCUSDT", BaseAsset = "BTC", QuoteAsset = "USDT" },
            new Symbol { ExchangeId = 2, Name = "BTC-USDT", BaseAsset = "BTC", QuoteAsset = "USDT" });
        await db.SaveChangesAsync();

        var repo = new SymbolRepository(db);
        var result = (await repo.SearchAsync(2, "btc")).ToList();

        var symbol = Assert.Single(result);
        Assert.Equal(2, symbol.ExchangeId);
        Assert.Equal("BTC-USDT", symbol.Name);
    }

    // Kontrollerer, at opslaget er uafhængigt af store og små bogstaver.
    [Fact]
    public async Task GetByNameAsync_IsCaseInsensitiveAndTrimsInput()
    {
        await using var db = TestDbContextFactory.Create();
        db.Symbols.Add(new Symbol
        {
            ExchangeId = 1,
            Name = "BTCUSDT",
            BaseAsset = "BTC",
            QuoteAsset = "USDT"
        });
        await db.SaveChangesAsync();

        var repo = new SymbolRepository(db);
        var result = await repo.GetByNameAsync(1, "  btcusdt ");

        Assert.NotNull(result);
        Assert.Equal("BTCUSDT", result!.Name);
    }
}
