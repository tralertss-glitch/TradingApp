namespace TradingAppLibrary.Models;

public class ChartDrawing
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int SymbolId { get; set; }
    public Symbol Symbol { get; set; } = null!;
    public string Interval { get; set; } = "1h";
    public string DrawingType { get; set; } = string.Empty;
    public string DataJson { get; set; } = "{}";
    public bool IsVisible { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
