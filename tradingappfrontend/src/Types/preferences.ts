export type Language = 'tr' | 'en' | 'da';
export type Theme = 'dark' | 'light';
export type ChartType = 'candles' | 'bars' | 'line' | 'area' | 'heikin-ashi';
export type LayoutMode = '1x1' | '1x2' | '2x2';

export interface ChartIndicatorConfig {
    id: string;
    type: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB';
    name: string;
    enabled: boolean;
    color: string;
    period?: number;
    stdDev?: number;
    fastPeriod?: number;   // Til MACD.
    slowPeriod?: number;   // Til MACD.
    signalPeriod?: number; // Til MACD.
}

export interface ChartVisualSettings {
    upColor: string;
    downColor: string;
    showBorders: boolean;
    showWicks: boolean;
    showGrid: boolean;
    gridColorDark: string;
    gridColorLight: string;
    showPriceLine: boolean;
    soundEnabled: boolean;
}

export interface UserPreferences {
    theme: Theme;
    language: Language;
    lastSymbol: string;
    lastInterval: string;
    chartType: ChartType;
    layoutMode: LayoutMode;
    indicators: ChartIndicatorConfig[];
    visualSettings: ChartVisualSettings;
}

export const defaultPreferences: UserPreferences = {
    theme: 'dark',
    language: 'tr',
    lastSymbol: 'BTCUSDT',
    lastInterval: '15m',
    chartType: 'candles',
    layoutMode: '1x1',
    indicators: [
        { id: 'sma-20', type: 'SMA', name: 'SMA (20)', enabled: true, period: 20, color: '#f59e0b' },
        { id: 'ema-50', type: 'EMA', name: 'EMA (50)', enabled: false, period: 50, color: '#3b82f6' },
        { id: 'ema-200', type: 'EMA', name: 'EMA (200)', enabled: false, period: 200, color: '#ec4899' },
        { id: 'rsi-14', type: 'RSI', name: 'RSI (14)', enabled: false, period: 14, color: '#8b5cf6' },
        { id: 'bb-20', type: 'BB', name: 'Bollinger Bands (20, 2)', enabled: false, period: 20, stdDev: 2, color: '#10b981' },
    ],
    visualSettings: {
        upColor: '#089981',
        downColor: '#f23645',
        showBorders: false,
        showWicks: true,
        showGrid: true,
        gridColorDark: '#1e222d',
        gridColorLight: '#f0f3fa',
        showPriceLine: true,
        soundEnabled: true,
    },
};