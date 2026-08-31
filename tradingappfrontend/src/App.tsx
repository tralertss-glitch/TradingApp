import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { api } from './Services/api';
import { authService } from './Services/authService';
import { watchlistService } from './Services/watchlistService';
import { symbolApi } from './Services/symbolApi';
import { preferenceService } from './Services/preferenceService';
import type { WatchlistResponseDto } from './Types/watchlist';
import type { SymbolResponseDto } from './Types/symbol';
import type { ChartType } from './Types/candle';
import type { User } from './Types/auth';

import {
    DEFAULT_INDICATORS,
    type IndicatorConfig,
} from './Types/indicator';

import {
    DEFAULT_CHART_SETTINGS,
    type ChartVisualSettings,
} from './Types/chartSettings';

import { AuthPage } from './Pages/AuthPage';
import { AdminPanel } from './Pages/AdminPanel';

import { ProtectedRoute } from './Components/Common/ProtectedRoute';
import { HeaderNavbar } from './Components/HeaderNavbar';
import { CandlestickChart } from './Components/Chart/CandlestickChart';
import { ChartSettingsModal } from './Components/ChartSettingsModal';
import { CreateAlertModal } from './Components/CreateAlertModal';

import { useTheme } from './Context/ThemeContext';
import { useAlerts } from './hooks/useAlerts';


// LocalStorage-nøgler
const STORAGE_KEYS = {
    SYMBOL: 'app_last_symbol',
    INTERVAL: 'app_last_interval',
    CHART_TYPE: 'app_chart_type',
    LAYOUT_MODE: 'app_layout_mode',
    INDICATORS: 'app_indicators',
    CHART_SETTINGS: 'app_chart_settings',
};


/*
 * Hjælpefunktion, der sikkert kombinerer gemte
 * indikatorer med DEFAULT_INDICATORS.
 */
const mergeIndicators = (
    savedList: any[] | null | undefined
): IndicatorConfig[] => {
    if (
        !Array.isArray(savedList) ||
        savedList.length === 0
    ) {
        return DEFAULT_INDICATORS;
    }

    return DEFAULT_INDICATORS.map(
        (defaultInd) => {
            const saved = savedList.find(
                (s) =>
                    (s.id || s.Id) ===
                    defaultInd.id ||
                    (s.name || s.Name) ===
                    defaultInd.name
            );

            if (saved) {
                const enabled =
                    saved.enabled ??
                    saved.Enabled;

                return {
                    ...defaultInd,

                    enabled:
                        typeof enabled ===
                            'boolean'
                            ? enabled
                            : defaultInd.enabled,

                    color:
                        saved.color ||
                        saved.Color ||
                        defaultInd.color,

                    period:
                        saved.period ||
                        saved.Period ||
                        defaultInd.period,

                    fastPeriod:
                        saved.fastPeriod ||
                        saved.FastPeriod ||
                        defaultInd.fastPeriod,

                    slowPeriod:
                        saved.slowPeriod ||
                        saved.SlowPeriod ||
                        defaultInd.slowPeriod,

                    signalPeriod:
                        saved.signalPeriod ||
                        saved.SignalPeriod ||
                        defaultInd.signalPeriod,

                    stdDev:
                        saved.stdDev ||
                        saved.StdDev ||
                        defaultInd.stdDev,
                };
            }

            return defaultInd;
        }
    );
};


/*
 * Hjælpefunktion, der normaliserer indstillinger
 * fra backend eller LocalStorage.
 */
