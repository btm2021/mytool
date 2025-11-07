/**
 * Simple Backtest System - Rewritten for clarity and accuracy
 * 
 * Rules:
 * 1. Each entry is completely independent (4000 USDT capital each)
 * 2. Entry signal: When trail1 crosses trail2 (side change)
 * 3. Entry execution: At CLOSE price of the signal candle
 * 4. Exit: When trail1 crosses trail2 in opposite direction
 * 5. Each entry stores its own OHLCV data
 */

class ATRIndicator {
    constructor(emaLength = 30, atrLength = 14, atrMultiplier = 2.0) {
        this.emaLength = emaLength;
        this.atrLength = atrLength;
        this.atrMultiplier = atrMultiplier;
        this.reset();
    }

    reset() {
        this.emaMultiplier = 2 / (this.emaLength + 1);
        this.atrMultiplier_calc = 2 / (this.atrLength + 1);
        this.ema = null;
        this.atr = null;
        this.trail2 = null;
        this.prevClose = null;
        this.prevTrail1 = null;
    }

    calculate(candle) {
        const { high, low, close, time } = candle;
        
        // Calculate True Range
        let trueRange;
        if (this.prevClose === null) {
            trueRange = high - low;
        } else {
            const tr1 = high - low;
            const tr2 = Math.abs(high - this.prevClose);
            const tr3 = Math.abs(low - this.prevClose);
            trueRange = Math.max(tr1, tr2, tr3);
        }
        
        // Calculate ATR
        if (this.atr === null) {
            this.atr = trueRange;
        } else {
            this.atr = (trueRange * this.atrMultiplier_calc) + (this.atr * (1 - this.atrMultiplier_calc));
        }
        
        // Calculate EMA (Trail1)
        if (this.ema === null) {
            this.ema = close;
        } else {
            this.ema = (close * this.emaMultiplier) + (this.ema * (1 - this.emaMultiplier));
        }
        const trail1 = this.ema;
        
        // Calculate Trail2
        const sl2 = this.atr * this.atrMultiplier;
        const nzPrevTrail2 = this.trail2 !== null ? this.trail2 : 0;
        
        let trail2;
        if (trail1 > nzPrevTrail2) {
            if (this.prevTrail1 !== null && this.prevTrail1 > nzPrevTrail2) {
                trail2 = Math.max(nzPrevTrail2, trail1 - sl2);
            } else {
                trail2 = trail1 - sl2;
            }
        } else {
            if (this.prevTrail1 !== null && this.prevTrail1 < nzPrevTrail2) {
                trail2 = Math.min(nzPrevTrail2, trail1 + sl2);
            } else {
                trail2 = trail1 + sl2;
            }
        }
        
        // Store for next calculation
        this.prevClose = close;
        this.prevTrail1 = trail1;
        this.trail2 = trail2;
        
        return {
            time: time,
            trail1: trail1,
            trail2: trail2,
            atr: this.atr
        };
    }
}

class BacktestEntry {
    constructor(id, side, signalCandle, signalIndex) {
        this.id = id;
        this.side = side; // 'LONG' or 'SHORT'
        this.capital = 4000; // USDT
        
        // Signal information
        this.signalCandle = signalCandle;
        this.signalIndex = signalIndex;
        this.signalTime = signalCandle.time;
        
        // Entry execution (at signal candle close)
        this.entryPrice = signalCandle.close;
        this.entryTime = signalCandle.time;
        this.entryIndex = signalIndex;
        this.coinAmount = this.capital / this.entryPrice;
        
        // Exit information (will be filled when closed)
        this.exitPrice = null;
        this.exitTime = null;
        this.exitIndex = null;
        
        // Performance
        this.pnl = null;
        this.pnlPercent = null;
        this.maxPnL = -Infinity;
        this.maxPnLPercent = -Infinity;
        this.maxPrice = null;
        this.minPnL = Infinity;
        this.minPnLPercent = Infinity;
        this.minPrice = null;
        
        // Candle data storage
        this.candleData = [];
        
        // Status
        this.status = 'ACTIVE';
        
        // Add the signal candle as first candle
        this.addCandle(signalCandle);
    }
    
    addCandle(candle) {
        // Store candle data
        this.candleData.push({
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume || 0
        });
        
        // Update max/min PnL tracking
        this.updateMaxMinPnL(candle);
    }
    
    updateMaxMinPnL(candle) {
        if (!this.entryPrice || !this.coinAmount) return;
        
        // Check both high and low prices
        const prices = [
            { value: candle.high, type: 'high' },
            { value: candle.low, type: 'low' }
        ];
        
        prices.forEach(({ value: price }) => {
            let pnl;
            if (this.side === 'LONG') {
                pnl = (price - this.entryPrice) * this.coinAmount;
            } else { // SHORT
                pnl = (this.entryPrice - price) * this.coinAmount;
            }
            
            const pnlPercent = (pnl / this.capital) * 100;
            
            // Update maximum PnL
            if (pnl > this.maxPnL) {
                this.maxPnL = pnl;
                this.maxPnLPercent = pnlPercent;
                this.maxPrice = price;
            }
            
            // Update minimum PnL
            if (pnl < this.minPnL) {
                this.minPnL = pnl;
                this.minPnLPercent = pnlPercent;
                this.minPrice = price;
            }
        });
    }
    
