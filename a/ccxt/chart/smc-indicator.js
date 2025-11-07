/**
 * Smart Money Concept (SMC) Indicator
 * Adapted for the trading application
 * Detects market structure: CHoCH, BoS, Liquidity Sweeps, Strong/Weak High/Low
 */

class SMCIndicator {
    constructor(options = {}) {
        // Default parameters
        this.leftBars = options.leftBars || 8;
        this.rightBars = options.rightBars || this.leftBars;
        this.useBos = options.useBos !== undefined ? options.useBos : false;
        this.sweepX = options.sweepX !== undefined ? options.sweepX : false;
        
        // State variables
        this.reset();
    }

    /**
     * Reset all state variables
     */
    reset() {
        this.pivotHighs = [];
        this.pivotLows = [];
        this.chochPoints = [];
        this.bosPoints = [];
        this.liquiditySweeps = [];
        this.marketTrends = [];
        this.strongHighs = [];
        this.weakHighs = [];
        this.strongLows = [];
        this.weakLows = [];
        
        // Current state
        this.upperLine = null;
        this.lowerLine = null;
        this.count1 = 0;
        this.count2 = 0;
        this.countTrend1 = 0;
        this.countTrend2 = 0;
        this.n1 = 0;
        this.n2 = 0;
        this.currentTrend = null;
        
        // Trailing extremes
        this.trailingTop = null;
        this.trailingBottom = null;
        this.lastTopIndex = null;
        this.lastBottomIndex = null;
    }

    /**
     * Find Pivot High
     * @param {Array} candles - Array of candles
     * @param {Number} currentIndex - Current index
     * @returns {Object|null} - Pivot high if found
     */
    findPivotHigh(candles, currentIndex) {
        const pivotIndex = currentIndex - this.rightBars;
        
        if (pivotIndex < this.leftBars || pivotIndex >= candles.length) {
            return null;
        }
        
        const pivotCandle = candles[pivotIndex];
        let isPivot = true;
        
        // Check left bars
        for (let i = 1; i <= this.leftBars; i++) {
            if (pivotIndex - i < 0 || candles[pivotIndex - i].high >= pivotCandle.high) {
                isPivot = false;
                break;
            }
        }
        
        // Check right bars
        if (isPivot) {
            for (let i = 1; i <= this.rightBars; i++) {
                if (pivotIndex + i >= candles.length || candles[pivotIndex + i].high > pivotCandle.high) {
                    isPivot = false;
                    break;
                }
            }
        }
        
        if (isPivot) {
            return {
                type: 'pivotHigh',
                price: pivotCandle.high,
                index: pivotIndex,
                time: pivotCandle.time,
                detectedAtIndex: currentIndex
            };
        }
        
        return null;
    }

    /**
     * Find Pivot Low
     * @param {Array} candles - Array of candles
     * @param {Number} currentIndex - Current index
     * @returns {Object|null} - Pivot low if found
     */
    findPivotLow(candles, currentIndex) {
        const pivotIndex = currentIndex - this.rightBars;
        
        if (pivotIndex < this.leftBars || pivotIndex >= candles.length) {
            return null;
        }
        
        const pivotCandle = candles[pivotIndex];
        let isPivot = true;
        
        // Check left bars
        for (let i = 1; i <= this.leftBars; i++) {
            if (pivotIndex - i < 0 || candles[pivotIndex - i].low <= pivotCandle.low) {
                isPivot = false;
                break;
            }
        }
        
        // Check right bars
        if (isPivot) {
            for (let i = 1; i <= this.rightBars; i++) {
                if (pivotIndex + i >= candles.length || candles[pivotIndex + i].low < pivotCandle.low) {
                    isPivot = false;
                    break;
                }
            }
        }
        
        if (isPivot) {
            return {
                type: 'pivotLow',
                price: pivotCandle.low,
                index: pivotIndex,
                time: pivotCandle.time,
                detectedAtIndex: currentIndex
            };
        }
        
        return null;
    }

