using Microsoft.AspNetCore.Mvc;
using Moq;
using TradingApp.Controllers;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingAppTest.Controllers;

public class SymbolsControllerTests
{
    // Kontrollerer, at et ugyldigt exchange-id bliver afvist.
    [Fact]
    public async Task GetSymbols_InvalidExchangeId_ReturnsBadRequest()
    {
        var controller = new SymbolsController(Mock.Of<ISymbolService>(), Mock.Of<IMarketDataSyncService>());

        var result = await controller.GetSymbols(exchangeId: 0);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // Kontrollerer, at et manglende element returnerer Not Found.
    [Fact]
    public async Task GetSymbol_WhenMissing_ReturnsNotFound()
    {
        var symbols = new Mock<ISymbolService>();
        symbols.Setup(x => x.GetSymbolByIdAsync(99)).ReturnsAsync((SymbolResponseDto?)null);
        var controller = new SymbolsController(symbols.Object, Mock.Of<IMarketDataSyncService>());

        var result = await controller.GetSymbol(99);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    // Kontrollerer, at exchange-koden normaliseres før synkronisering.
    [Fact]
    public async Task SyncSymbols_NormalizesExchangeCodeAndCallsSyncService()
    {
        var sync = new Mock<IMarketDataSyncService>();
        var controller = new SymbolsController(Mock.Of<ISymbolService>(), sync.Object);

        var result = await controller.SyncSymbols(" okx ", CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        sync.Verify(x => x.SyncExchangeSymbolsAsync("OKX", It.IsAny<CancellationToken>()), Times.Once);
    }

    // Kontrollerer, at statusændring på et manglende symbol returnerer Not Found.
    [Fact]
    public async Task ToggleStatus_WhenSymbolMissing_ReturnsNotFound()
    {
        var symbols = new Mock<ISymbolService>();
        symbols.Setup(x => x.UpdateSymbolStatusAsync(42, true))
            .ReturnsAsync((SymbolStatusUpdateResultDto?)null);
        var controller = new SymbolsController(symbols.Object, Mock.Of<IMarketDataSyncService>());

        var result = await controller.ToggleStatus(42, new ToggleStatusDto(true));

        Assert.IsType<NotFoundObjectResult>(result);
    }
}
