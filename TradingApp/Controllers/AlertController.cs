using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingApp.Controllers;

[Route("api/alerts")]
[ApiController]
[Authorize]
public class AlertController : ControllerBase
{
    private readonly ICandleService _candleService;

    public AlertController(ICandleService candleService)
    {
        _candleService = candleService;
    }

    // Henter user id.
    private string GetUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("id")?.Value
            ?? User.FindFirst("sub")?.Value
            ?? string.Empty;
    }

    /// <summary>
    /// Henter alle alarmer for den bruger, der er logget ind.
    /// GET: api/alerts
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AlertResponseDto>>> GetMyAlerts()
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new { message = "Yetkisiz işlem." });
        return Ok(await _candleService.GetUserAlertsAsync(userId));
    }

    /// <summary>
    /// Henter aktive alarmer for et SymbolId.
    /// GET: api/alerts/active?symbolId=10
    /// </summary>
    [HttpGet("active")]
    public async Task<ActionResult<IEnumerable<AlertResponseDto>>> GetActiveAlertsBySymbol([FromQuery] int symbolId)
    {
        if (symbolId <= 0)
            return BadRequest(new { message = "Geçerli bir symbolId zorunludur." });
        return Ok(await _candleService.GetActiveAlertsBySymbolAsync(symbolId));
    }

    /// <summary>
    /// Opretter en ny prisalarm.
    /// POST: api/alerts
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<AlertResponseDto>> CreateAlert([FromBody] CreateAlertDto dto)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new { message = "Yetkisiz işlem." });

        if (dto == null || dto.SymbolId <= 0 || dto.TargetPrice <= 0)
        {
            return BadRequest(new
            {
                message = "Geçerli symbolId ve hedef fiyat zorunludur."
            });
        }

        try
        {
            var createdAlert = await _candleService.CreateAlertAsync(userId, dto);

            return CreatedAtAction(nameof(GetMyAlerts), new { id = createdAlert.Id }, createdAlert);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Sletter alarmen permanent.
    /// DELETE: api/alerts/{id}
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAlert(string id)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new { message = "Yetkisiz işlem." });

        var success = await _candleService.DeleteAlertAsync(id, userId);

        if (!success)
        {
            return NotFound(new
            {
                message = "Alarm bulunamadı veya bu işlem için yetkiniz yok."
            });
        }
        return Ok(new { message = "Alarm başarıyla silindi." });
    }

    /// <summary>
    /// Aktiverer eller deaktiverer alarmen.
    /// PATCH: api/alerts/{id}/toggle
    /// </summary>
    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> ToggleAlert(string id)
    {
        var userId = GetUserId();

        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new { message = "Yetkisiz işlem." });

        var success = await _candleService.ToggleAlertAsync(id, userId);

        if (!success)
        {
            return NotFound(new
            {
                message = "Alarm bulunamadı veya güncellenemedi."
            });
        }
        return Ok(new { message = "Alarm durumu başarıyla güncellendi." });
    }
}
