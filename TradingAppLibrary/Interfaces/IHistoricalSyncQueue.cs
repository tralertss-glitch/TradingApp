namespace TradingAppLibrary.Interfaces;

public interface IHistoricalSyncQueue
{
    bool TryEnqueue(int symbolId, string exchangeCode);
    ValueTask<HistoricalSyncJob> DequeueAsync(CancellationToken cancellationToken);
    void Complete(int symbolId);
    bool IsPendingOrRunning(int symbolId);
}

// Behandler historical sync job.
public sealed record HistoricalSyncJob(int SymbolId, string ExchangeCode);
