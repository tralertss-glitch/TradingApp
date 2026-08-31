import { api } from './api';
import type { AddWatchlistItemDto, WatchlistResponseDto } from '../Types/watchlist';

export const watchlistService = {
    getMyWatchlists: async (): Promise<WatchlistResponseDto[]> => {
        const response = await api.get<WatchlistResponseDto[]>('/watchlists');
        return response.data;
    },

    createWatchlist: async (name: string): Promise<WatchlistResponseDto> => {
        const response = await api.post<WatchlistResponseDto>('/watchlists', JSON.stringify(name), {
            headers: { 'Content-Type': 'application/json' },
        });
        return response.data;
    },

    deleteWatchlist: async (watchlistId: number): Promise<void> => {
        await api.delete(`/watchlists/${watchlistId}`);
    },

    addSymbolToWatchlist: async (dto: AddWatchlistItemDto): Promise<void> => {
        await api.post('/watchlists/items', dto);
    },

    removeSymbolFromWatchlist: async (watchlistId: number, symbolId: number): Promise<void> => {
        await api.delete(`/watchlists/${watchlistId}/items/${symbolId}`);
    },
};
