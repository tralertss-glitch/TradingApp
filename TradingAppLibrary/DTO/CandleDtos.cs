namespace TradingAppLibrary.DTO;

// Behandler candle response dto.
public record CandleResponseDto(
    long Time,
    decimal Open,
    decimal High,
    decimal Low,
    decimal Close,
    decimal Volume,
    int SymbolId,
    string Symbol,
    string Exchange,
    string Interval,
    bool IsClosed = true);
