import React, { useEffect, useMemo, useState } from 'react';
import { ListPlus, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../Context/ThemeContext';
import { candleApi } from '../Services/candleApi';
import { signalrService } from '../Services/signalrService';
import type { CandleData } from '../Types/candle';
import type { WatchlistResponseDto } from '../Types/watchlist';
import type { SymbolResponseDto } from '../Types/symbol';

interface WatchlistProps {
    watchlists: WatchlistResponseDto[];
    selectedSymbolId?: number | null;
    onSelectSymbol: (symbol: SymbolResponseDto) => void;
    onCreateWatchlist: (name: string) => Promise<void> | void;
    onDeleteWatchlist: (watchlistId: number) => Promise<void> | void;
    onAddSymbol: (watchlistId: number, symbol: SymbolResponseDto) => Promise<void> | void;
    onRemoveSymbol: (watchlistId: number, symbolId: number) => Promise<void> | void;
    activeSymbols: SymbolResponseDto[];
}

interface LiveQuote {
    price: number;
    changePercent: number;
    updatedAt: number;
}

// Håndterer format price.
const formatPrice = (value?: number) => {
    if (value == null || !Number.isFinite(value)) return '—';
    if (value >= 1000) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (value >= 1) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
    return value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 });
};

export const Watchlist: React.FC<WatchlistProps> = ({
    watchlists = [],
    selectedSymbolId,
    onSelectSymbol,
    onCreateWatchlist,
    onDeleteWatchlist,
    onAddSymbol,
    onRemoveSymbol,
    activeSymbols = [],
}) => {
    const { t } = useTranslation();
    const { isDark } = useTheme();
    const [newListName, setNewListName] = useState('');
    const [activeListId, setActiveListId] = useState<number | null>(null);
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [isAddingSymbol, setIsAddingSymbol] = useState(false);
    const [selectedSymbolToAdd, setSelectedSymbolToAdd] = useState<number | ''>('');
    const [liveQuotes, setLiveQuotes] = useState<Record<number, LiveQuote>>({});
    const [busy, setBusy] = useState(false);

    const currentList =
        watchlists.find((w) => w.id === activeListId) ??
        watchlists[0];
    const symbolMap = useMemo(() => new Map(activeSymbols.map((s) => [s.id, s])), [activeSymbols]);

    const availableSymbols = useMemo(() => {
        const currentIds = new Set((currentList?.items || []).map((item) => item.symbolId));
        return activeSymbols.filter((symbol) => !currentIds.has(symbol.id));
    }, [activeSymbols, currentList]);

    // Symbolerne i den aktuelle watchlist abonneres uafhængigt af det synlige chart.
    // SignalR-gruppeabonnementet bruger reference counting, så det samme symbol kan deles
    // med et chart-panel uden ved en fejl at afmelde den anden forbruger.
    useEffect(() => {
        const items = currentList?.items || [];
        if (items.length === 0) return;

        let disposed = false;
        const subscriptions = items
            .map((item) => symbolMap.get(item.symbolId))
            .filter((symbol): symbol is SymbolResponseDto => Boolean(symbol));

        // Håndterer seed prices.
        const seedPrices = async () => {
            const snapshots = await Promise.all(
                subscriptions.map(async (symbol) => {
                    try {
                        const candles = await candleApi.getHistoricalCandles(symbol.id, '1m', 2);
                        const last = candles[candles.length - 1];
                        if (!last) return null;
                        const reference = Number(last.open) || Number(last.close);
                        const price = Number(last.close);
                        const changePercent = reference ? ((price - reference) / reference) * 100 : 0;
                        return { symbolId: symbol.id, price, changePercent };
                    } catch {
                        return null;
                    }
                })
            );

            if (disposed) return;
            setLiveQuotes((prev) => {
                const next = { ...prev };
                snapshots.forEach((snapshot) => {
                    if (!snapshot) return;
                    next[snapshot.symbolId] = {
                        price: snapshot.price,
                        changePercent: snapshot.changePercent,
                        updatedAt: Date.now(),
                    };
                });
                return next;
            });
        };

        // Behandler den relevante brugerhandling eller event.
        const handleCandle = (candle: CandleData) => {
            const symbolId = Number(candle.symbolId || 0);
            if (!symbolId || !items.some((item) => item.symbolId === symbolId)) return;

            const price = Number(candle.close);
            const open = Number(candle.open);
            if (!Number.isFinite(price)) return;

            setLiveQuotes((prev) => ({
                ...prev,
                [symbolId]: {
                    price,
                    changePercent: open ? ((price - open) / open) * 100 : (prev[symbolId]?.changePercent ?? 0),
                    updatedAt: Date.now(),
                },
            }));
        };

        // Håndterer forbindelsen til realtime-data via SignalR.
        const connect = async () => {
            await signalrService.startConnection();
            if (disposed) return;
            await Promise.all(
                subscriptions.map((symbol) => signalrService.subscribeToSymbolGroup(symbol.exchangeCode, symbol.name))
            );
            if (!disposed) signalrService.subscribeToCandleUpdates(handleCandle);
        };

        void seedPrices();
        void connect();

        return () => {
            disposed = true;
            signalrService.unsubscribeFromCandleUpdates(handleCandle);
            subscriptions.forEach((symbol) => {
                void signalrService.unsubscribeFromSymbolGroup(symbol.exchangeCode, symbol.name);
            });
        };
    }, [currentList?.id, currentList?.items, symbolMap]);

    // Håndterer submit list.
    const submitList = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = newListName.trim();
        if (!name || busy) return;
        setBusy(true);
        try {
            await onCreateWatchlist(name);
            setNewListName('');
            setIsCreatingList(false);
        } finally {
            setBusy(false);
        }
    };

    // Håndterer submit symbol.
    const submitSymbol = async () => {
        if (!currentList || selectedSymbolToAdd === '' || busy) return;
        const symbol = symbolMap.get(Number(selectedSymbolToAdd));
        if (!symbol) return;
        setBusy(true);
        try {
            await onAddSymbol(currentList.id, symbol);
            setSelectedSymbolToAdd('');
            setIsAddingSymbol(false);
        } finally {
            setBusy(false);
        }
    };

    // Fjerner det valgte element.
    const deleteCurrentList = async () => {
        if (!currentList || busy) return;
        const confirmed = window.confirm(
            t('watchlistPanel.deleteConfirm', { name: currentList.name })
        );
        if (!confirmed) return;
        setBusy(true);
        try {
            await onDeleteWatchlist(currentList.id);
        } finally {
            setBusy(false);
        }
    };

    const panel = isDark
        ? 'bg-[#111827] border-gray-800 text-gray-200'
        : 'bg-white border-gray-200 text-gray-800';

    return (
        <aside className={`w-80 border-l flex flex-col h-full shrink-0 ${panel}`}>
            <div className={`p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                            {t('watchlistPanel.title')}
                        </div>
                        <div className="text-[10px] mt-1 text-gray-500">{t('watchlistPanel.exchangeAwareHint')}</div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setIsCreatingList((v) => !v)}
                            className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20"
                            title={t('watchlistPanel.createButton')}
                        >
                            <ListPlus className="w-4 h-4" />
                        </button>
                        {currentList && (
                            <button
                                type="button"
                                onClick={() => setIsAddingSymbol((v) => !v)}
                                className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                                title={t('watchlistPanel.addSymbol')}
                            >
                                {isAddingSymbol ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </button>
                        )}
                        {currentList && (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={deleteCurrentList}
                                className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 disabled:opacity-50"
                                title={t('watchlistPanel.deleteList')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {isCreatingList && (
                    <form onSubmit={submitList} className="mt-4 flex gap-2">
                        <input
                            autoFocus
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            placeholder={t('watchlistPanel.placeholderQuick')}
                            className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs outline-none ${isDark ? 'bg-[#0b1220] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                        />
                        <button disabled={busy || !newListName.trim()} type="submit" className="px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">
                            {t('watchlistPanel.create')}
                        </button>
                    </form>
                )}

                <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                    {watchlists.map((list) => (
                        <button
                            key={list.id}
                            type="button"
                            onClick={() => setActiveListId(list.id)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap border ${currentList?.id === list.id
                                ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                                : isDark
                                    ? 'border-gray-700 text-gray-400 hover:text-white'
                                    : 'border-gray-200 text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {list.name}
                        </button>
                    ))}
                </div>
            </div>

            {isAddingSymbol && currentList && (
                <div className={`p-3 border-b flex gap-2 ${isDark ? 'border-gray-800 bg-[#0b1220]' : 'border-gray-200 bg-gray-50'}`}>
                    <select
                        value={selectedSymbolToAdd}
                        onChange={(e) => setSelectedSymbolToAdd(e.target.value ? Number(e.target.value) : '')}
                        className={`min-w-0 flex-1 rounded-lg border px-2 py-2 text-xs outline-none ${isDark ? 'bg-[#111827] border-gray-700' : 'bg-white border-gray-300'}`}
                    >
                        <option value="">{t('watchlistPanel.selectSymbol')}</option>
                        {availableSymbols.map((symbol) => (
                            <option key={symbol.id} value={symbol.id}>
                                {symbol.exchangeCode} · {symbol.name}
                            </option>
                        ))}
                    </select>
                    <button disabled={busy || selectedSymbolToAdd === ''} type="button" onClick={submitSymbol} className="px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">
                        {t('watchlistPanel.add')}
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2">
                {!currentList ? (
                    <div className="h-full grid place-items-center text-center text-xs text-gray-500 px-6">
                        <div>
                            <p>{t('watchlistPanel.emptyIntro')}</p>
                            <button type="button" onClick={() => setIsCreatingList(true)} className="mt-3 px-3 py-2 rounded-lg bg-indigo-600 text-white font-bold">
                                {t('watchlistPanel.createButton')}
                            </button>
                        </div>
                    </div>
                ) : (currentList.items || []).length === 0 ? (
                    <div className="h-full grid place-items-center text-center text-xs text-gray-500 px-6">
                        <div>
                            <p>{t('watchlistPanel.noSymbols')}</p>
                            <p className="mt-1 text-[10px]">{t('watchlistPanel.addFromAbove')}</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {currentList.items.map((item) => {
                            const symbol = symbolMap.get(item.symbolId);
                            const selected = selectedSymbolId === item.symbolId;
                            const quote = liveQuotes[item.symbolId];
                            const positive = (quote?.changePercent ?? 0) >= 0;

                            return (
                                <div
                                    key={item.id}
                                    className={`group flex items-center rounded-xl border transition-colors ${selected
                                        ? 'border-blue-500/30 bg-blue-500/10'
                                        : isDark
                                            ? 'border-transparent hover:bg-gray-800/60'
                                            : 'border-transparent hover:bg-gray-100'
                                        }`}
                                >
                                    <button
                                        type="button"
                                        disabled={!symbol}
                                        onClick={() => {
                                            if (!symbol) return;

                                            onSelectSymbol({
                                                ...symbol,
                                                name: item.symbol || symbol.name,
                                                exchangeCode: item.exchange || symbol.exchangeCode,
                                            });
                                        }}
                                        className="flex-1 min-w-0 text-left px-3 py-2.5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-black tracking-wide truncate">{item.symbol}</span>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-500">{item.exchange}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-500 mt-1">{t('watchlistPanel.live')}</div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-xs font-bold tabular-nums">{formatPrice(quote?.price)}</div>
                                                <div className={`text-[10px] font-bold tabular-nums ${quote ? (positive ? 'text-emerald-500' : 'text-rose-500') : 'text-gray-500'}`}>
                                                    {quote ? `${positive ? '+' : ''}${quote.changePercent.toFixed(2)}%` : t('watchlistPanel.waiting')}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => onRemoveSymbol(currentList.id, item.symbolId)}
                                        className="p-2 mr-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-rose-400 disabled:opacity-30"
                                        title={t('watchlistPanel.removeFromList')}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );
};
