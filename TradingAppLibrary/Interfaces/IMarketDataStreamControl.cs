namespace TradingAppLibrary.Interfaces;

public interface IMarketDataStreamControl
{
    void Register(string exchangeCode, CancellationTokenSource streamCancellation);
    void Unregister(string exchangeCode, CancellationTokenSource streamCancellation);
    void RequestRestart(string exchangeCode);
}
