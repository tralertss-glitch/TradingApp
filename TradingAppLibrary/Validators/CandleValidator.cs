using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Validation;

namespace TradingAppLibrary.Validators;

public sealed class CandleValidator : ICandleValidator
{
    private static readonly TimeSpan FutureTolerance = TimeSpan.FromMinutes(2);

    // Validerer den relevante operation.
    public CandleValidationResult Validate(ExchangeCandleDto candle, string expectedSymbol, string expectedInterval)
    {
        var errors = new List<string>();

        var normalizedSymbol = expectedSymbol.Trim().ToUpperInvariant();
        var normalizedInterval = expectedInterval.Trim().ToLowerInvariant();

        if (candle.Time <= 0)
            errors.Add("Candle timestamp must be greater than zero.");
        else
        {
            try
            {
                var candleTime = DateTimeOffset.FromUnixTimeMilliseconds(candle.Time);
                if (candleTime > DateTimeOffset.UtcNow.Add(FutureTolerance))
                    errors.Add("Candle timestamp is too far in the future.");
            }
            catch (ArgumentOutOfRangeException)
            {
                errors.Add("Candle timestamp is outside the supported Unix timestamp range.");
            }
        }

        if (candle.Open <= 0) errors.Add("Open must be greater than zero.");
        if (candle.High <= 0) errors.Add("High must be greater than zero.");
        if (candle.Low <= 0) errors.Add("Low must be greater than zero.");
        if (candle.Close <= 0) errors.Add("Close must be greater than zero.");
        if (candle.Volume < 0) errors.Add("Volume cannot be negative.");

        if (candle.High < candle.Low)
            errors.Add("High cannot be lower than Low.");

        if (candle.High < candle.Open || candle.High < candle.Close)
            errors.Add("High cannot be lower than Open or Close.");

        if (candle.Low > candle.Open || candle.Low > candle.Close)
            errors.Add("Low cannot be higher than Open or Close.");

        if (!string.Equals(candle.Symbol?.Trim(), normalizedSymbol, StringComparison.OrdinalIgnoreCase))
            errors.Add($"Unexpected symbol. Expected={normalizedSymbol}, Actual={candle.Symbol}.");

        if (!string.Equals(candle.Interval?.Trim(), normalizedInterval, StringComparison.OrdinalIgnoreCase))
            errors.Add($"Unexpected interval. Expected={normalizedInterval}, Actual={candle.Interval}.");

        return errors.Count == 0
            ? CandleValidationResult.Success()
            : new CandleValidationResult(false, errors);
    }

    // Validerer batch.
    public CandleBatchValidationResult ValidateBatch(IReadOnlyList<ExchangeCandleDto> candles, string expectedSymbol, string expectedInterval)
    {
        if (candles.Count == 0)
            return CandleBatchValidationResult.Success();

        var errors = new List<string>();
        var warnings = new List<string>();
        var expectedStep = GetIntervalMilliseconds(expectedInterval);

        for (var i = 0; i < candles.Count; i++)
        {
            var result = Validate(candles[i], expectedSymbol, expectedInterval);
            if (!result.IsValid)
            {
                foreach (var error in result.Errors)
                    errors.Add($"Index={i}, Time={candles[i].Time}: {error}");
            }
        }

        for (var i = 1; i < candles.Count; i++)
        {
            if (candles[i].Time < candles[i - 1].Time)
            {
                errors.Add($"Candle batch is not ordered at indexes {i - 1}/{i}: {candles[i - 1].Time} -> {candles[i].Time}.");
            }
        }

        var ordered = candles.OrderBy(c => c.Time).ToList();
        var duplicateTimes = ordered
            .GroupBy(c => c.Time)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        foreach (var duplicateTime in duplicateTimes)
            errors.Add($"Duplicate candle timestamp detected: {duplicateTime}.");

        if (expectedStep.HasValue)
        {
            for (var i = 1; i < ordered.Count; i++)
            {
                var difference = ordered[i].Time - ordered[i - 1].Time;
                if (difference > expectedStep.Value)
                {
                    var missingCount = difference / expectedStep.Value - 1;
                    warnings.Add(
                        $"Gap detected between {ordered[i - 1].Time} and {ordered[i].Time}. Missing candle count: {missingCount}.");
                }
                else if (difference > 0 && difference < expectedStep.Value)
                {
                    errors.Add($"Unexpected candle spacing between {ordered[i - 1].Time} and {ordered[i].Time}: {difference} ms.");
                }
            }
        }
        return new CandleBatchValidationResult(errors.Count == 0, errors, warnings);
    }

    // Henter interval milliseconds.
    private static long? GetIntervalMilliseconds(string interval) =>
        interval.Trim().ToLowerInvariant() switch
        {
            "1m" => 60_000L,
            "3m" => 3 * 60_000L,
            "5m" => 5 * 60_000L,
            "15m" => 15 * 60_000L,
            "30m" => 30 * 60_000L,
            "1h" => 60 * 60_000L,
            "2h" => 2 * 60 * 60_000L,
            "4h" => 4 * 60 * 60_000L,
            "1d" => 24 * 60 * 60_000L,
            _ => null
        };
}
