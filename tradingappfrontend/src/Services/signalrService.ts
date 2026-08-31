import * as signalR from '@microsoft/signalr';
import type { CandleData } from '../Types/candle';
import type { Alert } from '../Types/alert';

const SIGNALR_HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || 'https://localhost:7143/hubs/market-data';

class SignalRService {
    private connection: signalR.HubConnection | null = null;
    private candleListeners: Set<(candle: CandleData) => void> = new Set();
    private alertListeners: Set<(alert: Alert) => void> = new Set();
    private isListening: boolean = false;
    private subscribedGroups: Set<string> = new Set();
    private groupRefCounts: Map<string, number> = new Map();

    public getConnection(): signalR.HubConnection | null {
        return this.connection;
    }

    public async startConnection(): Promise<void> {
        if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
            return;
        }

        if (!this.connection) {
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(SIGNALR_HUB_URL, {
                    accessTokenFactory: () => localStorage.getItem('token') || '',
                })
                .withAutomaticReconnect()
                .configureLogging(signalR.LogLevel.Information)
                .build();

            this.connection.onreconnected(async () => {
                // SignalR-grupper er knyttet til forbindelsen. Tilslut alle aktive grupper igen efter reconnect.
                const groups = Array.from(this.subscribedGroups);
                for (const groupKey of groups) {
                    const separator = groupKey.indexOf(':');
                    if (separator <= 0) continue;
                    const exchange = groupKey.slice(0, separator);
                    const symbol = groupKey.slice(separator + 1);
                    try {
                        await this.connection?.invoke('SubscribeToSymbol', exchange, symbol);
                    } catch (err) {
                        console.error('[SignalR] Yeniden grup aboneliği başarısız:', groupKey, err);
                    }
                }
            });
        }

        if (!this.isListening) {
            // Lyt efter realtime candle-data.
            this.connection.on('ReceiveMarketData', (candle: CandleData) => {
                this.candleListeners.forEach((listener) => {
                    try {
                        listener(candle);
                    } catch (err) {
                        console.error('[SignalR] Mum dinleyici hatası:', err);
                    }
                });
            });

            // Lyt efter realtime udløste prisalarmer.
            this.connection.on('ReceiveAlertTriggered', (alert: Alert) => {
                this.alertListeners.forEach((listener) => {
                    try {
                        listener(alert);
                    } catch (err) {
                        console.error('[SignalR] Alarm dinleyici hatası:', err);
                    }
                });
            });

            this.isListening = true;
        }

        try {
            if (this.connection.state === signalR.HubConnectionState.Disconnected) {
                await this.connection.start();
                console.log('SignalR Bağlantısı Başarılı!');
            }
        } catch (err) {
            console.error('SignalR Bağlantı Hatası:', err);
            setTimeout(() => this.startConnection(), 5000);
        }
    }

    public async subscribeToSymbolGroup(exchangeCode: string, symbolName: string): Promise<void> {
        const exchange = exchangeCode?.trim().toUpperCase();
        const symbol = symbolName?.trim().toUpperCase();

        if (!exchange || !symbol) {
            console.warn('[SignalR] Geçersiz grup aboneliği atlandı.', { exchangeCode, symbolName });
            return;
        }

        const groupKey = `${exchange}:${symbol}`;
        const currentRefs = this.groupRefCounts.get(groupKey) ?? 0;
        this.groupRefCounts.set(groupKey, currentRefs + 1);

        // En anden chart/watchlist-forbruger bruger allerede serverabonnementet.
        if (currentRefs > 0 && this.subscribedGroups.has(groupKey)) return;

        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            await this.startConnection();
        }

        if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('SubscribeToSymbol', exchange, symbol);
                this.subscribedGroups.add(groupKey);
                console.log(`${groupKey} grubuna katılım sağlandı.`);
            } catch (err) {
                const refs = (this.groupRefCounts.get(groupKey) ?? 1) - 1;
                if (refs <= 0) this.groupRefCounts.delete(groupKey);
                else this.groupRefCounts.set(groupKey, refs);
                console.error('Gruba katılırken hata:', err);
            }
        }
    }

    public async unsubscribeFromSymbolGroup(exchangeCode: string, symbolName: string): Promise<void> {
        const exchange = exchangeCode?.trim().toUpperCase();
        const symbol = symbolName?.trim().toUpperCase();

        if (!exchange || !symbol) return;

        const groupKey = `${exchange}:${symbol}`;
        const currentRefs = this.groupRefCounts.get(groupKey) ?? 0;

        if (currentRefs > 1) {
            this.groupRefCounts.set(groupKey, currentRefs - 1);
            return;
        }

        this.groupRefCounts.delete(groupKey);
        if (!this.subscribedGroups.has(groupKey)) return;

        if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('UnsubscribeFromSymbol', exchange, symbol);
            } catch (err) {
                console.error('Gruptan ayrılırken hata:', err);
            }
        }

        this.subscribedGroups.delete(groupKey);
    }

    // Abonnement på candle-data
    public subscribeToCandleUpdates(callback: (candle: CandleData) => void): void {
        this.candleListeners.add(callback);
    }

    public unsubscribeFromCandleUpdates(callback?: (candle: CandleData) => void): void {
        if (callback) {
            this.candleListeners.delete(callback);
        } else {
            this.candleListeners.clear();
        }
    }

    // Abonnement på udløste alarmer
    public subscribeToAlertTriggered(callback: (alert: Alert) => void): void {
        this.alertListeners.add(callback);
    }

    public unsubscribeFromAlertTriggered(callback?: (alert: Alert) => void): void {
        if (callback) {
            this.alertListeners.delete(callback);
        } else {
            this.alertListeners.clear();
        }
    }
}

export const signalrService = new SignalRService();