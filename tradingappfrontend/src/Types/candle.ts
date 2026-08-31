export interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    symbolId?: number;
    symbol?: string;
    exchange?: string;
    interval?: string;
    isClosed?: boolean;
}
export type ChartType = 'candles' | 'bars' | 'line' | 'area' | 'heikin-ashi';
