import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { symbolApi } from '../../Services/symbolApi';
import { aiApi } from '../../Services/aiApi';
import { watchlistService } from '../../Services/watchlistService';
import type { WatchlistResponseDto } from '../../Types/watchlist';
import type { AiAnalysisResponseDto } from '../../Types/ai';
import type { ChartType } from '../../Types/candle';
import type { IndicatorConfig } from '../../Types/indicator';
import type { ChartVisualSettings } from '../../Types/chartSettings';
import type { Alert } from '../../Types/alert';
import type { SymbolResponseDto } from '../../Types/symbol';
import { AIAnalysisPanel } from '../AIAnalysisPanel';
import { Watchlist } from '../Watchlist';
import { ChartPane } from '../ChartPane';
import { useTheme } from '../../Context/ThemeContext';
import { Bell, Power, Trash2 } from 'lucide-react';

interface CandlestickChartProps {
    defaultSymbol?: string;
    defaultInterval?: string;
    layoutMode: '1x1' | '1x2' | '2x2';
    chartType?: ChartType;
    activeSymbol: string;
    activeSymbolId: number;
    activeExchangeCode: string;
    activeInterval: string;
    indicators: IndicatorConfig[];
    chartSettings: ChartVisualSettings;
    alerts?: Alert[];
    onToggleAlert?: (alertId: string) => Promise<void>;
    onDeleteAlert?: (alertId: string) => Promise<void>;
    onOpenCreateAlert?: () => void;
    onActiveStateChange: (symbol: string, interval: string, symbolInfo?: SymbolResponseDto) => void;
}

