using TradingAppLibrary.Models;
using TradingAppLibrary.Repositories;
using TradingAppTest.Helpers;

namespace TradingAppTest.Repositories;

public class ExchangeRepositoryTests
{
    // Kontrollerer, at kun aktive exchanges returneres og sorteres efter navn.
    [Fact]
    public async Task GetActiveAsync_ReturnsOnlyActiveExchangesOrderedByName()
    {
        await using var db = TestDbContextFactory.Create();
        db.Exchanges.AddRange(
            new Exchange { Id = 2, Code = "OKX", Name = "OKX", IsActive = true },
            new Exchange { Id = 3, Code = "KRAKEN", Name = "Kraken", IsActive = false });
        await db.SaveChangesAsync();

        var repo = new ExchangeRepository(db);
        var result = (await repo.GetActiveAsync()).ToList();

        Assert.Equal(2, result.Count);
        Assert.All(result, exchange => Assert.True(exchange.IsActive));
        Assert.Equal("BINANCE", result[0].Code);
        Assert.Equal("OKX", result[1].Code);
    }

    // Kontrollerer, at en exchange kan findes via dens id.
    [Fact]
    public async Task GetByIdAsync_ExistingExchange_ReturnsExchange()
    {
        await using var db = TestDbContextFactory.Create();
        var repo = new ExchangeRepository(db);

        var result = await repo.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal("BINANCE", result!.Code);
    }

    // Kontrollerer duplicate code og exclude-id ved opdatering.
    [Fact]
    public async Task ExistsByCodeAsync_RespectsExcludedExchangeId()
    {
        await using var db = TestDbContextFactory.Create();
        var repo = new ExchangeRepository(db);

        Assert.True(await repo.ExistsByCodeAsync("BINANCE"));
        Assert.False(await repo.ExistsByCodeAsync("BINANCE", 1));
        Assert.False(await repo.ExistsByCodeAsync("DOES_NOT_EXIST"));
    }

    // Kontrollerer, om en exchange har tilknyttede symbols.
    [Fact]
    public async Task HasSymbolsAsync_ReturnsTrueOnlyWhenSymbolsExist()
    {
        await using var db = TestDbContextFactory.Create();
        db.Exchanges.Add(new Exchange { Id = 2, Code = "OKX", Name = "OKX", IsActive = true });
        db.Symbols.Add(new Symbol
        {
            ExchangeId = 1,
            Name = "BTCUSDT",
            BaseAsset = "BTC",
            QuoteAsset = "USDT",
            IsActive = true
        });
        await db.SaveChangesAsync();

        var repo = new ExchangeRepository(db);

        Assert.True(await repo.HasSymbolsAsync(1));
        Assert.False(await repo.HasSymbolsAsync(2));
    }

    // Kontrollerer, at AddAsync gemmer en ny exchange i databasen.
    [Fact]
    public async Task AddAsync_PersistsExchange()
    {
        await using var db = TestDbContextFactory.Create();
        var repo = new ExchangeRepository(db);
        var exchange = new Exchange
        {
            Code = "OKX",
            Name = "OKX",
            IsActive = true
        };

        await repo.AddAsync(exchange);

        var saved = await repo.GetByIdAsync(exchange.Id);
        Assert.NotNull(saved);
        Assert.Equal("OKX", saved!.Code);
        Assert.True(saved.IsActive);
    }

    // Kontrollerer, at ændringer gemmes via SaveChangesAsync.
    [Fact]
    public async Task SaveChangesAsync_PersistsUpdatedExchange()
    {
        await using var db = TestDbContextFactory.Create();
        var repo = new ExchangeRepository(db);
        var exchange = await repo.GetByIdAsync(1);
        Assert.NotNull(exchange);

        exchange!.Name = "Binance Updated";
        exchange.IsActive = false;
        await repo.SaveChangesAsync();

        var saved = await repo.GetByIdAsync(1);
        Assert.NotNull(saved);
        Assert.Equal("Binance Updated", saved!.Name);
        Assert.False(saved.IsActive);
    }

    // Kontrollerer, at DeleteAsync fjerner en exchange uden tilknyttede data.
    [Fact]
    public async Task DeleteAsync_RemovesExchange()
    {
        await using var db = TestDbContextFactory.Create();
        var repo = new ExchangeRepository(db);
        var exchange = new Exchange
        {
            Code = "TEST",
            Name = "Test Exchange",
            IsActive = false
        };
        await repo.AddAsync(exchange);
        var id = exchange.Id;

        await repo.DeleteAsync(exchange);

        var deleted = await repo.GetByIdAsync(id);
        Assert.Null(deleted);
    }
}
