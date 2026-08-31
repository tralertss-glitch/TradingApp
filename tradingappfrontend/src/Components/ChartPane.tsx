import React, { useEffect, useRef, useState } from 'react';
import {
    createChart,
    CandlestickSeries,
    BarSeries,
    LineSeries,
    AreaSeries,
} from 'lightweight-charts';
import type {
    IChartApi,
    ISeriesApi,
    CandlestickData,
    LineData,
    Time,
    LogicalRange,
    IPriceLine,
    MouseEventParams,
} from 'lightweight-charts';
import { TrendingUp } from 'lucide-react';
import { DrawingLayer } from './Chart/DrawingLayer';
import { useTranslation } from 'react-i18next';
import { signalrService } from '../Services/signalrService';
import { candleApi } from '../Services/candleApi';
import type { CandleData, ChartType } from '../Types/candle';
import type { IndicatorConfig } from '../Types/indicator';
import type { ChartVisualSettings } from '../Types/chartSettings';
import type { Alert } from '../Types/alert';
import {
    calculateSMA,
    calculateEMA,
    calculateBollingerBands,
    calculateRSI,
} from '../Utils/indicatorCalculators';

interface ChartPaneProps {
    symbolId: number;
    exchangeCode: string;
    symbol: string;
    interval: string;
    chartType?: ChartType;
    isDark: boolean;
    isSelected: boolean;
    indicators?: IndicatorConfig[];
    chartSettings?: ChartVisualSettings;
    alerts?: Alert[];
    onSelectPane: () => void;
    onPriceClick?: (price: number) => void;
}

type ChartSeriesApi =
    | ISeriesApi<'Candlestick'>
    | ISeriesApi<'Bar'>
    | ISeriesApi<'Line'>
    | ISeriesApi<'Area'>;

const getIntervalTime = (timestampInSeconds: number, interval: string): number => {
    const date = new Date(timestampInSeconds * 1000);
    if (interval.endsWith('m')) {
        const minutes = parseInt(interval, 10) || 1;
        date.setUTCMinutes(Math.floor(date.getUTCMinutes() / minutes) * minutes, 0, 0);
    } else if (interval.endsWith('h')) {
        const hours = parseInt(interval, 10) || 1;
        date.setUTCHours(Math.floor(date.getUTCHours() / hours) * hours, 0, 0);
    } else if (interval.endsWith('d')) {
        date.setUTCHours(0, 0, 0, 0);
    } else if (interval.endsWith('w')) {
        // Timescale time_bucket('1 week', ...) bruger ISO-grænser med mandag som ugens start.
        const day = date.getUTCDay();
        const daysFromMonday = (day + 6) % 7;
        date.setUTCDate(date.getUTCDate() - daysFromMonday);
        date.setUTCHours(0, 0, 0, 0);
    } else if (interval.endsWith('mon')) {
        date.setUTCDate(1);
        date.setUTCHours(0, 0, 0, 0);
    } else if (interval.endsWith('y')) {
        date.setUTCMonth(0, 1);
        date.setUTCHours(0, 0, 0, 0);
    }
    return Math.floor(date.getTime() / 1000);
};

const getIntervalDurationSeconds = (interval: string): number => {
    const normalized = interval.trim().toLowerCase();
    const value = parseInt(normalized, 10) || 1;

    if (normalized.endsWith('m') && !normalized.endsWith('mon')) return value * 60;
    if (normalized.endsWith('h')) return value * 60 * 60;
    if (normalized.endsWith('d')) return value * 24 * 60 * 60;
    if (normalized.endsWith('w')) return value * 7 * 24 * 60 * 60;
    if (normalized.endsWith('mon')) return value * 31 * 24 * 60 * 60;
    if (normalized.endsWith('y')) return value * 366 * 24 * 60 * 60;

    return 60;
};

const getLatestContiguousSegment = (
    candles: CandlestickData<Time>[],
    interval: string
): CandlestickData<Time>[] => {
    if (candles.length <= 1) return candles;

    const expectedStep = getIntervalDurationSeconds(interval);
    // Nogle få manglende candles eller korte exchange-afbrydelser tolereres; gaps over flere år behandles separat.
    const maxAllowedGap = expectedStep * 3;
    let startIndex = candles.length - 1;

    for (let i = candles.length - 1; i > 0; i--) {
        const current = Number(candles[i].time);
        const previous = Number(candles[i - 1].time);
        const gap = current - previous;

        if (!Number.isFinite(gap) || gap <= 0 || gap > maxAllowedGap) {
            break;
        }

        startIndex = i - 1;
    }

    return candles.slice(startIndex);
};