export interface PaneState {
    symbolId: number;
    symbol: string;
    exchangeCode: string;
    interval: string;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
    defaultSymbol = 'BTCUSDT',
    defaultInterval = '15m',
    layoutMode,
    chartType = 'candles',
    activeSymbol,
    activeSymbolId,
    activeExchangeCode,
    activeInterval,
    indicators = [],
    chartSettings,
    alerts = [],
    onToggleAlert,
    onDeleteAlert,
    onOpenCreateAlert,
    onActiveStateChange,
}) => {
    const { t, i18n } = useTranslation();
    const { isDark } = useTheme();

    const [activeSymbols, setActiveSymbols] = useState<SymbolResponseDto[]>([]);
    const [selectedPaneId, setSelectedPaneId] = useState<number>(1);

    const [panes, setPanes] = useState<Record<number, PaneState>>({
        1: { symbolId: activeSymbolId, symbol: activeSymbol || defaultSymbol, exchangeCode: activeExchangeCode, interval: activeInterval || defaultInterval },
        2: { symbolId: activeSymbolId, symbol: activeSymbol || defaultSymbol, exchangeCode: activeExchangeCode, interval: '1h' },
        3: { symbolId: activeSymbolId, symbol: activeSymbol || defaultSymbol, exchangeCode: activeExchangeCode, interval: '4h' },
        4: { symbolId: activeSymbolId, symbol: activeSymbol || defaultSymbol, exchangeCode: activeExchangeCode, interval: '1d' },
    });

    const [watchlists, setWatchlists] = useState<WatchlistResponseDto[]>([]);
    const [activePanel, setActivePanel] = useState<'watchlist' | 'ai' | 'alerts' | null>('watchlist');

    const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResponseDto | null>(null);
    const [aiLoading, setAiLoading] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;

        Promise.all([
            symbolApi.searchSymbols().then((all) => all.filter((s) => s.isActive)).catch(() => []),
            watchlistService.getMyWatchlists().catch(() => []),
        ]).then(([symbols, lists]) => {
            if (isMounted) {
                if (symbols) setActiveSymbols(symbols);
                if (lists) setWatchlists(lists);
            }
        });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!activeSymbol && !activeInterval) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setPanes((prev) => ({
                ...prev,
                [selectedPaneId]: {
                    symbolId:
                        activeSymbolId ||
                        prev[selectedPaneId].symbolId,
                    symbol:
                        activeSymbol ||
                        prev[selectedPaneId].symbol,
                    exchangeCode:
                        activeExchangeCode ||
                        prev[selectedPaneId].exchangeCode,
                    interval:
                        activeInterval ||
                        prev[selectedPaneId].interval,
                },
            }));
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        activeSymbol,
        activeSymbolId,
        activeExchangeCode,
        activeInterval,
        selectedPaneId,
    ]);

    // Behandler den relevante brugerhandling eller event.
    const handleSelectPane = (paneId: number) => {
        setSelectedPaneId(paneId);
        const targetPane = panes[paneId];
        if (targetPane) {
            onActiveStateChange(targetPane.symbol, targetPane.interval, activeSymbols.find((s) => s.id === targetPane.symbolId));
        }
    };

    const getPaneConfig = (paneId: number): PaneState => {
        return panes[paneId] || { symbolId: activeSymbolId, symbol: defaultSymbol, exchangeCode: activeExchangeCode, interval: defaultInterval };
    };

    const currentActivePane = getPaneConfig(selectedPaneId);

    // Henter de nødvendige data til denne funktion.
    const fetchAiAnalysis = useCallback(async (symbolId: number, intv: string) => {
        if (!symbolId || symbolId <= 0) {
            setAiAnalysis(null);
            return;
        }

        setAiLoading(true);
        try {
            const data = await aiApi.getDetailedAnalysis(
                symbolId,
                intv,
                i18n.resolvedLanguage || i18n.language,
            );
            setAiAnalysis(data);
        } catch {
            setAiAnalysis(null);
        } finally {
            setAiLoading(false);
        }
    }, [i18n.resolvedLanguage, i18n.language]);

    const visiblePaneIds =
        layoutMode === '1x1' ? [1] : layoutMode === '1x2' ? [1, 2] : [1, 2, 3, 4];

    return (
        <div
            className={`flex w-full h-full rounded-xl overflow-hidden border relative select-none transition-colors duration-300 ${isDark ? 'bg-[#0b0e14] text-gray-200 border-gray-800' : 'bg-gray-100 text-gray-800 border-gray-300'
                }`}
        >
            {/* CHART-GITTEROMRÅDE */}
            <div className="flex-1 p-1.5 w-full h-full min-w-0 overflow-hidden">
                <div
                    className={`w-full h-full gap-1.5 grid ${layoutMode === '1x1'
                        ? 'grid-cols-1 grid-rows-1'
                        : layoutMode === '1x2'
                            ? 'grid-cols-2 grid-rows-1'
                            : 'grid-cols-2 grid-rows-2'
                        }`}
                >
                    {visiblePaneIds.map((id) => {
                        const paneConfig = getPaneConfig(id);
                        return (
                            <ChartPane
                                key={id}
                                symbolId={paneConfig.symbolId}
                                exchangeCode={paneConfig.exchangeCode}
                                symbol={paneConfig.symbol}
                                interval={paneConfig.interval}
                                chartType={chartType}
                                isDark={isDark}
                                isSelected={selectedPaneId === id}
                                indicators={indicators}
                                chartSettings={chartSettings}
                                alerts={alerts}
                                onSelectPane={() => handleSelectPane(id)}
                            />
                        );
                    })}
                </div>
            </div>

            {/* HØJRE PANEL 1: Watchlist */}
            {activePanel === 'watchlist' && (
                <div className="h-full relative flex shrink-0 shadow-2xl z-20">
                    <Watchlist
                        watchlists={watchlists}
                        selectedSymbolId={currentActivePane.symbolId}
                        onSelectSymbol={(sym: SymbolResponseDto) => {
                            setPanes((prev) => ({
                                ...prev,
                                [selectedPaneId]: { ...prev[selectedPaneId], symbolId: sym.id, symbol: sym.name, exchangeCode: sym.exchangeCode },
                            }));
                            onActiveStateChange(sym.name, currentActivePane.interval, sym);
                        }}
                        onCreateWatchlist={async (name: string) => {
                            const created = await watchlistService.createWatchlist(name);
                            if (created) setWatchlists((prev) => [...prev, created]);
                        }}
                        onDeleteWatchlist={async (watchlistId: number) => {
                            await watchlistService.deleteWatchlist(watchlistId);
                            setWatchlists((prev) => prev.filter((list) => list.id !== watchlistId));
                        }}
                        onAddSymbol={async (wId: number, sym: SymbolResponseDto) => {
                            await watchlistService.addSymbolToWatchlist({ watchlistId: wId, symbolId: sym.id });
                            const updated = await watchlistService.getMyWatchlists();
                            if (updated) setWatchlists(updated);
                        }}
                        onRemoveSymbol={async (wId: number, symbolId: number) => {
                            await watchlistService.removeSymbolFromWatchlist(wId, symbolId);
                            const updated = await watchlistService.getMyWatchlists();
                            if (updated) setWatchlists(updated);
                        }}
                        activeSymbols={activeSymbols}
                    />
                </div>
            )}

            {/* HØJRE PANEL 2: AI-analyse */}
            <AIAnalysisPanel
                isOpen={activePanel === 'ai'}
                onClose={() => setActivePanel(null)}
                symbol={currentActivePane.symbol}
                interval={currentActivePane.interval}
                analysis={aiAnalysis}
                loading={aiLoading}
                onRefresh={() => fetchAiAnalysis(currentActivePane.symbolId, currentActivePane.interval)}
            />

            {/* HØJRE PANEL 3: Alarmliste */}
            {activePanel === 'alerts' && (
                <div
                    className={`w-72 h-full border-l flex flex-col shrink-0 z-20 shadow-2xl ${isDark ? 'bg-[#131722] border-gray-800 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                        }`}
                >
                    {/* Titel */}
                    <div className="p-3 border-b flex items-center justify-between border-gray-700/50">
                        <div className="flex items-center space-x-2">
                            <Bell className="w-4 h-4 text-amber-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider">
                                {t('alerts.title', 'Fiyat Alarmları')}
                            </h3>
                        </div>
                        {onOpenCreateAlert && (
                            <button
                                type="button"
                                onClick={onOpenCreateAlert}
                                className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
                            >
                                {t('alerts.newAlert', '+ Yeni')}
                            </button>
                        )}
                    </div>

                    {/* Alarmliste */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-700/20 p-2 space-y-1.5">
                        {alerts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                                <Bell className="w-8 h-8 text-gray-500 mb-2 opacity-40" />
                                <p className="text-xs text-gray-400">
                                    {t('alerts.noAlerts', 'Henüz kurulu alarmınız yok.')}
                                </p>
                            </div>
                        ) : (
                            alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-2.5 rounded-lg border text-xs flex flex-col space-y-1.5 transition-all ${alert.isTriggered
                                        ? 'bg-red-500/10 border-red-500/30 opacity-75'
                                        : alert.isActive
                                            ? isDark
                                                ? 'bg-[#1e222d] border-gray-700/60'
                                                : 'bg-gray-50 border-gray-200'
                                            : isDark
                                                ? 'bg-[#131722] border-gray-800 opacity-60'
                                                : 'bg-gray-100 border-gray-200 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-blue-400">{alert.symbol}</span>
                                        <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${alert.isTriggered
                                                ? 'bg-red-500/20 text-red-400'
                                                : alert.isActive
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-gray-500/20 text-gray-400'
                                                }`}
                                        >
                                            {alert.isTriggered
                                                ? t('alerts.triggered', 'TETİKLENDİ')
                                                : alert.isActive
                                                    ? t('alerts.active', 'AKTİF')
                                                    : t('alerts.passive', 'PASİF')}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] font-mono">
                                        <span className="text-gray-400">
                                            {alert.condition === 'CROSSES_UP'
                                                ? t('alerts.crossesUp', '▲ Yukarı Kesince')
                                                : t('alerts.crossesDown', '▼ Aşağı Kesince')}
                                        </span>
                                        <span className="font-bold text-white font-mono">
                                            ${Number(alert.targetPrice).toFixed(2)}
                                        </span>
                                    </div>

                                    {alert.note && (
                                        <p className="text-[10px] text-gray-400 italic truncate">{alert.note}</p>
                                    )}

                                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-gray-700/20">
                                        {!alert.isTriggered && onToggleAlert && (
                                            <button
                                                type="button"
                                                onClick={() => onToggleAlert(alert.id)}
                                                className={`p-1 rounded hover:bg-gray-700/40 transition-colors ${alert.isActive ? 'text-green-400' : 'text-gray-400'
                                                    }`}
                                                title={alert.isActive ? t('alerts.passive', 'Pasife Al') : t('alerts.active', 'Aktif Et')}
                                            >
                                                <Power className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        {onDeleteAlert && (
                                            <button
                                                type="button"
                                                onClick={() => onDeleteAlert(alert.id)}
                                                className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                                title={t('watchlistPanel.removeFromList', 'Alarmı Sil')}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* HØJRE VÆRKTØJSLINJE (TOOLBAR) */}
            <div
                className={`w-11 border-l flex flex-col items-center py-3 space-y-2 shrink-0 z-30 shadow-lg transition-colors duration-300 ${isDark ? 'bg-[#0b0e14] border-gray-800' : 'bg-gray-100 border-gray-300'
                    }`}
            >
                {/* 1. Watchlist-knap */}
                <button
                    type="button"
                    onClick={() => setActivePanel(activePanel === 'watchlist' ? null : 'watchlist')}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activePanel === 'watchlist'
                        ? 'bg-blue-600 text-white shadow-md'
                        : isDark
                            ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                    title={t('header.watchlist', 'İzleme Listesi')}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                </button>

                {/* 2. AI-knap */}
                <button
                    type="button"
                    onClick={() => {
                        const willOpen = activePanel !== 'ai';
                        setActivePanel(willOpen ? 'ai' : null);
                        if (willOpen) fetchAiAnalysis(currentActivePane.symbolId, currentActivePane.interval);
                    }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activePanel === 'ai'
                        ? 'bg-purple-600 text-white shadow-md'
                        : isDark
                            ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                    title={t('header.aiAssistant', 'Yapay Zeka Asistanı')}
                >
                    <span className="text-xs font-bold">🤖</span>
                </button>

                {/* 3. Knap til alarmpanel */}
                <button
                    type="button"
                    onClick={() => setActivePanel(activePanel === 'alerts' ? null : 'alerts')}
                    className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activePanel === 'alerts'
                        ? 'bg-amber-600 text-white shadow-md'
                        : isDark
                            ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                    title={t('header.alerts', 'Alarmlar')}
                >
                    <Bell className="w-4 h-4" />
                    {alerts.filter((a) => a.isActive && !a.isTriggered).length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[8px] font-black h-3.5 min-w-[14px] px-0.5 rounded-full flex items-center justify-center shadow">
                            {alerts.filter((a) => a.isActive && !a.isTriggered).length}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};
