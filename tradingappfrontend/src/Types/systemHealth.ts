export interface ExchangeHealthDto {
    exchangeCode: string;
    exchangeName: string;
    isActive: boolean;
    activeSymbolCount: number;
    lastCandleTimeUtc?: string | null;
    lastCandleAgeSeconds?: number | null;
    historicalSyncRunning: boolean;
    historicalSyncStartedAtUtc?: string | null;
    historicalSyncCompletedAtUtc?: string | null;
    realtimeConnected: boolean;
    realtimeConnectedAtUtc?: string | null;
    lastRealtimeMessageAtUtc?: string | null;
    lastError?: string | null;
    lastErrorAtUtc?: string | null;
    validationErrorCount: number;
    validationWarningCount: number;
    status: string;
}

export interface SystemHealthDto {
    status: string;
    databaseHealthy: boolean;
    timescaleHealthy: boolean;
    candlesHypertableHealthy: boolean;
    activeExchangeCount: number;
    activeSymbolCount: number;
    lastCandleTimeUtc?: string | null;
    lastCandleAgeSeconds?: number | null;
    validationErrorCount: number;
    validationWarningCount: number;
    startedAtUtc: string;
    uptime: string;
    checkedAtUtc: string;
    exchanges: ExchangeHealthDto[];
}
