using Microsoft.EntityFrameworkCore;
using TradingAppLibrary.Data;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Repositories;

public class ChartDrawingRepository : IChartDrawingRepository
{
    private readonly AppDbContext _dbContext;

    public ChartDrawingRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ChartDrawing>> GetAsync(
        int userId,
        int symbolId,
        string interval,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.ChartDrawings
            .AsNoTracking()
            .Include(d => d.Symbol)
                .ThenInclude(s => s.Exchange)
            .Where(d => d.UserId == userId && d.SymbolId == symbolId && d.Interval == interval)
            .OrderBy(d => d.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<ChartDrawing?> GetByIdForUserAsync(
        int userId,
        long drawingId,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.ChartDrawings
            .Include(d => d.Symbol)
                .ThenInclude(s => s.Exchange)
            .FirstOrDefaultAsync(d => d.Id == drawingId && d.UserId == userId, cancellationToken);
    }

    public Task<Symbol?> GetSymbolAsync(int symbolId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Symbols
            .Include(s => s.Exchange)
            .FirstOrDefaultAsync(s => s.Id == symbolId, cancellationToken);
    }

    public async Task AddAsync(ChartDrawing drawing, CancellationToken cancellationToken = default)
    {
        _dbContext.ChartDrawings.Add(drawing);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);

    public async Task DeleteAsync(ChartDrawing drawing, CancellationToken cancellationToken = default)
    {
        _dbContext.ChartDrawings.Remove(drawing);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<int> DeleteAllAsync(
        int userId,
        int symbolId,
        string interval,
        CancellationToken cancellationToken = default)
    {
        return _dbContext.ChartDrawings
            .Where(d => d.UserId == userId && d.SymbolId == symbolId && d.Interval == interval)
            .ExecuteDeleteAsync(cancellationToken);
    }
}
