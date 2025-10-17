// Indicator calculation module
const Indicators = {
    /**
     * Calculate RSI (Relative Strength Index)
     * @param {Array} closes - Array of closing prices
     * @param {Number} period - RSI period (default 14)
     * @returns {Number} RSI value
     */
    calculateRSI(closes, period = 14) {
        if (!closes || closes.length < period + 1) {
            return null;
        }

        let gains = 0;
        let losses = 0;

        // Calculate initial average gain/loss
        for (let i = closes.length - period; i < closes.length; i++) {
            const change = closes[i] - closes[i - 1];
            if (change > 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) {
            return 100;
        }

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return rsi;
    },

    /**
     * Calculate EMA (Exponential Moving Average)
     * @param {Array} closes - Array of closing prices
     * @param {Number} period - EMA period
     * @returns {Number} EMA value
     */
    calculateEMA(closes, period) {
        if (!closes || closes.length < period) {
            return null;
        }

        const multiplier = 2 / (period + 1);

        // Calculate initial SMA
        let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;

        // Calculate EMA
        for (let i = period; i < closes.length; i++) {
            ema = (closes[i] - ema) * multiplier + ema;
        }

        return ema;
    },

    /**
     * Calculate SMA (Simple Moving Average)
     * @param {Array} closes - Array of closing prices
     * @param {Number} period - SMA period
     * @returns {Number} SMA value
     */
    calculateSMA(closes, period) {
        if (!closes || closes.length < period) {
            return null;
        }

        const slice = closes.slice(-period);
        return slice.reduce((a, b) => a + b, 0) / period;
    },

    /**
     * Generate trading signal based on indicators
     * @param {Object} indicators - Object containing RSI, EMA values
     * @returns {String} Signal: BUY, SELL, or HOLD
     */
    generateSignal(indicators) {
        const { rsi, ema50, ema200, close } = indicators;

        if (!rsi || !ema50 || !ema200 || !close) {
            return 'HOLD';
        }

        // RSI oversold + price above EMA50 = BUY
        if (rsi < 30 && close > ema50) {
            return 'BUY';
        }

        // RSI overbought + price below EMA50 = SELL
        if (rsi > 70 && close < ema50) {
            return 'SELL';
        }

        // Golden cross: EMA50 > EMA200 and price > EMA50 = BUY
        if (ema50 > ema200 && close > ema50 && rsi < 60) {
            return 'BUY';
        }

        // Death cross: EMA50 < EMA200 and price < EMA50 = SELL
        if (ema50 < ema200 && close < ema50 && rsi > 40) {
            return 'SELL';
        }

        return 'HOLD';
    },

    /**
     * Calculate all indicators for a symbol
     * @param {Array} ohlcv - OHLCV data array
     * @param {Object} config - Configuration object
     * @returns {Object} Calculated indicators
     */
    calculateAll(ohlcv, config = {}) {
        if (!ohlcv || ohlcv.length === 0) {
            return null;
        }

        const closes = ohlcv.map(candle => candle[4]);
        const lastClose = closes[closes.length - 1];

        const rsiPeriod = config.rsiPeriod || 14;
        const emaShort = config.emaShort || 50;
        const emaLong = config.emaLong || 200;

        const rsi = this.calculateRSI(closes, rsiPeriod);
        const ema50 = this.calculateEMA(closes, emaShort);
        const ema200 = this.calculateEMA(closes, emaLong);

        const indicators = {
            close: lastClose,
            rsi: rsi,
            ema50: ema50,
            ema200: ema200
        };

        const signal = this.generateSignal(indicators);

        return {
            ...indicators,
            signal: signal
        };
    }
};

// Export for worker usage
if (typeof self !== 'undefined' && self.postMessage) {
    self.Indicators = Indicators;
}
