using Microsoft.EntityFrameworkCore;
using TradingAppLibrary.Data;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Repositories;

public class SymbolRepository : ISymbolRepository
{
    private readonly AppDbContext _context;

    public SymbolRepository(AppDbContext context) => _context = context;

    // Henter all.
    public async Task<IEnumerable<Symbol>> GetAllAsync() =>
        await _context.Symbols.AsNoTracking().Include(s => s.Exchange)
            .OrderBy(s => s.Exchange.Code).ThenBy(s => s.Name).ToListAsync();

    // Henter all active symbols.
    public async Task<IEnumerable<Symbol>> GetAllActiveSymbolsAsync() =>
        await _context.Symbols.AsNoTracking().Include(s => s.Exchange)
            .Where(s => s.IsActive && s.Exchange.IsActive)
            .OrderBy(s => s.Exchange.Code).ThenBy(s => s.Name).ToListAsync();

    // Henter all active symbols.
    public async Task<IEnumerable<Symbol>> GetAllActiveSymbolsAsync(int exchangeId) =>
        await _context.Symbols.AsNoTracking().Include(s => s.Exchange)
            .Where(s => s.ExchangeId == exchangeId && s.IsActive && s.Exchange.IsActive)
            .OrderBy(s => s.Name).ToListAsync();

    // Henter symbols by exchange.
    public async Task<IEnumerable<Symbol>> GetSymbolsByExchangeAsync(int exchangeId) =>
        await _context.Symbols.Include(s => s.Exchange)
            .Where(s => s.ExchangeId == exchangeId).OrderBy(s => s.Name).ToListAsync();

    // Søger efter den relevante operation.
    public async Task<IEnumerable<Symbol>> SearchAsync(string query)
    {
        var search = query.Trim().ToUpperInvariant();
        return await _context.Symbols.AsNoTracking().Include(s => s.Exchange)
            .Where(s => s.Name.ToUpper().Contains(search) || s.BaseAsset.ToUpper().Contains(search) || s.QuoteAsset.ToUpper().Contains(search))
            .OrderBy(s => s.Name).ToListAsync();
    }

    // Søger efter den relevante operation.
    public async Task<IEnumerable<Symbol>> SearchAsync(int exchangeId, string query)
    {
        var search = query.Trim().ToUpperInvariant();
        return await _context.Symbols.AsNoTracking().Include(s => s.Exchange)
            .Where(s => s.ExchangeId == exchangeId &&
                (s.Name.ToUpper().Contains(search) || s.BaseAsset.ToUpper().Contains(search) || s.QuoteAsset.ToUpper().Contains(search)))
            .OrderBy(s => s.Name).ToListAsync();
    }

    // Henter by id.
    public async Task<Symbol?> GetByIdAsync(int id) =>
        await _context.Symbols.Include(s => s.Exchange).FirstOrDefaultAsync(s => s.Id == id);

    // Henter by name.
    public async Task<Symbol?> GetByNameAsync(int exchangeId, string name)
    {
        var formatted = name.Trim().ToUpperInvariant();
        return await _context.Symbols.Include(s => s.Exchange)
            .FirstOrDefaultAsync(s => s.ExchangeId == exchangeId && s.Name.ToUpper() == formatted);
    }

    // Tilføjer den relevante operation.
    public async Task AddAsync(Symbol symbol)
    {
        Normalize(symbol);
        await _context.Symbols.AddAsync(symbol);
        await _context.SaveChangesAsync();
    }

    // Tilføjer range.
    public async Task AddRangeAsync(IEnumerable<Symbol> symbols)
    {
        var list = symbols.ToList();
        foreach (var symbol in list) Normalize(symbol);
        await _context.Symbols.AddRangeAsync(list);
        await _context.SaveChangesAsync();
    }

    // Gemmer changes.
    public Task SaveChangesAsync() => _context.SaveChangesAsync();

    // Normaliserer den relevante operation.
    private static void Normalize(Symbol symbol)
    {
        symbol.Name = symbol.Name.Trim().ToUpperInvariant();
        symbol.BaseAsset = symbol.BaseAsset.Trim().ToUpperInvariant();
        symbol.QuoteAsset = symbol.QuoteAsset.Trim().ToUpperInvariant();
    }
}
