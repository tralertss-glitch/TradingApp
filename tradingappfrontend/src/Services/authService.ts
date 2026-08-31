import { api } from './api';
import type {
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    User,
} from '../Types/auth';

// Håndterer persist auth.
const persistAuth = (response: AuthResponse) => {
    if (!response.token) return;

    localStorage.setItem('token', response.token);
    localStorage.setItem(
        'user',
        JSON.stringify({
            username: response.username,
            email: response.email,
            role: response.role,
            firstName: response.firstName,
            lastName: response.lastName,
        })
    );
};

export const authService = {
    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/Auth/login', data);
        persistAuth(response.data);
        return response.data;
    },

    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/Auth/register', data);
        // Registrering skal ikke oprette en lokal session. Brugeren får vist en succesbesked
        // og logger derefter selv ind.
        return response.data;
    },

    forgotPassword: async (data: ForgotPasswordRequest): Promise<MessageResponse> => {
        const response = await api.post<MessageResponse>('/Auth/forgot-password', data);
        return response.data;
    },

    resetPassword: async (data: ResetPasswordRequest): Promise<MessageResponse> => {
        const response = await api.post<MessageResponse>('/Auth/reset-password', data);
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser: (): User | null => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: (): boolean => !!localStorage.getItem('token'),

    isAdmin: (): boolean => {
        const user = authService.getCurrentUser();
        const role = (user?.role || '').toLowerCase();
        return role === 'admin' || role === 'superadmin';
    },

    isSuperAdmin: (): boolean => {
        const user = authService.getCurrentUser();
        return (user?.role || '').toLowerCase() === 'superadmin';
    },
};
