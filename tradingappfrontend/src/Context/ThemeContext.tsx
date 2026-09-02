/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { preferenceService } from '../Services/preferenceService';
import { authService } from '../Services/authService';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme, saveToDb?: boolean) => void;
    toggleTheme: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode; }> = ({ children }) => {
    // Hent temaet fra localStorage ved første åbning; brug ellers dark som standard.
    const [theme, setThemeState] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('tradingpro_theme') as Theme;
        return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
    });

    // Synkronisering af DOM og LocalStorage
    useEffect(() => {
        localStorage.setItem('tradingpro_theme', theme);
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    // Angiv temaet direkte, når data kommer fra databasen eller brugeren vælger et tema.
    const setTheme = useCallback((newTheme: Theme, saveToDb = false) => {
        setThemeState(newTheme);
        localStorage.setItem('tradingpro_theme', newTheme);

        if (saveToDb && authService.isAuthenticated()) {
            preferenceService
                .updatePreferences({ theme: newTheme })
                .catch(() => { });
        }
    }, []);

    // Skift tema, når knappen trykkes.
    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('tradingpro_theme', next);

            // Gem straks i databasen, når brugeren trykker på knappen.
            if (authService.isAuthenticated()) {
                preferenceService
                    .updatePreferences({ theme: next })
                    .catch(() => { });
            }
            return next;
        });
    }, []);

    return (
        <ThemeContext.Provider
            value={{
                theme,
                setTheme,
                toggleTheme,
                isDark: theme === 'dark',
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
