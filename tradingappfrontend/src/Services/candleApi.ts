import { api } from './api';
import type { CandleData } from '../Types/candle';

export const candleApi = {
    getHistoricalCandles: async (
        symbolId: number,
        interval: string = '1m',
        limit: number = 500,
        endTime?: number
    ): Promise<CandleData[]> => {
        if (!symbolId) return [];
        const response = await api.get<CandleData[]>('/candles', {
            params: { symbolId, interval, limit, endTime },
        });
        return response.data;
    },
};
