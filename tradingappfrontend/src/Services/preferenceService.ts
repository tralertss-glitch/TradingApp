import { api } from './api';
import type { UserPreferences } from '../Types/preferences';

export const preferenceService = {
    getPreferences: async (): Promise<UserPreferences> => {
        const response = await api.get<UserPreferences>('/users/preferences');
        return response.data;
    },

    savePreferences: async (preferences: UserPreferences): Promise<void> => {
        await api.put('/users/preferences', preferences);
    },
};