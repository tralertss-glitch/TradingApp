using System;
using System.Collections.Generic;
using System.Text;
using TradingAppLibrary.DTO;

namespace TradingAppLibrary.Interfaces
{
    public interface IAiAnalysisService
    {
        Task<AiAnalysisResponseDto> AnalyzeMarketAsync(AiAnalysisRequestDto request);
    }
}
