export type DrawingTool = 'cursor' | 'trendLine' | 'horizontalLine' | 'rectangle' | 'fibonacci' | 'text' | 'eraser';
export type PersistedDrawingType = Exclude<DrawingTool, 'cursor' | 'eraser'>;

export interface DrawingPoint {
    time: number;
    price: number;
}

export interface DrawingStyle {
    color?: string;
    lineWidth?: number;
    fillOpacity?: number;
}

export type DrawingData =
    | { points: [DrawingPoint, DrawingPoint]; style?: DrawingStyle }
    | { price: number; style?: DrawingStyle }
    | { point: DrawingPoint; text: string; style?: DrawingStyle };

export interface ChartDrawingDto {
    id: number;
    symbolId: number;
    exchangeCode: string;
    symbolName: string;
    interval: string;
    drawingType: PersistedDrawingType;
    data: DrawingData;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateChartDrawingDto {
    symbolId: number;
    interval: string;
    drawingType: PersistedDrawingType;
    data: DrawingData;
    isVisible?: boolean;
}

export interface UpdateChartDrawingDto {
    data: DrawingData;
    isVisible?: boolean;
}
