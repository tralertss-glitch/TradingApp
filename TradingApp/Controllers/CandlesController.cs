using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingApp.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class CandlesController : ControllerBase
{
    private readonly ICandleService _candleService;

    public CandlesController(ICandleService candleService)
    {
        _candleService = candleService;
    }

    /// <summary>
    /// Henter candle-data ud fra SymbolId.
    /// GET: api/candles?symbolId=10&interval=1h&limit=100&endTime=1710000000000
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CandleResponseDto>>> GetCandles(
        [FromQuery] int symbolId,
        [FromQuery] string interval = "1m",
        [FromQuery] int limit = 1000,
        [FromQuery] long? endTime = null)
    {
        if (symbolId <= 0)
            return BadRequest(new { message = "Geçerli bir symbolId zorunludur." });

        if (string.IsNullOrWhiteSpace(interval))
            return BadRequest(new { message = "Interval parametresi zorunludur." });

        limit = Math.Clamp(limit, 1, 1000);

        var candles = await _candleService.GetCandlesAsync(
            symbolId,
            interval,
            limit,
            endTime);

        return Ok(candles);
    }
}
