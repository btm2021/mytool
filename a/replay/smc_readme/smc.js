/**
 * Smart Money Concept (SMC) Library
 * Chuyển đổi từ PineScript sang JavaScript
 */

class SMC {
    constructor(options = {}) {
        // Default parameters
        this.leftBars = options.leftBars || 8;
        this.rightBars = options.rightBars || this.leftBars;
        this.useBos = options.useBos || false;
        this.sweepX = options.sweepX || false;
        
        // State variables
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
        
        // Current state - giống như var trong PineScript
        this.upperLine = null;  // Line hiện tại cho pivot high
        this.lowerLine = null;  // Line hiện tại cho pivot low
        this.count1 = 0; // Counter cho upper structure
        this.count2 = 0; // Counter cho lower structure
        this.countTrend1 = 0; // Counter cho uptrend
        this.countTrend2 = 0; // Counter cho downtrend
        this.n1 = 0; // Bar index của pivot high cuối cùng
        this.n2 = 0; // Bar index của pivot low cuối cùng
        this.currentTrend = null;
        
        // Trailing extremes - để track strong/weak high/low
        this.trailingTop = null;
        this.trailingBottom = null;
        this.lastTopIndex = null;
        this.lastBottomIndex = null;
    }
    
    /**
     * Tìm Pivot High - giống ta.pivothigh trong PineScript
     * @param {Array} candles - Mảng nến
     * @param {Number} currentIndex - Index hiện tại (tương ứng bar_index)
     * @returns {Object|null} - Pivot high nếu tìm thấy
     */
    findPivotHigh(candles, currentIndex) {
        // Pivot được phát hiện tại vị trí currentIndex - rightBars
        const pivotIndex = currentIndex - this.rightBars;
        
        if (pivotIndex < this.leftBars || pivotIndex >= candles.length) {
            return null;
        }
        
        const pivotCandle = candles[pivotIndex];
        let isPivot = true;
        
        // Kiểm tra left bars
        for (let i = 1; i <= this.leftBars; i++) {
            if (pivotIndex - i < 0 || candles[pivotIndex - i].high >= pivotCandle.high) {
                isPivot = false;
                break;
            }
        }
        
        // Kiểm tra right bars
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
                timestamp: pivotCandle.timestamp,
                detectedAtIndex: currentIndex
            };
        }
        
        return null;
    }
    
    /**
     * Tìm Pivot Low - giống ta.pivotlow trong PineScript
     * @param {Array} candles - Mảng nến
     * @param {Number} currentIndex - Index hiện tại
     * @returns {Object|null} - Pivot low nếu tìm thấy
     */
    findPivotLow(candles, currentIndex) {
        // Pivot được phát hiện tại vị trí currentIndex - rightBars
        const pivotIndex = currentIndex - this.rightBars;
        
        if (pivotIndex < this.leftBars || pivotIndex >= candles.length) {
            return null;
        }
        
        const pivotCandle = candles[pivotIndex];
        let isPivot = true;
        
        // Kiểm tra left bars
        for (let i = 1; i <= this.leftBars; i++) {
            if (pivotIndex - i < 0 || candles[pivotIndex - i].low <= pivotCandle.low) {
                isPivot = false;
                break;
            }
        }
        
        // Kiểm tra right bars
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
                timestamp: pivotCandle.timestamp,
                detectedAtIndex: currentIndex
            };
        }
        
        return null;
    }
    
    /**
     * Cập nhật trailing extremes và xác định strong/weak high/low
     * @param {Array} candles - Mảng nến
     * @param {Number} currentIndex - Index hiện tại
     */
    updateTrailingExtremes(candles, currentIndex) {
        const currentCandle = candles[currentIndex];
        
        // Update trailing top
        if (this.trailingTop === null || currentCandle.high > this.trailingTop) {
            // Kiểm tra nếu có trailing top cũ và trend để xác định strong/weak
            if (this.trailingTop !== null && this.lastTopIndex !== null) {
                const highPoint = {
                    type: this.currentTrend === 'bearish' ? 'strongHigh' : 'weakHigh',
                    price: this.trailingTop,
                    index: this.lastTopIndex,
                    timestamp: candles[this.lastTopIndex].timestamp,
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
            // Kiểm tra nếu có trailing bottom cũ và trend để xác định strong/weak
            if (this.trailingBottom !== null && this.lastBottomIndex !== null) {
                const lowPoint = {
                    type: this.currentTrend === 'bullish' ? 'strongLow' : 'weakLow',
                    price: this.trailingBottom,
                    index: this.lastBottomIndex,
                    timestamp: candles[this.lastBottomIndex].timestamp,
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
     * Tính tổng volume từ n1/n2 đến bar hiện tại
     * @param {Array} candles - Mảng nến
     * @param {Number} startIndex - Index bắt đầu (n1 hoặc n2)
     * @param {Number} endIndex - Index hiện tại
     * @returns {Number} - Tổng volume
     */
    calculateVolume(candles, startIndex, endIndex) {
        let totalVolume = 0;
        // Loop từ 0 đến (endIndex - startIndex) giống PineScript
        for (let i = 0; i <= (endIndex - startIndex); i++) {
            const candle = candles[startIndex + i];
            if (candle) {
                totalVolume += candle.close > candle.open ? candle.volume : -candle.volume;
            }
        }
        return totalVolume;
    }
    
    /**
     * Phân tích SMC theo từng nến - giống flow của PineScript
     * @param {Array} candles - Mảng nến [{high, low, open, close, volume, timestamp}]
     * @returns {Object} - Kết quả phân tích SMC
     */
    analyze(candles) {
        // Reset state
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
        this.upperLine = null;
        this.lowerLine = null;
        this.count1 = 0;
        this.count2 = 0;
        this.countTrend1 = 0;
        this.countTrend2 = 0;
        this.n1 = 0;
        this.n2 = 0;
        this.currentTrend = null;
        this.trailingTop = null;
        this.trailingBottom = null;
        this.lastTopIndex = null;
        this.lastBottomIndex = null;
        
        // Process từng nến giống PineScript
        for (let i = 0; i < candles.length; i++) {
            const currentCandle = candles[i];
            
            // Update trailing extremes cho strong/weak high/low
            this.updateTrailingExtremes(candles, i);
            
            // Tìm pivot high/low
            const pivotHigh = this.findPivotHigh(candles, i);
            const pivotLow = this.findPivotLow(candles, i);
            
            // Nếu tìm thấy pivot high mới
            if (pivotHigh) {
                this.pivotHighs.push(pivotHigh);
                // Tạo upper line mới
                this.upperLine = {
                    price: pivotHigh.price,
                    index: pivotHigh.index
                };
                this.n1 = pivotHigh.index;
                
                // Reset trailing khi có pivot mới
                this.trailingTop = pivotHigh.price;
                this.lastTopIndex = pivotHigh.index;
            }
            
            // Nếu tìm thấy pivot low mới
            if (pivotLow) {
                this.pivotLows.push(pivotLow);
                // Tạo lower line mới
                this.lowerLine = {
                    price: pivotLow.price,  
                    index: pivotLow.index
                };
                this.n2 = pivotLow.index;
                
                // Reset trailing khi có pivot mới
                this.trailingBottom = pivotLow.price;
                this.lastBottomIndex = pivotLow.index;
            }
            
            // Kiểm tra break upper line
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
                        startTimestamp: candles[this.n1].timestamp,
                        endTimestamp: currentCandle.timestamp,
                        volume: volume,
                        effectCandles: i - this.n1 + 1
                    };
                    this.chochPoints.push(choch);
                    
                } else if (this.count1 > 1 && this.useBos) {
                    // BoS - Break of Structure
                    const midIndex = this.n1 + Math.floor((i - this.n1) / 2);
                    
                    // Kiểm tra liquidity sweep
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
                        startTimestamp: candles[this.n1].timestamp,
                        endTimestamp: currentCandle.timestamp,
                        volume: volume,
                        effectCandles: i - this.n1 + 1
                    };
                    
                    if (isLiquiditySweep) {
                        this.liquiditySweeps.push(structure);
                    } else {
                        this.bosPoints.push(structure);
                    }
                }
                
                // Reset upper line sau khi break
                this.upperLine = null;
            }
            
            // Kiểm tra break lower line
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
                        startTimestamp: candles[this.n2].timestamp,
                        endTimestamp: currentCandle.timestamp,
                        volume: volume,
                        effectCandles: i - this.n2 + 1
                    };
                    this.chochPoints.push(choch);
                    
                } else if (this.count2 > 1 && this.useBos) {
                    // BoS - Break of Structure
                    const midIndex = this.n2 + Math.floor((i - this.n2) / 2);
                    
                    // Kiểm tra liquidity sweep
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
                        startTimestamp: candles[this.n2].timestamp,
                        endTimestamp: currentCandle.timestamp,
                        volume: volume,
                        effectCandles: i - this.n2 + 1
                    };
                    
                    if (isLiquiditySweep) {
                        this.liquiditySweeps.push(structure);
                    } else {
                        this.bosPoints.push(structure);
                    }
                }
                
                // Reset lower line sau khi break
                this.lowerLine = null;
            }
            
            // Cập nhật trend counters
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
        
        // Đóng trend cuối cùng và strong/weak high/low cuối cùng
        if (this.marketTrends.length > 0) {
            const lastTrend = this.marketTrends[this.marketTrends.length - 1];
            if (!lastTrend.endIndex) {
                lastTrend.endIndex = candles.length - 1;
                lastTrend.endTimestamp = candles[candles.length - 1].timestamp;
                lastTrend.endPrice = candles[candles.length - 1].close;
            }
        }
        
        // Thêm strong/weak high/low cuối cùng nếu có
        if (this.trailingTop !== null && this.lastTopIndex !== null) {
            const highPoint = {
                type: this.currentTrend === 'bearish' ? 'strongHigh' : 'weakHigh',
                price: this.trailingTop,
                index: this.lastTopIndex,
                timestamp: candles[this.lastTopIndex].timestamp,
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
                timestamp: candles[this.lastBottomIndex].timestamp,
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
            currentTrend: this.countTrend1 > 0 ? 'bullish' : (this.countTrend2 > 0 ? 'bearish' : null),
            summary: {
                totalPivotHighs: this.pivotHighs.length,
                totalPivotLows: this.pivotLows.length,
                totalChoch: this.chochPoints.length,
                totalBos: this.bosPoints.length,
                totalLiquiditySweeps: this.liquiditySweeps.length,
                totalTrends: this.marketTrends.length,
                totalStrongHighs: this.strongHighs.length,
                totalWeakHighs: this.weakHighs.length,
                totalStrongLows: this.strongLows.length,
                totalWeakLows: this.weakLows.length
            }
        };
    }
    
    /**
     * Cập nhật market trend
     * @param {Array} candles - Mảng nến
     * @param {Number} currentIndex - Index hiện tại
     * @param {String} trendDirection - 'bullish' hoặc 'bearish'
     */
    updateMarketTrend(candles, currentIndex, trendDirection) {
        if (this.currentTrend !== trendDirection) {
            // Kết thúc trend cũ
            if (this.marketTrends.length > 0 && !this.marketTrends[this.marketTrends.length - 1].endIndex) {
                const lastTrend = this.marketTrends[this.marketTrends.length - 1];
                lastTrend.endIndex = currentIndex - 1;
                lastTrend.endTimestamp = candles[currentIndex - 1] ? candles[currentIndex - 1].timestamp : lastTrend.startTimestamp;
                lastTrend.endPrice = candles[currentIndex - 1] ? candles[currentIndex - 1].close : lastTrend.startPrice;
            }
            
            // Bắt đầu trend mới
            const newTrend = {
                direction: trendDirection,
                startIndex: currentIndex,
                startTimestamp: candles[currentIndex].timestamp,
                startPrice: candles[currentIndex].open,
                endIndex: null,
                endTimestamp: null,
                endPrice: null
            };
            this.marketTrends.push(newTrend);
            this.currentTrend = trendDirection;
        }
    }
    
    /**
     * Lấy trend hiện tại tại một thời điểm cụ thể
     * @param {Number} timestamp - Timestamp cần kiểm tra
     * @returns {Object|null} - Trend tại thời điểm đó
     */
    getTrendAtTime(timestamp) {
        for (const trend of this.marketTrends) {
            if (timestamp >= trend.startTimestamp && 
                (!trend.endTimestamp || timestamp <= trend.endTimestamp)) {
                return trend;
            }
        }
        return null;
    }
    
    /**
     * Lấy tất cả các điểm structure trong khoảng thời gian
     * @param {Number} startTime - Thời gian bắt đầu
     * @param {Number} endTime - Thời gian kết thúc
     * @returns {Object} - Các điểm structure trong khoảng
     */
    getStructuresInRange(startTime, endTime) {
        const filter = (point) => 
            point.startTimestamp >= startTime && point.endTimestamp <= endTime;
        
        return {
            choch: this.chochPoints.filter(filter),
            bos: this.bosPoints.filter(filter),
            liquiditySweeps: this.liquiditySweeps.filter(filter),
            strongHighs: this.strongHighs.filter(p => p.timestamp >= startTime && p.timestamp <= endTime),
            weakHighs: this.weakHighs.filter(p => p.timestamp >= startTime && p.timestamp <= endTime),
            strongLows: this.strongLows.filter(p => p.timestamp >= startTime && p.timestamp <= endTime),
            weakLows: this.weakLows.filter(p => p.timestamp >= startTime && p.timestamp <= endTime)
        };
    }
}

// Export module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SMC;
}