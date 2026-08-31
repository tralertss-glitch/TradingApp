export interface AddWatchlistItemDto {
    watchlistId: number;
    symbolId: number;
}

export interface WatchlistItemResponseDto {
    id: number;
    symbolId: number;
    symbol: string;
    exchange: string;
    addedAt: string;
}

export interface WatchlistResponseDto {
    id: number;
    name: string;
    items: WatchlistItemResponseDto[];
}
