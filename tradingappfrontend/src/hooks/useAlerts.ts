import { useCallback, useEffect, useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import type { Alert, CreateAlertRequest } from '../Types/alert';
import { alertService } from '../Services/alertService';

export const useAlerts = (
    symbol: string,
    hubConnection: HubConnection | null,
    soundEnabled: boolean = true
) => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [triggeredAlert, setTriggeredAlert] = useState<Alert | null>(null);

    // Hent alarmer fra backend.
    const fetchAlerts = useCallback(async () => {
        try {
            const data = await alertService.getMyAlerts();
            setAlerts(data);
        } catch (err) {
            console.error('[useAlerts] Alarmlar alınamadı:', err);
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchAlerts();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [fetchAlerts]);

    // Realtidslistener til "ReceiveAlertTriggered" via SignalR.
    useEffect(() => {
        if (!hubConnection) return;

        // Behandler den relevante brugerhandling eller event.
        const handleTriggered = (alert: Alert) => {
            setTriggeredAlert(alert);

            // Afspil lyd, hvis lyd er aktiveret i brugerindstillingerne.
            if (soundEnabled) {
                try {
                    const audio = new Audio('/sounds/alert.mp3');
                    audio.volume = 0.8;
                    audio.play().catch((err) => {
                        console.warn('[useAlerts] Tarayıcı ses çalmayı engelledi:', err);
                    });
                } catch (error: unknown) {
                    console.warn('[useAlerts] Alarm sesi oluşturulamadı:', error);
                }
            }

            // Opdater state, og markér alarmen som udløst.
            setAlerts((prev) =>
                prev.map((a) =>
                    a.id === alert.id ? { ...a, isTriggered: true, isActive: false } : a
                )
            );
        };

        hubConnection.on('ReceiveAlertTriggered', handleTriggered);

        return () => {
            hubConnection.off('ReceiveAlertTriggered', handleTriggered);
        };
    }, [hubConnection, soundEnabled]);

    // Opret ny alarm
    const createAlert = async (request: CreateAlertRequest) => {
        const created = await alertService.createAlert(request);
        if (created) {
            setAlerts((prev) => [created, ...prev]);
        }
        return created;
    };

    // Slet alarm
    const deleteAlert = async (id: string) => {
        await alertService.deleteAlert(id);
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    };

    // Aktiver/deaktiver alarm
    const toggleAlert = async (id: string) => {
        await alertService.toggleAlert(id);
        setAlerts((prev) =>
            prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
        );
    };

    // Aktive og ikke-udløste alarmer for det valgte symbol.
    const activeSymbolAlerts = alerts.filter(
        (a) =>
            a.symbol.toUpperCase() === symbol.toUpperCase() &&
            a.isActive &&
            !a.isTriggered
    );

    return {
        alerts,
        activeSymbolAlerts,
        triggeredAlert,
        clearTriggeredAlert: () => setTriggeredAlert(null),
        createAlert,
        deleteAlert,
        toggleAlert,
        refreshAlerts: fetchAlerts,
    };
};
