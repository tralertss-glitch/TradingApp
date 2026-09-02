import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { api } from './Services/api';
import { authService } from './Services/authService';
import { watchlistService } from './Services/watchlistService';
import { symbolApi } from './Services/symbolApi';
import { preferenceService } from './Services/preferenceService';
import { alertService } from './Services/alertService';
import { signalrService } from './Services/signalrService';
import type { WatchlistResponseDto } from './Types/watchlist';
import type { SymbolResponseDto } from './Types/symbol';
import type { ChartType } from './Types/candle';
import type { Alert, CreateAlertRequest } from './Types/alert';
import type { User } from './Types/auth';
import { DEFAULT_INDICATORS, type IndicatorConfig } from './Types/indicator';
import { DEFAULT_CHART_SETTINGS, type ChartVisualSettings } from './Types/chartSettings';
import type { UserPreferences } from './Types/preferences';
import { AuthPage } from './Pages/AuthPage';
import { AdminPanel } from './Pages/AdminPanel';
import { ProtectedRoute } from './Components/Common/ProtectedRoute';
import { HeaderNavbar } from './Components/HeaderNavbar';
import { CandlestickChart } from './Components/Chart/CandlestickChart';
import { ChartSettingsModal } from './Components/ChartSettingsModal';
import { CreateAlertModal } from './Components/CreateAlertModal';
import { useTheme } from './Context/ThemeContext';

// LocalStorage-nøgler
const STORAGE_KEYS = {
    SYMBOL: 'app_last_symbol',
    INTERVAL: 'app_last_interval',
    CHART_TYPE: 'app_chart_type',
    LAYOUT_MODE: 'app_layout_mode',
    INDICATORS: 'app_indicators',
    CHART_SETTINGS: 'app_chart_settings',
};

// Hjælpefunktion, der sikkert kombinerer gemte indikatorer med DEFAULT_INDICATORS.
type StoredIndicator = Partial<IndicatorConfig> & {
    Id?: string;
    Type?: IndicatorConfig['type'];
    Name?: string;
    Enabled?: boolean;
    Color?: string;
    Period?: number;
    FastPeriod?: number;
    SlowPeriod?: number;
    SignalPeriod?: number;
    StdDev?: number;
};

type StoredVisualSettings = Partial<ChartVisualSettings> & {
    UpColor?: string;
    DownColor?: string;
    ShowBorders?: boolean;
    ShowWicks?: boolean;
    ShowGrid?: boolean;
    GridColorDark?: string;
    GridColorLight?: string;
    ShowPriceLine?: boolean;
    SoundEnabled?: boolean;
};

const mergeIndicators = (savedList: unknown): IndicatorConfig[] => {
    if (!Array.isArray(savedList) || savedList.length === 0) {
        return DEFAULT_INDICATORS;
    }

    const storedIndicators = savedList.filter(
        (item): item is StoredIndicator => typeof item === 'object' && item !== null
    );

    return DEFAULT_INDICATORS.map((defaultIndicator) => {
        const saved = storedIndicators.find(
            (item) =>
                (item.id ?? item.Id) === defaultIndicator.id ||
                (item.name ?? item.Name) === defaultIndicator.name
        );

        if (!saved) return defaultIndicator;

        const enabled = saved.enabled ?? saved.Enabled;
        return {
            ...defaultIndicator,
            enabled: typeof enabled === 'boolean' ? enabled : defaultIndicator.enabled,
            color: saved.color ?? saved.Color ?? defaultIndicator.color,
            period: saved.period ?? saved.Period ?? defaultIndicator.period,
            fastPeriod: saved.fastPeriod ?? saved.FastPeriod ?? defaultIndicator.fastPeriod,
            slowPeriod: saved.slowPeriod ?? saved.SlowPeriod ?? defaultIndicator.slowPeriod,
            signalPeriod: saved.signalPeriod ?? saved.SignalPeriod ?? defaultIndicator.signalPeriod,
            stdDev: saved.stdDev ?? saved.StdDev ?? defaultIndicator.stdDev,
        };
    });
};

