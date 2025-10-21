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

        if (!ohlcv || ohlcv.length < length + 2) {
            return [];
        }

        const result = [];
        let lastUpper = null;
        let lastLower = null;
        let prevStdev = null;

        for (let i = length; i < ohlcv.length; i++) {
            // Current volume change
            const currentVolume = ohlcv[i][5];
            const prevVolume = ohlcv[i - 1][5];

            if (prevVolume === 0) {
                // Keep last levels but don't calculate signal
                if (lastUpper !== null && lastLower !== null) {
                    result.push({
                        time: ohlcv[i][0],
                        upper: lastUpper,
                        lower: lastLower,
                        hasSignal: false,
                        signal: 0
                    });
                }
                continue;
            }

            const change = currentVolume / prevVolume - 1;

            // Calculate stdev of changes for the window ending at current bar
            const changes = [];
            for (let j = i - length + 1; j <= i; j++) {
                if (j > 0 && ohlcv[j - 1][5] > 0) {
                    const vol = ohlcv[j][5];
                    const prevVol = ohlcv[j - 1][5];
                    changes.push(vol / prevVol - 1);
                }
            }

            const currentStdev = this.calculateStdev(changes, changes.length);

            // Use previous bar's stdev (stdev[1] in PineScript)
            if (prevStdev && prevStdev > 0) {
                // Calculate difference and signal
                const difference = change / prevStdev;
                const signal = Math.abs(difference);

                // If signal exceeds threshold, update levels (valuewhen logic)
                if (signal > threshold) {
                    const prevHigh = ohlcv[i - 1][2];
                    const prevLow = ohlcv[i - 1][3];
                    const prevClose = ohlcv[i - 1][4];

                    lastUpper = Math.max(prevHigh, prevClose);
                    lastLower = Math.min(prevLow, prevClose);
                }

                // Always push with current levels (valuewhen keeps last value)
                if (lastUpper !== null && lastLower !== null) {
                    result.push({
                        time: ohlcv[i][0],
                        upper: lastUpper,
                        lower: lastLower,
                        hasSignal: signal > threshold,
                        signal: signal
                    });
                }
            }

            // Store current stdev for next iteration
            prevStdev = currentStdev;
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
     * Calculate WMA (Weighted Moving Average)
     * @param {Array} closes - Array of closing prices
     * @param {Number} period - WMA period
     * @returns {Number} WMA value
     */
    calculateWMA(closes, period) {
        if (!closes || closes.length < period) {
            return null;
        }

        const slice = closes.slice(-period);
        let weightedSum = 0;
        let weightSum = 0;

        for (let i = 0; i < period; i++) {
            const weight = i + 1; // Weight increases linearly
            weightedSum += slice[i] * weight;
            weightSum += weight;
        }

        return weightedSum / weightSum;
    },

    /**
     * Calculate WMA series for all data points
     * @param {Array} ohlcv - OHLCV data array
     * @param {Object} params - Parameters {period: 60}
     * @returns {Array} Array of {time, wma} objects
     */
    calculateWMASeries(ohlcv, params = {}) {
        const period = params.period || 60;

        if (!ohlcv || ohlcv.length < period) {
            return [];
        }

        const closes = ohlcv.map(c => c[4]);
        const result = [];

        for (let i = period - 1; i < ohlcv.length; i++) {
            const currentCloses = closes.slice(0, i + 1);
            const wma = this.calculateWMA(currentCloses, period);

            if (wma !== null) {
                result.push({
                    time: ohlcv[i][0],
                    wma: wma
                });
            }
        }

        return result;
    },

    /**
     * Calculate HMA (Hull Moving Average)
     * @param {Array} closes - Array of closing prices
     * @param {Number} period - HMA period
     * @returns {Number} HMA value
     */
    calculateHMA(closes, period) {
        if (!closes || closes.length < period) {
            return null;
        }

        // HMA = WMA(2*WMA(n/2) - WMA(n)), sqrt(n))
        const halfPeriod = Math.floor(period / 2);
        const sqrtPeriod = Math.floor(Math.sqrt(period));

        // Calculate WMA(n/2)
        const wmaHalf = this.calculateWMA(closes, halfPeriod);
        if (wmaHalf === null) return null;

        // Calculate WMA(n)
        const wmaFull = this.calculateWMA(closes, period);
        if (wmaFull === null) return null;

        // Calculate 2*WMA(n/2) - WMA(n) for all points
        const rawHMA = [];
        const minLength = Math.max(halfPeriod, period);
        
        for (let i = minLength - 1; i < closes.length; i++) {
            const currentCloses = closes.slice(0, i + 1);
            const wmaH = this.calculateWMA(currentCloses, halfPeriod);
            const wmaF = this.calculateWMA(currentCloses, period);
            
            if (wmaH !== null && wmaF !== null) {
                rawHMA.push(2 * wmaH - wmaF);
            }
        }

        if (rawHMA.length < sqrtPeriod) return null;

        // Calculate WMA of rawHMA with sqrt(period)
        return this.calculateWMA(rawHMA, sqrtPeriod);
    },

    /**
     * Calculate HMA series for all data points
     * @param {Array} ohlcv - OHLCV data array
     * @param {Object} params - Parameters {period: 60}
     * @returns {Array} Array of {time, hma} objects
     */
    calculateHMASeries(ohlcv, params = {}) {
        const period = params.period || 60;

        if (!ohlcv || ohlcv.length < period) {
            return [];
        }

        const closes = ohlcv.map(c => c[4]);
        const result = [];
        
        const halfPeriod = Math.floor(period / 2);
        const sqrtPeriod = Math.floor(Math.sqrt(period));
        const minLength = period + sqrtPeriod;

        for (let i = minLength - 1; i < ohlcv.length; i++) {
            const currentCloses = closes.slice(0, i + 1);
            
            // Calculate raw HMA values
            const rawHMA = [];
            const startIdx = Math.max(halfPeriod, period) - 1;
            
            for (let j = startIdx; j < currentCloses.length; j++) {
                const slicedCloses = currentCloses.slice(0, j + 1);
                const wmaH = this.calculateWMA(slicedCloses, halfPeriod);
                const wmaF = this.calculateWMA(slicedCloses, period);
                
                if (wmaH !== null && wmaF !== null) {
                    rawHMA.push(2 * wmaH - wmaF);
                }
            }

            if (rawHMA.length >= sqrtPeriod) {
                const hma = this.calculateWMA(rawHMA, sqrtPeriod);
                
                if (hma !== null) {
                    result.push({
                        time: ohlcv[i][0],
                        hma: hma
                    });
                }
            }
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
