using TradingAppLibrary.DTO;

namespace TradingAppLibrary.Interfaces;

public interface ISystemHealthService
{
    Task<SystemHealthDto> GetHealthAsync(CancellationToken cancellationToken = default);
}
