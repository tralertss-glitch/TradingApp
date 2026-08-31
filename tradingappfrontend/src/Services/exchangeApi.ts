import { api } from './api';
import type { ExchangeResponseDto } from '../Types/symbol';

export interface ExchangeUpsertDto {
    code: string;
    name: string;
    isActive: boolean;
}

export const exchangeApi = {
    getActiveExchanges: async (): Promise<ExchangeResponseDto[]> => {
        const response = await api.get<ExchangeResponseDto[]>('/exchanges');
        return response.data;
    },

    getAdminExchanges: async (): Promise<ExchangeResponseDto[]> => {
        const response = await api.get<ExchangeResponseDto[]>('/exchanges/admin');
        return response.data;
    },

    createExchange: async (payload: ExchangeUpsertDto): Promise<ExchangeResponseDto> => {
        const response = await api.post<ExchangeResponseDto>('/exchanges', payload);
        return response.data;
    },

    updateExchange: async (id: number, payload: ExchangeUpsertDto): Promise<ExchangeResponseDto> => {
        const response = await api.put<ExchangeResponseDto>(`/exchanges/${id}`, payload);
        return response.data;
    },

    deleteExchange: async (id: number): Promise<void> => {
        await api.delete(`/exchanges/${id}`);
    },
};
