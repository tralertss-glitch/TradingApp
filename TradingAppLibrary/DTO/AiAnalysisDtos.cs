namespace TradingAppLibrary.DTO;

// Behandler ai analysis request dto.
public record AiAnalysisRequestDto(int SymbolId, string Interval, string? Language = null);
// Behandler ai analysis response dto.
public record AiAnalysisResponseDto(int SymbolId, string Symbol, string Exchange, string AnalysisText, DateTime GeneratedAt);