const calculateHeikinAshi = (candles: CandlestickData<Time>[]): CandlestickData<Time>[] => {
    if (candles.length === 0) return [];
    const haCandles: CandlestickData<Time>[] = [];

    for (let i = 0; i < candles.length; i++) {
        const current = candles[i];
        const haClose = (current.open + current.high + current.low + current.close) / 4;
        let haOpen = current.open;

        if (i > 0) {
            const prevHa = haCandles[i - 1];
            haOpen = (prevHa.open + prevHa.close) / 2;
        }

        const haHigh = Math.max(current.high, haOpen, haClose);
        const haLow = Math.min(current.low, haOpen, haClose);

        haCandles.push({
            time: current.time,
            open: haOpen,
            high: haHigh,
            low: haLow,
            close: haClose,
        });
    }

    return haCandles;
};

export const ChartPane: React.FC<ChartPaneProps> = ({
    symbolId,
    exchangeCode,
    symbol,
    interval,
    chartType = 'candles',
    isDark,
    isSelected,
    indicators = [],
    chartSettings = {
        upColor: '#089981',
        downColor: '#f23645',
        showBorders: false,
        showWicks: true,
        showGrid: true,
        gridColorDark: '#1e222d',
        gridColorLight: '#f0f3fa',
        showPriceLine: true,
        soundEnabled: true,
    },
    alerts = [],
    onSelectPane,
    onPriceClick,
}) => {
    const { t } = useTranslation();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ChartSeriesApi | null>(null);
    const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>[]>>(new Map());
    const alertLinesRef = useRef<IPriceLine[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [lastCandle, setLastCandle] = useState<CandleData | null>(null);
    const [drawingRenderVersion, setDrawingRenderVersion] = useState(0);
    const [drawingReady, setDrawingReady] = useState(false);
    const [historyPending, setHistoryPending] = useState(false);

    const candlesRef = useRef<CandlestickData<Time>[]>([]);
    const isLoadingMoreRef = useRef<boolean>(false);
    const hasMoreDataRef = useRef<boolean>(true);
    const lazyLoadCooldownUntilRef = useRef<number>(0);
    const lazyRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isNearLeftEdgeRef = useRef<boolean>(false);

    const isDisposedRef = useRef<boolean>(false);
    const rafIdRef = useRef<number | null>(null);

    // Opdaterer de aktuelle data i brugergrænsefladen.
    const updateIndicatorsData = (candles: CandlestickData<Time>[]) => {
        if (isDisposedRef.current || !chartRef.current || candles.length === 0) return;

        indicators.forEach((ind) => {
            if (!ind.enabled) return;
            const lines = indicatorSeriesRef.current.get(ind.id);
            if (!lines || lines.length === 0) return;

            try {
                if (ind.type === 'SMA') {
                    const smaData = calculateSMA(candles, ind.period || 20);
                    lines[0]?.setData(smaData);
                } else if (ind.type === 'EMA') {
                    const emaData = calculateEMA(candles, ind.period || 50);
                    lines[0]?.setData(emaData);
                } else if (ind.type === 'BB') {
                    const bb = calculateBollingerBands(candles, ind.period || 20, ind.stdDev || 2);
                    lines[0]?.setData(bb.upper);
                    lines[1]?.setData(bb.middle);
                    lines[2]?.setData(bb.lower);
                } else if (ind.type === 'RSI') {
                    const rsiData = calculateRSI(candles, ind.period || 14);
                    lines[0]?.setData(rsiData);
                }
            } catch (e) {
                console.warn(`[ChartPane] ${ind.name} indikatör güncelleme hatası:`, e);
            }
        });
    };

    // 🔔 Tegn prisalarmer som stiplede linjer på chartet.
    useEffect(() => {
        const series = seriesRef.current;
        if (!series || isDisposedRef.current) return;

        // 1. Fjern tidligere alarmlinjer.
        alertLinesRef.current.forEach((line) => {
            try {
                series.removePriceLine(line);
            } catch { }
        });
        alertLinesRef.current = [];

        // 2. Filtrér aktive og ikke-udløste alarmer for dette symbol.
        const activeAlerts = alerts.filter(
            (a) =>
                (a.symbolId === symbolId || a.symbol.toUpperCase() === symbol.toUpperCase()) &&
                a.isActive &&
                !a.isTriggered
        );

        // 3. Opret en linje for hver alarm.
        activeAlerts.forEach((alert) => {
            try {
                const isUp = alert.condition === 'CROSSES_UP';
                const alertLabel = t('chartPane.alertLabel', 'ALARM');
                const line = series.createPriceLine({
                    price: Number(alert.targetPrice),
                    color: isUp ? '#089981' : '#f23645',
                    lineWidth: 1,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: `🔔 ${alertLabel} ${Number(alert.targetPrice).toFixed(2)}`,
                });
                alertLinesRef.current.push(line);
            } catch (err) {
                console.warn('[ChartPane] Alarm çizgisi çizilemedi:', err);
            }
        });
    }, [alerts, symbol, symbolId, t]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        isDisposedRef.current = false;
        chartContainerRef.current.innerHTML = '';
        hasMoreDataRef.current = true;
        isLoadingMoreRef.current = false;
        lazyLoadCooldownUntilRef.current = 0;
        isNearLeftEdgeRef.current = false;
        if (lazyRetryTimerRef.current) {
            clearTimeout(lazyRetryTimerRef.current);
            lazyRetryTimerRef.current = null;
        }
        candlesRef.current = [];
        setHistoryPending(false);
        indicatorSeriesRef.current.clear();
        alertLinesRef.current = [];
        setLastCandle(null);

        const width = chartContainerRef.current.clientWidth || 600;
        const height = chartContainerRef.current.clientHeight || 400;

        const gridColor = chartSettings.showGrid
            ? isDark
                ? chartSettings.gridColorDark
                : chartSettings.gridColorLight
            : 'transparent';

        const chart = createChart(chartContainerRef.current, {
            width,
            height,
            layout: {
                background: { color: isDark ? '#131722' : '#ffffff' },
                textColor: isDark ? '#787b86' : '#131722',
            },
            grid: {
                vertLines: { color: gridColor },
                horzLines: { color: gridColor },
            },
            crosshair: { mode: 1 },
            timeScale: {
                borderColor: isDark ? '#2a2e39' : '#e0e3eb',
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 12,
                barSpacing: 8,
            },
            rightPriceScale: {
                borderColor: isDark ? '#2a2e39' : '#e0e3eb',
                autoScale: true,
            },
        });

        chartRef.current = chart;
        setDrawingReady(true);
        setDrawingRenderVersion((v) => v + 1);

        if (onPriceClick) {
            chart.subscribeClick((param: MouseEventParams<Time>) => {
                if (!param.point || !seriesRef.current) return;
                const price = seriesRef.current.coordinateToPrice(param.point.y);
                if (price !== null && typeof price === 'number') {
                    onPriceClick(price);
                }
            });
        }

        let series: ChartSeriesApi;
        if (chartType === 'bars') {
            series = chart.addSeries(BarSeries, {
                upColor: chartSettings.upColor,
                downColor: chartSettings.downColor,
                priceLineVisible: chartSettings.showPriceLine,
            });
        } else if (chartType === 'line') {
            series = chart.addSeries(LineSeries, {
                color: '#2962ff',
                lineWidth: 2,
                priceLineVisible: chartSettings.showPriceLine,
            });
        } else if (chartType === 'area') {
            series = chart.addSeries(AreaSeries, {
                topColor: 'rgba(41, 98, 255, 0.4)',
                bottomColor: 'rgba(41, 98, 255, 0.02)',
                lineColor: '#2962ff',
                lineWidth: 2,
                priceLineVisible: chartSettings.showPriceLine,
            });
        } else {
            series = chart.addSeries(CandlestickSeries, {
                upColor: chartSettings.upColor,
                downColor: chartSettings.downColor,
                borderVisible: chartSettings.showBorders,
                borderColor: chartSettings.upColor,
                wickVisible: chartSettings.showWicks,
                wickUpColor: chartSettings.upColor,
                wickDownColor: chartSettings.downColor,
                priceLineVisible: chartSettings.showPriceLine,
            });
        }
        seriesRef.current = series;

        indicators.forEach((ind) => {
            if (!ind.enabled) return;

            if (ind.type === 'SMA' || ind.type === 'EMA') {
                const line = chart.addSeries(LineSeries, {
                    color: ind.color,
                    lineWidth: 1.5 as any,
                    priceLineVisible: false,
                    lastValueVisible: true,
                });
                indicatorSeriesRef.current.set(ind.id, [line]);
            } else if (ind.type === 'BB') {
                const upper = chart.addSeries(LineSeries, {
                    color: ind.color,
                    lineWidth: 1 as any,
                    priceLineVisible: false,
                });
                const middle = chart.addSeries(LineSeries, {
                    color: ind.color,
                    lineWidth: 1 as any,
                    lineStyle: 2,
                    priceLineVisible: false,
                });
                const lower = chart.addSeries(LineSeries, {
                    color: ind.color,
                    lineWidth: 1 as any,
                    priceLineVisible: false,
                });
                indicatorSeriesRef.current.set(ind.id, [upper, middle, lower]);
            } else if (ind.type === 'RSI') {
                const rsiLine = chart.addSeries(LineSeries, {
                    color: ind.color,
                    lineWidth: 1.5 as any,
                    priceScaleId: 'rsi',
                });
                chart.priceScale('rsi').applyOptions({
                    scaleMargins: { top: 0.75, bottom: 0.05 },
                });
                indicatorSeriesRef.current.set(ind.id, [rsiLine]);
            }
        });

        // Håndterer focus latest bars.
        const focusLatestBars = (candles: CandlestickData<Time>[]) => {
            if (!chartRef.current || candles.length === 0 || isDisposedRef.current) return;

            // Alle data fra databasen bliver i serien; kun det første viewport fokuserer på den nyeste sammenhængende blok.
            // Selv om 2017 og 2026 findes i samme datasæt, påvirker de gamle priser derfor ikke
            // den aktuelle prisskala ved første åbning. Brugeren kan nå de gamle databasedata ved at scrolle mod venstre.
            const latestSegment = getLatestContiguousSegment(candles, interval);
            const latestCount = Math.max(1, latestSegment.length);
            const latestStartIndex = Math.max(0, candles.length - latestCount);
            const rightPaddingBars = 18;
            // Medtag ikke den gamle blok lige til venstre for et stort gap i det første viewport.
            const from = Math.max(-10, latestStartIndex - 0.5);
            const to = candles.length - 1 + rightPaddingBars;

            try {
                chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
            } catch (err) {
                console.warn('[ChartPane] Son bar görünümü ayarlanamadı:', err);
            }
        };

        // Håndterer apply data to series.
        const applyDataToSeries = (candles: CandlestickData<Time>[]) => {
            if (isDisposedRef.current || !seriesRef.current) return;

            try {
                if (chartType === 'line' || chartType === 'area') {
                    const lineData: LineData<Time>[] = candles.map((c) => ({
                        time: c.time,
                        value: c.close,
                    }));
                    (seriesRef.current as ISeriesApi<'Line' | 'Area'>).setData(lineData);
                } else if (chartType === 'heikin-ashi') {
                    const haData = calculateHeikinAshi(candles);
                    (seriesRef.current as ISeriesApi<'Candlestick'>).setData(haData);
                } else if (chartType === 'bars') {
                    (seriesRef.current as ISeriesApi<'Bar'>).setData(candles);
                } else {
                    (seriesRef.current as ISeriesApi<'Candlestick'>).setData(candles);
                }

                updateIndicatorsData(candles);
            } catch (err) {
                console.warn('[ChartPane] Veri atama hatası:', err);
            }
        };

        // Henter candles til det valgte symbol og timeframe.
        const fetchCandles = async (endTime?: number) => {
            if (isDisposedRef.current || isLoadingMoreRef.current) return;
            if (endTime && !hasMoreDataRef.current) return;
            if (endTime && Date.now() < lazyLoadCooldownUntilRef.current) return;

            try {
                if (!endTime) setLoading(true);
                else isLoadingMoreRef.current = true;

                const pageSize = 500;
                const data = await candleApi.getHistoricalCandles(symbolId, interval, pageSize, endTime);

                if (isDisposedRef.current) return;

                if (!data || data.length === 0) {
                    // Et tomt resultat betyder kun, når der faktisk anmodes om en ældre side,
                    // at der ikke findes ældre poster i databasen.
                    if (endTime) hasMoreDataRef.current = false;
                    return;
                }

                const formatted: CandlestickData<Time>[] = data
                    .map((c) => {
                        const rawTime = Number(c.time);
                        const timeInSec = rawTime > 10000000000 ? Math.floor(rawTime / 1000) : rawTime;
                        return {
                            time: timeInSec as Time,
                            open: Number(c.open),
                            high: Number(c.high),
                            low: Number(c.low),
                            close: Number(c.close),
                        };
                    })
                    .filter((c) =>
                        Number.isFinite(Number(c.time)) &&
                        Number.isFinite(c.open) &&
                        Number.isFinite(c.high) &&
                        Number.isFinite(c.low) &&
                        Number.isFinite(c.close)
                    )
                    .sort((a, b) => Number(a.time) - Number(b.time));

                if (isDisposedRef.current || formatted.length === 0) return;

                if (endTime) {
                    const current = candlesRef.current;
                    const oldLength = current.length;
                    const previousRange = chartRef.current?.timeScale().getVisibleLogicalRange() ?? null;

                    const merged = [...formatted, ...current];
                    const byTime = new Map<number, CandlestickData<Time>>();
                    for (const candle of merged) byTime.set(Number(candle.time), candle);
                    const unique = Array.from(byTime.values()).sort(
                        (a, b) => Number(a.time) - Number(b.time)
                    );

                    // Vis det, der findes i databasen: tilføj gamle candles i starten af serien, også hvis der er et gap.
                    // Det første viewport ændres ikke; brugeren ser disse candles, når der scrolles mod venstre.
                    const prependedCount = Math.max(0, unique.length - oldLength);

                    if (prependedCount > 0) {
                        candlesRef.current = unique;
                        applyDataToSeries(unique);
                        lazyLoadCooldownUntilRef.current = 0;

                        // Bevar brugerens synlige område efter prepend, så chartet ikke hopper.
                        if (previousRange && chartRef.current) {
                            try {
                                chartRef.current.timeScale().setVisibleLogicalRange({
                                    from: previousRange.from + prependedCount,
                                    to: previousRange.to + prependedCount,
                                });
                            } catch { }
                        }
                    }

                    // At en side indeholder færre end 500 rækker betyder ikke nødvendigvis, at der ikke findes ældre data.
                    // Det gælder især, hvis der er et stort gap mellem realtime-blokken og historical-blokken;
                    // den første ældre side kan være lille. Den reelle slutning accepteres først, når næste forespørgsel
                    // returnerer tomt.
                    hasMoreDataRef.current = prependedCount > 0;
                    setHistoryPending(false);
                } else {
                    // DB-first: Den første request kan nogle gange kun returnere 2-3 aktuelle candles, der er oprettet via realtime.
                    // Det betyder ikke, at databasen ikke indeholder ældre data.
                    // Hent også en side fra historical-blokken, og tilføj den til det samme datasæt.
                    let initialCandles = formatted;
                    const latestSegment = getLatestContiguousSegment(formatted, interval);

                    if (latestSegment.length < 100 && formatted.length > 0) {
                        try {
                            const oldestTimeMs = Number(formatted[0].time) * 1000;
                            const olderData = await candleApi.getHistoricalCandles(
                                symbolId,
                                interval,
                                pageSize,
                                oldestTimeMs
                            );

                            const olderFormularatted: CandlestickData<Time>[] = (olderData ?? [])
                                .map((c) => {
                                    const rawTime = Number(c.time);
                                    const timeInSec = rawTime > 10000000000
                                        ? Math.floor(rawTime / 1000)
                                        : rawTime;
                                    return {
                                        time: timeInSec as Time,
                                        open: Number(c.open),
                                        high: Number(c.high),
                                        low: Number(c.low),
                                        close: Number(c.close),
                                    };
                                })
                                .filter((c) =>
                                    Number.isFinite(Number(c.time)) &&
                                    Number.isFinite(c.open) &&
                                    Number.isFinite(c.high) &&
                                    Number.isFinite(c.low) &&
                                    Number.isFinite(c.close)
                                );

                            if (olderFormularatted.length > 0) {
                                const byTime = new Map<number, CandlestickData<Time>>();
                                for (const candle of [...olderFormularatted, ...formatted]) {
                                    byTime.set(Number(candle.time), candle);
                                }
                                initialCandles = Array.from(byTime.values()).sort(
                                    (a, b) => Number(a.time) - Number(b.time)
                                );
                            }
                        } catch (olderError) {
                            console.warn('[ChartPane] İlk historical sayfa yüklenemedi:', olderError);
                        }
                    }

                    candlesRef.current = initialCandles;
                    applyDataToSeries(initialCandles);

                    // Hvis den aktuelle sammenhængende blok kun består af få candles, men databasen
                    // har en fyldt historical-blok, vises den fyldte historical-blok i stedet for et tomt chart med tre candles.
                    // De aktuelle candles bliver i højre side af datasættet og
                    // kan nås ved at scrolle mod højre.
                    const currentLatestSegment = getLatestContiguousSegment(initialCandles, interval);
                    if (currentLatestSegment.length >= 20 || initialCandles.length < 20) {
                        focusLatestBars(initialCandles);
                    } else if (chartRef.current) {
                        const historicalOnly = initialCandles.slice(0, initialCandles.length - currentLatestSegment.length);
                        const historicalSegment = getLatestContiguousSegment(historicalOnly, interval);
                        if (historicalSegment.length > 0) {
                            const segmentStart = historicalOnly.length - historicalSegment.length;
                            const visibleBars = Math.min(120, historicalSegment.length);
                            const from = Math.max(segmentStart, historicalOnly.length - visibleBars);
                            const to = historicalOnly.length - 1 + 8;
                            try {
                                chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
                            } catch {
                                focusLatestBars(initialCandles);
                            }
                        } else {
                            focusLatestBars(initialCandles);
                        }
                    }

                    setHistoryPending(false);
                    // En lille første side betyder ikke, at pagination er færdig.
                    hasMoreDataRef.current = initialCandles.length > 0;

                    if (formatted.length > 0) {
                        const latest = formatted[formatted.length - 1];
                        setLastCandle({
                            time: Number(latest.time),
                            open: latest.open,
                            high: latest.high,
                            low: latest.low,
                            close: latest.close,
                        });
                    }
                }
            } catch (err) {
                if (!isDisposedRef.current) {
                    console.error('[ChartPane] Veri çekme hatası:', err);
                }
            } finally {
                if (!isDisposedRef.current) {
                    setLoading(false);
                    isLoadingMoreRef.current = false;
                }
            }
        };

        chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange: LogicalRange | null) => {
            if (isDisposedRef.current || !logicalRange) return;
            setDrawingRenderVersion((v) => v + 1);

            const nearLeftEdge = logicalRange.from < 20;
            isNearLeftEdgeRef.current = nearLeftEdge;

            if (
                nearLeftEdge &&
                !isLoadingMoreRef.current &&
                hasMoreDataRef.current &&
                Date.now() >= lazyLoadCooldownUntilRef.current
            ) {
                const oldestCandle = candlesRef.current[0];
                if (oldestCandle) {
                    void fetchCandles(Number(oldestCandle.time) * 1000);
                }
            }
        });

        // Opdaterer de aktuelle data i brugergrænsefladen.
        const handleCandleUpdate = (newCandle: CandleData) => {
            if (isDisposedRef.current || !seriesRef.current || !chartRef.current) return;
            if (newCandle.symbolId && newCandle.symbolId !== symbolId) return;
            if (newCandle.exchange && newCandle.exchange.toUpperCase() !== exchangeCode.toUpperCase()) return;

            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }

            rafIdRef.current = requestAnimationFrame(() => {
                if (isDisposedRef.current || !seriesRef.current) return;

                const rawTime = Number(newCandle.time);
                const rawSec = rawTime > 10000000000 ? Math.floor(rawTime / 1000) : rawTime;
                const candleTimeSec = getIntervalTime(rawSec, interval);
                const candleTime = candleTimeSec as Time;
                const lastCandleInRef = candlesRef.current[candlesRef.current.length - 1];

                if (lastCandleInRef && candleTimeSec < Number(lastCandleInRef.time)) {
                    return;
                }

                let high = Number(newCandle.high);
                let low = Number(newCandle.low);
                let open = Number(newCandle.open);
                const close = Number(newCandle.close);

                if (isNaN(high) || isNaN(low) || isNaN(open) || isNaN(close)) return;

                if (lastCandleInRef && Number(lastCandleInRef.time) === candleTimeSec) {
                    high = Math.max(Number(lastCandleInRef.high), high);
                    low = Math.min(Number(lastCandleInRef.low), low);
                    open = Number(lastCandleInRef.open);
                }

                const updated: CandlestickData<Time> = {
                    time: candleTime,
                    open,
                    high,
                    low,
                    close,
                };

                // Slet ikke databasedata, selv om der er et stort gap mellem realtime- og historical-blokken.
                // Den nye candle tilføjes normalt i slutningen af serien, mens viewport bliver på den aktuelle side.

                try {
                    if (chartType === 'line' || chartType === 'area') {
                        (seriesRef.current as ISeriesApi<'Line' | 'Area'>).update({
                            time: candleTime,
                            value: close,
                        });
                    } else if (chartType === 'heikin-ashi') {
                        const temp = [...candlesRef.current];
                        if (lastCandleInRef && Number(lastCandleInRef.time) === candleTimeSec) {
                            temp[temp.length - 1] = updated;
                        } else {
                            temp.push(updated);
                        }
                        const ha = calculateHeikinAshi(temp);
                        if (ha.length > 0) {
                            (seriesRef.current as ISeriesApi<'Candlestick'>).update(ha[ha.length - 1]);
                        }
                    } else if (chartType === 'bars') {
                        (seriesRef.current as ISeriesApi<'Bar'>).update(updated);
                    } else {
                        (seriesRef.current as ISeriesApi<'Candlestick'>).update(updated);
                    }

                    if (lastCandleInRef && Number(lastCandleInRef.time) === candleTimeSec) {
                        candlesRef.current[candlesRef.current.length - 1] = updated;
                    } else {
                        candlesRef.current.push(updated);
                    }

                    updateIndicatorsData(candlesRef.current);

                    setLastCandle({
                        time: candleTimeSec,
                        open,
                        high,
                        low,
                        close,
                    });
                } catch (err) {
                    console.warn('[ChartPane] Canlı veri güncelleme atlandı:', err);
                }
            });
        };

        const hasResolvedSymbol = symbolId > 0 && exchangeCode.trim().length > 0 && symbol.trim().length > 0;

        // Håndterer init.
        const init = async () => {
            // Ved første render har App muligvis endnu ikke fundet SymbolId/ExchangeCode.
            // Abonnér aldrig på gamle SignalR-grupper uden exchange, f.eks. :BTCUSDT.
            if (!hasResolvedSymbol) return;

            await fetchCandles();
            if (isDisposedRef.current) return;
            try {
                await signalrService.startConnection();
                if (isDisposedRef.current) return;
                await signalrService.subscribeToSymbolGroup(exchangeCode, symbol);
                signalrService.subscribeToCandleUpdates(handleCandleUpdate);
            } catch (e) {
                if (!isDisposedRef.current) {
                    console.error('[ChartPane] SignalR başlatma hatası:', e);
                }
            }
        };

        init();

        const resizeObserver = new ResizeObserver((entries) => {
            if (isDisposedRef.current || !entries || entries.length === 0) return;
            const { width: w, height: h } = entries[0].contentRect;
            if (chartRef.current && w > 0 && h > 0) {
                chartRef.current.applyOptions({ width: w, height: h });
                setDrawingRenderVersion((v) => v + 1);
            }
        });

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            isDisposedRef.current = true;

            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            if (lazyRetryTimerRef.current) {
                clearTimeout(lazyRetryTimerRef.current);
                lazyRetryTimerRef.current = null;
            }

            resizeObserver.disconnect();
            if (hasResolvedSymbol) {
                void signalrService.unsubscribeFromSymbolGroup(exchangeCode, symbol);
            }
            signalrService.unsubscribeFromCandleUpdates(handleCandleUpdate);

            indicatorSeriesRef.current.clear();
            alertLinesRef.current = [];
            setDrawingReady(false);
            seriesRef.current = null;
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [symbolId, exchangeCode, symbol, interval, chartType, isDark, indicators, chartSettings, onPriceClick]);

    const isPriceUp = lastCandle ? lastCandle.close >= lastCandle.open : true;
    const priceColor = isPriceUp ? 'text-[#089981]' : 'text-[#f23645]';

    return (
        <div
            onClick={onSelectPane}
            className={`flex flex-col w-full h-full relative overflow-hidden cursor-pointer transition-all border ${isSelected
                    ? 'border-[#2962ff] ring-1 ring-[#2962ff]/40 shadow-md'
                    : isDark
                        ? 'border-[#2a2e39] bg-[#131722]'
                        : 'border-gray-200 bg-white'
                }`}
        >
            {/* Legend og OHLC */}
            <div
                className={`px-3 py-1.5 flex items-center justify-between text-xs font-medium z-10 select-none border-b ${isDark ? 'border-[#2a2e39]/60 bg-[#131722]/80' : 'border-gray-100 bg-white/80'
                    } backdrop-blur-sm`}
            >
                <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-[#00897b] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                        {symbol.slice(0, 3)}
                    </div>
                    <span className="font-semibold text-xs tracking-tight text-gray-300">
                        {symbol} · {interval} · <span className="text-gray-400">{chartType.toUpperCase()}</span>
                    </span>

                    <div className="hidden md:flex items-center space-x-1.5 ml-2">
                        {indicators
                            .filter((i) => i.enabled)
                            .map((ind) => (
                                <span
                                    key={ind.id}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1"
                                    style={{ backgroundColor: `${ind.color}15`, color: ind.color }}
                                >
                                    <span>{ind.name}</span>
                                </span>
                            ))}
                    </div>
                </div>

                {lastCandle && (
                    <div className="hidden sm:flex items-center space-x-2.5 font-mono text-[11px]">
                        <span className="text-gray-400">
                            {t('chartPane.open', 'O')} <span className={priceColor}>{lastCandle.open.toFixed(2)}</span>
                        </span>
                        <span className="text-gray-400">
                            {t('chartPane.high', 'H')} <span className={priceColor}>{lastCandle.high.toFixed(2)}</span>
                        </span>
                        <span className="text-gray-400">
                            {t('chartPane.low', 'L')} <span className={priceColor}>{lastCandle.low.toFixed(2)}</span>
                        </span>
                        <span className="text-gray-400">
                            {t('chartPane.close', 'C')} <span className={priceColor}>{lastCandle.close.toFixed(2)}</span>
                        </span>
                    </div>
                )}
            </div>

            {/* Chartets tegneområde */}
            <div className="flex-1 relative w-full h-full min-h-[200px] overflow-hidden">
                {loading && (
                    <div
                        className={`absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs ${isDark ? 'bg-[#131722]/70' : 'bg-white/70'
                            }`}
                    >
                        <div className="w-6 h-6 border-2 border-[#2962ff] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {historyPending && !loading && (
                    <div
                        className={`absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] shadow-sm backdrop-blur-sm pointer-events-none select-none ${
                            isDark
                                ? 'border-[#2a2e39] bg-[#131722]/85 text-gray-300'
                                : 'border-gray-200 bg-white/90 text-gray-600'
                        }`}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2962ff] animate-pulse" />
                        <span>{t('chartPane.historySyncing', 'Geçmiş veriler senkronize ediliyor')}</span>
                    </div>
                )}

                <div className="absolute left-3 bottom-8 z-10 flex items-center space-x-1.5 opacity-30 hover:opacity-80 transition-opacity pointer-events-none select-none">
                    <div className="p-1 bg-[#2962ff] rounded-md shadow-sm">
                        <TrendingUp className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-extrabold tracking-wider text-xs text-white">
                        TRADING<span className="text-[#2962ff]">PRO</span>
                    </span>
                </div>

                <div ref={chartContainerRef} className="w-full h-full absolute inset-0 [&_a]:!hidden" />

                {drawingReady && (
                    <DrawingLayer
                        symbolId={symbolId}
                        interval={interval}
                        isDark={isDark}
                        isSelected={isSelected}
                        chart={chartRef.current}
                        series={seriesRef.current}
                        renderVersion={drawingRenderVersion}
                    />
                )}
            </div>
        </div>
    );
};
