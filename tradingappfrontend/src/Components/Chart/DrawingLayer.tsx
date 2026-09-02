import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import {Eraser, Minus, MousePointer2, Ruler, Square, Trash2, TrendingUp,Type} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { chartDrawingService } from '../../Services/chartDrawingService';
import type {ChartDrawingDto, DrawingData, DrawingPoint, DrawingTool, PersistedDrawingType, DrawingStyle} from '../../Types/chartDrawing';

interface DrawingLayerProps {
    symbolId: number;
    interval: string;
    isDark: boolean;
    isSelected: boolean;
    chart: IChartApi | null;
    series: ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | null;
    renderVersion: number;
}

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const DEFAULT_COLOR = '#2962ff';

const isTwoPointData = (
    data: DrawingData
): data is {
    points: [DrawingPoint, DrawingPoint];
    style?: DrawingStyle;
} =>
    'points' in data;

export const DrawingLayer: React.FC<DrawingLayerProps> = ({
    symbolId,
    interval,
    isDark,
    isSelected,
    chart,
    series,
    renderVersion,
}) => {
    const { t } = useTranslation();
    const [tool, setTool] = useState<DrawingTool>('cursor');
    const [drawings, setDrawings] = useState<ChartDrawingDto[]>([]);
    const [draftStart, setDraftStart] = useState<DrawingPoint | null>(null);
    const [draftCurrent, setDraftCurrent] = useState<DrawingPoint | null>(null);
    const [busy, setBusy] = useState(false);

    const canDraw = symbolId > 0 && !!interval && !!chart && !!series;

    // Opretter eller tilføjer det valgte element.
    const loadDrawings = useCallback(async () => {
        if (!symbolId || !interval) {
            setDrawings([]);
            return;
        }

        try {
            setDrawings(await chartDrawingService.getDrawings(symbolId, interval));
        } catch (error) {
            console.error('[DrawingLayer] Çizimler yüklenemedi:', error);
        }
    }, [symbolId, interval]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setTool('cursor');
            setDraftStart(null);
            setDraftCurrent(null);
            void loadDrawings();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [loadDrawings]);

    const pointFromMouse = (event: React.MouseEvent<SVGSVGElement>): DrawingPoint | null => {
        if (!chart || !series) return null;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const time = chart.timeScale().coordinateToTime(x);
        const price = series.coordinateToPrice(y);
        if (time == null || price == null || !Number.isFinite(Number(price))) return null;
        return { time: Number(time), price: Number(price) };
    };

    const toCoordinates = (point: DrawingPoint): { x: number; y: number; } | null => {
        if (!chart || !series) return null;
        const x = chart.timeScale().timeToCoordinate(point.time as Time);
        const y = series.priceToCoordinate(point.price);
        if (x == null || y == null) return null;
        return { x, y };
    };

    // Opretter eller tilføjer det valgte element.
    const createDrawing = async (drawingType: PersistedDrawingType, data: DrawingData) => {
        if (!symbolId || busy) return;
        setBusy(true);
        try {
            const created = await chartDrawingService.createDrawing({
                symbolId,
                interval,
                drawingType,
                data,
                isVisible: true,
            });
            setDrawings((prev) => [...prev, created]);
        } catch (error) {
            console.error('[DrawingLayer] Çizim kaydedilemedi:', error);
        } finally {
            setBusy(false);
        }
    };

    // Behandler den relevante brugerhandling eller event.
    const handleCanvasClick = async (event: React.MouseEvent<SVGSVGElement>) => {
        if (!canDraw || tool === 'cursor' || tool === 'eraser') return;
        event.stopPropagation();
        const point = pointFromMouse(event);
        if (!point) return;

        if (tool === 'horizontalLine') {
            await createDrawing('horizontalLine', { price: point.price, style: { color: DEFAULT_COLOR, lineWidth: 2 } });
            return;
        }

        if (tool === 'text') {
            const text = window.prompt(t('drawings.textPrompt'))?.trim();
            if (!text) return;
            await createDrawing('text', { point, text, style: { color: DEFAULT_COLOR, lineWidth: 2 } });
            return;
        }

        if (!draftStart) {
            setDraftStart(point);
            setDraftCurrent(point);
            return;
        }

        const drawingType = tool as PersistedDrawingType;
        await createDrawing(drawingType, {
            points: [draftStart, point],
            style: { color: DEFAULT_COLOR, lineWidth: 2, fillOpacity: 0.08 },
        });
        setDraftStart(null);
        setDraftCurrent(null);
    };

    // Behandler den relevante brugerhandling eller event.
    const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
        if (!draftStart || tool === 'cursor' || tool === 'eraser') return;
        const point = pointFromMouse(event);
        if (point) setDraftCurrent(point);
    };

    // Fjerner det valgte element.
    const deleteDrawing = async (drawingId: number) => {
        try {
            await chartDrawingService.deleteDrawing(drawingId);
            setDrawings((prev) => prev.filter((d) => d.id !== drawingId));
        } catch (error) {
            console.error('[DrawingLayer] Çizim silinemedi:', error);
        }
    };

    // Håndterer clear all.
    const clearAll = async () => {
        if (!symbolId || !drawings.length) return;
        if (!window.confirm(t('drawings.clearConfirm'))) return;
        try {
            await chartDrawingService.clearDrawings(symbolId, interval);
            setDrawings([]);
        } catch (error) {
            console.error('[DrawingLayer] Çizimler temizlenemedi:', error);
        }
    };

    const visibleDrawings = useMemo(() => drawings.filter((d) => d.isVisible), [drawings]);

    // Håndterer render drawing.
    const renderDrawing = (drawing: ChartDrawingDto, draft = false) => {
        const data = drawing.data;
        const color = ('style' in data && data.style?.color) || DEFAULT_COLOR;
        const strokeWidth = ('style' in data && data.style?.lineWidth) || 2;
        const common = {
            stroke: color,
            strokeWidth,
            vectorEffect: 'non-scaling-stroke' as const,
            opacity: draft ? 0.65 : 1,
        };
        const eraseHandler = tool === 'eraser' && !draft
            ? (e: React.MouseEvent) => { e.stopPropagation(); void deleteDrawing(drawing.id); }
            : undefined;

        if (drawing.drawingType === 'horizontalLine' && 'price' in data) {
            if (!series) return null;
            const y = series.priceToCoordinate(data.price);
            if (y == null) return null;
            return <line key={drawing.id} x1="0" y1={y} x2="100%" y2={y} {...common} onClick={eraseHandler} className={tool === 'eraser' ? 'cursor-crosshair' : ''} />;
        }

        if (drawing.drawingType === 'text' && 'point' in data) {
            const p = toCoordinates(data.point);
            if (!p) return null;
            return (
                <g key={drawing.id} onClick={eraseHandler} className={tool === 'eraser' ? 'cursor-crosshair' : ''}>
                    <circle cx={p.x} cy={p.y} r={3} fill={color} />
                    <text x={p.x + 7} y={p.y - 7} fill={color} fontSize="12" fontWeight="600">{data.text}</text>
                </g>
            );
        }

        if (!isTwoPointData(data)) return null;
        const p1 = toCoordinates(data.points[0]);
        const p2 = toCoordinates(data.points[1]);
        if (!p1 || !p2) return null;

        if (drawing.drawingType === 'rectangle') {
            const x = Math.min(p1.x, p2.x);
            const y = Math.min(p1.y, p2.y);
            const width = Math.abs(p2.x - p1.x);
            const height = Math.abs(p2.y - p1.y);
            return (
                <rect key={drawing.id} x={x} y={y} width={width} height={height}
                    fill={color} fillOpacity={data.style?.fillOpacity ?? 0.08} {...common}
                    onClick={eraseHandler} className={tool === 'eraser' ? 'cursor-crosshair' : ''} />
            );
        }

        if (drawing.drawingType === 'fibonacci') {
            const low = data.points[0].price;
            const high = data.points[1].price;
            return (
                <g key={drawing.id} onClick={eraseHandler} className={tool === 'eraser' ? 'cursor-crosshair' : ''}>
                    {FIB_LEVELS.map((level) => {
                        const price = low + (high - low) * level;
                        const y = series?.priceToCoordinate(price);
                        if (y == null) return null;
                        return (
                            <g key={level}>
                                <line x1={p1.x} y1={y} x2={p2.x} y2={y} {...common} opacity={draft ? 0.5 : 0.85} />
                                <text x={Math.min(p1.x, p2.x) + 4} y={y - 3} fill={color} fontSize="10">{(level * 100).toFixed(1)}%</text>
                            </g>
                        );
                    })}
                </g>
            );
        }

        return <line key={drawing.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} {...common} onClick={eraseHandler} className={tool === 'eraser' ? 'cursor-crosshair' : ''} />;
    };

    const draftDrawing: ChartDrawingDto | null = draftStart && draftCurrent && !['cursor', 'eraser', 'horizontalLine', 'text'].includes(tool)
        ? {
            id: -1,
            symbolId,
            exchangeCode: '',
            symbolName: '',
            interval,
            drawingType: tool as PersistedDrawingType,
            data: { points: [draftStart, draftCurrent], style: { color: DEFAULT_COLOR, lineWidth: 2, fillOpacity: 0.08 } },
            isVisible: true,
            createdAt: '',
            updatedAt: '',
        }
        : null;

    const tools: Array<{ id: DrawingTool; icon: React.ReactNode; label: string; }> = [
        { id: 'cursor', icon: <MousePointer2 size={17} />, label: t('drawings.cursor') },
        { id: 'trendLine', icon: <TrendingUp size={17} />, label: t('drawings.trendLine') },
        { id: 'horizontalLine', icon: <Minus size={17} />, label: t('drawings.horizontalLine') },
        { id: 'rectangle', icon: <Square size={17} />, label: t('drawings.rectangle') },
        { id: 'fibonacci', icon: <Ruler size={17} />, label: t('drawings.fibonacci') },
        { id: 'text', icon: <Type size={17} />, label: t('drawings.text') },
        { id: 'eraser', icon: <Eraser size={17} />, label: t('drawings.eraser') },
    ];

    // renderVersion udløser bevidst genberegning af koordinater efter zoom, scroll eller resize af chartet.
    void renderVersion;

    return (
        <>
            {isSelected && (
                <div className={`absolute left-2 top-2 z-30 flex flex-col gap-1 rounded-lg border p-1 shadow-xl backdrop-blur ${isDark ? 'bg-[#131722]/95 border-[#2a2e39]' : 'bg-white/95 border-gray-200'}`}>
                    {tools.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            title={item.label}
                            onClick={(e) => {
                                e.stopPropagation();
                                setTool(item.id);
                                setDraftStart(null);
                                setDraftCurrent(null);
                            }}
                            className={`w-8 h-8 rounded-md flex items-center justify-center transition ${tool === item.id ? 'bg-[#2962ff] text-white' : isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                            {item.icon}
                        </button>
                    ))}
                    <div className={`h-px my-0.5 ${isDark ? 'bg-[#2a2e39]' : 'bg-gray-200'}`} />
                    <button
                        type="button"
                        title={t('drawings.clearAll')}
                        disabled={!drawings.length}
                        onClick={(e) => { e.stopPropagation(); void clearAll(); }}
                        className={`w-8 h-8 rounded-md flex items-center justify-center transition disabled:opacity-30 ${isDark ? 'text-red-300 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                    >
                        <Trash2 size={17} />
                    </button>
                </div>
            )}

            <svg
                className={`absolute inset-0 z-20 w-full h-full ${tool === 'cursor' ? 'pointer-events-none' : 'pointer-events-auto'} ${tool !== 'cursor' ? 'cursor-crosshair' : ''}`}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onDoubleClick={(e) => { e.preventDefault(); setDraftStart(null); setDraftCurrent(null); }}
            >
                {visibleDrawings.map((drawing) => renderDrawing(drawing))}
                {draftDrawing && renderDrawing(draftDrawing, true)}
            </svg>
        </>
    );
};
