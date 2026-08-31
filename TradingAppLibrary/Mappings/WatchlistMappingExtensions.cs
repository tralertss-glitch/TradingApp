using TradingAppLibrary.DTO;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Mappings;

public static class WatchlistMappingExtensions
{
    // Behandler to response dto.
    public static WatchlistItemResponseDto ToResponseDto(this WatchlistItem item) => new(
        item.Id,
        item.SymbolId,
        item.Symbol?.Name ?? string.Empty,
        item.Symbol?.Exchange?.Code ?? string.Empty,
        item.AddedAt);

    // Behandler to response dto.
    public static WatchlistResponseDto ToResponseDto(this Watchlist watchlist) => new(
        watchlist.Id,
        watchlist.Name,
        watchlist.Items?.Select(item => item.ToResponseDto()).ToList() ?? new List<WatchlistItemResponseDto>());

    // Behandler to response dtos.
    public static IEnumerable<WatchlistResponseDto> ToResponseDtos(this IEnumerable<Watchlist> watchlists) =>
        watchlists?.Select(watchlist => watchlist.ToResponseDto()) ?? Enumerable.Empty<WatchlistResponseDto>();

    // Behandler to entity.
    public static WatchlistItem ToEntity(this AddWatchlistItemDto dto) => new()
    {
        WatchlistId = dto.WatchlistId,
        SymbolId = dto.SymbolId,
        AddedAt = DateTime.UtcNow
    };
}
