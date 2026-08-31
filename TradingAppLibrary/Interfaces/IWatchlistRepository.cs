using TradingAppLibrary.Models;

namespace TradingAppLibrary.Interfaces;

public interface IWatchlistRepository
{
    Task<IEnumerable<Watchlist>> GetWatchlistsByUserIdAsync(int userId);
    Task<Watchlist?> GetByIdAsync(int id);
    Task AddAsync(Watchlist watchlist);
    Task AddItemAsync(WatchlistItem item);
    Task RemoveItemAsync(int watchlistId, int symbolId);
    Task DeleteAsync(int id);
}
