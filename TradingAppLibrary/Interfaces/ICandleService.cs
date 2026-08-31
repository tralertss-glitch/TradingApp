using TradingAppLibrary.DTO;

namespace TradingAppLibrary.Interfaces;

public interface ICandleService
{
    Task<IEnumerable<CandleResponseDto>> GetCandlesAsync(int symbolId, string interval, int limit = 1000, long? endTime = null);
    Task<List<AlertResponseDto>> GetUserAlertsAsync(string userId);
    Task<List<AlertResponseDto>> GetActiveAlertsBySymbolAsync(int symbolId);
    Task<AlertResponseDto?> GetAlertByIdAsync(string alertId, string userId);
    Task<AlertResponseDto> CreateAlertAsync(string userId, CreateAlertDto dto);
    Task<bool> DeleteAlertAsync(string alertId, string userId);
    Task<bool> ToggleAlertAsync(string alertId, string userId);
    Task<List<AlertResponseDto>> CheckAndTriggerAlertsAsync(int symbolId, decimal currentPrice);
}
