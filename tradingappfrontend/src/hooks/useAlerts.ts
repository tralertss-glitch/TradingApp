import {
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';

import type {
    Alert,
    CreateAlertRequest,
} from '../Types/alert';

import { alertService } from '../Services/alertService';
import { signalrService } from '../Services/signalrService';

export const useAlerts = (
    isAuthenticated: boolean,
    soundEnabled: boolean = true
) => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [triggeredAlert, setTriggeredAlert] =
        useState<Alert | null>(null);

    /*
     * Aynı Audio nesnesini tekrar kullanıyoruz.
     * Her alarm geldiğinde yeni Audio oluşturmuyoruz.
     */
    const audioRef = useRef<HTMLAudioElement | null>(null);

    /*
     * Tarayıcının sesi kullanıcı etkileşiminden sonra
     * oynatabilmesi için durum bilgisi.
     */
    const audioUnlockedRef = useRef<boolean>(false);

    /*
     * Audio nesnesini hazırla.
     */
    useEffect(() => {
        const audio = new Audio('/alert.mp3');

        audio.preload = 'auto';
        audio.volume = 1;

        audioRef.current = audio;

        console.log(
            '[useAlerts] Audio oluşturuldu:',
            audio.src
        );

        return () => {
            audio.pause();
            audioRef.current = null;
        };
    }, []);

    /*
     * Chrome/Edge autoplay engelini aşmak için:
     * Kullanıcı sayfaya ilk kez tıkladığında veya klavyeyi
     * kullandığında audio sessiz olarak bir kez başlatılır.
     */
    useEffect(() => {
        const unlockAudio = (): void => {
            if (
                audioUnlockedRef.current ||
                !audioRef.current
            ) {
                return;
            }

            const audio = audioRef.current;
            const originalVolume = audio.volume;

            audio.volume = 0;

            void audio
                .play()
                .then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = originalVolume;

                    audioUnlockedRef.current = true;

                    console.log(
                        '✅ [useAlerts] Audio unlocked'
                    );
                })
                .catch((error: unknown) => {
                    audio.volume = originalVolume;

                    console.warn(
                        '⚠️ [useAlerts] Audio unlock başarısız:',
                        error
                    );
                });
        };

        window.addEventListener(
            'pointerdown',
            unlockAudio
        );

        window.addEventListener(
            'keydown',
            unlockAudio
        );

        return () => {
            window.removeEventListener(
                'pointerdown',
                unlockAudio
            );

            window.removeEventListener(
                'keydown',
                unlockAudio
            );
        };
    }, []);

    /*
     * Backend'den kullanıcının alarmlarını getirir.
     */
    const fetchAlerts =
        useCallback(async (): Promise<void> => {
            if (!isAuthenticated) {
                return;
            }

            try {
                const data =
                    await alertService.getMyAlerts();

                if (Array.isArray(data)) {
                    setAlerts(data);
                }

                console.log(
                    '[useAlerts] Alarmlar yüklendi:',
                    data
                );
            } catch (error: unknown) {
                console.error(
                    '❌ [useAlerts] Alarmlar alınamadı:',
                    error
                );
            }
        }, [isAuthenticated]);

    /*
     * Kullanıcı giriş yaptıktan sonra alarm listesini
     * backend'den getir.
     *
     * Promise callback içinde setState kullanıyoruz.
     * Böylece react-hooks/set-state-in-effect kuralına
     * takılmıyoruz.
     */
    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        let cancelled = false;

        void alertService
            .getMyAlerts()
            .then((data) => {
                if (
                    !cancelled &&
                    Array.isArray(data)
                ) {
                    setAlerts(data);

                    console.log(
                        '[useAlerts] İlk alarm listesi:',
                        data
                    );
                }
            })
            .catch((error: unknown) => {
                console.error(
                    '❌ [useAlerts] İlk alarm listesi alınamadı:',
                    error
                );
            });

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated]);

    /*
     * SignalR alarm listener.
     */
    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        console.log(
            '🟢 [useAlerts] SignalR alert listener kaydediliyor'
        );

        console.log(
            '[useAlerts] soundEnabled:',
            soundEnabled
        );

        const handleAlertTriggered = (
            alert: Alert
        ): void => {
            console.log(
                '🚨 [useAlerts] ReceiveAlertTriggered GELDİ:',
                alert
            );

            /*
             * Toast için son tetiklenen alarmı sakla.
             */
            setTriggeredAlert(alert);

            /*
             * Listedeki alarmı tetiklenmiş olarak işaretle.
             */
            setAlerts((previousAlerts) =>
                previousAlerts.map(
                    (existingAlert) =>
                        existingAlert.id === alert.id
                            ? {
                                ...existingAlert,
                                isTriggered: true,
                                isActive: false,
                            }
                            : existingAlert
                )
            );

            /*
             * Kullanıcı ayarlardan sesi kapatmışsa
             * burada dur.
             */
            if (!soundEnabled) {
                console.warn(
                    '🔇 [useAlerts] Alert sesi ayarlardan kapalı'
                );

                return;
            }

            if (!audioRef.current) {
                console.error(
                    '❌ [useAlerts] Audio nesnesi bulunamadı'
                );

                return;
            }

            const audio = audioRef.current;

            /*
             * Ses zaten oynuyorsa başa sar.
             */
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 1;

            console.log(
                '🔊 [useAlerts] Alarm sesi çalınıyor...'
            );

            console.log(
                '[useAlerts] Audio unlocked:',
                audioUnlockedRef.current
            );

            console.log(
                '[useAlerts] Audio URL:',
                audio.src
            );

            void audio
                .play()
                .then(() => {
                    console.log(
                        '✅ [useAlerts] ALARM SESİ ÇALDI'
                    );
                })
                .catch((error: unknown) => {
                    console.error(
                        '❌ [useAlerts] ALARM SESİ ÇALMA HATASI:',
                        error
                    );
                });
        };

        signalrService.subscribeToAlertTriggered(
            handleAlertTriggered
        );

        return () => {
            console.log(
                '🔴 [useAlerts] SignalR alert listener kaldırılıyor'
            );

            signalrService.unsubscribeFromAlertTriggered(
                handleAlertTriggered
            );
        };
    }, [isAuthenticated, soundEnabled]);

    /*
     * Yeni alarm oluştur.
     */
    const createAlert = useCallback(
        async (
            data: CreateAlertRequest
        ): Promise<void> => {
            try {
                const created =
                    await alertService.createAlert(data);

                if (!created) {
                    return;
                }

                setAlerts((previousAlerts) => [
                    created,
                    ...previousAlerts,
                ]);

                console.log(
                    '✅ [useAlerts] Alarm oluşturuldu:',
                    created
                );
            } catch (error: unknown) {
                console.error(
                    '❌ [useAlerts] Alarm oluşturulamadı:',
                    error
                );

                throw error;
            }
        },
        []
    );

    /*
     * Alarmı aktif/pasif yap.
     */
    const toggleAlert = useCallback(
        async (
            alertId: string
        ): Promise<void> => {
            try {
                await alertService.toggleAlert(
                    alertId
                );

                setAlerts((previousAlerts) =>
                    previousAlerts.map((alert) =>
                        alert.id === alertId
                            ? {
                                ...alert,
                                isActive:
                                    !alert.isActive,
                            }
                            : alert
                    )
                );

                console.log(
                    '✅ [useAlerts] Alarm durumu değiştirildi:',
                    alertId
                );
            } catch (error: unknown) {
                console.error(
                    '❌ [useAlerts] Alarm durumu değiştirilemedi:',
                    error
                );

                throw error;
            }
        },
        []
    );

    /*
     * Alarm sil.
     */
    const deleteAlert = useCallback(
        async (
            alertId: string
        ): Promise<void> => {
            try {
                await alertService.deleteAlert(
                    alertId
                );

                setAlerts((previousAlerts) =>
                    previousAlerts.filter(
                        (alert) =>
                            alert.id !== alertId
                    )
                );

                console.log(
                    '✅ [useAlerts] Alarm silindi:',
                    alertId
                );
            } catch (error: unknown) {
                console.error(
                    '❌ [useAlerts] Alarm silinemedi:',
                    error
                );

                throw error;
            }
        },
        []
    );

    /*
     * Toast'u kapat.
     */
    const clearTriggeredAlert =
        useCallback((): void => {
            setTriggeredAlert(null);
        }, []);

    return {
        alerts,
        triggeredAlert,
        fetchAlerts,
        createAlert,
        toggleAlert,
        deleteAlert,
        clearTriggeredAlert,
    };
};