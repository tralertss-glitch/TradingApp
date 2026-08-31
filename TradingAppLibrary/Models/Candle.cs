namespace TradingAppLibrary.Models;

public class Candle
{
    public long Id { get; set; }
    public int SymbolId { get; set; }
    public Symbol Symbol { get; set; } = null!;
    public string Interval { get; set; } = "1m";
    public DateTime OpenTime { get; set; }
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public decimal Volume { get; set; }
}