const normalizeVisualSettings = (
    rawSettings: any
): ChartVisualSettings => {
    if (!rawSettings) {
        return DEFAULT_CHART_SETTINGS;
    }

    return {
        ...DEFAULT_CHART_SETTINGS,

        upColor:
            rawSettings.upColor ||
            rawSettings.UpColor ||
            DEFAULT_CHART_SETTINGS.upColor,

        downColor:
            rawSettings.downColor ||
            rawSettings.DownColor ||
            DEFAULT_CHART_SETTINGS.downColor,

        showBorders:
            rawSettings.showBorders ??
            rawSettings.ShowBorders ??
            DEFAULT_CHART_SETTINGS.showBorders,

        showWicks:
            rawSettings.showWicks ??
            rawSettings.ShowWicks ??
            DEFAULT_CHART_SETTINGS.showWicks,

        showGrid:
            rawSettings.showGrid ??
            rawSettings.ShowGrid ??
            DEFAULT_CHART_SETTINGS.showGrid,

        gridColorDark:
            rawSettings.gridColorDark ||
            rawSettings.GridColorDark ||
            DEFAULT_CHART_SETTINGS.gridColorDark,

        gridColorLight:
            rawSettings.gridColorLight ||
            rawSettings.GridColorLight ||
            DEFAULT_CHART_SETTINGS.gridColorLight,

        showPriceLine:
            rawSettings.showPriceLine ??
            rawSettings.ShowPriceLine ??
            DEFAULT_CHART_SETTINGS.showPriceLine,

        soundEnabled:
            rawSettings.soundEnabled ??
            rawSettings.SoundEnabled ??
            DEFAULT_CHART_SETTINGS.soundEnabled,
    };
};


