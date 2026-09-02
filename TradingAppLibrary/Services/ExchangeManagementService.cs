using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Models;

namespace TradingAppLibrary.Services;

public class ExchangeManagementService : IExchangeManagementService
{
    private readonly IExchangeRepository _exchangeRepository;
    private readonly IExchangeServiceFactory _exchangeServiceFactory;

    public ExchangeManagementService(IExchangeRepository exchangeRepository, IExchangeServiceFactory exchangeServiceFactory)
    {
        _exchangeRepository = exchangeRepository;
        _exchangeServiceFactory = exchangeServiceFactory;
    }

    public async Task<IEnumerable<ExchangeResponseDto>> GetActiveExchangesAsync(CancellationToken cancellationToken = default)
    {
        var exchanges = await _exchangeRepository.GetActiveAsync(cancellationToken);
        return exchanges.Select(ToDto);
    }

    public async Task<IEnumerable<ExchangeResponseDto>> GetAllExchangesAsync(CancellationToken cancellationToken = default)
    {
        var exchanges = await _exchangeRepository.GetAllAsync(cancellationToken);
        return exchanges.Select(ToDto);
    }

    public async Task<ExchangeOperationResult> CreateExchangeAsync(CreateExchangeDto dto, CancellationToken cancellationToken = default)
    {
        var code = NormalizeCode(dto.Code);
        var name = dto.Name?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
            return Validation("Exchange code and name are required.");

        if (code.Length > 20 || name.Length > 50)
            return Validation("Exchange code or name is too long.");

        if (!HasIntegration(code, out var integrationError))
            return Validation(integrationError!);

        if (await _exchangeRepository.ExistsByCodeAsync(code, cancellationToken: cancellationToken))
            return Conflict($"Exchange code '{code}' already exists.");

        var exchange = new Exchange
        {
            Code = code,
            Name = name,
            IsActive = dto.IsActive
        };
        await _exchangeRepository.AddAsync(exchange, cancellationToken);
        return Success(exchange);
    }

    public async Task<ExchangeOperationResult> UpdateExchangeAsync(int id, UpdateExchangeDto dto, CancellationToken cancellationToken = default)
    {
        var exchange = await _exchangeRepository.GetByIdAsync(id, cancellationToken);

        if (exchange == null)
            return NotFound("Exchange not found.");

        var code = NormalizeCode(dto.Code);
        var name = dto.Name?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
            return Validation("Exchange code and name are required.");

        if (code.Length > 20 || name.Length > 50)
            return Validation("Exchange code or name is too long.");

        if (!HasIntegration(code, out var integrationError))
            return Validation(integrationError!);

        if (!exchange.Code.Equals(code, StringComparison.OrdinalIgnoreCase))
        {
            if (await _exchangeRepository.HasSymbolsAsync(exchange.Id, cancellationToken))
            {
                return Conflict(
                    "Exchange code cannot be changed after symbols have been synchronized. Create a new exchange instead.");
            }

            if (await _exchangeRepository.ExistsByCodeAsync(code, exchange.Id, cancellationToken))
                return Conflict($"Exchange code '{code}' already exists.");

            exchange.Code = code;
        }

        exchange.Name = name;
        exchange.IsActive = dto.IsActive;
        await _exchangeRepository.SaveChangesAsync(cancellationToken);
        return Success(exchange);
    }

    public async Task<ExchangeOperationResult> DeleteExchangeAsync(int id, CancellationToken cancellationToken = default)
    {
        var exchange = await _exchangeRepository.GetByIdAsync(id, cancellationToken);

        if (exchange == null)
            return NotFound("Exchange not found.");

        if (await _exchangeRepository.HasSymbolsAsync(exchange.Id, cancellationToken))
        {
            return Conflict(
                "This exchange already has symbols/history and cannot be deleted safely. Set it inactive instead.");
        }
        await _exchangeRepository.DeleteAsync(exchange, cancellationToken);
        return new ExchangeOperationResult(true);
    }

    private bool HasIntegration(string code, out string? error)
    {
        try
        {
            _exchangeServiceFactory.GetExchange(code);
            error = null;
            return true;
        }
        catch (NotSupportedException)
        {
            error = $"No backend market-data adapter is registered for '{code}'.";
            return false;
        }
    }

    private static string NormalizeCode(string? code) =>
        (code ?? string.Empty).Trim().ToUpperInvariant();

    private static ExchangeResponseDto ToDto(Exchange exchange) =>
        new(exchange.Id, exchange.Code, exchange.Name, exchange.IsActive);

    private static ExchangeOperationResult Success(Exchange exchange) =>
        new(true, ToDto(exchange));

    private static ExchangeOperationResult Validation(string message) =>
        new(false, Error: message, ErrorType: ExchangeOperationErrorType.Validation);

    private static ExchangeOperationResult NotFound(string message) =>
        new(false, Error: message, ErrorType: ExchangeOperationErrorType.NotFound);

    private static ExchangeOperationResult Conflict(string message) =>
        new(false, Error: message, ErrorType: ExchangeOperationErrorType.Conflict);
}
