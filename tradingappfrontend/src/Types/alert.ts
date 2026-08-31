export type AlertCondition = 'CROSSES_UP' | 'CROSSES_DOWN';

export interface Alert {
    id: string;
    userId: string;
    symbolId: number;
    symbol: string;
    exchange: string;
    targetPrice: number;
    condition: AlertCondition;
    isTriggered: boolean;
    isActive: boolean;
    note?: string;
    createdAt: string;
}

export interface CreateAlertRequest {
    symbolId: number;
    targetPrice: number;
    condition: AlertCondition;
    note?: string;
}
