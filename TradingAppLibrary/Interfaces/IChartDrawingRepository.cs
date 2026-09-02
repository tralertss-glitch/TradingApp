using TradingAppLibrary.Models;

namespace TradingAppLibrary.Interfaces;

public interface IChartDrawingRepository
{
    Task<IReadOnlyList<ChartDrawing>> GetAsync(int userId, int symbolId, string interval, CancellationToken cancellationToken = default);
    Task<ChartDrawing?> GetByIdForUserAsync(int userId, long drawingId, CancellationToken cancellationToken = default);
    Task<Symbol?> GetSymbolAsync(int symbolId, CancellationToken cancellationToken = default);
    Task AddAsync(ChartDrawing drawing, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
    Task DeleteAsync(ChartDrawing drawing, CancellationToken cancellationToken = default);
    Task<int> DeleteAllAsync(int userId, int symbolId, string interval, CancellationToken cancellationToken = default);
}
