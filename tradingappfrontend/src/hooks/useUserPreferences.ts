import { useState, useEffect, useCallback, useRef } from 'react';
import { type UserPreferences, defaultPreferences } from '../Types/preferences';
import { preferenceService } from '../Services/preferenceService';

export const useUserPreferences = () => {
    const [preferences, setPreferences] = useState<UserPreferences>(() => {
        try {
            const local = localStorage.getItem('user_prefs');
            return local ? { ...defaultPreferences, ...JSON.parse(local) } : defaultPreferences;
        } catch {
            return defaultPreferences;
        }
    });

    const [loading, setLoading] = useState(true);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 1. Hent indstillinger fra serveren, når siden åbnes.
    useEffect(() => {
        let isMounted = true;

        preferenceService
            .getPreferences()
            .then((data) => {
                if (isMounted && data && Object.keys(data).length > 0) {
                    const merged = { ...defaultPreferences, ...data };
                    setPreferences(merged);
                    localStorage.setItem('user_prefs', JSON.stringify(merged));
                }
            })
            .catch((err) => {
                console.warn('Kullanıcı tercihleri sunucudan alınamadı, yerel ayarlar kullanılıyor:', err);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    // 2. Opdater indstillinger, og gem dem i databasen (debounced).
    const updatePreferences = useCallback((newPrefs: Partial<UserPreferences>) => {
        setPreferences((prev) => {
            const updated = { ...prev, ...newPrefs };
            localStorage.setItem('user_prefs', JSON.stringify(updated));

            // Brug debounce for at undgå mange API-kald ved hurtige klik.
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
                preferenceService.savePreferences(updated).catch((err) => {
                    console.error('Tercihler sunucuya kaydedilemedi:', err);
                });
            }, 500);

            return updated;
        });
    }, []);

    return { preferences, updatePreferences, loading };
};
