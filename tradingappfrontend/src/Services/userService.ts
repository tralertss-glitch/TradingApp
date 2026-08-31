import { api } from './api';

export interface UserManagementDto {
    id: number;
    username: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    isDeleted: boolean;
    deletionRequestedAt?: string | null;
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}

export interface UserPreferencesDto {
    theme?: string;
    language?: string;
    selectedLayout?: string;
    activeIndicatorsJson?: string;
    chartSettingsJson?: string;
}

export const userService = {
    getMyProfile: async (): Promise<UserManagementDto> => {
        const response = await api.get<UserManagementDto>('/users/me');
        return response.data;
    },

    updateMyProfile: async (dto: Partial<UserManagementDto>): Promise<UserManagementDto> => {
        const response = await api.put<UserManagementDto>('/users/me', dto);
        return response.data;
    },

    changePassword: async (dto: ChangePasswordDto): Promise<{ message: string }> => {
        const response = await api.post<{ message: string }>('/users/change-password', dto);
        return response.data;
    },

    // 🛑 Slet brugerkonto (soft delete)
    deleteMyAccount: async (): Promise<{ message: string }> => {
        const response = await api.delete<{ message: string }>('/users/me');
        return response.data;
    },

    // 🔥 Admin/SuperAdmin sletter en konto permanent fra databasen (hard delete)
    hardDeleteUser: async (userId: number): Promise<{ message: string }> => {
        const response = await api.delete<{ message: string }>(`/users/${userId}`);
        return response.data;
    },

    getPreferences: async (): Promise<UserPreferencesDto> => {
        const response = await api.get<UserPreferencesDto>('/users/preferences');
        return response.data;
    },

    savePreferences: async (dto: UserPreferencesDto): Promise<{ message: string }> => {
        const response = await api.put<{ message: string }>('/users/preferences', dto);
        return response.data;
    },

    getAllUsers: async (): Promise<UserManagementDto[]> => {
        const response = await api.get<UserManagementDto[]>('/users');
        return response.data;
    },

    assignRole: async (dto: UserManagementDto): Promise<{ message: string }> => {
        const response = await api.put<{ message: string }>('/users/assign-role', dto);
        return response.data;
    },
};