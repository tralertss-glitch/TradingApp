using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradingApp.Controllers;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Models;
using TradingAppLibrary.Repositories;
using TradingAppLibrary.Services;
using TradingAppTest.Helpers;

namespace TradingAppTest.Controllers;

public class ExchangesControllerTests
{
    // Kontrollerer, at kun aktive exchanges returneres.
    [Fact]
    public async Task GetActiveExchanges_ReturnsOnlyActiveRows()
    {
        await using var db = TestDbContextFactory.Create();
        db.Exchanges.Add(new Exchange { Id = 2, Code = "OKX", Name = "OKX", IsActive = false });
        await db.SaveChangesAsync();
        var controller = CreateController(db);

        var result = await controller.GetActiveExchanges(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var exchanges = Assert.IsAssignableFrom<IEnumerable<ExchangeResponseDto>>(ok.Value).ToList();
        var exchange = Assert.Single(exchanges);
        Assert.Equal("BINANCE", exchange.Code);
    }

    // Kontrollerer, at en exchange med en understøttet adapter kan oprettes.
    [Fact]
    public async Task CreateExchange_WithSupportedAdapter_CreatesNormalizedExchange()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.CreateExchange(
            new CreateExchangeDto(" okx ", " OKX Exchange ", true), CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<ExchangeResponseDto>(created.Value);
        Assert.Equal("OKX", dto.Code);
        Assert.Equal("OKX Exchange", dto.Name);
        Assert.True(await db.Exchanges.AnyAsync(e => e.Code == "OKX"));
    }

    // Kontrollerer, at en exchange uden backend-adapter bliver afvist.
    [Fact]
    public async Task CreateExchange_WithoutBackendAdapter_ReturnsBadRequest()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.CreateExchange(
            new CreateExchangeDto("KRAKEN", "Kraken", true), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.False(await db.Exchanges.AnyAsync(e => e.Code == "KRAKEN"));
    }

    // Kontrollerer, at en eksisterende exchange-kode ikke kan oprettes igen.
    [Fact]
    public async Task CreateExchange_WhenCodeAlreadyExists_ReturnsConflict()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.CreateExchange(
            new CreateExchangeDto("BINANCE", "Another Binance", true), CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    // Kontrollerer, at exchange-koden ikke kan ændres, når der allerede findes symboler.
    [Fact]
    public async Task UpdateExchange_CannotChangeCodeAfterSymbolsExist()
    {
        await using var db = TestDbContextFactory.Create();
        db.Symbols.Add(new Symbol { ExchangeId = 1, Name = "BTCUSDT", BaseAsset = "BTC", QuoteAsset = "USDT" });
        await db.SaveChangesAsync();
        var controller = CreateController(db);

        var result = await controller.UpdateExchange(
            1, new UpdateExchangeDto("OKX", "Changed", true), CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(result.Result);
        Assert.Equal("BINANCE", (await db.Exchanges.FindAsync(1))!.Code);
    }

    // Kontrollerer, at en exchange med eksisterende symboler ikke kan slettes.
    [Fact]
    public async Task DeleteExchange_WithSymbols_ReturnsConflictAndKeepsExchange()
    {
        await using var db = TestDbContextFactory.Create();
        db.Symbols.Add(new Symbol { ExchangeId = 1, Name = "BTCUSDT", BaseAsset = "BTC", QuoteAsset = "USDT" });
        await db.SaveChangesAsync();
        var controller = CreateController(db);

        var result = await controller.DeleteExchange(1, CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(result);
        Assert.NotNull(await db.Exchanges.FindAsync(1));
    }

    // Kontrollerer, at en exchange uden symboler kan slettes korrekt.
    [Fact]
    public async Task DeleteExchange_WithoutSymbols_ReturnsNoContent()
    {
        await using var db = TestDbContextFactory.Create();
        db.Exchanges.Add(new Exchange { Id = 2, Code = "OKX", Name = "OKX", IsActive = false });
        await db.SaveChangesAsync();
        var controller = CreateController(db);

        var result = await controller.DeleteExchange(2, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.Null(await db.Exchanges.FindAsync(2));
    }

    private static ExchangesController CreateController(TradingAppLibrary.Data.AppDbContext db)
    {
        var repository = new ExchangeRepository(db);
        var service = new ExchangeManagementService(
            repository,
            new FakeExchangeServiceFactory("BINANCE", "OKX"));

        return new ExchangesController(service);
    }
}
