using TradingAppLibrary.DTO;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Mappings;

public static class CandleMappingExtensions
{
    // Behandler to entity.
    public static Candle ToEntity(this ExchangeCandleDto source, int symbolId) => new()
    {
        SymbolId = symbolId,
        Interval = source.Interval.Trim().ToLowerInvariant(),
        OpenTime = DateTimeOffset.FromUnixTimeMilliseconds(source.Time).UtcDateTime,
        Open = source.Open,
        High = source.High,
        Low = source.Low,
        Close = source.Close,
        Volume = source.Volume
    };

    // Behandler to response dto.
    public static CandleResponseDto ToResponseDto(
        this Candle candle,
        Symbol symbol,
        string? interval = null,
        bool isClosed = true)
    {
        var utcTime = candle.OpenTime.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(candle.OpenTime, DateTimeKind.Utc)
            : candle.OpenTime.ToUniversalTime();

        return new CandleResponseDto(
            new DateTimeOffset(utcTime).ToUnixTimeMilliseconds(),
            candle.Open,
            candle.High,
            candle.Low,
            candle.Close,
            candle.Volume,
            symbol.Id,
            symbol.Name,
            symbol.Exchange?.Code ?? string.Empty,
            (interval ?? candle.Interval).Trim().ToLowerInvariant(),
            isClosed);
    }

    // Behandler to response dto.
    public static CandleResponseDto ToResponseDto(
        this ExchangeCandleDto candle,
        int symbolId,
        string symbolName,
        string exchangeCode) => new(
            candle.Time,
            candle.Open,
            candle.High,
            candle.Low,
            candle.Close,
            candle.Volume,
            symbolId,
            symbolName,
            exchangeCode,
            candle.Interval,
            candle.IsClosed);
}
