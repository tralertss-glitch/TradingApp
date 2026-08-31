using Microsoft.EntityFrameworkCore;
using TradingAppLibrary.Data;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Repositories;

public class ExchangeRepository : IExchangeRepository
{
    private readonly AppDbContext _context;

    public ExchangeRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Exchange>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _context.Exchanges
            .AsNoTracking()
            .OrderBy(e => e.Name)
            .ToListAsync(cancellationToken);

    public async Task<IEnumerable<Exchange>> GetActiveAsync(CancellationToken cancellationToken = default) =>
        await _context.Exchanges
            .AsNoTracking()
            .Where(e => e.IsActive)
            .OrderBy(e => e.Name)
            .ToListAsync(cancellationToken);

    public async Task<Exchange?> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>
        await _context.Exchanges
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    public async Task<bool> ExistsByCodeAsync(
        string code,
        int? excludeExchangeId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Exchanges.AsQueryable();

        if (excludeExchangeId.HasValue)
            query = query.Where(e => e.Id != excludeExchangeId.Value);

        return await query.AnyAsync(e => e.Code == code, cancellationToken);
    }

    public async Task<bool> HasSymbolsAsync(int exchangeId, CancellationToken cancellationToken = default) =>
        await _context.Symbols.AnyAsync(s => s.ExchangeId == exchangeId, cancellationToken);

    public async Task AddAsync(Exchange exchange, CancellationToken cancellationToken = default)
    {
        await _context.Exchanges.AddAsync(exchange, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _context.SaveChangesAsync(cancellationToken);

    public async Task DeleteAsync(Exchange exchange, CancellationToken cancellationToken = default)
    {
        _context.Exchanges.Remove(exchange);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