export const App: React.FC = () => {
    const { t } = useTranslation();

    const {
        isDark,
        setTheme,
    } = useTheme();


    /*
     * Authentication
     */
    const [
        isAuthenticated,
        setIsAuthenticated,
    ] = useState<boolean>(() =>
        authService.isAuthenticated()
    );


    const currentUser = useMemo(
        () =>
            authService.getCurrentUser(),
        [isAuthenticated]
    );


    /*
     * Backend connection state
     */
    const [
        isBackendDown,
        setIsBackendDown,
    ] = useState<boolean>(false);


    /*
     * Aktif görünüm.
     */
    const [
        currentView,
        setCurrentView,
    ] = useState<'terminal' | 'admin'>(
        () => {
            const user =
                authService.getCurrentUser();

            const role = (
                user?.role || ''
            ).toLowerCase();

            return role === 'admin' ||
                role === 'superadmin'
                ? 'admin'
                : 'terminal';
        }
    );


    /*
     * Aktif symbol.
     */
    const [
        currentSymbol,
        setCurrentSymbol,
    ] = useState<string>(() => {
        return (
            localStorage.getItem(
                STORAGE_KEYS.SYMBOL
            ) || 'BTCUSDT'
        );
    });


    /*
     * Aktif symbol ID.
     */
    const [
        currentSymbolId,
        setCurrentSymbolId,
    ] = useState<number>(() => {
        const saved = Number(
            localStorage.getItem(
                'tradingapp_symbol_id'
            )
        );

        return Number.isFinite(saved) &&
            saved > 0
            ? saved
            : 0;
    });


    /*
     * Aktif exchange.
     */
    const [
        currentExchangeCode,
        setCurrentExchangeCode,
    ] = useState<string>(() => {
        return (
            localStorage.getItem(
                'tradingapp_exchange_code'
            ) || ''
        );
    });


    /*
     * Aktif interval.
     */
    const [
        currentInterval,
        setCurrentInterval,
    ] = useState<string>(() => {
        return (
            localStorage.getItem(
                STORAGE_KEYS.INTERVAL
            ) || '15m'
        );
    });


    /*
     * Grafik tipi.
     */
    const [
        chartType,
        setChartType,
    ] = useState<ChartType>(() => {
        return (
            localStorage.getItem(
                STORAGE_KEYS.CHART_TYPE
            ) as ChartType
        ) || 'candles';
    });


    /*
     * Layout.
     */
    const [
        layoutMode,
        setLayoutMode,
    ] = useState<
        '1x1' | '1x2' | '2x2'
    >(() => {
        return (
            localStorage.getItem(
                STORAGE_KEYS.LAYOUT_MODE
            ) as
            | '1x1'
            | '1x2'
            | '2x2'
        ) || '1x1';
    });


    /*
     * İndikatörler.
     */
    const [
        indicators,
        setIndicators,
    ] = useState<IndicatorConfig[]>(
        () => {
            const saved =
                localStorage.getItem(
                    STORAGE_KEYS.INDICATORS
                );

            if (saved) {
                try {
                    return mergeIndicators(
                        JSON.parse(saved)
                    );
                } catch {
                    return DEFAULT_INDICATORS;
                }
            }

            return DEFAULT_INDICATORS;
        }
    );


    /*
     * Chart ayarları.
     */
    const [
        chartSettings,
        setChartSettings,
    ] = useState<ChartVisualSettings>(
        () => {
            const saved =
                localStorage.getItem(
                    STORAGE_KEYS.CHART_SETTINGS
                );

            if (saved) {
                try {
                    return normalizeVisualSettings(
                        JSON.parse(saved)
                    );
                } catch {
                    return DEFAULT_CHART_SETTINGS;
                }
            }

            return DEFAULT_CHART_SETTINGS;
        }
    );


    /*
     * ALERT HOOK
     *
     * Alarm ile ilgili bütün state, API, SignalR
     * ve ses yönetimi artık useAlerts içinde.
     */
    const {
        alerts,
        createAlert,
        toggleAlert,
        deleteAlert,
    } = useAlerts(
        isAuthenticated,
        chartSettings.soundEnabled ??
        true
    );


    /*
     * Diğer state'ler.
     */
    const [
        activeSymbols,
        setActiveSymbols,
    ] = useState<
        SymbolResponseDto[]
    >([]);


    const [
        watchlists,
        setWatchlists,
    ] = useState<
        WatchlistResponseDto[]
    >([]);


    const [
        isSettingsOpen,
        setIsSettingsOpen,
    ] = useState<boolean>(false);


    const [
        isAlertModalOpen,
        setIsAlertModalOpen,
    ] = useState<boolean>(false);


    /*
     * Ref'ler.
     */
    const isInitialFetchDone =
        useRef<boolean>(false);


    const saveTimeoutRef =
        useRef<
            ReturnType<
                typeof setTimeout
            > | null
        >(null);


    /*
     * Backend bağlantı durumunu izle.
     */
    useEffect(() => {
        const handleConnectionError =
            (): void => {
                setIsBackendDown(true);
            };

        const handleConnectionRestored =
            (): void => {
                setIsBackendDown(false);
            };

        window.addEventListener(
            'backend-connection-error',
            handleConnectionError
        );

        window.addEventListener(
            'backend-connection-restored',
            handleConnectionRestored
        );


        const healthInterval =
            setInterval(
                async () => {
                    if (
                        !isBackendDown
                    ) {
                        return;
                    }

                    try {
                        await api.get(
                            '/exchanges'
                        );

                        setIsBackendDown(
                            false
                        );
                    } catch (
                    err: any
                    ) {
                        /*
                         * Backend cevap veriyorsa,
                         * 401 gibi status olsa bile
                         * sunucu ayakta demektir.
                         */
                        if (
                            err.response
                        ) {
                            setIsBackendDown(
                                false
                            );
                        }
                    }
                },
                5000
            );


        return () => {
            window.removeEventListener(
                'backend-connection-error',
                handleConnectionError
            );

            window.removeEventListener(
                'backend-connection-restored',
                handleConnectionRestored
            );

            clearInterval(
                healthInterval
            );
        };
    }, [isBackendDown]);


    /*
     * Backend'den ilk verileri ve kullanıcı
     * ayarlarını getir.
     *
     * Alert artık burada çekilmiyor.
     * useAlerts kendi getiriyor.
     */
    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        let isMounted = true;

        Promise.all([
            symbolApi
                .searchSymbols()
                .then((all) =>
                    all.filter(
                        (symbol) =>
                            symbol.isActive
                    )
                )
                .catch(() => []),

            watchlistService
                .getMyWatchlists()
                .catch(() => []),

            preferenceService
                .getPreferences()
                .catch(() => null),
        ]).then(
            ([
                syms,
                lists,
                dbPrefs,
            ]) => {
                if (!isMounted) {
                    return;
                }


                /*
                 * Symbols
                 */
                if (
                    Array.isArray(
                        syms
                    )
                ) {
                    setActiveSymbols(
                        syms
                    );

                    const preferredName = (
                        dbPrefs?.lastSymbol ||
                        dbPrefs?.LastSymbol ||
                        currentSymbol ||
                        ''
                    ).toUpperCase();


                    const selected =
                        syms.find(
                            (
                                symbol: SymbolResponseDto
                            ) =>
                                symbol.name.toUpperCase() ===
                                preferredName
                        ) ||
                        syms[0];


                    if (selected) {
                        setCurrentSymbol(
                            selected.name
                        );

                        setCurrentSymbolId(
                            selected.id
                        );

                        setCurrentExchangeCode(
                            selected.exchangeCode
                        );

                        localStorage.setItem(
                            STORAGE_KEYS.SYMBOL,
                            selected.name
                        );

                        localStorage.setItem(
                            'tradingapp_symbol_id',
                            String(
                                selected.id
                            )
                        );

                        localStorage.setItem(
                            'tradingapp_exchange_code',
                            selected.exchangeCode
                        );
                    }
                }


                /*
                 * Watchlists
                 */
                if (
                    Array.isArray(
                        lists
                    )
                ) {
                    setWatchlists(
                        lists
                    );
                }


                /*
                 * Preferences
                 */
                if (dbPrefs) {
                    /*
                     * Theme
                     */
                    const themeVal =
                        dbPrefs.theme ||
                        dbPrefs.Theme;

                    if (
                        themeVal &&
                        (
                            themeVal ===
                            'dark' ||
                            themeVal ===
                            'light'
                        )
                    ) {
                        if (
                            typeof setTheme ===
                            'function'
                        ) {
                            setTheme(
                                themeVal,
                                false
                            );
                        }
                    }


                    /*
                     * Symbol
                     */
                    const symbolVal =
                        dbPrefs.lastSymbol ||
                        dbPrefs.LastSymbol;

                    if (symbolVal) {
                        setCurrentSymbol(
                            symbolVal
                        );

                        localStorage.setItem(
                            STORAGE_KEYS.SYMBOL,
                            symbolVal
                        );
                    }


                    /*
                     * Interval
                     */
                    const intervalVal =
                        dbPrefs.lastInterval ||
                        dbPrefs.LastInterval;

                    if (
                        intervalVal
                    ) {
                        setCurrentInterval(
                            intervalVal
                        );

                        localStorage.setItem(
                            STORAGE_KEYS.INTERVAL,
                            intervalVal
                        );
                    }


                    /*
                     * Chart type
                     */
                    const chartTypeVal =
                        dbPrefs.chartType ||
                        dbPrefs.ChartType;

                    if (
                        chartTypeVal
                    ) {
                        setChartType(
                            chartTypeVal as ChartType
                        );

                        localStorage.setItem(
                            STORAGE_KEYS.CHART_TYPE,
                            chartTypeVal
                        );
                    }


                    /*
                     * Layout
                     */
                    const layoutVal =
                        dbPrefs.layoutMode ||
                        dbPrefs.LayoutMode;

                    if (
                        layoutVal
                    ) {
                        setLayoutMode(
                            layoutVal as
                            | '1x1'
                            | '1x2'
                            | '2x2'
                        );

                        localStorage.setItem(
                            STORAGE_KEYS.LAYOUT_MODE,
                            layoutVal
                        );
                    }


                    /*
                     * Indicators
                     */
                    const rawIndicators =
                        dbPrefs.indicators ||
                        dbPrefs.Indicators;

                    if (
                        rawIndicators &&
                        Array.isArray(
                            rawIndicators
                        )
                    ) {
                        const merged =
                            mergeIndicators(
                                rawIndicators
                            );

                        setIndicators(
                            merged
                        );

                        localStorage.setItem(
                            STORAGE_KEYS.INDICATORS,
                            JSON.stringify(
                                merged
                            )
                        );
                    }


                    /*
                     * Visual settings
                     */
                    const rawVisual =
                        dbPrefs.visualSettings ||
                        dbPrefs.VisualSettings ||
                        dbPrefs.chartSettings;


                    if (rawVisual) {
                        const normalized =
                            normalizeVisualSettings(
                                rawVisual
                            );

                        setChartSettings(
                            normalized
                        );

                        localStorage.setItem(
                            STORAGE_KEYS.CHART_SETTINGS,
                            JSON.stringify(
                                normalized
                            )
                        );
                    } else if (
                        dbPrefs.candleColors
                    ) {
                        setChartSettings(
                            (previous) => {
                                const merged =
                                {
                                    ...previous,
                                    ...dbPrefs.candleColors,
                                };

                                localStorage.setItem(
                                    STORAGE_KEYS.CHART_SETTINGS,
                                    JSON.stringify(
                                        merged
                                    )
                                );

                                return merged;
                            }
                        );
                    }
                }


                isInitialFetchDone.current =
                    true;
            }
        );


        return () => {
            isMounted = false;
        };
    }, [
        isAuthenticated,
        setTheme,
    ]);


    /*
     * Kullanıcı tercihlerini backend'e kaydet.
     */
    useEffect(() => {
        if (
            !isAuthenticated ||
            !isInitialFetchDone.current
        ) {
            return;
        }


        if (
            saveTimeoutRef.current
        ) {
            clearTimeout(
                saveTimeoutRef.current
            );
        }


        saveTimeoutRef.current =
            setTimeout(() => {
                preferenceService
                    .savePreferences({
                        Theme:
                            isDark
                                ? 'dark'
                                : 'light',

                        theme:
                            isDark
                                ? 'dark'
                                : 'light',

                        LastSymbol:
                            currentSymbol,

                        lastSymbol:
                            currentSymbol,

                        LastInterval:
                            currentInterval,

                        lastInterval:
                            currentInterval,

                        ChartType:
                            chartType,

                        chartType:
                            chartType as any,

                        LayoutMode:
                            layoutMode,

                        layoutMode:
                            layoutMode,

                        Indicators:
                            indicators.map(
                                (indicator) => ({
                                    Id:
                                        indicator.id,

                                    Type:
                                        indicator.type,

                                    Name:
                                        indicator.name,

                                    Enabled:
                                        indicator.enabled,

                                    Color:
                                        indicator.color,

                                    Period:
                                        indicator.period ??
                                        null,

                                    FastPeriod:
                                        indicator.fastPeriod ??
                                        null,

                                    SlowPeriod:
                                        indicator.slowPeriod ??
                                        null,

                                    SignalPeriod:
                                        indicator.signalPeriod ??
                                        null,

                                    StdDev:
                                        indicator.stdDev ??
                                        null,
                                })
                            ),

                        VisualSettings: {
                            UpColor:
                                chartSettings.upColor,

                            DownColor:
                                chartSettings.downColor,

                            ShowBorders:
                                chartSettings.showBorders,

                            ShowWicks:
                                chartSettings.showWicks,

                            ShowGrid:
                                chartSettings.showGrid,

                            GridColorDark:
                                chartSettings.gridColorDark,

                            GridColorLight:
                                chartSettings.gridColorLight,

                            ShowPriceLine:
                                chartSettings.showPriceLine,

                            SoundEnabled:
                                chartSettings.soundEnabled ??
                                true,
                        },
                    } as any)
                    .catch(
                        (
                            error: unknown
                        ) => {
                            console.warn(
                                'Tercihler veritabanına kaydedilemedi:',
                                error
                            );
                        }
                    );
            }, 500);


        return () => {
            if (
                saveTimeoutRef.current
            ) {
                clearTimeout(
                    saveTimeoutRef.current
                );
            }
        };
    }, [
        isAuthenticated,
        isDark,
        currentSymbol,
        currentInterval,
        chartType,
        layoutMode,
        indicators,
        chartSettings,
    ]);


    /*
     * Login sonrası role göre ekran değiştir.
     */
    const handleLoginSuccess =
        useCallback(
            (
                user?: User
            ): void => {
                setIsAuthenticated(
                    true
                );

                const loggedUser =
                    user ||
                    authService.getCurrentUser();

                const role = (
                    loggedUser?.role ||
                    ''
                ).toLowerCase();


                if (
                    role === 'admin' ||
                    role ===
                    'superadmin'
                ) {
                    setCurrentView(
                        'admin'
                    );
                } else {
                    setCurrentView(
                        'terminal'
                    );
                }
            },
            []
        );


    /*
     * Logout.
     */
    const handleLogout =
        useCallback((): void => {
            authService.logout();

            setIsAuthenticated(
                false
            );

            setWatchlists([]);

            isInitialFetchDone.current =
                false;

            setCurrentView(
                'terminal'
            );
        }, []);


    /*
     * Aktif symbol ve interval değiştir.
     */
    const handleActiveStateChange =
        useCallback(
            (
                symbol: string,
                interval: string,
                symbolInfo?: SymbolResponseDto
            ): void => {
                const resolved =
                    symbolInfo ||
                    activeSymbols.find(
                        (item) =>
                            item.name.toUpperCase() ===
                            symbol.toUpperCase()
                    );


                if (resolved) {
                    setCurrentSymbolId(
                        resolved.id
                    );

                    setCurrentExchangeCode(
                        resolved.exchangeCode
                    );

                    localStorage.setItem(
                        'tradingapp_symbol_id',
                        String(
                            resolved.id
                        )
                    );

                    localStorage.setItem(
                        'tradingapp_exchange_code',
                        resolved.exchangeCode
                    );
                }


                setCurrentSymbol(
                    (previous) => {
                        if (
                            previous !==
                            symbol
                        ) {
                            localStorage.setItem(
                                STORAGE_KEYS.SYMBOL,
                                symbol
                            );

                            return symbol;
                        }

                        return previous;
                    }
                );


                setCurrentInterval(
                    (previous) => {
                        if (
                            previous !==
                            interval
                        ) {
                            localStorage.setItem(
                                STORAGE_KEYS.INTERVAL,
                                interval
                            );

                            return interval;
                        }

                        return previous;
                    }
                );
            },
            [activeSymbols]
        );


    /*
     * Chart tipi değiştir.
     */
    const handleSelectChartType =
        useCallback(
            (
                type: ChartType
            ): void => {
                setChartType(
                    type
                );

                localStorage.setItem(
                    STORAGE_KEYS.CHART_TYPE,
                    type
                );
            },
            []
        );


    /*
     * Layout değiştir.
     */
    const handleChangeLayout =
        useCallback(
            (
                layout:
                    | '1x1'
                    | '1x2'
                    | '2x2'
            ): void => {
                setLayoutMode(
                    layout
                );

                localStorage.setItem(
                    STORAGE_KEYS.LAYOUT_MODE,
                    layout
                );
            },
            []
        );


    /*
     * Indicator aç/kapat.
     */
    const handleToggleIndicator =
        useCallback(
            (
                indicatorId: string
            ): void => {
                setIndicators(
                    (previous) => {
                        const updated =
                            previous.map(
                                (
                                    indicator
                                ) =>
                                    indicator.id ===
                                        indicatorId
                                        ? {
                                            ...indicator,
                                            enabled:
                                                !indicator.enabled,
                                        }
                                        : indicator
                            );


                        localStorage.setItem(
                            STORAGE_KEYS.INDICATORS,
                            JSON.stringify(
                                updated
                            )
                        );

                        return updated;
                    }
                );
            },
            []
        );


    /*
     * Aktif symbol listesini yenile.
     */
    const refreshActiveSymbols =
        useCallback(
            async (): Promise<void> => {
                try {
                    const all =
                        await symbolApi.searchSymbols();

                    const active =
                        all.filter(
                            (symbol) =>
                                symbol.isActive
                        );


                    setActiveSymbols(
                        active
                    );


                    const selected =
                        active.find(
                            (symbol) =>
                                symbol.id ===
                                currentSymbolId
                        ) ||
                        active.find(
                            (symbol) =>
                                symbol.name.toUpperCase() ===
                                currentSymbol.toUpperCase()
                        ) ||
                        active[0];


                    if (selected) {
                        setCurrentSymbol(
                            selected.name
                        );

                        setCurrentSymbolId(
                            selected.id
                        );

                        setCurrentExchangeCode(
                            selected.exchangeCode
                        );

                        localStorage.setItem(
                            STORAGE_KEYS.SYMBOL,
                            selected.name
                        );

                        localStorage.setItem(
                            'tradingapp_symbol_id',
                            String(
                                selected.id
                            )
                        );

                        localStorage.setItem(
                            'tradingapp_exchange_code',
                            selected.exchangeCode
                        );
                    }
                } catch (
                error: unknown
                ) {
                    console.warn(
                        'Aktif semboller yenilenemedi:',
                        error
                    );
                }
            },
            [
                currentSymbol,
                currentSymbolId,
            ]
        );


    /*
     * Admin ekranından terminale geç.
     */
    const handleSwitchToTerminal =
        useCallback(
            async (): Promise<void> => {
                await refreshActiveSymbols();

                setCurrentView(
                    'terminal'
                );
            },
            [
                refreshActiveSymbols,
            ]
        );


    /*
     * Chart ayarlarını kaydet.
     */
    const handleSaveChartSettings =
        useCallback(
            (
                newSettings: ChartVisualSettings
            ): void => {
                setChartSettings(
                    newSettings
                );

                localStorage.setItem(
                    STORAGE_KEYS.CHART_SETTINGS,
                    JSON.stringify(
                        newSettings
                    )
                );

                setIsSettingsOpen(
                    false
                );
            },
            []
        );


    return (
        <div
            className={`min-h-screen transition-colors duration-300 relative ${isDark
                    ? 'bg-[#0b0e14] text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
        >
            {/* Backend bağlantı hatası */}
            {isBackendDown && (
                <div className="bg-red-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center space-x-2 fixed top-0 left-0 right-0 z-[99999] shadow-2xl animate-pulse">
                    <WifiOff className="w-4 h-4 shrink-0" />

                    <span>
                        {t(
                            'app.backendDisconnected'
                        )}
                    </span>
                </div>
            )}


            <ProtectedRoute
                fallback={
                    <AuthPage
                        onLoginSuccess={
                            handleLoginSuccess
                        }
                    />
                }
            >
                {currentView ===
                    'admin' ? (
                    /*
                     * ADMIN
                     */
                    <AdminPanel
                        onSwitchToTerminal={
                            handleSwitchToTerminal
                        }
                        onLogout={
                            handleLogout
                        }
                    />
                ) : (
                    /*
                     * TERMINAL
                     */
                    <div className="flex flex-col h-screen overflow-hidden">

                        {/* HEADER */}
                        <HeaderNavbar
                            currentUser={
                                currentUser
                            }
                            onLogout={
                                handleLogout
                            }
                            watchlists={
                                watchlists
                            }
                            currentSymbol={
                                currentSymbol
                            }
                            currentSymbolId={
                                currentSymbolId
                            }
                            currentExchangeCode={
                                currentExchangeCode
                            }
                            currentInterval={
                                currentInterval
                            }
                            chartType={
                                chartType
                            }
                            onSelectChartType={
                                handleSelectChartType
                            }
                            layoutMode={
                                layoutMode
                            }
                            activeSymbols={
                                activeSymbols
                            }
                            indicators={
                                indicators
                            }
                            onToggleIndicator={
                                handleToggleIndicator
                            }
                            onSelectSymbol={(
                                symbol
                            ) =>
                                handleActiveStateChange(
                                    symbol.name,
                                    currentInterval,
                                    symbol
                                )
                            }
                            onSelectInterval={(
                                interval
                            ) =>
                                handleActiveStateChange(
                                    currentSymbol,
                                    interval
                                )
                            }
                            onChangeLayout={
                                handleChangeLayout
                            }
                            onOpenSettings={() =>
                                setIsSettingsOpen(
                                    true
                                )
                            }
                            onOpenAlertModal={() =>
                                setIsAlertModalOpen(
                                    true
                                )
                            }
                        />


                        {/* CHART */}
                        <main className="flex-1 p-1 overflow-hidden">
                            <CandlestickChart
                                layoutMode={
                                    layoutMode
                                }
                                activeSymbol={
                                    currentSymbol
                                }
                                activeSymbolId={
                                    currentSymbolId
                                }
                                activeExchangeCode={
                                    currentExchangeCode
                                }
                                activeInterval={
                                    currentInterval
                                }
                                chartType={
                                    chartType
                                }
                                indicators={
                                    indicators
                                }
                                chartSettings={
                                    chartSettings
                                }
                                alerts={
                                    alerts
                                }
                                onToggleAlert={
                                    toggleAlert
                                }
                                onDeleteAlert={
                                    deleteAlert
                                }
                                onOpenCreateAlert={() =>
                                    setIsAlertModalOpen(
                                        true
                                    )
                                }
                                onActiveStateChange={
                                    handleActiveStateChange
                                }
                            />
                        </main>
                    </div>
                )}


                {/* CHART SETTINGS */}
                <ChartSettingsModal
                    isOpen={
                        isSettingsOpen
                    }
                    onClose={() =>
                        setIsSettingsOpen(
                            false
                        )
                    }
                    settings={
                        chartSettings
                    }
                    onSave={
                        handleSaveChartSettings
                    }
                    isDark={
                        isDark
                    }
                />


                {/* CREATE ALERT */}
                <CreateAlertModal
                    isOpen={
                        isAlertModalOpen
                    }
                    onClose={() =>
                        setIsAlertModalOpen(
                            false
                        )
                    }
                    symbolId={
                        currentSymbolId
                    }
                    symbol={
                        currentSymbol
                    }
                    onSave={
                        createAlert
                    }
                    isDark={
                        isDark
                    }
                />
            </ProtectedRoute>
        </div>
    );
};


export default App;