namespace TradingAppLibrary.DTO;

// Behandler symbol response dto.
public record SymbolResponseDto(
    int Id,
    int ExchangeId,
    string ExchangeCode,
    string ExchangeName,
    string Name,
    string BaseAsset,
    string QuoteAsset,
    bool IsActive);

// Behandler symbol status update result dto.
public record SymbolStatusUpdateResultDto(
    int SymbolId,
    string ExchangeCode,
    string SymbolName,
    bool IsActive,
    bool HistoricalSyncQueued,
    bool RealtimeRestartRequested);
