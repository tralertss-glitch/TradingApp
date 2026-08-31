import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7143/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Hjælper: Ryd sessionen, og naviger videre.
const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Undgå en uendelig redirect-løkke, hvis vi allerede er på login-siden.
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
    }
};

// 1. Request-interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 2. Response-interceptor
api.interceptors.response.use(
    (response) => {
        // Markér globalt, at backend-forbindelsen er aktiv, når requesten lykkes.
        window.dispatchEvent(new CustomEvent('backend-connection-restored'));
        return response;
    },
    (error) => {
        // 🚨 SERVEREN SVARER IKKE (backend er nede / netværksfejl)
        if (!error.response) {
            window.dispatchEvent(new CustomEvent('backend-connection-error', {
                detail: { message: 'The server is unreachable. The backend service may be down.' }
            }));
            return Promise.reject(error);
        }

        const status = error.response?.status;
        const originalRequest = error.config;

        // Redirect kun ved 401 fra andre requests end /login eller /auth.
        const isAuthRequest = originalRequest.url?.includes('/login') || originalRequest.url?.includes('/auth');

        if (status === 401 && !isAuthRequest) {
            handleLogout();
        }

        return Promise.reject(error);
    }
);