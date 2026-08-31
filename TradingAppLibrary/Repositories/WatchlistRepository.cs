using Microsoft.EntityFrameworkCore;
using TradingAppLibrary.Data;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Repositories;

public class WatchlistRepository : IWatchlistRepository
{
    private readonly AppDbContext _context;

    public WatchlistRepository(AppDbContext context) => _context = context;

    // Henter watchlists by user id.
    public async Task<IEnumerable<Watchlist>> GetWatchlistsByUserIdAsync(int userId) =>
        await _context.Watchlists.AsNoTracking()
            .Include(w => w.Items).ThenInclude(i => i.Symbol).ThenInclude(s => s.Exchange)
            .Where(w => w.UserId == userId).OrderBy(w => w.Name).ToListAsync();

    // Henter by id.
    public async Task<Watchlist?> GetByIdAsync(int id) =>
        await _context.Watchlists
            .Include(w => w.Items).ThenInclude(i => i.Symbol).ThenInclude(s => s.Exchange)
            .FirstOrDefaultAsync(w => w.Id == id);

    // Tilføjer den relevante operation.
    public async Task AddAsync(Watchlist watchlist)
    {
        await _context.Watchlists.AddAsync(watchlist);
        await _context.SaveChangesAsync();
    }

    // Tilføjer item.
    public async Task AddItemAsync(WatchlistItem item)
    {
        await _context.WatchlistItems.AddAsync(item);
        await _context.SaveChangesAsync();
    }

    // Fjerner item.
    public async Task RemoveItemAsync(int watchlistId, int symbolId)
    {
        var item = await _context.WatchlistItems
            .FirstOrDefaultAsync(wi => wi.WatchlistId == watchlistId && wi.SymbolId == symbolId);
        if (item == null) return;
        _context.WatchlistItems.Remove(item);
        await _context.SaveChangesAsync();
    }

    // Sletter den relevante operation.
    public async Task DeleteAsync(int id)
    {
        var watchlist = await _context.Watchlists.FirstOrDefaultAsync(w => w.Id == id);
        if (watchlist == null) return;
        _context.Watchlists.Remove(watchlist);
        await _context.SaveChangesAsync();
    }
}
