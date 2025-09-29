/**
 * Binance API Service
 * Handles fetching OHLCV data from Binance Futures API
 */
class BinanceAPI {
    constructor() {
        this.baseURL = 'https://fapi.binance.com';
        this.cache = new Map();
    }

    /**
     * Fetch kline/candlestick data from Binance Futures
     * @param {string} symbol - Trading pair symbol (e.g., 'BTCUSDT')
     * @param {string} interval - Kline interval (e.g., '15m', '1h', '1d')
     * @param {number} limit - Number of klines to fetch (max 1500)
     * @param {number} startTime - Start time in milliseconds (optional)
     * @param {number} endTime - End time in milliseconds (optional)
     * @returns {Promise<Array>} Array of kline data
     */
    async fetchKlines(symbol, interval, limit = 500, startTime = null, endTime = null) {
        try {
            // Create cache key
            const cacheKey = `${symbol}_${interval}_${limit}_${startTime}_${endTime}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                console.log('Using cached data for', symbol, interval);
                return this.cache.get(cacheKey);
            }

            // Build URL parameters
            const params = new URLSearchParams({
                symbol: symbol,
                interval: interval,
                limit: limit.toString()
            });

            if (startTime) {
                params.append('startTime', startTime.toString());
            }
            
            if (endTime) {
                params.append('endTime', endTime.toString());
            }

            const url = `${this.baseURL}/fapi/v1/klines?${params.toString()}`;
            
            console.log('Fetching data from Binance:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Transform Binance kline data to our format
            const transformedData = data.map(kline => ({
                time: Math.floor(kline[0] / 1000), // Convert to seconds for Lightweight Charts
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
                closeTime: kline[6],
                quoteVolume: parseFloat(kline[7]),
                trades: kline[8],
                takerBuyBaseVolume: parseFloat(kline[9]),
                takerBuyQuoteVolume: parseFloat(kline[10])
            }));

            // Cache the result
            this.cache.set(cacheKey, transformedData);
            
            console.log(`Fetched ${transformedData.length} candles for ${symbol} ${interval}`);
            
            return transformedData;

        } catch (error) {
            console.error('Error fetching data from Binance:', error);
            throw new Error(`Failed to fetch data: ${error.message}`);
        }
    }

    /**
     * Fetch recent klines for real-time updates
     * @param {string} symbol - Trading pair symbol
     * @param {string} interval - Kline interval
     * @param {number} limit - Number of recent klines (default 100)
     * @returns {Promise<Array>} Array of recent kline data
     */
    async fetchRecentKlines(symbol, interval, limit = 100) {
        return this.fetchKlines(symbol, interval, limit);
    }

    /**
     * Fetch historical data for a specific date range
     * @param {string} symbol - Trading pair symbol
     * @param {string} interval - Kline interval
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} Array of historical kline data
     */
    async fetchHistoricalData(symbol, interval, startDate, endDate) {
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();
        
        // Binance has a limit of 1500 klines per request
        // We might need to make multiple requests for large date ranges
        const maxKlinesPerRequest = 1500;
        const intervalMs = this.getIntervalInMs(interval);
        const totalKlines = Math.ceil((endTime - startTime) / intervalMs);
        
        if (totalKlines <= maxKlinesPerRequest) {
            return this.fetchKlines(symbol, interval, totalKlines, startTime, endTime);
        }

        // Multiple requests needed - implement with better error handling and progress tracking
        const allData = [];
        let currentStartTime = startTime;
        let requestCount = 0;
        const maxRequests = Math.ceil(totalKlines / maxKlinesPerRequest);
        
        console.log(`Fetching large dataset: ${totalKlines} candles in ${maxRequests} requests`);
        
        while (currentStartTime < endTime && requestCount < 50) { // Limit to 50 requests max to prevent crashes
            try {
                const currentEndTime = Math.min(
                    currentStartTime + (maxKlinesPerRequest * intervalMs),
                    endTime
                );
                
                console.log(`Batch ${requestCount + 1}/${maxRequests}: ${new Date(currentStartTime).toISOString()}`);
                
                const batchData = await this.fetchKlines(
                    symbol, 
                    interval, 
                    maxKlinesPerRequest, 
                    currentStartTime, 
                    currentEndTime
                );
                
                if (batchData && batchData.length > 0) {
                    allData.push(...batchData);
                }
                
                currentStartTime = currentEndTime;
                requestCount++;
                
                // Progressive delay to avoid rate limiting - longer delays for more requests
                const delay = Math.min(200 + (requestCount * 50), 1000);
                await this.delay(delay);
                
            } catch (error) {
                console.error(`Error in batch ${requestCount + 1}:`, error);
                // Continue with next batch instead of failing completely
                currentStartTime += (maxKlinesPerRequest * intervalMs);
                requestCount++;
                await this.delay(2000); // Longer delay after error
            }
        }
        
        console.log(`Fetched ${allData.length} total candles in ${requestCount} requests`);
        return allData;
    }

    /**
     * Get interval duration in milliseconds
     * @param {string} interval - Interval string (e.g., '1m', '5m', '1h')
     * @returns {number} Duration in milliseconds
     */
    getIntervalInMs(interval) {
        const intervalMap = {
            '1m': 60 * 1000,
            '3m': 3 * 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '30m': 30 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '2h': 2 * 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '8h': 8 * 60 * 60 * 1000,
            '12h': 12 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000,
            '3d': 3 * 24 * 60 * 60 * 1000,
            '1w': 7 * 24 * 60 * 60 * 1000,
            '1M': 30 * 24 * 60 * 60 * 1000
        };
        
        return intervalMap[interval] || 60 * 1000; // Default to 1 minute
    }

    /**
     * Utility function to add delay
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('API cache cleared');
    }

    /**
     * Get exchange info for symbol validation
     * @returns {Promise<Object>} Exchange information
     */
    async getExchangeInfo() {
        try {
            const response = await fetch(`${this.baseURL}/fapi/v1/exchangeInfo`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching exchange info:', error);
            throw error;
        }
    }

    /**
     * Validate if a symbol is available for trading
     * @param {string} symbol - Trading pair symbol
     * @returns {Promise<boolean>} True if symbol is valid
     */
    async isValidSymbol(symbol) {
        try {
            const exchangeInfo = await this.getExchangeInfo();
            return exchangeInfo.symbols.some(s => s.symbol === symbol && s.status === 'TRADING');
        } catch (error) {
            console.error('Error validating symbol:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.BinanceAPI = BinanceAPI;
