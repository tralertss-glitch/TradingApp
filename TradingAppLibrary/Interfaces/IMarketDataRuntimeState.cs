using TradingAppLibrary.Runtime;

namespace TradingAppLibrary.Interfaces;

public interface IMarketDataRuntimeState
{
    DateTime StartedAtUtc { get; }

    void SetHistoricalSyncRunning(string exchangeCode, bool running);
    void SetRealtimeConnected(string exchangeCode, bool connected);
    void TouchRealtimeMessage(string exchangeCode);
    void RecordValidationError(string exchangeCode, long count = 1);
    void RecordValidationWarning(string exchangeCode, long count = 1);
    void RecordError(string exchangeCode, string error);
    void ClearError(string exchangeCode);

    MarketDataRuntimeSnapshot GetSnapshot();
}
