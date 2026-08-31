using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingApp.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class WatchlistsController : ControllerBase
{
    private readonly IWatchlistService _watchlistService;

    public WatchlistsController(IWatchlistService watchlistService)
    {
        _watchlistService = watchlistService;
    }

    /// <summary>
    /// Henter watchlists for den bruger, der er logget ind.
    /// GET: api/watchlists
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WatchlistResponseDto>>> GetMyWatchlists()
    {
        var userId = GetCurrentUserId();
        return Ok(await _watchlistService.GetUserWatchlistsAsync(userId));
    }

    /// <summary>
    /// Opretter en ny watchlist.
    /// POST: api/watchlists
    /// Body: "Mine favoritter"
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<WatchlistResponseDto>> CreateWatchlist(
        [FromBody] string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { message = "Liste adı boş olamaz." });

        var userId = GetCurrentUserId();

        var createdList = await _watchlistService.CreateWatchlistAsync(
            userId,
            name);

        return Ok(createdList);
    }

    /// <summary>
    /// Tilføjer et SymbolId til en watchlist.
    /// POST: api/watchlists/items
    /// </summary>
    [HttpPost("items")]
    public async Task<IActionResult> AddSymbolToWatchlist(
        [FromBody] AddWatchlistItemDto dto)
    {
        if (dto.WatchlistId <= 0 || dto.SymbolId <= 0)
        {
            return BadRequest(new
            {
                message = "Geçerli watchlistId ve symbolId zorunludur."
            });
        }

        var success = await _watchlistService.AddSymbolToWatchlistAsync(dto);

        if (!success)
        {
            return BadRequest(new
            {
                message = "İzleme listesi veya sembol bulunamadı."
            });
        }

        return Ok(new
        {
            message = "Sembol izleme listesine başarıyla eklendi.",
            dto.SymbolId
        });
    }

    /// <summary>
    /// Fjerner et SymbolId fra en watchlist.
    /// DELETE: api/watchlists/1/items/10
    /// </summary>
    [HttpDelete("{watchlistId:int}/items/{symbolId:int}")]
    public async Task<IActionResult> RemoveSymbolFromWatchlist(
        int watchlistId,
        int symbolId)
    {
        var success = await _watchlistService.RemoveSymbolFromWatchlistAsync(
            watchlistId,
            symbolId);

        if (!success)
        {
            return NotFound(new
            {
                message = "İzleme listesi veya silinecek sembol bulunamadı."
            });
        }

        return Ok(new
        {
            message = "Sembol izleme listesinden çıkarıldı.",
            symbolId
        });
    }

    // Henter current user id.
    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? User.FindFirst("id")?.Value;

        if (string.IsNullOrWhiteSpace(userIdClaim) ||
            !int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException(
                "Geçersiz veya bulunamayan kullanıcı kimliği.");
        }

        return userId;
    }
}
