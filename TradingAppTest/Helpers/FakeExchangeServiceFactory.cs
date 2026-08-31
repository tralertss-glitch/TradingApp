using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingAppTest.Helpers;

internal sealed class FakeExchangeServiceFactory : IExchangeServiceFactory
{
    private readonly HashSet<string> _supported;

    public FakeExchangeServiceFactory(params string[] supported)
    {
        _supported = supported.Select(x => x.Trim().ToUpperInvariant()).ToHashSet();
    }

    // Henter exchange.
    public IExchangeService GetExchange(string exchangeCode)
    {
        var code = exchangeCode.Trim().ToUpperInvariant();
        if (!_supported.Contains(code))
            throw new NotSupportedException(code);

        return new FakeExchangeService(code);
    }

    private sealed class FakeExchangeService : IExchangeService
    {
        public FakeExchangeService(string code) => ExchangeCode = code;

        public string ExchangeCode { get; }
        public DateTime HistoricalDataStartUtc => new(2017, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        // Henter symbols.
        public Task<IReadOnlyList<ExchangeSymbolDto>> GetSymbolsAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ExchangeSymbolDto>>(Array.Empty<ExchangeSymbolDto>());

        // Henter top popular symbols.
        public Task<IReadOnlyList<string>> GetTopPopularSymbolsAsync(int topCount = 50, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<string>>(Array.Empty<string>());

        // Henter historical candles.
        public Task<IReadOnlyList<ExchangeCandleDto>> GetHistoricalCandlesAsync(
            string symbol, string interval, int limit = 500, long? startTime = null,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ExchangeCandleDto>>(Array.Empty<ExchangeCandleDto>());

        // Behandler stream real time candles.
        public Task StreamRealTimeCandlesAsync(
            IReadOnlyCollection<string> symbols,
            string interval,
            Func<ExchangeCandleDto, Task> onCandleReceived,
            CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
