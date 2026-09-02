using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingApp.Controllers;

[ApiController]
[Route("api/chart-drawings")]
[Authorize]
public class ChartDrawingsController : ControllerBase
{
    private readonly IChartDrawingService _chartDrawingService;

    public ChartDrawingsController(IChartDrawingService chartDrawingService)
    {
        _chartDrawingService = chartDrawingService;
    }

    [HttpGet]
    // Henter den relevante operation.
    public async Task<ActionResult<IReadOnlyList<ChartDrawingResponseDto>>> Get([FromQuery] int symbolId, [FromQuery] string interval, CancellationToken cancellationToken)
    {
        if (symbolId <= 0 || string.IsNullOrWhiteSpace(interval))
            return BadRequest(new { message = "symbolId ve interval zorunludur." });
        return Ok(await _chartDrawingService.GetAsync(GetCurrentUserId(), symbolId, interval, cancellationToken));
    }

    [HttpPost]
    // Opretter den relevante operation.
    public async Task<ActionResult<ChartDrawingResponseDto>> Create([FromBody] CreateChartDrawingDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var created = await _chartDrawingService.CreateAsync(GetCurrentUserId(), dto, cancellationToken);
            return CreatedAtAction(nameof(Get), new { symbolId = created.SymbolId, interval = created.Interval }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{drawingId:long}")]
    // Opdaterer den relevante operation.
    public async Task<ActionResult<ChartDrawingResponseDto>> Update(long drawingId, [FromBody] UpdateChartDrawingDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _chartDrawingService.UpdateAsync(GetCurrentUserId(), drawingId, dto, cancellationToken);
            return updated == null
                ? NotFound(new { message = "Çizim bulunamadı." })
                : Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{drawingId:long}")]
    // Sletter den relevante operation.
    public async Task<IActionResult> Delete(long drawingId, CancellationToken cancellationToken)
    {
        var deleted = await _chartDrawingService.DeleteAsync(GetCurrentUserId(), drawingId, cancellationToken);

        return deleted
            ? NoContent()
            : NotFound(new { message = "Çizim bulunamadı." });
    }

    [HttpDelete]
    // Sletter all.
    public async Task<IActionResult> DeleteAll([FromQuery] int symbolId, [FromQuery] string interval, CancellationToken cancellationToken)
    {
        if (symbolId <= 0 || string.IsNullOrWhiteSpace(interval))
            return BadRequest(new { message = "symbolId ve interval zorunludur." });

        var deletedCount = await _chartDrawingService.DeleteAllAsync(GetCurrentUserId(), symbolId, interval, cancellationToken);
        return Ok(new { deletedCount });
    }

    // Henter current user id.
    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? User.FindFirst("id")?.Value;

        if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Geçersiz veya bulunamayan kullanıcı kimliği.");
        return userId;
    }
}
