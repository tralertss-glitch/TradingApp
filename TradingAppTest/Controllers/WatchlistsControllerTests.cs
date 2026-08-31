using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using TradingApp.Controllers;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingAppTest.Controllers;

public class WatchlistsControllerTests
{
    // Kontrollerer den forventede adfærd for dette testscenarie.
    private static WatchlistsController CreateController(IWatchlistService service, int userId = 7)
    {
        var controller = new WatchlistsController(service);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) }, "Test"))
            }
        };
        return controller;
    }

    // Kontrollerer, at watchlists hentes for den autentificerede bruger.
    [Fact]
    public async Task GetMyWatchlists_UsesAuthenticatedUserId()
    {
        var service = new Mock<IWatchlistService>();
        service.Setup(x => x.GetUserWatchlistsAsync(7))
            .ReturnsAsync(new[] { new WatchlistResponseDto(1, "Main", new()) });
        var controller = CreateController(service.Object);

        var result = await controller.GetMyWatchlists();

        Assert.IsType<OkObjectResult>(result.Result);
        service.Verify(x => x.GetUserWatchlistsAsync(7), Times.Once);
    }

    // Kontrollerer, at en watchlist uden navn bliver afvist.
    [Fact]
    public async Task CreateWatchlist_BlankName_ReturnsBadRequest()
    {
        var controller = CreateController(Mock.Of<IWatchlistService>());

        var result = await controller.CreateWatchlist("   ");

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // Kontrollerer, at ugyldige id-værdier bliver afvist.
    [Fact]
    public async Task AddSymbolToWatchlist_InvalidIds_ReturnsBadRequest()
    {
        var controller = CreateController(Mock.Of<IWatchlistService>());

        var result = await controller.AddSymbolToWatchlist(new AddWatchlistItemDto(0, 1));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // Kontrollerer, at et mislykket service-resultat returnerer Not Found.
    [Fact]
    public async Task RemoveSymbolFromWatchlist_WhenServiceReturnsFalse_ReturnsNotFound()
    {
        var service = new Mock<IWatchlistService>();
        service.Setup(x => x.RemoveSymbolFromWatchlistAsync(1, 10)).ReturnsAsync(false);
        var controller = CreateController(service.Object);

        var result = await controller.RemoveSymbolFromWatchlist(1, 10);

        Assert.IsType<NotFoundObjectResult>(result);
    }
}
