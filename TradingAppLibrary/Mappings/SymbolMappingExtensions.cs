using TradingAppLibrary.DTO;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Mappings;

public static class SymbolMappingExtensions
{
    // Behandler to response dto.
    public static SymbolResponseDto ToResponseDto(this Symbol symbol) => new(
        symbol.Id,
        symbol.ExchangeId,
        symbol.Exchange?.Code ?? string.Empty,
        symbol.Exchange?.Name ?? string.Empty,
        symbol.Name,
        symbol.BaseAsset,
        symbol.QuoteAsset,
        symbol.IsActive);

    // Behandler to response dtos.
    public static IEnumerable<SymbolResponseDto> ToResponseDtos(this IEnumerable<Symbol> symbols) =>
        symbols?.Select(symbol => symbol.ToResponseDto()) ?? Enumerable.Empty<SymbolResponseDto>();

    // Behandler to entity.
    public static Symbol ToEntity(this ExchangeSymbolDto source, int exchangeId) => new()
    {
        ExchangeId = exchangeId,
        Name = source.Name.Trim().ToUpperInvariant(),
        BaseAsset = source.BaseAsset.Trim().ToUpperInvariant(),
        QuoteAsset = source.QuoteAsset.Trim().ToUpperInvariant(),
        IsActive = false
    };

    // Opdaterer from exchange.
    public static void UpdateFromExchange(this Symbol target, ExchangeSymbolDto source)
    {
        target.Name = source.Name.Trim().ToUpperInvariant();
        target.BaseAsset = source.BaseAsset.Trim().ToUpperInvariant();
        target.QuoteAsset = source.QuoteAsset.Trim().ToUpperInvariant();

        // IsActive bevares bevidst.
        // Det angiver, om applikationen skal indsamle data for symbolet.
    }
}
