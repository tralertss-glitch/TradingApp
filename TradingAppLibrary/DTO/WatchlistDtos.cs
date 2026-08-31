namespace TradingAppLibrary.DTO;

// Tilføjer watchlist item dto.
public record AddWatchlistItemDto(int WatchlistId, int SymbolId);
// Behandler watchlist item response dto.
public record WatchlistItemResponseDto(int Id, int SymbolId, string Symbol, string Exchange, DateTime AddedAt);
// Behandler watchlist response dto.
public record WatchlistResponseDto(int Id, string Name, List<WatchlistItemResponseDto> Items);
