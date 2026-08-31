import { api } from './api';
import type { AiAnalysisResponseDto } from '../Types/ai';

const normalizeLanguage = (language?: string): 'tr' | 'en' | 'da' => {
    const value = (language || 'en').toLowerCase();
    if (value.startsWith('tr')) return 'tr';
    if (value.startsWith('da')) return 'da';
    return 'en';
};

export const aiApi = {
    getDetailedAnalysis: async (
        symbolId: number,
        interval: string,
        language?: string,
    ): Promise<AiAnalysisResponseDto> => {
        const normalizedLanguage = normalizeLanguage(language);

        const response = await api.post<AiAnalysisResponseDto>(
            '/AiAnalysis/analyze',
            {
                symbolId,
                interval,
                language: normalizedLanguage,
            },
            {
                headers: { 'Accept-Language': normalizedLanguage },
            },
        );

        return response.data;
    },
};
