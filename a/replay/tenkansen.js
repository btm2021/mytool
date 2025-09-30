class TenkansenIndicator {
    constructor(length = 50, color = 'rgba(255, 165, 0, 0.8)') {
        this.length = length;
        this.color = color;
        this.reset();
    }

    reset() {
        // No state needed for this indicator
    }

    getColor() {
        return this.color;
    }

    updateColor(color) {
        this.color = color;
    }

    calculateArray(candles) {
        const results = {
            tenkansen: []
        };

        for (let i = 0; i < candles.length; i++) {
            if (i < this.length - 1) {
                // Not enough data yet
                results.tenkansen.push({ time: candles[i].time, value: undefined });
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

            const tenkansen = (highestHigh + lowestLow) / 2;

            results.tenkansen.push({ time: candles[i].time, value: tenkansen });
        }

        return results;
    }

    updateParameters(length) {
        this.length = length;
        this.reset();
    }
}
