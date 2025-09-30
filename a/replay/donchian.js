class DonchianIndicator {
    constructor(length = 50, colors = {}) {
        this.length = length;
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

    calculateArray(candles) {
        const results = {
            upper: [],
            lower: [],
            middle: []
        };

        for (let i = 0; i < candles.length; i++) {
            if (i < this.length - 1) {
                // Not enough data yet
                results.upper.push({ time: candles[i].time, value: undefined });
                results.lower.push({ time: candles[i].time, value: undefined });
                results.middle.push({ time: candles[i].time, value: undefined });
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

            results.upper.push({ time: candles[i].time, value: highestHigh });
            results.lower.push({ time: candles[i].time, value: lowestLow });
            results.middle.push({ time: candles[i].time, value: middle });
        }

        return results;
    }

    updateParameters(length) {
        this.length = length;
        this.reset();
    }
}
