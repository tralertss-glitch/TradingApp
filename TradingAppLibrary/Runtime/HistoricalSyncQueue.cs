using System.Collections.Concurrent;
using System.Threading.Channels;
using TradingAppLibrary.Interfaces;

namespace TradingAppLibrary.Runtime;

public sealed class HistoricalSyncQueue : IHistoricalSyncQueue
{
    private readonly Channel<HistoricalSyncJob> _channel = Channel.CreateUnbounded<HistoricalSyncJob>(
        new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
            AllowSynchronousContinuations = false
        });

    private readonly ConcurrentDictionary<int, byte> _pendingOrRunning = new();

    // Behandler try enqueue.
    public bool TryEnqueue(int symbolId, string exchangeCode)
    {
        if (symbolId <= 0 || string.IsNullOrWhiteSpace(exchangeCode))
            return false;

        if (!_pendingOrRunning.TryAdd(symbolId, 0))
            return false;

        var job = new HistoricalSyncJob(
            symbolId,
            exchangeCode.Trim().ToUpperInvariant());

        if (_channel.Writer.TryWrite(job))
            return true;

        _pendingOrRunning.TryRemove(symbolId, out _);
        return false;
    }

    // Behandler dequeue.
    public ValueTask<HistoricalSyncJob> DequeueAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAsync(cancellationToken);

    // Behandler complete.
    public void Complete(int symbolId) =>
        _pendingOrRunning.TryRemove(symbolId, out _);

    // Kontrollerer om pending or running.
    public bool IsPendingOrRunning(int symbolId) =>
        _pendingOrRunning.ContainsKey(symbolId);
}
