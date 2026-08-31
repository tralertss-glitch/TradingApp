using TradingAppLibrary.Models;

namespace TradingAppLibrary.Interfaces;

public interface ICandleRepository
{
    Task<IEnumerable<Candle>> GetCandlesAsync(int symbolId, string interval, int limit = 1000, long? endTime = null);
    Task<Candle?> GetFirstCandleAsync(int symbolId, string interval);
    Task<DateTime?> GetFirstMissingOpenTimeAsync(int symbolId, string interval);
    Task AddOrUpdateCandleAsync(Candle candle);
    Task AddOrUpdateRangeAsync(IEnumerable<Candle> candles);
    Task AddRangeAsync(IEnumerable<Candle> candles);
    Task<List<Alert>> GetAlertsByUserIdAsync(string userId);
    Task<List<Alert>> GetActiveAlertsBySymbolAsync(int symbolId);
    Task<Alert?> GetAlertByIdAsync(string id);
    Task<Alert> CreateAlertAsync(Alert alert);
    Task<bool> DeleteAlertAsync(string id, string userId);
    Task UpdateAlertAsync(Alert alert);
}
