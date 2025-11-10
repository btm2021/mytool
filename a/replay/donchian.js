class DonchianIndicator {
    constructor(length = 50, colors = {}) {
        this.length = length;
        this.smoothLength = 14; // WMA smoothing period
        this.colors = {
            upper: colors.upper || 'rgba(0, 0, 255, 0.8)',
            lower: colors.lower || 'rgba(0, 0, 255, 0.8)',
            middle: colors.middle || 'rgba(0, 0, 255, 0.5)'
        };
        this.reset();
    }

    reset() {
        // No state needed for this indicator
    }

    getColors() {
        return this.colors;
    }

    updateColors(colors) {
        if (colors.upper) this.colors.upper = colors.upper;
        if (colors.lower) this.colors.lower = colors.lower;
        if (colors.middle) this.colors.middle = colors.middle;
    }

    calculateWMA(values, period) {
        // Calculate Weighted Moving Average
        if (values.length < period) {
            return undefined;
        }

        const weights = [];
        let weightSum = 0;
        for (let i = 1; i <= period; i++) {
            weights.push(i);
            weightSum += i;
        }

        let wma = 0;
        for (let i = 0; i < period; i++) {
            const value = values[values.length - period + i];
            if (value === undefined || value === null) {
                return undefined;
            }
            wma += value * weights[i];
        }

        return wma / weightSum;
    }

    calculateArray(candles) {
        const rawResults = {
            upper: [],
            lower: [],
            middle: []
        };

        // First pass: calculate raw Donchian values
        for (let i = 0; i < candles.length; i++) {
            if (i < this.length - 1) {
                // Not enough data yet
                rawResults.upper.push(undefined);
                rawResults.lower.push(undefined);
                rawResults.middle.push(undefined);
                continue;
            }

            const slice = candles.slice(i - this.length + 1, i + 1);
            let highestHigh = -Infinity;
            let lowestLow = Infinity;

            for (const candle of slice) {
                if (candle.high > highestHigh) {
                    highestHigh = candle.high;
                }
                if (candle.low < lowestLow) {
                    lowestLow = candle.low;
                }
            }

            const middle = (highestHigh + lowestLow) / 2;

            rawResults.upper.push(highestHigh);
            rawResults.lower.push(lowestLow);
            rawResults.middle.push(middle);
        }

        // Second pass: apply WMA smoothing
        const results = {
            upper: [],
            lower: [],
            middle: []
        };

        for (let i = 0; i < candles.length; i++) {
            if (i < this.length - 1 + this.smoothLength - 1) {
                // Not enough data for smoothing
                results.upper.push({ time: candles[i].time, value: undefined });
                results.lower.push({ time: candles[i].time, value: undefined });
                results.middle.push({ time: candles[i].time, value: undefined });
                continue;
            }

            const upperWMA = this.calculateWMA(rawResults.upper.slice(0, i + 1), this.smoothLength);
            const lowerWMA = this.calculateWMA(rawResults.lower.slice(0, i + 1), this.smoothLength);
            const middleWMA = this.calculateWMA(rawResults.middle.slice(0, i + 1), this.smoothLength);

            results.upper.push({ time: candles[i].time, value: upperWMA });
            results.lower.push({ time: candles[i].time, value: lowerWMA });
            results.middle.push({ time: candles[i].time, value: middleWMA });
        }

        return results;
    }

    updateParameters(length) {
        this.length = length;
        this.reset();
    }
}
