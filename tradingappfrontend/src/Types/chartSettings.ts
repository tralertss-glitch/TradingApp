export interface ChartVisualSettings {
    // 1. Candle-krop og farver
    upColor: string;
    downColor: string;
    showBorders: boolean;
    showWicks: boolean;

    // 2. Indstillinger for lærred og gitter
    showGrid: boolean;
    gridColorDark: string;
    gridColorLight: string;

    // 3. Prislinjer
    showPriceLine: boolean;

    // 4. Alarmer og lyd
    soundEnabled?: boolean;
}

export const DEFAULT_CHART_SETTINGS: ChartVisualSettings = {
    upColor: '#089981',
    downColor: '#f23645',
    showBorders: false,
    showWicks: true,
    showGrid: true,
    gridColorDark: '#1e222d',
    gridColorLight: '#f0f3fa',
    showPriceLine: true,
    soundEnabled: true,
};