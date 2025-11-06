class BinanceAPI {
    constructor() {
        this.baseURL = 'https://api.binance.com';
        this.symbolsCache = null;
        this.symbolsCacheTime = 0;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }
    
    async fetchSymbols() {
        // Return cached symbols if still valid
        const now = Date.now();
        if (this.symbolsCache && (now - this.symbolsCacheTime) < this.CACHE_DURATION) {
            return this.symbolsCache;
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/v3/ticker/24hr`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Filter USDT pairs and sort by volume
            const usdtPairs = data
                .filter(s => s.symbol.endsWith('USDT'))
                .map(s => ({
                    symbol: s.symbol,
                    lastPrice: s.lastPrice,
                    priceChangePercent: s.priceChangePercent,
                    quoteVolume: s.quoteVolume,
                    volume: s.volume
                }))
                .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
            
            // Cache the results
            this.symbolsCache = usdtPairs;
            this.symbolsCacheTime = now;
            
            return usdtPairs;
        } catch (error) {
            console.error('Error fetching symbols:', error);
            throw error;
        }
    }
    
    async fetchHistoricalData(symbol, interval, limit = 1000, progressCallback = null) {
        try {
            const allCandles = [];
            const maxLimit = 1000;
            let remainingCandles = limit;
            let endTime = null;
            
            while (remainingCandles > 0) {
                const currentLimit = Math.min(remainingCandles, maxLimit);
                
                let url = `${this.baseURL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${currentLimit}`;
                if (endTime) {
                    url += `&endTime=${endTime}`;
                }
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.length === 0) break;
                
                // Convert to candle format
                const candles = data.map(k => ({
                    time: Math.floor(k[0] / 1000),
                    open: parseFloat(k[1]),
                    high: parseFloat(k[2]),
                    low: parseFloat(k[3]),
                    close: parseFloat(k[4]),
                    volume: parseFloat(k[5])
                }));
                
                // Add to beginning of array (we're fetching backwards)
                allCandles.unshift(...candles);
                
                remainingCandles -= data.length;
                
                // Update progress
                if (progressCallback) {
                    const progress = ((limit - remainingCandles) / limit) * 100;
                    progressCallback(limit - remainingCandles, limit, `Loading ${Math.round(progress)}%`);
                }
                
                // If we got less than requested, we've reached the beginning
                if (data.length < currentLimit) break;
                
                // Set endTime for next batch (1 second before first candle)
                endTime = data[0][0] - 1;
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return allCandles;
            
        } catch (error) {
            console.error('Error fetching historical data:', error);
            throw error;
        }
    }
    
    getIntervalMs(interval) {
        const units = {
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000,
            'w': 7 * 24 * 60 * 60 * 1000
        };
        
        const value = parseInt(interval);
        const unit = interval.slice(-1);
        
        return value * (units[unit] || 60000);
    }
}
