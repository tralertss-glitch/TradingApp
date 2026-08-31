namespace TradingAppLibrary.DTO;

// Behandler exchange response dto.
public record ExchangeResponseDto(int Id, string Code, string Name, bool IsActive);
// Behandler exchange symbol dto.
public record ExchangeSymbolDto(string Name, string BaseAsset, string QuoteAsset, bool IsActive);
// Behandler exchange candle dto.
public record ExchangeCandleDto(long Time, decimal Open, decimal High, decimal Low, decimal Close, decimal Volume, string Symbol, string Interval, bool IsClosed);

// Opretter exchange dto.
public record CreateExchangeDto(string Code, string Name, bool IsActive = true);
// Opdaterer exchange dto.
public record UpdateExchangeDto(string Code, string Name, bool IsActive);