// Hjælpefunktion, der normaliserer indstillinger fra backend eller storage.
const normalizeVisualSettings = (rawSettings: unknown): ChartVisualSettings => {
    if (!rawSettings || typeof rawSettings !== 'object') return DEFAULT_CHART_SETTINGS;

    const settings = rawSettings as StoredVisualSettings;
    return {
        ...DEFAULT_CHART_SETTINGS,
        upColor: settings.upColor ?? settings.UpColor ?? DEFAULT_CHART_SETTINGS.upColor,
        downColor: settings.downColor ?? settings.DownColor ?? DEFAULT_CHART_SETTINGS.downColor,
        showBorders: settings.showBorders ?? settings.ShowBorders ?? DEFAULT_CHART_SETTINGS.showBorders,
        showWicks: settings.showWicks ?? settings.ShowWicks ?? DEFAULT_CHART_SETTINGS.showWicks,
        showGrid: settings.showGrid ?? settings.ShowGrid ?? DEFAULT_CHART_SETTINGS.showGrid,
        gridColorDark: settings.gridColorDark ?? settings.GridColorDark ?? DEFAULT_CHART_SETTINGS.gridColorDark,
        gridColorLight: settings.gridColorLight ?? settings.GridColorLight ?? DEFAULT_CHART_SETTINGS.gridColorLight,
        showPriceLine: settings.showPriceLine ?? settings.ShowPriceLine ?? DEFAULT_CHART_SETTINGS.showPriceLine,
        soundEnabled: settings.soundEnabled ?? settings.SoundEnabled ?? DEFAULT_CHART_SETTINGS.soundEnabled,
    };
};

