using TradingAppLibrary.Models;

namespace TradingAppLibrary.Interfaces;

public interface IExchangeRepository
{
    Task<IEnumerable<Exchange>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<Exchange>> GetActiveAsync(CancellationToken cancellationToken = default);
    Task<Exchange?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<bool> ExistsByCodeAsync(string code, int? excludeExchangeId = null, CancellationToken cancellationToken = default);
    Task<bool> HasSymbolsAsync(int exchangeId, CancellationToken cancellationToken = default);
    Task AddAsync(Exchange exchange, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
    Task DeleteAsync(Exchange exchange, CancellationToken cancellationToken = default);
}
