namespace TradingAppLibrary.DTO;

public class CreateAlertDto
{
    public int SymbolId { get; set; }
    public decimal TargetPrice { get; set; }
    public string Condition { get; set; } = "CROSSES_UP";
    public string? Note { get; set; }
}

public class AlertResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public int SymbolId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public string Exchange { get; set; } = string.Empty;
    public decimal TargetPrice { get; set; }
    public string Condition { get; set; } = string.Empty;
    public bool IsTriggered { get; set; }
    public bool IsActive { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}
