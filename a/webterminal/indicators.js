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
     * Calculate ATR (Average True Range)
     * @param {Array} ohlcv - OHLCV data array [[timestamp, open, high, low, close, volume], ...]
     * @param {Number} period - ATR period (default 14)
     * @returns {Number} ATR value
     */
    calculateATR(ohlcv, period = 14) {
        if (!ohlcv || ohlcv.length < period + 1) {
            return null;
        }

        const trueRanges = [];

        for (let i = 1; i < ohlcv.length; i++) {
            const high = ohlcv[i][2];
            const low = ohlcv[i][3];
            const prevClose = ohlcv[i - 1][4];

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );

            trueRanges.push(tr);
        }

        // Calculate ATR using EMA-like smoothing
        if (trueRanges.length < period) {
            return null;
        }

        // Initial ATR is SMA of first period TRs
        let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

        // Smooth subsequent values
        for (let i = period; i < trueRanges.length; i++) {
            atr = ((atr * (period - 1)) + trueRanges[i]) / period;
        }

        return atr;
    },

    /**
     * Calculate ATR Bot indicator (Trail lines)
     * @param {Array} ohlcv - OHLCV data array
     * @param {Object} params - Parameters {atrLength: 14, atrMult: 2.0, emaLength: 30}
     * @returns {Array} Array of {time, trail1, trail2, isUptrend} objects
     */
    calculateATRBot(ohlcv, params = {}) {
        const atrLength = params.atrLength || 14;
        const atrMult = params.atrMult || 2.0;
        const emaLength = params.emaLength || 30;

        if (!ohlcv || ohlcv.length < Math.max(atrLength, emaLength) + 1) {
            return [];
        }

        const closes = ohlcv.map(c => c[4]);
        const result = [];

        for (let i = Math.max(atrLength, emaLength); i < ohlcv.length; i++) {
            const currentOHLCV = ohlcv.slice(0, i + 1);
            const currentCloses = closes.slice(0, i + 1);

            // Calculate Trail1 (EMA of close)
            const trail1 = this.calculateEMA(currentCloses, emaLength);

            // Calculate ATR
            const atr = this.calculateATR(currentOHLCV, atrLength);

            if (!trail1 || !atr) continue;

            const sl2 = atr * atrMult;

            // Get previous values (nz function returns 0 if null/undefined)
            const prevTrail2 = result.length > 0 ? result[result.length - 1].trail2 : 0;
            const prevTrail1 = result.length > 0 ? result[result.length - 1].trail1 : 0;

            // PineScript logic translation:
            // iff_1 = Trail1 > nz(Trail2[1], 0) ? Trail1 - SL2 : Trail1 + SL2
            let iff_1;
            if (trail1 > prevTrail2) {
                iff_1 = trail1 - sl2;
            } else {
                iff_1 = trail1 + sl2;
            }

            // iff_2 = Trail1 < nz(Trail2[1], 0) and Trail1[1] < nz(Trail2[1], 0) ? math.min(nz(Trail2[1], 0), Trail1 + SL2) : iff_1
            let iff_2;
            if (trail1 < prevTrail2 && prevTrail1 < prevTrail2) {
                iff_2 = Math.min(prevTrail2, trail1 + sl2);
            } else {
                iff_2 = iff_1;
            }

            // Trail2 := Trail1 > nz(Trail2[1], 0) and Trail1[1] > nz(Trail2[1], 0) ? math.max(nz(Trail2[1], 0), Trail1 - SL2) : iff_2
            let trail2;
            if (trail1 > prevTrail2 && prevTrail1 > prevTrail2) {
                trail2 = Math.max(prevTrail2, trail1 - sl2);
            } else {
                trail2 = iff_2;
            }

            const isUptrend = trail1 > trail2;

            result.push({
                time: ohlcv[i][0],
                trail1: trail1,
                trail2: trail2,
                isUptrend: isUptrend
            });
        }

        return result;
    },

    /**
     * Calculate Standard Deviation
     * @param {Array} values - Array of values
     * @param {Number} period - Period for calculation
     * @returns {Number} Standard deviation value
     */
    calculateStdev(values, period) {
        if (!values || values.length < period) {
            return null;
        }

        const slice = values.slice(-period);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const squaredDiffs = slice.map(value => Math.pow(value - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
        
        return Math.sqrt(variance);
    },

    /**
     * Calculate VSR (Volume Support/Resistance) levels
     * @param {Array} ohlcv - OHLCV data array [[timestamp, open, high, low, close, volume], ...]
     * @param {Object} params - Parameters {length: 20, threshold: 3.0}
     * @returns {Array} Array of {time, upper, lower, hasSignal} objects
     */
    calculateVSR(ohlcv, params = {}) {
        const length = params.length || 20;
        const threshold = params.threshold || 3.0;

        if (!ohlcv || ohlcv.length < length + 1) {
            return [];
        }

        const result = [];
        let lastUpper = null;
        let lastLower = null;

        for (let i = length; i < ohlcv.length; i++) {
            const volumes = [];
            const changes = [];

            // Calculate volume changes
            for (let j = i - length; j <= i; j++) {
                volumes.push(ohlcv[j][5]); // volume
                
                if (j > i - length) {
                    const prevVolume = ohlcv[j - 1][5];
                    if (prevVolume > 0) {
                        const change = volumes[volumes.length - 1] / prevVolume - 1;
                        changes.push(change);
                    }
                }
            }

            // Current volume change
            const currentVolume = ohlcv[i][5];
            const prevVolume = ohlcv[i - 1][5];
            
            if (prevVolume === 0) continue;

            const change = currentVolume / prevVolume - 1;

            // Calculate stdev of changes
            const stdev = this.calculateStdev(changes, Math.min(changes.length, length));
            
            if (!stdev || stdev === 0) continue;

            // Calculate difference and signal
            const difference = change / stdev;
            const signal = Math.abs(difference);

            let upper = lastUpper;
            let lower = lastLower;
            let hasSignal = false;

            // If signal exceeds threshold, update levels
            if (signal > threshold) {
                const prevHigh = ohlcv[i - 1][2];
                const prevLow = ohlcv[i - 1][3];
                const prevClose = ohlcv[i - 1][4];

                upper = Math.max(prevHigh, prevClose);
                lower = Math.min(prevLow, prevClose);
                
                lastUpper = upper;
                lastLower = lower;
                hasSignal = true;
            }

            result.push({
                time: ohlcv[i][0],
                upper: upper,
                lower: lower,
                hasSignal: hasSignal,
                signal: signal
            });
        }

        return result;
    },

    /**
     * Calculate VWAP (Volume Weighted Average Price)
     * @param {Array} ohlcv - OHLCV data array [[timestamp, open, high, low, close, volume], ...]
     * @param {Object} params - Parameters {resetPeriod: 'daily'} - 'daily', 'weekly', 'none'
     * @returns {Array} Array of {time, vwap} objects
     */
    calculateVWAP(ohlcv, params = {}) {
        const resetPeriod = params.resetPeriod || 'daily';

        if (!ohlcv || ohlcv.length === 0) {
            return [];
        }

        const result = [];
        let cumulativeTPV = 0; // Cumulative Typical Price * Volume
        let cumulativeVolume = 0;
        let lastResetTime = null;

        for (let i = 0; i < ohlcv.length; i++) {
            const timestamp = ohlcv[i][0];
            const high = ohlcv[i][2];
            const low = ohlcv[i][3];
            const close = ohlcv[i][4];
            const volume = ohlcv[i][5];

            // Check if we need to reset (for daily VWAP)
            let shouldReset = false;
            if (resetPeriod === 'daily' && lastResetTime !== null) {
                const currentDay = Math.floor(timestamp / (24 * 60 * 60 * 1000));
                const lastDay = Math.floor(lastResetTime / (24 * 60 * 60 * 1000));
                shouldReset = currentDay !== lastDay;
            } else if (resetPeriod === 'weekly' && lastResetTime !== null) {
                const currentWeek = Math.floor(timestamp / (7 * 24 * 60 * 60 * 1000));
                const lastWeek = Math.floor(lastResetTime / (7 * 24 * 60 * 60 * 1000));
                shouldReset = currentWeek !== lastWeek;
            }

            if (shouldReset) {
                cumulativeTPV = 0;
                cumulativeVolume = 0;
            }

            lastResetTime = timestamp;

            // Calculate Typical Price (HLC/3)
            const typicalPrice = (high + low + close) / 3;

            // Accumulate
            cumulativeTPV += typicalPrice * volume;
            cumulativeVolume += volume;

            // Calculate VWAP
            const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice;

            result.push({
                time: timestamp,
                vwap: vwap
            });
        }

        return result;
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
