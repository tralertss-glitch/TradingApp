export interface AiAnalysisRequestDto {
    symbolId: number;
    interval: string;
    language?: string;
}

export interface AiAnalysisResponseDto {
    symbolId: number;
    symbol: string;
    exchange: string;
    analysisText: string;
    generatedAt: string;
}
