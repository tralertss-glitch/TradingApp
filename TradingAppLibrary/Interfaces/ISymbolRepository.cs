using TradingAppLibrary.Models;

namespace TradingAppLibrary.Interfaces;

public interface ISymbolRepository
{
    Task<IEnumerable<Symbol>> GetAllAsync();
    Task<IEnumerable<Symbol>> GetAllActiveSymbolsAsync();
    Task<IEnumerable<Symbol>> GetAllActiveSymbolsAsync(int exchangeId);
    Task<IEnumerable<Symbol>> GetSymbolsByExchangeAsync(int exchangeId);
    Task<IEnumerable<Symbol>> SearchAsync(string query);
    Task<IEnumerable<Symbol>> SearchAsync(int exchangeId, string query);
    Task<Symbol?> GetByIdAsync(int id);
    Task<Symbol?> GetByNameAsync(int exchangeId, string name);
    Task AddAsync(Symbol symbol);
    Task AddRangeAsync(IEnumerable<Symbol> symbols);
    Task SaveChangesAsync();
}
