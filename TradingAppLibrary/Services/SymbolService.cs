using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;
using TradingAppLibrary.Mappings;

namespace TradingAppLibrary.Services;

public class SymbolService : ISymbolService
{
    private readonly ISymbolRepository _symbolRepository;
    private readonly IHistoricalSyncQueue _historicalSyncQueue;
    private readonly IMarketDataStreamControl _streamControl;

    public SymbolService(
        ISymbolRepository symbolRepository,
        IHistoricalSyncQueue historicalSyncQueue,
        IMarketDataStreamControl streamControl)
    {
        _symbolRepository = symbolRepository;
        _historicalSyncQueue = historicalSyncQueue;
        _streamControl = streamControl;
    }

    // Henter all symbols.
    public async Task<IEnumerable<SymbolResponseDto>> GetAllSymbolsAsync() =>
        (await _symbolRepository.GetAllAsync()).ToResponseDtos();

    // Henter symbols by exchange.
    public async Task<IEnumerable<SymbolResponseDto>> GetSymbolsByExchangeAsync(int exchangeId)
    {
        if (exchangeId <= 0) return Enumerable.Empty<SymbolResponseDto>();
        return (await _symbolRepository.GetSymbolsByExchangeAsync(exchangeId)).ToResponseDtos();
    }

    // Søger efter symbols.
    public async Task<IEnumerable<SymbolResponseDto>> SearchSymbolsAsync(string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return await GetAllSymbolsAsync();
        return (await _symbolRepository.SearchAsync(query.Trim())).ToResponseDtos();
    }

    // Søger efter symbols.
    public async Task<IEnumerable<SymbolResponseDto>> SearchSymbolsAsync(int exchangeId, string query)
    {
        if (exchangeId <= 0) return Enumerable.Empty<SymbolResponseDto>();
        if (string.IsNullOrWhiteSpace(query)) return await GetSymbolsByExchangeAsync(exchangeId);
        return (await _symbolRepository.SearchAsync(exchangeId, query.Trim())).ToResponseDtos();
    }

    // Henter symbol by id.
    public async Task<SymbolResponseDto?> GetSymbolByIdAsync(int symbolId)
    {
        if (symbolId <= 0) return null;
        var symbol = await _symbolRepository.GetByIdAsync(symbolId);
        return symbol?.ToResponseDto();
    }

    // Henter active symbols.
    public async Task<List<SymbolResponseDto>> GetActiveSymbolsAsync(int exchangeId)
    {
        if (exchangeId <= 0) return new();
        return (await _symbolRepository.GetAllActiveSymbolsAsync(exchangeId)).ToResponseDtos().ToList();
    }

    // Opdaterer symbol status.
    public async Task<SymbolStatusUpdateResultDto?> UpdateSymbolStatusAsync(
        int symbolId,
        bool isActive)
    {
        if (symbolId <= 0)
            return null;

        var symbol = await _symbolRepository.GetByIdAsync(symbolId);
        if (symbol == null)
            return null;

        var exchangeCode = symbol.Exchange.Code.Trim().ToUpperInvariant();
        var changed = symbol.IsActive != isActive;
        var historicalSyncQueued = false;
        var realtimeRestartRequested = false;

        if (changed)
        {
            symbol.IsActive = isActive;
            await _symbolRepository.SaveChangesAsync();

            if (isActive)
            {
                // Aktivering sker bevidst i to faser:
                // 1) udfyld historiske 1m-data i baggrunden,
                // 2) genstart WebSocket efter backfill, så symbolet tilsluttes realtime.
                historicalSyncQueued = _historicalSyncQueue.TryEnqueue(
                    symbol.Id,
                    exchangeCode);
            }
            else
            {
                // Fjern straks et deaktiveret symbol fra det aktuelle WebSocket-abonnement.
                _streamControl.RequestRestart(exchangeCode);
                realtimeRestartRequested = true;
            }
        }
        else if (isActive && _historicalSyncQueue.IsPendingOrRunning(symbol.Id))
        {
            historicalSyncQueued = true;
        }

        return new SymbolStatusUpdateResultDto(
            symbol.Id,
            exchangeCode,
            symbol.Name,
            symbol.IsActive,
            historicalSyncQueued,
            realtimeRestartRequested);
    }
}
