using TradingAppLibrary.DTO;

namespace TradingAppLibrary.Interfaces;

public interface IWatchlistService
{
    Task<IEnumerable<WatchlistResponseDto>> GetUserWatchlistsAsync(int userId);
    Task<WatchlistResponseDto> CreateWatchlistAsync(int userId, string name);
    Task<bool> AddSymbolToWatchlistAsync(AddWatchlistItemDto dto);
    Task<bool> RemoveSymbolFromWatchlistAsync(int watchlistId, int symbolId);
}
