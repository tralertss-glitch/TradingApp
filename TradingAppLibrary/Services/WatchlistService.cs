using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Mappings;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Services;

public class WatchlistService : IWatchlistService
{
    private readonly IWatchlistRepository _watchlistRepository;
    private readonly ISymbolRepository _symbolRepository;

    public WatchlistService(IWatchlistRepository watchlistRepository, ISymbolRepository symbolRepository)
    {
        _watchlistRepository = watchlistRepository;
        _symbolRepository = symbolRepository;
    }

    // Henter user watchlists.
    public async Task<IEnumerable<WatchlistResponseDto>> GetUserWatchlistsAsync(int userId)
    {
        if (userId <= 0) return Enumerable.Empty<WatchlistResponseDto>();
        return (await _watchlistRepository.GetWatchlistsByUserIdAsync(userId)).ToResponseDtos();
    }

    // Opretter watchlist.
    public async Task<WatchlistResponseDto> CreateWatchlistAsync(int userId, string name)
    {
        if (userId <= 0)
            throw new ArgumentException("Geçerli bir UserId gereklidir.", nameof(userId));

        var watchlist = new Watchlist
        {
            UserId = userId,
            Name = string.IsNullOrWhiteSpace(name) ? "Favorilerim" : name.Trim()
        };

        await _watchlistRepository.AddAsync(watchlist);
        return watchlist.ToResponseDto();
    }

    // Tilføjer symbol to watchlist.
    public async Task<bool> AddSymbolToWatchlistAsync(AddWatchlistItemDto dto)
    {
        if (dto.WatchlistId <= 0 || dto.SymbolId <= 0) return false;

        var watchlist = await _watchlistRepository.GetByIdAsync(dto.WatchlistId);
        if (watchlist == null) return false;
        if (await _symbolRepository.GetByIdAsync(dto.SymbolId) == null) return false;
        if (watchlist.Items.Any(item => item.SymbolId == dto.SymbolId)) return true;

        await _watchlistRepository.AddItemAsync(dto.ToEntity());
        return true;
    }

    // Fjerner symbol from watchlist.
    public async Task<bool> RemoveSymbolFromWatchlistAsync(int watchlistId, int symbolId)
    {
        if (watchlistId <= 0 || symbolId <= 0) return false;

        var watchlist = await _watchlistRepository.GetByIdAsync(watchlistId);
        if (watchlist == null || !watchlist.Items.Any(item => item.SymbolId == symbolId)) return false;

        await _watchlistRepository.RemoveItemAsync(watchlistId, symbolId);
        return true;
    }
}
