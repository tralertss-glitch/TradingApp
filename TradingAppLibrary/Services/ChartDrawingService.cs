using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TradingAppLibrary.Data;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Services;

public class ChartDrawingService : IChartDrawingService
{
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "trendLine", "horizontalLine", "rectangle", "fibonacci", "text"
    };

    private readonly AppDbContext _dbContext;

    public ChartDrawingService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // Henter den relevante operation.
    public async Task<IReadOnlyList<ChartDrawingResponseDto>> GetAsync(
        int userId,
        int symbolId,
        string interval,
        CancellationToken cancellationToken = default)
    {
        var normalizedInterval = NormalizeInterval(interval);

        var drawings = await _dbContext.ChartDrawings
            .AsNoTracking()
            .Include(d => d.Symbol)
                .ThenInclude(s => s.Exchange)
            .Where(d => d.UserId == userId && d.SymbolId == symbolId && d.Interval == normalizedInterval)
            .OrderBy(d => d.Id)
            .ToListAsync(cancellationToken);

        return drawings.Select(ToResponseDto).ToList();
    }

    // Opretter den relevante operation.
    public async Task<ChartDrawingResponseDto> CreateAsync(
        int userId,
        CreateChartDrawingDto dto,
        CancellationToken cancellationToken = default)
    {
        if (dto.SymbolId <= 0)
            throw new ArgumentException("Geçerli bir SymbolId zorunludur.");

        var interval = NormalizeInterval(dto.Interval);
        var drawingType = NormalizeDrawingType(dto.DrawingType);
        ValidateJson(dto.Data);

        var symbol = await _dbContext.Symbols
            .Include(s => s.Exchange)
            .FirstOrDefaultAsync(s => s.Id == dto.SymbolId, cancellationToken)
            ?? throw new InvalidOperationException("Sembol bulunamadı.");

        var entity = new ChartDrawing
        {
            UserId = userId,
            SymbolId = dto.SymbolId,
            Interval = interval,
            DrawingType = drawingType,
            DataJson = dto.Data.GetRawText(),
            IsVisible = dto.IsVisible,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Symbol = symbol
        };

        _dbContext.ChartDrawings.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToResponseDto(entity);
    }

    // Opdaterer den relevante operation.
    public async Task<ChartDrawingResponseDto?> UpdateAsync(
        int userId,
        long drawingId,
        UpdateChartDrawingDto dto,
        CancellationToken cancellationToken = default)
    {
        ValidateJson(dto.Data);

        var entity = await _dbContext.ChartDrawings
            .Include(d => d.Symbol)
                .ThenInclude(s => s.Exchange)
            .FirstOrDefaultAsync(d => d.Id == drawingId && d.UserId == userId, cancellationToken);

        if (entity == null) return null;

        entity.DataJson = dto.Data.GetRawText();
        entity.IsVisible = dto.IsVisible;
        entity.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToResponseDto(entity);
    }

    // Sletter den relevante operation.
    public async Task<bool> DeleteAsync(
        int userId,
        long drawingId,
        CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.ChartDrawings
            .FirstOrDefaultAsync(d => d.Id == drawingId && d.UserId == userId, cancellationToken);

        if (entity == null) return false;

        _dbContext.ChartDrawings.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    // Sletter all.
    public async Task<int> DeleteAllAsync(
        int userId,
        int symbolId,
        string interval,
        CancellationToken cancellationToken = default)
    {
        var normalizedInterval = NormalizeInterval(interval);

        return await _dbContext.ChartDrawings
            .Where(d => d.UserId == userId && d.SymbolId == symbolId && d.Interval == normalizedInterval)
            .ExecuteDeleteAsync(cancellationToken);
    }

    // Normaliserer interval.
    private static string NormalizeInterval(string interval)
    {
        if (string.IsNullOrWhiteSpace(interval))
            throw new ArgumentException("Interval zorunludur.");

        var normalized = interval.Trim().ToLowerInvariant();
        if (normalized.Length > 10)
            throw new ArgumentException("Interval geçersiz.");

        return normalized;
    }

    // Normaliserer drawing type.
    private static string NormalizeDrawingType(string drawingType)
    {
        if (string.IsNullOrWhiteSpace(drawingType) || !AllowedTypes.Contains(drawingType.Trim()))
            throw new ArgumentException("Desteklenmeyen çizim tipi.");

        return AllowedTypes.First(x => x.Equals(drawingType.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    // Validerer json.
    private static void ValidateJson(JsonElement data)
    {
        if (data.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            throw new ArgumentException("Çizim verisi zorunludur.");

        if (data.GetRawText().Length > 32_000)
            throw new ArgumentException("Çizim verisi çok büyük.");
    }

    // Behandler to response dto.
    private static ChartDrawingResponseDto ToResponseDto(ChartDrawing drawing)
    {
        using var document = JsonDocument.Parse(drawing.DataJson);
        var data = document.RootElement.Clone();

        return new ChartDrawingResponseDto(
            drawing.Id,
            drawing.SymbolId,
            drawing.Symbol.Exchange?.Code ?? string.Empty,
            drawing.Symbol.Name,
            drawing.Interval,
            drawing.DrawingType,
            data,
            drawing.IsVisible,
            drawing.CreatedAt,
            drawing.UpdatedAt);
    }
}