    /**
     * Update trailing extremes for strong/weak high/low detection
     * @param {Array} candles - Array of candles
     * @param {Number} currentIndex - Current index
     */
    updateTrailingExtremes(candles, currentIndex) {
        const currentCandle = candles[currentIndex];
        
        // Update trailing top
        if (this.trailingTop === null || currentCandle.high > this.trailingTop) {
            if (this.trailingTop !== null && this.lastTopIndex !== null) {
                const highPoint = {
                    type: this.currentTrend === 'bearish' ? 'strongHigh' : 'weakHigh',
                    price: this.trailingTop,
                    index: this.lastTopIndex,
                    time: candles[this.lastTopIndex].time,
                    trend: this.currentTrend
                };
                
                if (this.currentTrend === 'bearish') {
                    this.strongHighs.push(highPoint);
                } else {
                    this.weakHighs.push(highPoint);
                }
            }
            
            this.trailingTop = currentCandle.high;
            this.lastTopIndex = currentIndex;
        }
        
        // Update trailing bottom
        if (this.trailingBottom === null || currentCandle.low < this.trailingBottom) {
            if (this.trailingBottom !== null && this.lastBottomIndex !== null) {
                const lowPoint = {
                    type: this.currentTrend === 'bullish' ? 'strongLow' : 'weakLow',
                    price: this.trailingBottom,
                    index: this.lastBottomIndex,
                    time: candles[this.lastBottomIndex].time,
                    trend: this.currentTrend
                };
                
                if (this.currentTrend === 'bullish') {
                    this.strongLows.push(lowPoint);
                } else {
                    this.weakLows.push(lowPoint);
                }
            }
            
            this.trailingBottom = currentCandle.low;
            this.lastBottomIndex = currentIndex;
        }
    }

    /**
     * Calculate total volume from start to end index
     * @param {Array} candles - Array of candles
     * @param {Number} startIndex - Start index
     * @param {Number} endIndex - End index
     * @returns {Number} - Total volume
     */
    calculateVolume(candles, startIndex, endIndex) {
        let totalVolume = 0;
        for (let i = 0; i <= (endIndex - startIndex); i++) {
            const candle = candles[startIndex + i];
            if (candle) {
                totalVolume += candle.close > candle.open ? candle.volume : -candle.volume;
            }
        }
        return totalVolume;
    }

    /**
     * Update market trend
     * @param {Array} candles - Array of candles
     * @param {Number} currentIndex - Current index
     * @param {String} trendDirection - 'bullish' or 'bearish'
     */
    updateMarketTrend(candles, currentIndex, trendDirection) {
        if (this.currentTrend !== trendDirection) {
            // End previous trend
            if (this.marketTrends.length > 0 && !this.marketTrends[this.marketTrends.length - 1].endIndex) {
                const lastTrend = this.marketTrends[this.marketTrends.length - 1];
                lastTrend.endIndex = currentIndex - 1;
                lastTrend.endTime = candles[currentIndex - 1] ? candles[currentIndex - 1].time : lastTrend.startTime;
                lastTrend.endPrice = candles[currentIndex - 1] ? candles[currentIndex - 1].close : lastTrend.startPrice;
            }
            
            // Start new trend
            const newTrend = {
                direction: trendDirection,
                startIndex: currentIndex,
                startTime: candles[currentIndex].time,
                startPrice: candles[currentIndex].open,
                endIndex: null,
                endTime: null,
                endPrice: null
            };
            this.marketTrends.push(newTrend);
            this.currentTrend = trendDirection;
        }
    }

