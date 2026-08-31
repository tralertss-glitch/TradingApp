namespace TradingAppLibrary.Interfaces;

public interface IExchangeServiceFactory
{
    IExchangeService GetExchange(string exchangeCode);
}
