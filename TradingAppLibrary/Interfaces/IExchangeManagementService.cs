using TradingAppLibrary.DTO;

namespace TradingAppLibrary.Interfaces;

public interface IExchangeManagementService
{
    Task<IEnumerable<ExchangeResponseDto>> GetActiveExchangesAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<ExchangeResponseDto>> GetAllExchangesAsync(CancellationToken cancellationToken = default);
    Task<ExchangeOperationResult> CreateExchangeAsync(CreateExchangeDto dto, CancellationToken cancellationToken = default);
    Task<ExchangeOperationResult> UpdateExchangeAsync(int id, UpdateExchangeDto dto, CancellationToken cancellationToken = default);
    Task<ExchangeOperationResult> DeleteExchangeAsync(int id, CancellationToken cancellationToken = default);
}

public enum ExchangeOperationErrorType
{
    None,
    Validation,
    NotFound,
    Conflict
}

public record ExchangeOperationResult(
    bool Success,
    ExchangeResponseDto? Exchange = null,
    string? Error = null,
    ExchangeOperationErrorType ErrorType = ExchangeOperationErrorType.None);
