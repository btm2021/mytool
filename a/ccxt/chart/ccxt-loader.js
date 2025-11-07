/**
 * CCXT Data Loader for Chart
 * Loads fresh OHLCV data using CCXT library (no cache)
 */

class CCXTLoader {
    constructor() {
        this.exchange = null;
        this.exchangeId = null;
    }

    /**
     * Initialize exchange
     */
    async initExchange(exchangeId) {
        if (this.exchangeId === exchangeId && this.exchange) {
            return this.exchange;
        }

        try {
            this.exchangeId = exchangeId;
            this.exchange = new ccxt[exchangeId]({
                enableRateLimit: true
            });

            // Load markets
            await this.exchange.loadMarkets();
            
            console.log(`✓ Initialized ${exchangeId} exchange`);
            return this.exchange;
        } catch (error) {
            console.error(`✗ Failed to initialize ${exchangeId}:`, error);
            throw error;
        }
    }

    /**
     * Fetch fresh OHLCV data (no cache)
     */
    async fetchOHLCV(exchangeId, symbol, timeframe, limit) {
        try {
            // Initialize exchange if needed
            await this.initExchange(exchangeId);

            console.log(`📊 Fetching fresh ${symbol} ${timeframe} data from ${exchangeId}...`);
            console.log(`   Limit: ${limit} candles`);

            // Fetch OHLCV - always fresh data
            const ohlcv = await this.exchange.fetchOHLCV(
                symbol,
                timeframe,
                undefined,
                limit
            );

            console.log(`✓ Fetched ${ohlcv.length} candles`);

            // Convert to chart format
            const chartData = this.convertToChartFormat(ohlcv);
            
            console.log(`✓ Converted to chart format`);
            console.log(`   Time range: ${new Date(chartData[0].time * 1000).toISOString()} to ${new Date(chartData[chartData.length - 1].time * 1000).toISOString()}`);
            
            return chartData;
        } catch (error) {
            console.error('✗ Failed to fetch OHLCV:', error);
            throw error;
        }
    }

    /**
     * Convert CCXT OHLCV to chart format
     */
    convertToChartFormat(ohlcv) {
        return ohlcv.map(candle => ({
            time: Math.floor(candle[0] / 1000), // Convert ms to seconds
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));
    }

    /**
     * Get exchange info
     */
    getExchangeInfo() {
        if (!this.exchange) return null;
        
        return {
            id: this.exchangeId,
            name: this.exchange.name,
            has: this.exchange.has
        };
    }
}

// Make available globally
window.CCXTLoader = CCXTLoader;
