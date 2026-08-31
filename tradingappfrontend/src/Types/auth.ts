export interface User {
    username: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
}

export interface AuthResponse {
    token: string;
    username: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
}

export interface LoginRequest {
    identifier: string;
    password: string;
}

export interface RegisterRequest {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
}

export interface ForgotPasswordRequest {
    identifier: string;
}

export interface ResetPasswordRequest {
    userId: number;
    token: string;
    newPassword: string;
}

export interface MessageResponse {
    message: string;
}
