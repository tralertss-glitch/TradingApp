using TradingAppLibrary.DTO;

namespace TradingAppLibrary.Interfaces;

public interface IExchangeService
{
    string ExchangeCode { get; }
    DateTime HistoricalDataStartUtc { get; }

    Task<IReadOnlyList<ExchangeSymbolDto>> GetSymbolsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> GetTopPopularSymbolsAsync(int topCount = 50, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ExchangeCandleDto>> GetHistoricalCandlesAsync(
        string symbol,
        string interval,
        int limit = 500,
        long? startTime = null,
        CancellationToken cancellationToken = default);

    Task StreamRealTimeCandlesAsync(
        IReadOnlyCollection<string> symbols,
        string interval,
        Func<ExchangeCandleDto, Task> onCandleReceived,
        CancellationToken cancellationToken);
}