    /**
     * Analyze SMC for array of candles
     * @param {Array} candles - Array of candles [{time, open, high, low, close, volume}]
     * @returns {Object} - SMC analysis result
     */
    calculateArray(candles) {
        this.reset();
        
        // Process each candle
        for (let i = 0; i < candles.length; i++) {
            const currentCandle = candles[i];
            
            // Update trailing extremes
            this.updateTrailingExtremes(candles, i);
            
            // Find pivot high/low
            const pivotHigh = this.findPivotHigh(candles, i);
            const pivotLow = this.findPivotLow(candles, i);
            
            // Process pivot high
            if (pivotHigh) {
                this.pivotHighs.push(pivotHigh);
                this.upperLine = {
                    price: pivotHigh.price,
                    index: pivotHigh.index
                };
                this.n1 = pivotHigh.index;
                this.trailingTop = pivotHigh.price;
                this.lastTopIndex = pivotHigh.index;
            }
            
            // Process pivot low
            if (pivotLow) {
                this.pivotLows.push(pivotLow);
                this.lowerLine = {
                    price: pivotLow.price,
                    index: pivotLow.index
                };
                this.n2 = pivotLow.index;
                this.trailingBottom = pivotLow.price;
                this.lastBottomIndex = pivotLow.index;
            }
            
            // Check break upper line
            if (this.upperLine && 
                currentCandle.high > this.upperLine.price && 
                currentCandle.low < this.upperLine.price) {
                
                this.count1++;
                this.count2 = 0;
                
                const volume = this.calculateVolume(candles, this.n1, i);
                
                if (this.count1 === 1) {
                    // CHoCH - Change of Character
                    const choch = {
                        type: 'CHoCH',
                        direction: 'bullish',
                        price: this.upperLine.price,
                        startIndex: this.n1,
                        endIndex: i,
                        startTime: candles[this.n1].time,
                        endTime: currentCandle.time,
                        volume: volume,
                        effectCandles: i - this.n1 + 1
                    };
                    this.chochPoints.push(choch);
                    
                } else if (this.count1 > 1 && this.useBos) {
                    // BoS - Break of Structure
                    const midIndex = this.n1 + Math.floor((i - this.n1) / 2);
                    
                    const isLiquiditySweep = this.sweepX && 
                        currentCandle.close < currentCandle.open && 
                        currentCandle.high > this.upperLine.price && 
                        currentCandle.open < this.upperLine.price;
                    
                    const structure = {
                        type: isLiquiditySweep ? 'LiquiditySweep' : 'BoS',
                        direction: 'bullish',
                        price: this.upperLine.price,
                        startIndex: this.n1,
                        endIndex: i,
                        labelIndex: midIndex,
                        startTime: candles[this.n1].time,
                        endTime: currentCandle.time,
                        volume: volume,
                        effectCandles: i - this.n1 + 1
                    };
                    
                    if (isLiquiditySweep) {
                        this.liquiditySweeps.push(structure);
                    } else {
                        this.bosPoints.push(structure);
                    }
                }
                
                this.upperLine = null;
            }
            
            // Check break lower line
            if (this.lowerLine && 
                currentCandle.high > this.lowerLine.price && 
                currentCandle.low < this.lowerLine.price) {
                
                this.count2++;
                this.count1 = 0;
                
                const volume = this.calculateVolume(candles, this.n2, i);
                
                if (this.count2 === 1) {
                    // CHoCH - Change of Character
                    const choch = {
                        type: 'CHoCH',
                        direction: 'bearish',
                        price: this.lowerLine.price,
                        startIndex: this.n2,
                        endIndex: i,
                        startTime: candles[this.n2].time,
                        endTime: currentCandle.time,
                        volume: volume,
                        effectCandles: i - this.n2 + 1
                    };
                    this.chochPoints.push(choch);
                    
                } else if (this.count2 > 1 && this.useBos) {
                    // BoS - Break of Structure
                    const midIndex = this.n2 + Math.floor((i - this.n2) / 2);
                    
                    const isLiquiditySweep = this.sweepX && 
                        currentCandle.close < currentCandle.open && 
                        currentCandle.low < this.lowerLine.price && 
                        currentCandle.close > this.lowerLine.price;
                    
                    const structure = {
                        type: isLiquiditySweep ? 'LiquiditySweep' : 'BoS',
                        direction: 'bearish',
                        price: this.lowerLine.price,
                        startIndex: this.n2,
                        endIndex: i,
                        labelIndex: midIndex,
                        startTime: candles[this.n2].time,
                        endTime: currentCandle.time,
                        volume: volume,
                        effectCandles: i - this.n2 + 1
                    };
                    
                    if (isLiquiditySweep) {
                        this.liquiditySweeps.push(structure);
                    } else {
                        this.bosPoints.push(structure);
                    }
                }
                
                this.lowerLine = null;
            }
            
            // Update trend counters
            if (this.count1 > 0) {
                this.countTrend2 = 0;
                this.countTrend1++;
                this.updateMarketTrend(candles, i, 'bullish');
            }
            
            if (this.count2 > 0) {
                this.countTrend1 = 0;
                this.countTrend2++;
                this.updateMarketTrend(candles, i, 'bearish');
            }
        }
        
        // Close last trend
        if (this.marketTrends.length > 0) {
            const lastTrend = this.marketTrends[this.marketTrends.length - 1];
            if (!lastTrend.endIndex) {
                lastTrend.endIndex = candles.length - 1;
                lastTrend.endTime = candles[candles.length - 1].time;
                lastTrend.endPrice = candles[candles.length - 1].close;
            }
        }
        
        // Add last strong/weak high/low
        if (this.trailingTop !== null && this.lastTopIndex !== null) {
            const highPoint = {
                type: this.currentTrend === 'bearish' ? 'strongHigh' : 'weakHigh',
                price: this.trailingTop,
                index: this.lastTopIndex,
                time: candles[this.lastTopIndex].time,
                trend: this.currentTrend,
                isLast: true
            };
            
            if (this.currentTrend === 'bearish') {
                this.strongHighs.push(highPoint);
            } else {
                this.weakHighs.push(highPoint);
            }
        }
        
        if (this.trailingBottom !== null && this.lastBottomIndex !== null) {
            const lowPoint = {
                type: this.currentTrend === 'bullish' ? 'strongLow' : 'weakLow',
                price: this.trailingBottom,
                index: this.lastBottomIndex,
                time: candles[this.lastBottomIndex].time,
                trend: this.currentTrend,
                isLast: true
            };
            
            if (this.currentTrend === 'bullish') {
                this.strongLows.push(lowPoint);
            } else {
                this.weakLows.push(lowPoint);
            }
        }
        
        return {
            pivotHighs: this.pivotHighs,
            pivotLows: this.pivotLows,
            chochPoints: this.chochPoints,
            bosPoints: this.bosPoints,
            liquiditySweeps: this.liquiditySweeps,
            marketTrends: this.marketTrends,
            strongHighs: this.strongHighs,
            weakHighs: this.weakHighs,
            strongLows: this.strongLows,
            weakLows: this.weakLows,
            currentTrend: this.countTrend1 > 0 ? 'bullish' : (this.countTrend2 > 0 ? 'bearish' : null)
        };
    }

    /**
     * Update parameters
     * @param {Object} options - New parameters
     */
    updateParameters(options) {
        if (options.leftBars !== undefined) this.leftBars = options.leftBars;
        if (options.rightBars !== undefined) this.rightBars = options.rightBars;
        if (options.useBos !== undefined) this.useBos = options.useBos;
        if (options.sweepX !== undefined) this.sweepX = options.sweepX;
    }

    /**
     * Get current trend
     * @returns {String|null} - Current trend direction
     */
    getCurrentTrend() {
        return this.currentTrend;
    }

    /**
     * Get statistics
     * @returns {Object} - SMC statistics
     */
    getStatistics() {
        return {
            totalPivotHighs: this.pivotHighs.length,
            totalPivotLows: this.pivotLows.length,
            totalChoch: this.chochPoints.length,
            totalBos: this.bosPoints.length,
            totalLiquiditySweeps: this.liquiditySweeps.length,
            totalTrends: this.marketTrends.length,
            totalStrongHighs: this.strongHighs.length,
            totalWeakHighs: this.weakHighs.length,
            totalStrongLows: this.strongLows.length,
            totalWeakLows: this.weakLows.length,
            currentTrend: this.currentTrend
        };
    }
}
