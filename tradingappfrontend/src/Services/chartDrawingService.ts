import { api } from './api';
import type {
    ChartDrawingDto,
    CreateChartDrawingDto,
    UpdateChartDrawingDto,
} from '../Types/chartDrawing';

export const chartDrawingService = {
    getDrawings: async (symbolId: number, interval: string): Promise<ChartDrawingDto[]> => {
        if (!symbolId || !interval) return [];
        const response = await api.get<ChartDrawingDto[]>('/chart-drawings', {
            params: { symbolId, interval },
        });
        return response.data;
    },

    createDrawing: async (dto: CreateChartDrawingDto): Promise<ChartDrawingDto> => {
        const response = await api.post<ChartDrawingDto>('/chart-drawings', dto);
        return response.data;
    },

    updateDrawing: async (drawingId: number, dto: UpdateChartDrawingDto): Promise<ChartDrawingDto> => {
        const response = await api.put<ChartDrawingDto>(`/chart-drawings/${drawingId}`, dto);
        return response.data;
    },

    deleteDrawing: async (drawingId: number): Promise<void> => {
        await api.delete(`/chart-drawings/${drawingId}`);
    },

    clearDrawings: async (symbolId: number, interval: string): Promise<number> => {
        const response = await api.delete<{ deletedCount: number }>('/chart-drawings', {
            params: { symbolId, interval },
        });
        return response.data.deletedCount;
    },
};
