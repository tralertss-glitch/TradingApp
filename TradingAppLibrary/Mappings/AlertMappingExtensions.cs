using TradingAppLibrary.DTO;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Mappings;

public static class AlertMappingExtensions
{
    // Behandler to response dto.
    public static AlertResponseDto ToResponseDto(this Alert alert) => new()
    {
        Id = alert.Id,
        UserId = alert.UserId,
        SymbolId = alert.SymbolId,
        Symbol = alert.Symbol?.Name ?? string.Empty,
        Exchange = alert.Symbol?.Exchange?.Code ?? string.Empty,
        TargetPrice = alert.TargetPrice,
        Condition = alert.Condition,
        IsTriggered = alert.IsTriggered,
        IsActive = alert.IsActive,
        Note = alert.Note,
        CreatedAt = alert.CreatedAt
    };

    // Behandler to response dtos.
    public static List<AlertResponseDto> ToResponseDtos(this IEnumerable<Alert> alerts) =>
        alerts?.Select(alert => alert.ToResponseDto()).ToList() ?? new List<AlertResponseDto>();

    // Behandler to entity.
    public static Alert ToEntity(this CreateAlertDto dto, string userId, int symbolId, string condition) => new()
    {
        Id = Guid.NewGuid().ToString(),
        UserId = userId,
        SymbolId = symbolId,
        TargetPrice = dto.TargetPrice,
        Condition = condition,
        Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
        IsActive = true,
        IsTriggered = false,
        CreatedAt = DateTime.UtcNow
    };
}
