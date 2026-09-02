import axios from 'axios';

interface ApiErrorPayload {
    message?: string;
    errors?: Record<string, unknown>;
}

const firstValidationMessage = (errors: Record<string, unknown> | undefined): string | null => {
    if (!errors) return null;

    for (const value of Object.values(errors)) {
        if (typeof value === 'string' && value.trim()) return value;
        if (Array.isArray(value)) {
            const message = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
            if (message) return message;
        }
    }

    return null;
};

export const getApiErrorMessage = (
    error: unknown,
    fallback: string,
    connectionFallback?: string
): string => {
    if (!axios.isAxiosError<ApiErrorPayload>(error)) return fallback;

    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim()) return responseMessage;

    const validationMessage = firstValidationMessage(error.response?.data?.errors);
    if (validationMessage) return validationMessage;

    if (!error.response && error.request && connectionFallback) return connectionFallback;
    return fallback;
};
