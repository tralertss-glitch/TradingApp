import { api } from './api';
import type { SystemHealthDto } from '../Types/systemHealth';

export const systemHealthService = {
    getHealth: async (): Promise<SystemHealthDto> => {
        const response = await api.get<SystemHealthDto>('/admin/system-health');
        return response.data;
    },
};
