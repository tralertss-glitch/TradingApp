export type IndicatorType = 'SMA' | 'EMA' | 'RSI' | 'BB' | 'MACD';

export interface IndicatorConfig {
    id: string;
    type: IndicatorType;
    name: string;
    enabled: boolean;
    color: string;
    period?: number;
    fastPeriod?: number; // Til MACD.
    slowPeriod?: number; // Til MACD.
    signalPeriod?: number; // Til MACD.
    stdDev?: number; // Til Bollinger Bands.
}

export const DEFAULT_INDICATORS: IndicatorConfig[] = [
    { id: 'sma-20', type: 'SMA', name: 'SMA (20)', enabled: false, color: '#f59e0b', period: 20 },
    { id: 'ema-50', type: 'EMA', name: 'EMA (50)', enabled: false, color: '#3b82f6', period: 50 },
    { id: 'ema-200', type: 'EMA', name: 'EMA (200)', enabled: false, color: '#ec4899', period: 200 },
    { id: 'rsi-14', type: 'RSI', name: 'RSI (14)', enabled: false, color: '#8b5cf6', period: 14 },
    { id: 'bb-20', type: 'BB', name: 'Bollinger Bands (20, 2)', enabled: false, color: '#10b981', period: 20, stdDev: 2 },
];