import { api } from './api';
import type { Alert, CreateAlertRequest } from '../Types/alert';

export const alertService = {
    getMyAlerts: async (): Promise<Alert[]> => {
        const response = await api.get<Alert[]>('/alerts');
        return response.data;
    },

    getActiveAlertsBySymbol: async (symbolId: number): Promise<Alert[]> => {
        const response = await api.get<Alert[]>('/alerts/active', { params: { symbolId } });
        return response.data;
    },

    createAlert: async (data: CreateAlertRequest): Promise<Alert> => {
        const response = await api.post<Alert>('/alerts', data);
        return response.data;
    },

    deleteAlert: async (id: string): Promise<void> => {
        await api.delete(`/alerts/${id}`);
    },

    toggleAlert: async (id: string): Promise<void> => {
        await api.patch(`/alerts/${id}/toggle`);
    },
};
