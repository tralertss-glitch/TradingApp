namespace TradingAppLibrary.Models;

public class WatchlistItem
{
    public int Id { get; set; }
    public int WatchlistId { get; set; }
    public Watchlist Watchlist { get; set; } = null!;
    public int SymbolId { get; set; }
    public Symbol Symbol { get; set; } = null!;
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}
