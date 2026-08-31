using TradingAppLibrary.DTO;

namespace TradingAppLibrary.Interfaces;

public interface IChartDrawingService
{
    Task<IReadOnlyList<ChartDrawingResponseDto>> GetAsync(int userId, int symbolId, string interval, CancellationToken cancellationToken = default);
    Task<ChartDrawingResponseDto> CreateAsync(int userId, CreateChartDrawingDto dto, CancellationToken cancellationToken = default);
    Task<ChartDrawingResponseDto?> UpdateAsync(int userId, long drawingId, UpdateChartDrawingDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int userId, long drawingId, CancellationToken cancellationToken = default);
    Task<int> DeleteAllAsync(int userId, int symbolId, string interval, CancellationToken cancellationToken = default);
}
