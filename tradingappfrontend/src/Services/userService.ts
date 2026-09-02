import { api } from './api';
import type { UserPreferences } from '../Types/preferences';

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

export const userService = {
    getMyProfile: async (): Promise<UserManagementDto> => {
        const response = await api.get<UserManagementDto>('/users/me');
        return response.data;
    },

    updateMyProfile: async (dto: Partial<UserManagementDto>): Promise<UserManagementDto> => {
        const response = await api.put<UserManagementDto>('/users/me', dto);
        return response.data;
    },

    changePassword: async (dto: ChangePasswordDto): Promise<{ message: string; }> => {
        const response = await api.post<{ message: string; }>('/users/change-password', dto);
        return response.data;
    },

    // 🛑 Slet brugerkonto (soft delete)
    deleteMyAccount: async (): Promise<{ message: string; }> => {
        const response = await api.delete<{ message: string; }>('/users/me');
        return response.data;
    },

    // 🔥 Admin/SuperAdmin sletter en konto permanent fra databasen (hard delete)
    hardDeleteUser: async (userId: number): Promise<{ message: string; }> => {
        const response = await api.delete<{ message: string; }>(`/users/${userId}`);
        return response.data;
    },

    getPreferences: async (): Promise<UserPreferences> => {
        const response = await api.get<UserPreferences>('/users/preferences');
        return response.data;
    },

    savePreferences: async (dto: UserPreferences): Promise<{ message: string; }> => {
        const response = await api.put<{ message: string; }>('/users/preferences', dto);
        return response.data;
    },

    getAllUsers: async (): Promise<UserManagementDto[]> => {
        const response = await api.get<UserManagementDto[]>('/users');
        return response.data;
    },

    assignRole: async (dto: UserManagementDto): Promise<{ message: string; }> => {
        const response = await api.put<{ message: string; }>('/users/assign-role', dto);
        return response.data;
    },
};
