// Exchange API using CCXT library
// Supports multiple exchanges: Binance, Bybit, OKX, etc.

class ExchangeAPI {
    constructor(exchangeName = 'binance') {
        this.exchangeName = exchangeName.toLowerCase();
        this.exchange = null;
        this.maxLimit = 1500; // Default max limit per request
        this.initialized = false;
        
        this.initializeExchange();
    }

    // Initialize CCXT exchange
    async initializeExchange() {
        try {
            // Check if CCXT is loaded
            if (typeof ccxt === 'undefined') {
                throw new Error('CCXT library not loaded. Please include CCXT script in HTML.');
            }

            // Create exchange instance
            const ExchangeClass = ccxt[this.exchangeName];
            if (!ExchangeClass) {
                throw new Error(`Exchange '${this.exchangeName}' not supported by CCXT`);
            }

            this.exchange = new ExchangeClass({
                enableRateLimit: true,
                options: {
                    defaultType: 'future', // Use futures market by default
                }
            });

            // Set max limit based on exchange
            this.maxLimit = this.getExchangeMaxLimit();

            // Load markets
            await this.exchange.loadMarkets();
            this.initialized = true;

            console.log(`${this.exchangeName} exchange initialized successfully`);
        } catch (error) {
            console.error('Error initializing exchange:', error);
            throw error;
        }
    }

    // Get max limit per request for different exchanges
    getExchangeMaxLimit() {
        const limits = {
            'binance': 1500,
            'binanceusdm': 1500,
            'bybit': 1000,
            'okx': 300,
            'bitget': 1000,
            'gate': 1000
        };
        return limits[this.exchangeName] || 1000;
    }