export const App: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { isDark, setTheme } = useTheme();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
    const currentUser = authService.getCurrentUser();

    // 🛑 State for mistet backend-forbindelse.
    const [isBackendDown, setIsBackendDown] = useState<boolean>(false);

    // 🛑 AKTIV VISNING: Admin/SuperAdmin starter som standard i admin-visningen, normale brugere i terminalen.
    const [currentView, setCurrentView] = useState<'terminal' | 'admin'>(() => {
        const user = authService.getCurrentUser();
        const role = (user?.role || '').toLowerCase();
        return role === 'admin' || role === 'superadmin' ? 'admin' : 'terminal';
    });

    // 1. Startværdier (LocalStorage eller standardværdier)
    const [currentSymbol, setCurrentSymbol] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEYS.SYMBOL) || 'BTCUSDT';
    });

    const [currentSymbolId, setCurrentSymbolId] = useState<number>(() => {
        const saved = Number(localStorage.getItem('tradingapp_symbol_id'));
        return Number.isFinite(saved) && saved > 0 ? saved : 0;
    });
    const [currentExchangeCode, setCurrentExchangeCode] = useState<string>(() => {
        return localStorage.getItem('tradingapp_exchange_code') || '';
    });

    const [currentInterval, setCurrentInterval] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEYS.INTERVAL) || '15m';
    });

    const [chartType, setChartType] = useState<ChartType>(() => {
        return (localStorage.getItem(STORAGE_KEYS.CHART_TYPE) as ChartType) || 'candles';
    });

    const [layoutMode, setLayoutMode] = useState<'1x1' | '1x2' | '2x2'>(() => {
        return (localStorage.getItem(STORAGE_KEYS.LAYOUT_MODE) as '1x1' | '1x2' | '2x2') || '1x1';
    });

    const [indicators, setIndicators] = useState<IndicatorConfig[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.INDICATORS);
        if (saved) {
            try {
                return mergeIndicators(JSON.parse(saved));
            } catch {
                return DEFAULT_INDICATORS;
            }
        }
        return DEFAULT_INDICATORS;
    });

    const [chartSettings, setChartSettings] = useState<ChartVisualSettings>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.CHART_SETTINGS);
        if (saved) {
            try {
                return normalizeVisualSettings(JSON.parse(saved));
            } catch {
                return DEFAULT_CHART_SETTINGS;
            }
        }
        return DEFAULT_CHART_SETTINGS;
    });

    // Tilstand for modaler, lister og alarmer
    const [activeSymbols, setActiveSymbols] = useState<SymbolResponseDto[]>([]);
    const [watchlists, setWatchlists] = useState<WatchlistResponseDto[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);

    const isInitialFetchDone = useRef<boolean>(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialSymbolRef = useRef<string>(currentSymbol);
    const initialSymbolIdRef = useRef<number>(currentSymbolId);
    const initialExchangeCodeRef = useRef<string>(currentExchangeCode);

    // 🛑 Overvåg backend-forbindelsesfejl og health check.
    useEffect(() => {
        // Håndterer forbindelsen til realtime-data via SignalR.
        const handleConnectionError = () => setIsBackendDown(true);
        // Håndterer forbindelsen til realtime-data via SignalR.
        const handleConnectionRestored = () => setIsBackendDown(false);

        window.addEventListener('backend-connection-error', handleConnectionError);
        window.addEventListener('backend-connection-restored', handleConnectionRestored);

        // Kontroller hvert 5. sekund, om serveren er tilgængelig igen (health check).
        const healthInterval = setInterval(async () => {
            if (isBackendDown) {
                try {
                    await api.get('/exchanges'); // Ping backend via et offentligt endpoint.
                    setIsBackendDown(false);
                } catch (err: unknown) {
                    if (axios.isAxiosError(err) && err.response) {
                        // Hvis serveren svarer, er den tilgængelig, også selv om svaret f.eks. er 401.
                        setIsBackendDown(false);
                    }
                }
            }
        }, 5000);

        return () => {
            window.removeEventListener('backend-connection-error', handleConnectionError);
            window.removeEventListener('backend-connection-restored', handleConnectionRestored);
            clearInterval(healthInterval);
        };
    }, [isBackendDown]);

    // 2. Hent data og indstillinger fra backend, når siden åbnes.
    useEffect(() => {
        if (!isAuthenticated) return;

        let isMounted = true;

        Promise.all([
            symbolApi.searchSymbols().then((all) => all.filter((s) => s.isActive)).catch(() => []),
            watchlistService.getMyWatchlists().catch(() => []),
            preferenceService.getPreferences().catch(() => null),
            alertService.getMyAlerts().catch(() => []),
        ]).then(([syms, lists, dbPrefs, userAlerts]) => {
            if (!isMounted) return;

            if (Array.isArray(syms)) {
                setActiveSymbols(syms);

                const preferredName = (
                    dbPrefs?.lastSymbol ||
                    initialSymbolRef.current ||
                    ''
                ).toUpperCase();

                const selected =
                    syms.find(
                        (s: SymbolResponseDto) =>
                            s.id === initialSymbolIdRef.current &&
                            (!initialExchangeCodeRef.current ||
                                s.exchangeCode.toUpperCase() ===
                                initialExchangeCodeRef.current.toUpperCase())
                    ) ||
                    syms.find(
                        (s: SymbolResponseDto) =>
                            s.name.toUpperCase() === preferredName &&
                            (!initialExchangeCodeRef.current ||
                                s.exchangeCode.toUpperCase() ===
                                initialExchangeCodeRef.current.toUpperCase())
                    ) ||
                    syms.find(
                        (s: SymbolResponseDto) =>
                            s.name.toUpperCase() === preferredName
                    ) ||
                    syms[0];

                if (selected) {
                    setCurrentSymbol(selected.name);
                    setCurrentSymbolId(selected.id);
                    setCurrentExchangeCode(selected.exchangeCode);
                    localStorage.setItem(STORAGE_KEYS.SYMBOL, selected.name);
                    localStorage.setItem(
                        'tradingapp_symbol_id',
                        String(selected.id)
                    );
                    localStorage.setItem(
                        'tradingapp_exchange_code',
                        selected.exchangeCode
                    );
                }
            }
            if (Array.isArray(lists)) setWatchlists(lists);
            if (Array.isArray(userAlerts)) setAlerts(userAlerts);

            if (dbPrefs) {
                // TEMA
                const themeVal = dbPrefs.theme;
                if (themeVal && (themeVal === 'dark' || themeVal === 'light')) {
                    if (typeof setTheme === 'function') {
                        setTheme(themeVal, false);
                    }
                }

                // INTERVAL
                const intervalVal = dbPrefs.lastInterval;
                if (intervalVal) {
                    setCurrentInterval(intervalVal);
                    localStorage.setItem(STORAGE_KEYS.INTERVAL, intervalVal);
                }

                // CHARTTYPE
                const chartTypeVal = dbPrefs.chartType;
                if (chartTypeVal) {
                    setChartType(chartTypeVal as ChartType);
                    localStorage.setItem(STORAGE_KEYS.CHART_TYPE, chartTypeVal);
                }

                // LAYOUT
                const layoutVal = dbPrefs.layoutMode;
                if (layoutVal) {
                    setLayoutMode(layoutVal as '1x1' | '1x2' | '2x2');
                    localStorage.setItem(STORAGE_KEYS.LAYOUT_MODE, layoutVal);
                }

                // INDIKATORER
                const rawIndicators = dbPrefs.indicators;
                if (rawIndicators && Array.isArray(rawIndicators)) {
                    const merged = mergeIndicators(rawIndicators);
                    setIndicators(merged);
                    localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(merged));
                }

                // VISUELLE INDSTILLINGER
                const rawVisual = dbPrefs.visualSettings;
                if (rawVisual) {
                    const normalized = normalizeVisualSettings(rawVisual);
                    setChartSettings(normalized);
                    localStorage.setItem(STORAGE_KEYS.CHART_SETTINGS, JSON.stringify(normalized));
                }
            }

            isInitialFetchDone.current = true;
        });

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated, setTheme]);

    // 3. Realtidslistener til SignalR til udløste alarmer.
    useEffect(() => {
        if (!isAuthenticated) return;

        // Behandler den relevante brugerhandling eller event.
        const handleAlertTriggered = (triggeredAlert: Alert) => {
            if (chartSettings.soundEnabled) {
                try {
                    const audio = new Audio('/sounds/alert.mp3');
                    audio.volume = 0.8;
                    audio.play().catch((error: unknown) => {
                        console.warn('[App] Alarm sesi çalınamadı:', error);
                    });
                } catch (error: unknown) {
                    console.warn('[App] Alarm sesi oluşturulamadı:', error);
                }
            }

            setAlerts((prev) =>
                prev.map((a) =>
                    a.id === triggeredAlert.id ? { ...a, isTriggered: true, isActive: false } : a
                )
            );
        };

        signalrService.subscribeToAlertTriggered(handleAlertTriggered);

        return () => {
            signalrService.unsubscribeFromAlertTriggered(handleAlertTriggered);
        };
    }, [isAuthenticated, chartSettings.soundEnabled]);

    // 4. Gem brugerindstillinger eller tema i databasen ved ændringer (debounced 500 ms).
    useEffect(() => {
        if (!isAuthenticated || !isInitialFetchDone.current) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            const language: UserPreferences['language'] = i18n.language.startsWith('da')
                ? 'da'
                : i18n.language.startsWith('en')
                    ? 'en'
                    : 'tr';

            const preferences: UserPreferences = {
                theme: isDark ? 'dark' : 'light',
                language,
                lastSymbol: currentSymbol,
                lastInterval: currentInterval,
                chartType,
                layoutMode,
                indicators: indicators.map((indicator) => ({
                    id: indicator.id,
                    type: indicator.type,
                    name: indicator.name,
                    enabled: indicator.enabled,
                    color: indicator.color,
                    period: indicator.period,
                    fastPeriod: indicator.fastPeriod,
                    slowPeriod: indicator.slowPeriod,
                    signalPeriod: indicator.signalPeriod,
                    stdDev: indicator.stdDev,
                })),
                visualSettings: {
                    upColor: chartSettings.upColor,
                    downColor: chartSettings.downColor,
                    showBorders: chartSettings.showBorders,
                    showWicks: chartSettings.showWicks,
                    showGrid: chartSettings.showGrid,
                    gridColorDark: chartSettings.gridColorDark,
                    gridColorLight: chartSettings.gridColorLight,
                    showPriceLine: chartSettings.showPriceLine,
                    soundEnabled: chartSettings.soundEnabled ?? true,
                },
            };

            preferenceService
                .savePreferences(preferences)
                .catch((err) => {
                    console.warn('Tercihler veritabanına kaydedilemedi:', err);
                });
        }, 500);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [isAuthenticated, isDark, currentSymbol, currentInterval, chartType, layoutMode, indicators, chartSettings, i18n.language]);

    // 5. Alarmfunktioner
    const handleCreateAlert = async (data: CreateAlertRequest) => {
        const created = await alertService.createAlert(data);
        if (created) {
            setAlerts((prev) => [created, ...prev]);
        }
    };

    // Behandler den relevante brugerhandling eller event.
    const handleToggleAlert = async (alertId: string) => {
        await alertService.toggleAlert(alertId);
        setAlerts((prev) =>
            prev.map((a) => (a.id === alertId ? { ...a, isActive: !a.isActive } : a))
        );
    };

    // Fjerner det valgte element.
    const handleDeleteAlert = async (alertId: string) => {
        await alertService.deleteAlert(alertId);
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    };

    // Kontroller rolle og naviger efter vellykket login.
    const handleLoginSuccess = useCallback((user?: User) => {
        setIsAuthenticated(true);
        const loggedUser = user || authService.getCurrentUser();
        const role = (loggedUser?.role || '').toLowerCase();

        if (role === 'admin' || role === 'superadmin') {
            setCurrentView('admin');
        } else {
            setCurrentView('terminal');
        }
    }, []);

    // Behandler den relevante brugerhandling eller event.
    const handleLogout = useCallback(() => {
        authService.logout();
        setIsAuthenticated(false);
        setWatchlists([]);
        setAlerts([]);
        isInitialFetchDone.current = false;
        setCurrentView('terminal');
    }, []);

    // Skift aktivt symbol og interval.
    const handleActiveStateChange = useCallback((symbol: string, interval: string, symbolInfo?: SymbolResponseDto) => {
        const resolved = symbolInfo || activeSymbols.find((s) => s.name.toUpperCase() === symbol.toUpperCase());
        if (resolved) {
            setCurrentSymbolId(resolved.id);
            setCurrentExchangeCode(resolved.exchangeCode);
            localStorage.setItem('tradingapp_symbol_id', String(resolved.id));
            localStorage.setItem('tradingapp_exchange_code', resolved.exchangeCode);
        }
        setCurrentSymbol((prev) => {
            if (prev !== symbol) {
                localStorage.setItem(STORAGE_KEYS.SYMBOL, symbol);
                return symbol;
            }
            return prev;
        });

        setCurrentInterval((prev) => {
            if (prev !== interval) {
                localStorage.setItem(STORAGE_KEYS.INTERVAL, interval);
                return interval;
            }
            return prev;
        });
    }, [activeSymbols]);

    // Behandler den relevante brugerhandling eller event.
    const handleSelectChartType = useCallback((type: ChartType) => {
        setChartType(type);
        localStorage.setItem(STORAGE_KEYS.CHART_TYPE, type);
    }, []);

    // Behandler den relevante brugerhandling eller event.
    const handleChangeLayout = useCallback((layout: '1x1' | '1x2' | '2x2') => {
        setLayoutMode(layout);
        localStorage.setItem(STORAGE_KEYS.LAYOUT_MODE, layout);
    }, []);

    // Behandler den relevante brugerhandling eller event.
    const handleToggleIndicator = useCallback((indicatorId: string) => {
        setIndicators((prev) => {
            const updated = prev.map((ind) =>
                ind.id === indicatorId ? { ...ind, enabled: !ind.enabled } : ind
            );
            localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Håndterer refresh active symbols.
    const refreshActiveSymbols = useCallback(async () => {
        try {
            const all = await symbolApi.searchSymbols();
            const active = all.filter((symbol) => symbol.isActive);
            setActiveSymbols(active);
            const selected = active.find((symbol) => symbol.id === currentSymbolId)
                || active.find((symbol) => symbol.name.toUpperCase() === currentSymbol.toUpperCase())
                || active[0];
            if (selected) {
                setCurrentSymbol(selected.name);
                setCurrentSymbolId(selected.id);
                setCurrentExchangeCode(selected.exchangeCode);
                localStorage.setItem(STORAGE_KEYS.SYMBOL, selected.name);
                localStorage.setItem('tradingapp_symbol_id', String(selected.id));
                localStorage.setItem('tradingapp_exchange_code', selected.exchangeCode);
            }
        } catch (err) {
            console.warn('Aktif semboller yenilenemedi:', err);
        }
    }, [currentSymbol, currentSymbolId]);

    // Behandler den relevante brugerhandling eller event.
    const handleSwitchToTerminal = useCallback(async () => {
        await refreshActiveSymbols();
        setCurrentView('terminal');
    }, [refreshActiveSymbols]);

    // Gemmer de aktuelle data eller brugerindstillinger.
    const handleSaveChartSettings = useCallback((newSettings: ChartVisualSettings) => {
        setChartSettings(newSettings);
        localStorage.setItem(STORAGE_KEYS.CHART_SETTINGS, JSON.stringify(newSettings));
        setIsSettingsOpen(false);
    }, []);

    return (
        <div
            className={`min-h-screen transition-colors duration-300 relative ${isDark ? 'bg-[#0b0e14] text-white' : 'bg-gray-100 text-gray-900'
                }`}
        >
            {/* 🚨 Banner ved mistet backend-forbindelse */}
            {isBackendDown && (
                <div className="bg-red-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center space-x-2 fixed top-0 left-0 right-0 z-[99999] shadow-2xl animate-pulse">
                    <WifiOff className="w-4 h-4 shrink-0" />
                    <span>{t('app.backendDisconnected')}</span>
                </div>
            )}

            <ProtectedRoute fallback={<AuthPage onLoginSuccess={handleLoginSuccess} />}>
                {/* 🔒 1. ADMIN-VISNING */}
                {currentView === 'admin' ? (
                    <AdminPanel
                        onSwitchToTerminal={handleSwitchToTerminal}
                        onLogout={handleLogout}
                    />
                ) : (
                    /* 📈 2. STANDART GRAFİK & TERMİNAL GÖRÜNÜMÜ */
                    <div className="flex flex-col h-screen overflow-hidden">
                        {/* ØVERSTE KONTROLLINJE */}
                        <HeaderNavbar
                            currentUser={currentUser}
                            onLogout={handleLogout}
                            watchlists={watchlists}
                            currentSymbol={currentSymbol}
                            currentSymbolId={currentSymbolId}
                            currentExchangeCode={currentExchangeCode}
                            currentInterval={currentInterval}
                            chartType={chartType}
                            onSelectChartType={handleSelectChartType}
                            layoutMode={layoutMode}
                            activeSymbols={activeSymbols}
                            indicators={indicators}
                            onToggleIndicator={handleToggleIndicator}
                            onSelectSymbol={(sym) => handleActiveStateChange(sym.name, currentInterval, sym)}
                            onSelectInterval={(inv) => handleActiveStateChange(currentSymbol, inv)}
                            onChangeLayout={handleChangeLayout}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                            onOpenAlertModal={() => setIsAlertModalOpen(true)}
                        />

                        {/* CHARTOMRÅDE */}
                        <main className="flex-1 p-1 overflow-hidden">
                            <CandlestickChart
                                layoutMode={layoutMode}
                                activeSymbol={currentSymbol}
                                activeSymbolId={currentSymbolId}
                                activeExchangeCode={currentExchangeCode}
                                activeInterval={currentInterval}
                                chartType={chartType}
                                indicators={indicators}
                                chartSettings={chartSettings}
                                alerts={alerts}
                                onToggleAlert={handleToggleAlert}
                                onDeleteAlert={handleDeleteAlert}
                                onOpenCreateAlert={() => setIsAlertModalOpen(true)}
                                onActiveStateChange={handleActiveStateChange}
                            />
                        </main>
                    </div>
                )}

                {/* MODAL TIL CHARTINDSTILLINGER */}
                <ChartSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    settings={chartSettings}
                    onSave={handleSaveChartSettings}
                    isDark={isDark}
                />

                {/* MODAL TIL OPRETTELSE AF ALARM */}
                <CreateAlertModal
                    isOpen={isAlertModalOpen}
                    onClose={() => setIsAlertModalOpen(false)}
                    symbolId={currentSymbolId}
                    symbol={currentSymbol}
                    onSave={handleCreateAlert}
                    isDark={isDark}
                />
            </ProtectedRoute>
        </div>
    );
};

export default App;
