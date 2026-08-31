using Microsoft.Extensions.Configuration;
using System.Globalization;
using System.Text;
using System.Text.Json;
using TradingAppLibrary.DTO;
using TradingAppLibrary.Interfaces;

namespace TradingAppLibrary.Services;

public class AiAnalysisService : IAiAnalysisService
{
    private readonly ICandleRepository _candleRepository;
    private readonly ISymbolRepository _symbolRepository;
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public AiAnalysisService(
        ICandleRepository candleRepository,
        ISymbolRepository symbolRepository,
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _candleRepository = candleRepository;
        _symbolRepository = symbolRepository;
        _httpClient = httpClient;
        _apiKey = configuration["Groq:ApiKey"] ?? throw new ArgumentNullException("Groq:ApiKey configuration is missing.");
    }

    // Behandler analyze market.
    public async Task<AiAnalysisResponseDto> AnalyzeMarketAsync(AiAnalysisRequestDto request)
    {
        var language = NormalizeLanguage(request.Language);
        var symbol = await _symbolRepository.GetByIdAsync(request.SymbolId);

        if (symbol == null)
        {
            return new AiAnalysisResponseDto(
                request.SymbolId,
                string.Empty,
                string.Empty,
                Localize(language,
                    tr: "Sembol bulunamadı.",
                    en: "Symbol could not be found.",
                    da: "Symbolet blev ikke fundet."),
                DateTime.UtcNow);
        }

        var candles = (await _candleRepository
            .GetCandlesAsync(request.SymbolId, request.Interval, 50))
            .ToList();

        if (candles.Count == 0)
        {
            return new AiAnalysisResponseDto(
                symbol.Id,
                symbol.Name,
                symbol.Exchange.Code,
                Localize(language,
                    tr: $"{symbol.Exchange.Code}/{symbol.Name} için analiz edilecek yeterli mum verisi bulunamadı.",
                    en: $"There is not enough candle data to analyze {symbol.Exchange.Code}/{symbol.Name}.",
                    da: $"Der er ikke nok candle-data til at analysere {symbol.Exchange.Code}/{symbol.Name}."),
                DateTime.UtcNow);
        }

        var candleData = string.Join("\n", candles.TakeLast(20).Select(c =>
            $"Time: {c.OpenTime:yyyy-MM-dd HH:mm} | Open: {c.Open.ToString(CultureInfo.InvariantCulture)} | High: {c.High.ToString(CultureInfo.InvariantCulture)} | Low: {c.Low.ToString(CultureInfo.InvariantCulture)} | Close: {c.Close.ToString(CultureInfo.InvariantCulture)} | Volume: {c.Volume.ToString(CultureInfo.InvariantCulture)}"));

        var (systemPrompt, userPrompt) = BuildPrompt(
            language,
            symbol.Exchange.Code,
            symbol.Name,
            request.Interval,
            candleData);

        var requestBody = new
        {
            model = "llama-3.3-70b-versatile",
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            temperature = 0.2
        };

        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            "https://api.groq.com/openai/v1/chat/completions");

        httpRequest.Headers.Add("Authorization", $"Bearer {_apiKey}");
        httpRequest.Content = new StringContent(
            JsonSerializer.Serialize(requestBody),
            Encoding.UTF8,
            "application/json");

        try
        {
            var response = await _httpClient.SendAsync(httpRequest);
            var jsonResponse = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new AiAnalysisResponseDto(
                    symbol.Id,
                    symbol.Name,
                    symbol.Exchange.Code,
                    Localize(language,
                        tr: $"Groq API hatası [{response.StatusCode}].",
                        en: $"Groq API error [{response.StatusCode}].",
                        da: $"Groq API-fejl [{response.StatusCode}]."),
                    DateTime.UtcNow);
            }

            using var doc = JsonDocument.Parse(jsonResponse);
            var aiText = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return new AiAnalysisResponseDto(
                symbol.Id,
                symbol.Name,
                symbol.Exchange.Code,
                aiText ?? Localize(language,
                    tr: "Yapay zeka analiz sonucu üretemedi.",
                    en: "The AI could not produce an analysis result.",
                    da: "AI'en kunne ikke generere et analyseresultat."),
                DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            return new AiAnalysisResponseDto(
                symbol.Id,
                symbol.Name,
                symbol.Exchange.Code,
                Localize(language,
                    tr: $"İstek işlenirken hata oluştu: {ex.Message}",
                    en: $"An error occurred while processing the request: {ex.Message}",
                    da: $"Der opstod en fejl under behandlingen af anmodningen: {ex.Message}"),
                DateTime.UtcNow);
        }
    }

    // Normaliserer language.
    private static string NormalizeLanguage(string? language)
    {
        if (string.IsNullOrWhiteSpace(language))
            return "en";

        var normalized = language.Trim().ToLowerInvariant();
        if (normalized.StartsWith("tr")) return "tr";
        if (normalized.StartsWith("da")) return "da";
        return "en";
    }

    // Behandler localize.
    private static string Localize(string language, string tr, string en, string da) =>
        language switch
        {
            "tr" => tr,
            "da" => da,
            _ => en
        };

    private static (string SystemPrompt, string UserPrompt) BuildPrompt(
        string language,
        string exchangeCode,
        string symbolName,
        string interval,
        string candleData)
    {
        return language switch
        {
            "tr" => (
                "Sen uzman bir kripto ve finansal piyasalar teknik analistisin. Yalnız verilen piyasa verilerine dayan ve kesin kazanç vaadinde bulunma.",
                $@"Aşağıda {exchangeCode}/{symbolName} sembolünün {interval} periyodundaki son mum verileri yer almaktadır:
{candleData}

Bu verilere dayanarak kısa, net ve anlaşılır bir teknik analiz yap:
- Genel trend durumu (Boğa, Ayı veya Yatay)
- Kritik destek ve direnç seviyeleri
- Kısa vadeli beklenti ve Al/Sat/Nötr değerlendirmesi

Cevabını Türkçe ve maddeler halinde sun."),

            "da" => (
                "Du er ekspert i teknisk analyse af kryptovaluta- og finansmarkeder. Brug kun de angivne markedsdata, og giv ingen garanti for afkast.",
                $@"Nedenfor er de seneste candle-data for {exchangeCode}/{symbolName} på intervallet {interval}:
{candleData}

Lav en kort, klar og letforståelig teknisk analyse baseret på dataene:
- Overordnet trend (Bullish, Bearish eller Sideways)
- Vigtige støtte- og modstandsniveauer
- Kortsigtet forventning og Køb/Sælg/Neutral vurdering

Svar på dansk og brug punktform."),

            _ => (
                "You are an expert technical analyst for cryptocurrency and financial markets. Base the analysis only on the supplied market data and do not guarantee returns.",
                $@"Below are the latest candle data for {exchangeCode}/{symbolName} on the {interval} timeframe:
{candleData}

Based on these data, provide a short, clear, and easy-to-understand technical analysis:
- Overall trend (Bullish, Bearish, or Sideways)
- Key support and resistance levels
- Short-term outlook and Buy/Sell/Neutral assessment

Respond in English and use bullet points.")
        };
    }
}