    // Ensure exchange is initialized
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initializeExchange();
        }
    }

    // Convert timeframe to milliseconds
    timeframeToMs(timeframe) {
        const timeframes = {
            '1m': 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000
        };
        return timeframes[timeframe] || timeframes['15m'];
    }

    // Calculate batches needed for the requested number of candles
    calculateBatches(totalCandles, timeframe) {
        const batches = [];
        const timeframeMs = this.timeframeToMs(timeframe);
        const now = Date.now();
        
        let remainingCandles = totalCandles;
        let endTime = now;

        while (remainingCandles > 0) {
            const batchSize = Math.min(remainingCandles, this.maxLimit);
            const startTime = endTime - (batchSize * timeframeMs);
            
            batches.unshift({
                startTime,
                endTime: endTime - timeframeMs,
                limit: batchSize
            });
            
            endTime = startTime;
            remainingCandles -= batchSize;
        }

        return batches;
    }

    // Normalize symbol format for different exchanges
    normalizeSymbol(symbol) {
        // Remove any slashes or special characters
        symbol = symbol.toUpperCase().replace(/[\/\-_]/g, '');
        
        // Add slash for CCXT format (e.g., BTC/USDT)
        if (!symbol.includes('/')) {
            // Assume USDT pair if not specified
            if (symbol.endsWith('USDT')) {
                const base = symbol.slice(0, -4);
                symbol = `${base}/USDT`;
            } else {
                symbol = `${symbol}/USDT`;
            }
        }
        
        return symbol;
    }

    // Fetch OHLCV data using CCXT
    async fetchOHLCV(symbol, timeframe, since, limit) {
        await this.ensureInitialized();
        
        try {
            const normalizedSymbol = this.normalizeSymbol(symbol);
            
            console.log(`Fetching ${limit} candles for ${normalizedSymbol} ${timeframe} from ${this.exchangeName}`);
            
            const ohlcv = await this.exchange.fetchOHLCV(
                normalizedSymbol,
                timeframe,
                since,
                limit
            );
            
            return ohlcv;
        } catch (error) {
            console.error('Error fetching OHLCV:', error);
            throw error;
        }
    }

    // Convert CCXT OHLCV data to chart format
    formatOHLCVData(ohlcv) {
        return ohlcv.map(candle => ({
            time: Math.floor(candle[0] / 1000), // Convert milliseconds to seconds
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));
    }

    // Main method to fetch historical data with batching
    async fetchHistoricalData(symbol, timeframe, candleCount, onProgress) {
        try {
            await this.ensureInitialized();
            
            const batches = this.calculateBatches(candleCount, timeframe);
            let allData = [];
            
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                
                if (onProgress) {
                    const currentCount = allData.length;
                    onProgress(
                        i + 1, 
                        batches.length, 
                        `Loading batch ${i + 1}/${batches.length} (${currentCount}/${candleCount} candles)`
                    );
                }
                
                const ohlcv = await this.fetchOHLCV(
                    symbol,
                    timeframe,
                    batch.startTime,
                    batch.limit
                );
                
                const formattedData = this.formatOHLCVData(ohlcv);
                allData = allData.concat(formattedData);
                
                // Small delay to respect rate limits
                if (i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            // Remove duplicates and sort by time
            const uniqueData = allData.filter((item, index, arr) => 
                index === 0 || item.time !== arr[index - 1].time
            );
            
            uniqueData.sort((a, b) => a.time - b.time);
            
            return uniqueData.slice(-candleCount);
            
        } catch (error) {
            console.error('Error fetching historical data:', error);
            throw error;
        }
    }

    // Fetch 24hr ticker statistics
    async fetch24hrTicker() {
        await this.ensureInitialized();
        
        try {
            const tickers = await this.exchange.fetchTickers();
            return Object.values(tickers);
        } catch (error) {
            console.error('Error fetching 24hr ticker:', error);
            throw error;
        }
    }

    // Format 24hr ticker data for the symbol table
    format24hrTicker(tickerData) {
        return tickerData
            .filter(ticker => {
                // Filter to only include USDT pairs
                return ticker.symbol && ticker.symbol.includes('/USDT');
            })
            .map(ticker => ({
                symbol: ticker.symbol.replace('/', ''), // Remove slash for display
                lastPrice: parseFloat(ticker.last || ticker.close || 0),
                priceChange: parseFloat(ticker.change || 0),
                priceChangePercent: parseFloat(ticker.percentage || 0),
                highPrice: parseFloat(ticker.high || 0),
                lowPrice: parseFloat(ticker.low || 0),
                volume: parseFloat(ticker.baseVolume || 0),
                quoteVolume: parseFloat(ticker.quoteVolume || 0),
                count: 0,
                openTime: ticker.timestamp || Date.now(),
                closeTime: ticker.timestamp || Date.now()
            }));
    }

    // Get list of symbols
    async getSymbolList() {
        try {
            await this.ensureInitialized();
            
            const tickerData = await this.fetch24hrTicker();
            const formatted = this.format24hrTicker(tickerData);
            
            // Sort by 24h volume (descending) and return symbol names
            return formatted
                .sort((a, b) => b.quoteVolume - a.quoteVolume)
                .map(ticker => ticker.symbol);
        } catch (error) {
            console.error('Error getting symbol list:', error);
            return [];
        }
    }

    // Switch to a different exchange
    async switchExchange(exchangeName) {
        this.exchangeName = exchangeName.toLowerCase();
        this.initialized = false;
        await this.initializeExchange();
    }

    // Get current exchange name
    getExchangeName() {
        return this.exchangeName;
    }

    // Get list of supported exchanges
    static getSupportedExchanges() {
        if (typeof ccxt === 'undefined') {
            return [];
        }
        
        // Return popular exchanges that support OHLCV
        return [
            'binance',
            'binanceusdm',
            'bybit',
            'okx',
            'bitget',
            'gate',
            'kucoin',
            'huobi',
            'mexc'
        ];
    }

    // Convert UTC timestamp (seconds) to Vietnam timezone (UTC+7)
    static convertToVietnamTime(timestampSeconds) {
        const ms = timestampSeconds * 1000;
        const date = new Date(ms);
        const utcTime = date.getTime();
        const vnTime = new Date(utcTime + (7 * 60 * 60 * 1000));
        return vnTime;
    }

    // Format timestamp to Vietnam timezone string
    static formatToVietnamTime(timestampSeconds, format = 'short') {
        const vnTime = ExchangeAPI.convertToVietnamTime(timestampSeconds);
        
        const day = String(vnTime.getUTCDate()).padStart(2, '0');
        const month = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
        const year = vnTime.getUTCFullYear();
        const hours = String(vnTime.getUTCHours()).padStart(2, '0');
        const minutes = String(vnTime.getUTCMinutes()).padStart(2, '0');
        const seconds = String(vnTime.getUTCSeconds()).padStart(2, '0');
        
        if (format === 'short') {
            return `${day}/${month} ${hours}:${minutes}`;
        } else if (format === 'full') {
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        } else {
            return vnTime.toISOString();
        }
    }
}

// Backward compatibility: Create BinanceAPI alias
class BinanceAPI extends ExchangeAPI {
    constructor() {
        super('binance');
    }
}
