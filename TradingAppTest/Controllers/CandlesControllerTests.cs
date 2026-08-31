using Microsoft.AspNetCore.Mvc;
using Moq;
using TradingApp.Controllers;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingAppTest.Controllers;

public class CandlesControllerTests
{
    // Kontrollerer, at et ugyldigt symbol-id bliver afvist med Bad Request.
    [Fact]
    public async Task GetCandles_InvalidSymbolId_ReturnsBadRequest()
    {
        var controller = new CandlesController(Mock.Of<ICandleService>());

        var result = await controller.GetCandles(0, "1m", 100, null);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // Kontrollerer, at en for stor candle-limit bliver begrænset før servicekaldet.
    [Fact]
    public async Task GetCandles_ClampsLimitTo1000()
    {
        var service = new Mock<ICandleService>();
        service.Setup(x => x.GetCandlesAsync(1, "15m", 1000, null))
            .ReturnsAsync(Array.Empty<CandleResponseDto>());
        var controller = new CandlesController(service.Object);

        var result = await controller.GetCandles(1, "15m", 5000, null);

        Assert.IsType<OkObjectResult>(result.Result);
        service.Verify(x => x.GetCandlesAsync(1, "15m", 1000, null), Times.Once);
    }

    // Kontrollerer, at en gyldig request returnerer det forventede service-resultat.
    [Fact]
    public async Task GetCandles_ValidRequest_ReturnsServiceResult()
    {
        var expected = new[]
        {
            new CandleResponseDto(1, 100, 110, 90, 105, 5, 1, "BTCUSDT", "BINANCE", "1m")
        };
        var service = new Mock<ICandleService>();
        service.Setup(x => x.GetCandlesAsync(1, "1m", 100, null)).ReturnsAsync(expected);
        var controller = new CandlesController(service.Object);

        var result = await controller.GetCandles(1, "1m", 100, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }
}
