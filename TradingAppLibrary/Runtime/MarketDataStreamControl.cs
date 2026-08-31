using System.Collections.Concurrent;
using TradingAppLibrary.Interfaces;

namespace TradingAppLibrary.Runtime;

public sealed class MarketDataStreamControl : IMarketDataStreamControl
{
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _streams =
        new(StringComparer.OrdinalIgnoreCase);

    // Opretter en ny bruger efter validering af de indsendte oplysninger.
    public void Register(string exchangeCode, CancellationTokenSource streamCancellation)
    {
        var code = Normalize(exchangeCode);
        _streams[code] = streamCancellation;
    }

    // Behandler unregister.
    public void Unregister(string exchangeCode, CancellationTokenSource streamCancellation)
    {
        var code = Normalize(exchangeCode);
        if (_streams.TryGetValue(code, out var current) && ReferenceEquals(current, streamCancellation))
            _streams.TryRemove(code, out _);
    }

    // Behandler restart.
    public void RequestRestart(string exchangeCode)
    {
        var code = Normalize(exchangeCode);
        if (!_streams.TryGetValue(code, out var cancellation))
            return;

        try
        {
            cancellation.Cancel();
        }
        catch (ObjectDisposedException)
        {
            _streams.TryRemove(code, out _);
        }
    }

    // Normaliserer den relevante operation.
    private static string Normalize(string exchangeCode) =>
        exchangeCode.Trim().ToUpperInvariant();
}
