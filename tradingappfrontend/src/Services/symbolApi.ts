import { api } from './api';
import type { SymbolResponseDto } from '../Types/symbol';

export const symbolApi = {
    getActiveSymbols: async (exchangeId: number): Promise<SymbolResponseDto[]> => {
        const response = await api.get<SymbolResponseDto[]>('/symbols/active', {
            params: { exchangeId },
        });
        return response.data;
    },

    searchSymbols: async (query?: string, exchangeId?: number): Promise<SymbolResponseDto[]> => {
        const response = await api.get<SymbolResponseDto[]>('/symbols', {
            params: {
                ...(query ? { query } : {}),
                ...(exchangeId ? { exchangeId } : {}),
            },
        });
        return response.data;
    },

    getSymbol: async (symbolId: number): Promise<SymbolResponseDto> => {
        const response = await api.get<SymbolResponseDto>(`/symbols/${symbolId}`);
        return response.data;
    },

    syncExchange: async (exchangeCode: string): Promise<{ message: string; }> => {
        const response = await api.post<{ message: string; }>(`/symbols/sync/${encodeURIComponent(exchangeCode)}`);
        return response.data;
    },

    toggleSymbolStatus: async (
        symbolId: number,
        isActive: boolean
    ): Promise<{ message: string; symbolId: number; exchangeCode: string; symbolName: string; isActive: boolean; historicalSyncQueued: boolean; realtimeRestartRequested: boolean; }> => {
        const response = await api.put<{ message: string; symbolId: number; exchangeCode: string; symbolName: string; isActive: boolean; historicalSyncQueued: boolean; realtimeRestartRequested: boolean; }>(
            `/symbols/${symbolId}/status`,
            { isActive }
        );
        return response.data;
    },
};
