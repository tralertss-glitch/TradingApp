namespace TradingAppLibrary.Interfaces;

public interface IMarketDataSyncService
{
    Task SyncExchangeSymbolsAsync(string exchangeCode, CancellationToken cancellationToken = default);
    Task SyncHistoricalCandlesAsync(int symbolId, string interval = "1m", CancellationToken cancellationToken = default);
    Task SyncExchangeHistoricalDataAsync(string exchangeCode, string interval = "1m", CancellationToken cancellationToken = default);
    Task StartRealtimeStreamAsync(string exchangeCode, string interval, CancellationToken cancellationToken);
}
