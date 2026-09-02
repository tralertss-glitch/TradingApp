import type { CandlestickData, LineData, Time } from 'lightweight-charts';

// Simpelt glidende gennemsnit (SMA)
export const calculateSMA = (data: CandlestickData<Time>[], period: number): LineData<Time>[] => {
    const result: LineData<Time>[] = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        result.push({
            time: data[i].time,
            value: sum / period,
        });
    }
    return result;
};

// Eksponentielt glidende gennemsnit (EMA)
export const calculateEMA = (data: CandlestickData<Time>[], period: number): LineData<Time>[] => {
    if (data.length < period) return [];
    const result: LineData<Time>[] = [];
    const multiplier = 2 / (period + 1);

    // Brug SMA til den første værdi.
    let initialSum = 0;
    for (let i = 0; i < period; i++) {
        initialSum += data[i].close;
    }
    let prevEma = initialSum / period;
    result.push({ time: data[period - 1].time, value: prevEma });

    for (let i = period; i < data.length; i++) {
        const currentClose = data[i].close;
        const currentEma = (currentClose - prevEma) * multiplier + prevEma;
        result.push({ time: data[i].time, value: currentEma });
        prevEma = currentEma;
    }

    return result;
};

// Bollinger Bands (øvre, midterste, nedre)
export const calculateBollingerBands = (
    data: CandlestickData<Time>[],
    period: number = 20,
    stdDevMultiplier: number = 2
) => {
    const upper: LineData<Time>[] = [];
    const middle: LineData<Time>[] = [];
    const lower: LineData<Time>[] = [];

    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        const sma = sum / period;

        let varianceSum = 0;
        for (let j = 0; j < period; j++) {
            varianceSum += Math.pow(data[i - j].close - sma, 2);
        }
        const stdDev = Math.sqrt(varianceSum / period);

        middle.push({ time: data[i].time, value: sma });
        upper.push({ time: data[i].time, value: sma + stdDev * stdDevMultiplier });
        lower.push({ time: data[i].time, value: sma - stdDev * stdDevMultiplier });
    }

    return { upper, middle, lower };
};

// Relative Strength Index (RSI)
export const calculateRSI = (data: CandlestickData<Time>[], period: number = 14): LineData<Time>[] => {
    if (data.length <= period) return [];
    const result: LineData<Time>[] = [];

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change >= 0) gains += change;
        else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - 100 / (1 + rs);
    result.push({ time: data[period].time, value: rsi });

    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi = 100 - 100 / (1 + rs);
        result.push({ time: data[i].time, value: rsi });
    }

    return result;
};
