using TradingAppLibrary.Interfaces;

namespace TradingAppLibrary.Services;

public class ExchangeServiceFactory : IExchangeServiceFactory
{
    private readonly IReadOnlyDictionary<string, IExchangeService> _services;

    public ExchangeServiceFactory(IEnumerable<IExchangeService> services)
    {
        _services = services.ToDictionary(
            s => s.ExchangeCode.Trim().ToUpperInvariant(),
            s => s,
            StringComparer.OrdinalIgnoreCase);
    }

    // Henter exchange.
    public IExchangeService GetExchange(string exchangeCode)
    {
        if (string.IsNullOrWhiteSpace(exchangeCode))
            throw new ArgumentException("Exchange kodu boş olamaz.", nameof(exchangeCode));

        var code = exchangeCode.Trim().ToUpperInvariant();
        return _services.TryGetValue(code, out var service)
            ? service
            : throw new NotSupportedException($"'{exchangeCode}' borsası için bir exchange service tanımlanmamış.");
    }
}
