using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingApp.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ExchangesController : ControllerBase
{
    private readonly IExchangeManagementService _exchangeManagementService;

    public ExchangesController(IExchangeManagementService exchangeManagementService)
    {
        _exchangeManagementService = exchangeManagementService;
    }

    /// <summary>
    /// Offentlig terminalliste: kun aktive exchanges.
    /// GET: api/exchanges
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExchangeResponseDto>>> GetActiveExchanges(
        CancellationToken cancellationToken)
    {
        var exchanges = await _exchangeManagementService.GetActiveExchangesAsync(cancellationToken);
        return Ok(exchanges);
    }

    /// <summary>
    /// Administrationsliste: aktive og inaktive exchanges.
    /// GET: api/exchanges/admin
    /// </summary>
    [HttpGet("admin")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<IEnumerable<ExchangeResponseDto>>> GetAllExchanges(
        CancellationToken cancellationToken)
    {
        var exchanges = await _exchangeManagementService.GetAllExchangesAsync(cancellationToken);
        return Ok(exchanges);
    }

    /// <summary>
    /// Opretter kun en exchange, når der findes en tilsvarende backend-adapter.
    /// POST: api/exchanges
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<ExchangeResponseDto>> CreateExchange(
        [FromBody] CreateExchangeDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _exchangeManagementService.CreateExchangeAsync(dto, cancellationToken);

        if (!result.Success)
            return HandleError<ExchangeResponseDto>(result);

        return CreatedAtAction(
            nameof(GetAllExchanges),
            new { id = result.Exchange!.Id },
            result.Exchange);
    }

    /// <summary>
    /// Opdaterer exchange-navn og status. Ændring af kode blokeres, når der allerede findes symboler.
    /// PUT: api/exchanges/{id}
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<ExchangeResponseDto>> UpdateExchange(
        int id,
        [FromBody] UpdateExchangeDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _exchangeManagementService.UpdateExchangeAsync(id, dto, cancellationToken);

        if (!result.Success)
            return HandleError<ExchangeResponseDto>(result);

        return Ok(result.Exchange);
    }

    /// <summary>
    /// Sletter kun en exchange permanent, når den ikke har tilknyttede symboler.
    /// Exchanges med markedshistorik bør deaktiveres i stedet for at blive slettet.
    /// DELETE: api/exchanges/{id}
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> DeleteExchange(int id, CancellationToken cancellationToken)
    {
        var result = await _exchangeManagementService.DeleteExchangeAsync(id, cancellationToken);

        if (!result.Success)
            return HandleError(result);

        return NoContent();
    }

    private ActionResult<T> HandleError<T>(ExchangeOperationResult result)
    {
        var response = new { message = result.Error ?? "Exchange operation failed." };

        return result.ErrorType switch
        {
            ExchangeOperationErrorType.NotFound => NotFound(response),
            ExchangeOperationErrorType.Conflict => Conflict(response),
            _ => BadRequest(response)
        };
    }

    private IActionResult HandleError(ExchangeOperationResult result)
    {
        var response = new { message = result.Error ?? "Exchange operation failed." };

        return result.ErrorType switch
        {
            ExchangeOperationErrorType.NotFound => NotFound(response),
            ExchangeOperationErrorType.Conflict => Conflict(response),
            _ => BadRequest(response)
        };
    }
}
