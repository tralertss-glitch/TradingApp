using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingApp.Controllers;

[Route("api/[controller]")]
[ApiController]
public class SymbolsController : ControllerBase
{
    private readonly ISymbolService _symbolService;
    private readonly IMarketDataSyncService _marketDataSyncService;

    public SymbolsController(ISymbolService symbolService, IMarketDataSyncService marketDataSyncService)
    {
        _symbolService = symbolService;
        _marketDataSyncService = marketDataSyncService;
    }

    /// <summary>
    /// Henter alle symboler eller de symboler, der matcher query-parameteren.
    /// Hvis exchangeId angives, søges der kun på den pågældende exchange.
    /// GET: api/symbols?query=BTC&exchangeId=1
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SymbolResponseDto>>> GetSymbols([FromQuery] string? query = null, [FromQuery] int? exchangeId = null)
    {
        if (exchangeId.HasValue && exchangeId.Value <= 0)
            return BadRequest(new { message = "Geçersiz exchangeId." });

        if (exchangeId.HasValue)
        {
            var result = string.IsNullOrWhiteSpace(query)
                ? await _symbolService.GetSymbolsByExchangeAsync(exchangeId.Value)
                : await _symbolService.SearchSymbolsAsync(exchangeId.Value, query);

            return Ok(result);
        }

        var symbols = string.IsNullOrWhiteSpace(query)
            ? await _symbolService.GetAllSymbolsAsync()
            : await _symbolService.SearchSymbolsAsync(query);

        return Ok(symbols);
    }

    /// <summary>
    /// Henter ét symbol ud fra SymbolId.
    /// GET: api/symbols/10
    /// </summary>
    [HttpGet("{symbolId:int}")]
    public async Task<ActionResult<SymbolResponseDto>> GetSymbol(int symbolId)
    {
        var symbol = await _symbolService.GetSymbolByIdAsync(symbolId);

        if (symbol == null)
            return NotFound(new { message = "Sembol bulunamadı." });

        return Ok(symbol);
    }

    /// <summary>
    /// Synkroniserer symbolerne for den angivne exchange med det eksterne API.
    /// POST: api/symbols/sync/BINANCE
    /// </summary>
    [HttpPost("sync/{exchangeCode}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> SyncSymbols(string exchangeCode, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(exchangeCode))
            return BadRequest(new { message = "Exchange kodu zorunludur." });

        await _marketDataSyncService.SyncExchangeSymbolsAsync(exchangeCode.Trim().ToUpperInvariant(), cancellationToken);

        return Ok(new
        {
            message = $"{exchangeCode.Trim().ToUpperInvariant()} sembolleri başarıyla senkronize edildi."
        });
    }

    /// <summary>
    /// Henter de aktive symboler på den angivne exchange.
    /// GET: api/symbols/active?exchangeId=1
    /// </summary>
    [HttpGet("active")]
    public async Task<ActionResult<IEnumerable<SymbolResponseDto>>> GetActiveSymbols([FromQuery] int exchangeId)
    {
        if (exchangeId <= 0)
            return BadRequest(new { message = "Geçerli bir exchangeId zorunludur." });

        return Ok(await _symbolService.GetActiveSymbolsAsync(exchangeId));
    }

    /// <summary>
    /// Opdaterer aktiv/inaktiv-status ud fra SymbolId.
    /// PUT: api/symbols/10/status
    /// </summary>
    [HttpPut("{symbolId:int}/status")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> ToggleStatus(int symbolId, [FromBody] ToggleStatusDto dto)
    {
        var result = await _symbolService.UpdateSymbolStatusAsync(symbolId, dto.IsActive);

        if (result == null)
            return NotFound(new { message = "Sembol bulunamadı." });

        var message = result.IsActive && result.HistoricalSyncQueued
            ? "Sembol aktif edildi. Geçmiş veriler arka planda senkronize ediliyor."
            : result.IsActive
                ? "Sembol aktif durumda."
                : "Sembol pasif edildi ve realtime aboneliği güncelleniyor.";

        return Ok(new
        {
            message,
            symbolId = result.SymbolId,
            exchangeCode = result.ExchangeCode,
            symbolName = result.SymbolName,
            isActive = result.IsActive,
            historicalSyncQueued = result.HistoricalSyncQueued,
            realtimeRestartRequested = result.RealtimeRestartRequested
        });
    }
}

// Skifter status for status dto.
public record ToggleStatusDto(bool IsActive);
