using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AiAnalysisController : ControllerBase
    {
        private readonly IAiAnalysisService _aiAnalysisService;

        public AiAnalysisController(IAiAnalysisService aiAnalysisService)
        {
            _aiAnalysisService = aiAnalysisService;
        }

        /// <summary>
        /// Opretter et AI-baseret teknisk analyseresumé ud fra det valgte symbol og interval.
        /// POST: api/aianalysis/analyze
        /// </summary>
        [HttpPost("analyze")]
        public async Task<ActionResult<AiAnalysisResponseDto>> AnalyzeMarket([FromBody] AiAnalysisRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _aiAnalysisService.AnalyzeMarketAsync(request);
            return Ok(result);
        }
    }
}