    close(exitCandle, exitIndex) {
        if (this.status !== 'ACTIVE') return;
        
        // Set exit information
        this.exitPrice = exitCandle.close;
        this.exitTime = exitCandle.time;
        this.exitIndex = exitIndex;
        this.status = 'CLOSED';
        
        // Add the exit candle
        this.addCandle(exitCandle);
        
        // Calculate final PnL
        if (this.side === 'LONG') {
            this.pnl = (this.exitPrice - this.entryPrice) * this.coinAmount;
        } else { // SHORT
            this.pnl = (this.entryPrice - this.exitPrice) * this.coinAmount;
        }
        this.pnlPercent = (this.pnl / this.capital) * 100;
        
        // Determine if win (based on max PnL >= 50 USDT)
        this.isWinByMaxPnL = this.maxPnL >= 50;
    }
    
    getStats() {
        return {
            id: this.id,
            side: this.side,
            status: this.status,
            
            // Entry/Exit
            entryPrice: this.entryPrice,
            entryTime: this.entryTime,
            exitPrice: this.exitPrice,
            exitTime: this.exitTime,
            
            // Performance
            pnl: this.pnl,
            pnlPercent: this.pnlPercent,
            maxPnL: this.maxPnL !== -Infinity ? this.maxPnL : 0,
            maxPnLPercent: this.maxPnLPercent !== -Infinity ? this.maxPnLPercent : 0,
            maxPrice: this.maxPrice,
            minPnL: this.minPnL !== Infinity ? this.minPnL : 0,
            minPnLPercent: this.minPnLPercent !== Infinity ? this.minPnLPercent : 0,
            minPrice: this.minPrice,
            
            // Data
            candleData: this.candleData,
            coinAmount: this.coinAmount,
            capital: this.capital,
            
            // Win/Loss
            isWinByMaxPnL: this.isWinByMaxPnL || false
        };
    }
}

class SimpleBacktestSystem {
    constructor() {
        this.indicator = new ATRIndicator();
        this.entries = [];
        this.activeEntry = null;
        this.prevSide = null;
        this.entryCounter = 0;
    }
    
    reset() {
        this.indicator.reset();
        this.entries = [];
        this.activeEntry = null;
        this.prevSide = null;
        this.entryCounter = 0;
    }
    
    runBacktest(candles) {
        this.reset();
        
        const results = {
            totalCandles: candles.length,
            entries: [],
            signals: []
        };
        
        for (let i = 0; i < candles.length; i++) {
            const candle = candles[i];
            const indicators = this.indicator.calculate(candle);
            
            // Determine current side
            let currentSide = null;
            if (indicators.trail1 > indicators.trail2) {
                currentSide = 'LONG';
            } else if (indicators.trail1 < indicators.trail2) {
                currentSide = 'SHORT';
            }
            
            // Check for side change (cross signal)
            const hasCrossed = currentSide !== null && 
                              this.prevSide !== null && 
                              currentSide !== this.prevSide;
            
            if (hasCrossed) {
                results.signals.push({
                    index: i,
                    time: candle.time,
                    side: currentSide,
                    trail1: indicators.trail1,
                    trail2: indicators.trail2
                });
                
                // Close active entry if exists
                if (this.activeEntry && this.activeEntry.status === 'ACTIVE') {
                    this.activeEntry.close(candle, i);
                    this.entries.push(this.activeEntry);
                    this.activeEntry = null;
                }
                
                // Create new entry
                this.entryCounter++;
                const entryId = `entry_${this.entryCounter}`;
                this.activeEntry = new BacktestEntry(entryId, currentSide, candle, i);
            } else if (this.activeEntry && this.activeEntry.status === 'ACTIVE') {
                // Update active entry with current candle
                this.activeEntry.addCandle(candle);
            }
            
            this.prevSide = currentSide;
        }
        
        // Close any remaining active entry
        if (this.activeEntry && this.activeEntry.status === 'ACTIVE') {
            const lastCandle = candles[candles.length - 1];
            this.activeEntry.close(lastCandle, candles.length - 1);
            this.entries.push(this.activeEntry);
        }
        
        // Prepare results
        results.entries = this.entries.map(entry => entry.getStats());
        
        return results;
    }
    
    getStatistics() {
        const closedEntries = this.entries.filter(e => e.status === 'CLOSED');
        
        if (closedEntries.length === 0) {
            return {
                totalEntries: 0,
                winCount: 0,
                lossCount: 0,
                winRate: 0,
                totalPnL: 0,
                averagePnL: 0
            };
        }
        
        const winCount = closedEntries.filter(e => e.isWinByMaxPnL).length;
        const lossCount = closedEntries.length - winCount;
        const totalPnL = closedEntries.reduce((sum, e) => sum + (e.pnl || 0), 0);
        const averagePnL = totalPnL / closedEntries.length;
        
        return {
            totalEntries: closedEntries.length,
            winCount: winCount,
            lossCount: lossCount,
            winRate: (winCount / closedEntries.length) * 100,
            totalPnL: totalPnL,
            averagePnL: averagePnL
        };
    }
    
    getAllEntries() {
        return this.entries.map(e => e.getStats());
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SimpleBacktestSystem, BacktestEntry, ATRIndicator };
}
