using TradingAppLibrary.DTO;

namespace TradingAppLibrary.Interfaces;

public interface ISymbolService
{
    Task<IEnumerable<SymbolResponseDto>> GetAllSymbolsAsync();
    Task<IEnumerable<SymbolResponseDto>> GetSymbolsByExchangeAsync(int exchangeId);
    Task<IEnumerable<SymbolResponseDto>> SearchSymbolsAsync(string query);
    Task<IEnumerable<SymbolResponseDto>> SearchSymbolsAsync(int exchangeId, string query);
    Task<SymbolResponseDto?> GetSymbolByIdAsync(int symbolId);
    Task<List<SymbolResponseDto>> GetActiveSymbolsAsync(int exchangeId);
    Task<SymbolStatusUpdateResultDto?> UpdateSymbolStatusAsync(int symbolId, bool isActive);
}
