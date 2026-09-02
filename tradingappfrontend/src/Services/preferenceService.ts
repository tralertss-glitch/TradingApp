import { api } from './api';
import type { UserPreferences } from '../Types/preferences';

export type UserPreferencesUpdate = Partial<Omit<UserPreferences, 'visualSettings'>> & {
    visualSettings?: Partial<UserPreferences['visualSettings']>;
};

export const preferenceService = {
    getPreferences: async (): Promise<UserPreferences> => {
        const response = await api.get<UserPreferences>('/users/preferences');
        return response.data;
    },

    savePreferences: async (preferences: UserPreferences): Promise<void> => {
        await api.put('/users/preferences', preferences);
    },

    updatePreferences: async (update: UserPreferencesUpdate): Promise<void> => {
        const current = await preferenceService.getPreferences();
        const merged: UserPreferences = {
            ...current,
            ...update,
            visualSettings: {
                ...current.visualSettings,
                ...update.visualSettings,
            },
        };

        await preferenceService.savePreferences(merged);
    },
};
