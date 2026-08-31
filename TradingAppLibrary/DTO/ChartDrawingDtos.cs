using System.Text.Json;

namespace TradingAppLibrary.DTO;

// Opretter chart drawing dto.
public record CreateChartDrawingDto(
    int SymbolId,
    string Interval,
    string DrawingType,
    JsonElement Data,
    bool IsVisible = true);

// Opdaterer chart drawing dto.
public record UpdateChartDrawingDto(
    JsonElement Data,
    bool IsVisible = true);

// Behandler chart drawing response dto.
public record ChartDrawingResponseDto(
    long Id,
    int SymbolId,
    string ExchangeCode,
    string SymbolName,
    string Interval,
    string DrawingType,
    JsonElement Data,
    bool IsVisible,
    DateTime CreatedAt,
    DateTime UpdatedAt);
