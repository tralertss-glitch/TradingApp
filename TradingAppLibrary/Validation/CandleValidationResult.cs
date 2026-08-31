namespace TradingAppLibrary.Validation;

// Behandler candle validation result.
public sealed record CandleValidationResult(bool IsValid, IReadOnlyList<string> Errors)
{
    // Behandler success.
    public static CandleValidationResult Success() => new(true, Array.Empty<string>());

    // Behandler failure.
    public static CandleValidationResult Failure(params string[] errors) =>
        new(false, errors.Where(x => !string.IsNullOrWhiteSpace(x)).ToArray());
}

// Behandler candle batch validation result.
public sealed record CandleBatchValidationResult(
    bool IsValid,
    IReadOnlyList<string> Errors,
    IReadOnlyList<string> Warnings)
{
    // Behandler success.
    public static CandleBatchValidationResult Success(IReadOnlyList<string>? warnings = null) =>
        new(true, Array.Empty<string>(), warnings ?? Array.Empty<string>());
}
