using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TradingAppLibrary.Models;

[Table("Alerts")]
public class Alert
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string UserId { get; set; } = string.Empty;

    public int SymbolId { get; set; }
    public Symbol Symbol { get; set; } = null!;

    [Column(TypeName = "decimal(18,8)")]
    public decimal TargetPrice { get; set; }

    [Required, MaxLength(20)]
    public string Condition { get; set; } = "CROSSES_UP";

    public bool IsTriggered { get; set; }
    public bool IsActive { get; set; } = true;

    [MaxLength(255)]
    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
