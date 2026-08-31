using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingApp.Controllers;

[ApiController]
[Route("api/admin/system-health")]
[Authorize(Roles = "Admin,SuperAdmin")]
public sealed class SystemHealthController : ControllerBase
{
    private readonly ISystemHealthService _systemHealthService;

    public SystemHealthController(ISystemHealthService systemHealthService)
    {
        _systemHealthService = systemHealthService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(SystemHealthDto), StatusCodes.Status200OK)]
    // Henter den relevante operation.
    public async Task<ActionResult<SystemHealthDto>> Get(
        CancellationToken cancellationToken)
    {
        var health = await _systemHealthService.GetHealthAsync(cancellationToken);
        return Ok(health);
    }
}
