import React from 'react';
import { authService } from '../../Services/authService';

interface ProtectedRouteProps {
    children: React.ReactNode;
    fallback: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, fallback }) => {
    const isAuth = authService.isAuthenticated();

    // Vis fallback-komponenten (AuthPage), hvis brugeren ikke er logget ind.
    if (!isAuth) {
        return <>{fallback}</>;
    }

    // Vis det beskyttede indhold (Dashboard), hvis brugeren er logget ind.
    return <>{children}</>;
};