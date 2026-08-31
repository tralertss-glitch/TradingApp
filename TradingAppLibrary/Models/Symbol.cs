namespace TradingAppLibrary.Models;

public class Symbol
{
    public int Id { get; set; }
    public int ExchangeId { get; set; }
    public Exchange Exchange { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string BaseAsset { get; set; } = string.Empty;
    public string QuoteAsset { get; set; } = string.Empty;
    public bool IsActive { get; set; } = false;
    public ICollection<Candle> Candles { get; set; } = new List<Candle>();
    public ICollection<ChartDrawing> ChartDrawings { get; set; } = new List<ChartDrawing>();
}
