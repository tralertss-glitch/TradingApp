using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Mappings;

namespace TradingAppLibrary.Services;

public class CandleService : ICandleService
{
    private readonly ICandleRepository _candleRepository;
    private readonly ISymbolRepository _symbolRepository;

    public CandleService(ICandleRepository candleRepository, ISymbolRepository symbolRepository)
    {
        _candleRepository = candleRepository;
        _symbolRepository = symbolRepository;
    }

    // Henter candles for det valgte symbol og interval.
    public async Task<IEnumerable<CandleResponseDto>> GetCandlesAsync(
        int symbolId,
        string interval,
        int limit = 1000,
        long? endTime = null)
    {
        if (symbolId <= 0 || string.IsNullOrWhiteSpace(interval))
            return Enumerable.Empty<CandleResponseDto>();

        if (limit <= 0) limit = 1000;

        var symbol = await _symbolRepository.GetByIdAsync(symbolId);
        if (symbol == null) return Enumerable.Empty<CandleResponseDto>();

        var candles = await _candleRepository.GetCandlesAsync(symbolId, interval, limit, endTime);
        var normalizedInterval = interval.Trim().ToLowerInvariant();

        return candles
            .OrderBy(candle => candle.OpenTime)
            .Select(candle => candle.ToResponseDto(symbol, normalizedInterval))
            .ToList();
    }

    // Henter user alerts.
    public async Task<List<AlertResponseDto>> GetUserAlertsAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new();
        return (await _candleRepository.GetAlertsByUserIdAsync(userId)).ToResponseDtos();
    }

    // Henter active alerts by symbol.
    public async Task<List<AlertResponseDto>> GetActiveAlertsBySymbolAsync(int symbolId)
    {
        if (symbolId <= 0) return new();
        return (await _candleRepository.GetActiveAlertsBySymbolAsync(symbolId)).ToResponseDtos();
    }

    // Henter alert by id.
    public async Task<AlertResponseDto?> GetAlertByIdAsync(string alertId, string userId)
    {
        if (string.IsNullOrWhiteSpace(alertId) || string.IsNullOrWhiteSpace(userId)) return null;

        var alert = await _candleRepository.GetAlertByIdAsync(alertId);
        return alert == null || alert.UserId != userId
            ? null
            : alert.ToResponseDto();
    }

    // Opretter alert.
    public async Task<AlertResponseDto> CreateAlertAsync(string userId, CreateAlertDto dto)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("Kullanıcı ID boş olamaz.", nameof(userId));
        if (dto.SymbolId <= 0)
            throw new ArgumentException("Geçerli bir SymbolId gereklidir.", nameof(dto.SymbolId));
        if (dto.TargetPrice <= 0)
            throw new ArgumentException("Hedef fiyat 0'dan büyük olmalıdır.", nameof(dto.TargetPrice));

        var symbol = await _symbolRepository.GetByIdAsync(dto.SymbolId)
            ?? throw new ArgumentException("Belirtilen symbol bulunamadı.", nameof(dto.SymbolId));

        var condition = string.Equals(dto.Condition, "CROSSES_DOWN", StringComparison.OrdinalIgnoreCase)
            ? "CROSSES_DOWN"
            : "CROSSES_UP";

        var alert = dto.ToEntity(userId, symbol.Id, condition);
        var created = await _candleRepository.CreateAlertAsync(alert);
        created.Symbol = symbol;

        return created.ToResponseDto();
    }

    // Sletter alert.
    public Task<bool> DeleteAlertAsync(string alertId, string userId) =>
        string.IsNullOrWhiteSpace(alertId) || string.IsNullOrWhiteSpace(userId)
            ? Task.FromResult(false)
            : _candleRepository.DeleteAlertAsync(alertId, userId);

    // Skifter status for alert.
    public async Task<bool> ToggleAlertAsync(string alertId, string userId)
    {
        if (string.IsNullOrWhiteSpace(alertId) || string.IsNullOrWhiteSpace(userId)) return false;

        var alert = await _candleRepository.GetAlertByIdAsync(alertId);
        if (alert == null || alert.UserId != userId) return false;

        alert.IsActive = !alert.IsActive;
        if (alert.IsActive) alert.IsTriggered = false;

        await _candleRepository.UpdateAlertAsync(alert);
        return true;
    }

    // Kontrollerer and trigger alerts.
    public async Task<List<AlertResponseDto>> CheckAndTriggerAlertsAsync(int symbolId, decimal currentPrice)
    {
        if (symbolId <= 0 || currentPrice <= 0) return new();

        var activeAlerts = await _candleRepository.GetActiveAlertsBySymbolAsync(symbolId);
        var triggeredAlerts = new List<AlertResponseDto>();

        foreach (var alert in activeAlerts)
        {
            var isTriggered = alert.Condition switch
            {
                "CROSSES_UP" => currentPrice >= alert.TargetPrice,
                "CROSSES_DOWN" => currentPrice <= alert.TargetPrice,
                _ => false
            };

            if (!isTriggered) continue;

            alert.IsTriggered = true;
            alert.IsActive = false;
            await _candleRepository.UpdateAlertAsync(alert);
            triggeredAlerts.Add(alert.ToResponseDto());
        }

        return triggeredAlerts;
    }
}
