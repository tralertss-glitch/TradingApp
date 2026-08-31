using TradingAppLibrary.DTO;
using TradingAppLibrary.Validation;

namespace TradingAppLibrary.Interfaces;

public interface ICandleValidator
{
    CandleValidationResult Validate(ExchangeCandleDto candle, string expectedSymbol, string expectedInterval);
    CandleBatchValidationResult ValidateBatch(IReadOnlyList<ExchangeCandleDto> candles, string expectedSymbol, string expectedInterval);
}
