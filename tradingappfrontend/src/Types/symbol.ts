export interface SymbolResponseDto {
    id: number;
    exchangeId: number;
    exchangeCode: string;
    exchangeName: string;
    name: string;
    baseAsset: string;
    quoteAsset: string;
    isActive: boolean;
}

export interface ExchangeResponseDto {
    id: number;
    code: string;
    name: string;
    isActive: boolean;
}
