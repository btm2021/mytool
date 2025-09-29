/**
 * Technical Indicators Module
 * Contains various technical analysis indicators
 */
class TechnicalIndicators {
    constructor() {
        this.indicators = new Map();
    }

    /**
     * Calculate Exponential Moving Average (EMA)
     * @param {Array} data - Array of price data (objects with close property)
     * @param {number} period - EMA period
     * @returns {Array} Array of EMA values with time and value properties
     */
    calculateEMA(data, period = 21) {
        if (!data || data.length < period) {
            return [];
        }

        const emaData = [];
        const multiplier = 2 / (period + 1);
        
        // Calculate initial SMA for the first EMA value
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i].close;
        }
        
        let ema = sum / period;
        emaData.push({
            time: data[period - 1].time,
            value: ema
        });

        // Calculate EMA for remaining data points
        for (let i = period; i < data.length; i++) {
            ema = (data[i].close * multiplier) + (ema * (1 - multiplier));
            emaData.push({
                time: data[i].time,
                value: ema
            });
        }

        return emaData;
    }

    /**
     * Calculate Simple Moving Average (SMA)
     * @param {Array} data - Array of price data
     * @param {number} period - SMA period
     * @returns {Array} Array of SMA values
     */
    calculateSMA(data, period = 20) {
        if (!data || data.length < period) {
            return [];
        }

        const smaData = [];
        
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = i - period + 1; j <= i; j++) {
                sum += data[j].close;
            }
            
            smaData.push({
                time: data[i].time,
                value: sum / period
            });
        }

        return smaData;
    }

    /**
     * Calculate Relative Strength Index (RSI)
     * @param {Array} data - Array of price data
     * @param {number} period - RSI period (default 14)
     * @returns {Array} Array of RSI values
     */
    calculateRSI(data, period = 14) {
        if (!data || data.length < period + 1) {
            return [];
        }

        const rsiData = [];
        const gains = [];
        const losses = [];

        // Calculate initial gains and losses
        for (let i = 1; i <= period; i++) {
            const change = data[i].close - data[i - 1].close;
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        // Calculate initial average gain and loss
        let avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
        let avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;

        // Calculate RSI for the first valid point
        let rs = avgGain / avgLoss;
        let rsi = 100 - (100 / (1 + rs));
        
        rsiData.push({
            time: data[period].time,
            value: rsi
        });

        // Calculate RSI for remaining data points
        for (let i = period + 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;

            // Smooth the gains and losses
            avgGain = ((avgGain * (period - 1)) + gain) / period;
            avgLoss = ((avgLoss * (period - 1)) + loss) / period;

            rs = avgGain / avgLoss;
            rsi = 100 - (100 / (1 + rs));

            rsiData.push({
                time: data[i].time,
                value: rsi
            });
        }

        return rsiData;
    }

    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     * @param {Array} data - Array of price data
     * @param {number} fastPeriod - Fast EMA period (default 12)
     * @param {number} slowPeriod - Slow EMA period (default 26)
     * @param {number} signalPeriod - Signal line EMA period (default 9)
     * @returns {Object} Object containing MACD line, signal line, and histogram
     */
    calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (!data || data.length < slowPeriod) {
            return { macd: [], signal: [], histogram: [] };
        }

        // Calculate fast and slow EMAs
        const fastEMA = this.calculateEMA(data, fastPeriod);
        const slowEMA = this.calculateEMA(data, slowPeriod);

        // Calculate MACD line
        const macdLine = [];
        const startIndex = slowPeriod - fastPeriod;
        
        for (let i = 0; i < slowEMA.length; i++) {
            const fastValue = fastEMA[i + startIndex];
            const slowValue = slowEMA[i];
            
            if (fastValue && slowValue) {
                macdLine.push({
                    time: slowValue.time,
                    value: fastValue.value - slowValue.value
                });
            }
        }

        // Calculate signal line (EMA of MACD line)
        const signalLine = this.calculateEMA(macdLine, signalPeriod);

        // Calculate histogram
        const histogram = [];
        const signalStartIndex = signalPeriod - 1;
        
        for (let i = 0; i < signalLine.length; i++) {
            const macdValue = macdLine[i + signalStartIndex];
            const signalValue = signalLine[i];
            
            if (macdValue && signalValue) {
                histogram.push({
                    time: signalValue.time,
                    value: macdValue.value - signalValue.value
                });
            }
        }

        return {
            macd: macdLine,
            signal: signalLine,
            histogram: histogram
        };
    }

    /**
     * Calculate Bollinger Bands
     * @param {Array} data - Array of price data
     * @param {number} period - Moving average period (default 20)
     * @param {number} stdDev - Standard deviation multiplier (default 2)
     * @returns {Object} Object containing upper, middle, and lower bands
     */
    calculateBollingerBands(data, period = 20, stdDev = 2) {
        if (!data || data.length < period) {
            return { upper: [], middle: [], lower: [] };
        }

        const upperBand = [];
        const middleBand = [];
        const lowerBand = [];

        for (let i = period - 1; i < data.length; i++) {
            // Calculate SMA
            let sum = 0;
            for (let j = i - period + 1; j <= i; j++) {
                sum += data[j].close;
            }
            const sma = sum / period;

            // Calculate standard deviation
            let variance = 0;
            for (let j = i - period + 1; j <= i; j++) {
                variance += Math.pow(data[j].close - sma, 2);
            }
            const standardDeviation = Math.sqrt(variance / period);

            const time = data[i].time;
            
            upperBand.push({
                time: time,
                value: sma + (stdDev * standardDeviation)
            });
            
            middleBand.push({
                time: time,
                value: sma
            });
            
            lowerBand.push({
                time: time,
                value: sma - (stdDev * standardDeviation)
            });
        }

        return {
            upper: upperBand,
            middle: middleBand,
            lower: lowerBand
        };
    }

    /**
     * Calculate Stochastic Oscillator
     * @param {Array} data - Array of OHLC data
     * @param {number} kPeriod - %K period (default 14)
     * @param {number} dPeriod - %D period (default 3)
     * @returns {Object} Object containing %K and %D lines
     */
    calculateStochastic(data, kPeriod = 14, dPeriod = 3) {
        if (!data || data.length < kPeriod) {
            return { k: [], d: [] };
        }

        const kLine = [];

        for (let i = kPeriod - 1; i < data.length; i++) {
            // Find highest high and lowest low in the period
            let highestHigh = data[i - kPeriod + 1].high;
            let lowestLow = data[i - kPeriod + 1].low;

            for (let j = i - kPeriod + 2; j <= i; j++) {
                if (data[j].high > highestHigh) highestHigh = data[j].high;
                if (data[j].low < lowestLow) lowestLow = data[j].low;
            }

            // Calculate %K
            const k = ((data[i].close - lowestLow) / (highestHigh - lowestLow)) * 100;
            
            kLine.push({
                time: data[i].time,
                value: k
            });
        }

        // Calculate %D (SMA of %K)
        const dLine = this.calculateSMA(kLine, dPeriod);

        return {
            k: kLine,
            d: dLine
        };
    }

    /**
     * Get indicator configuration for UI
     * @returns {Object} Available indicators with their default parameters
     */
    getAvailableIndicators() {
        return {
            ema: {
                name: 'Exponential Moving Average',
                params: { period: 21 },
                color: '#2196F3'
            },
            sma: {
                name: 'Simple Moving Average',
                params: { period: 20 },
                color: '#FF9800'
            },
            rsi: {
                name: 'Relative Strength Index',
                params: { period: 14 },
                color: '#9C27B0'
            },
            macd: {
                name: 'MACD',
                params: { fast: 12, slow: 26, signal: 9 },
                color: '#4CAF50'
            },
            bb: {
                name: 'Bollinger Bands',
                params: { period: 20, stdDev: 2 },
                color: '#607D8B'
            },
            stoch: {
                name: 'Stochastic',
                params: { kPeriod: 14, dPeriod: 3 },
                color: '#E91E63'
            }
        };
    }

    /**
     * Calculate indicator based on type
     * @param {string} type - Indicator type
     * @param {Array} data - Price data
     * @param {Object} params - Indicator parameters
     * @returns {Array|Object} Calculated indicator data
     */
    calculate(type, data, params = {}) {
        switch (type.toLowerCase()) {
            case 'ema':
                return this.calculateEMA(data, params.period || 21);
            case 'sma':
                return this.calculateSMA(data, params.period || 20);
            case 'rsi':
                return this.calculateRSI(data, params.period || 14);
            case 'macd':
                return this.calculateMACD(data, params.fast || 12, params.slow || 26, params.signal || 9);
            case 'bb':
                return this.calculateBollingerBands(data, params.period || 20, params.stdDev || 2);
            case 'stoch':
                return this.calculateStochastic(data, params.kPeriod || 14, params.dPeriod || 3);
            default:
                throw new Error(`Unknown indicator type: ${type}`);
        }
    }
}

// Export for use in other modules
window.TechnicalIndicators = TechnicalIndicators;
