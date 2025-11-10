/**
 * Example Exchange Implementation
 * Template để tạo exchange mới
 * 
 * Để thêm exchange mới:
 * 1. Copy file này và đổi tên (ví dụ: BybitFuturesExchange.js)
 * 2. Thay đổi class name và exchange ID
 * 3. Implement/override các methods cần thiết
 * 4. Load script trong index.html
 * 5. Add vào MultiExchange trong app.js
 */

class ExampleExchange extends BaseExchange {
    constructor(options = {}) {
        // Thay 'EXAMPLE' bằng exchange ID của bạn (ví dụ: 'BYBIT', 'OKX')
        super('EXAMPLE', {
            ...options,
            options: {
                defaultType: 'future' // hoặc 'spot'
            }
        });
        
        // Custom properties
        this.baseUrl = 'https://api.example.com';
        this.wsUrl = 'wss://stream.example.com';
        
        // Initialize custom data nếu cần
        this.initializeCustomData();
    }

    /**
     * Khởi tạo dữ liệu custom (optional)
     */
    async initializeCustomData() {
        // Ví dụ: fetch initial data, setup WebSocket, etc.
        try {
            // Your initialization code here
            console.log('Initializing Example Exchange...');
        } catch (error) {
            console.error('Error initializing Example Exchange:', error);
        }
    }

    /**
     * Override: Tìm kiếm symbols
     * Required nếu API của exchange khác với CCXT standard
     */
    async searchSymbols(userInput, symbolType = 'crypto') {
        try {
            // Option 1: Sử dụng CCXT (recommended)
            return await super.searchSymbols(userInput, symbolType);
            
            // Option 2: Custom implementation
            /*
            const response = await fetch(`${this.baseUrl}/api/v1/symbols`);
            const data = await response.json();
            
            let symbols = data.filter(s => s.status === 'TRADING');
            
            if (userInput && userInput.trim() !== '') {
                symbols = symbols.filter(s =>
                    s.symbol.includes(userInput.toUpperCase())
                );
            }
            
            return symbols.slice(0, 100).map(s => ({
                symbol: s.symbol,
                full_name: `EXAMPLE:${s.symbol}`,
                description: `${s.baseAsset}/${s.quoteAsset}`,
                exchange: 'EXAMPLE',
                type: symbolType,
                logo_urls: this.getLogoUrls(s.baseAsset)
            }));
            */
        } catch (error) {
            console.error('Error searching symbols:', error);
            return [];
        }
    }

    /**
     * Override: Lấy OHLCV data
     * Required nếu API của exchange khác với CCXT standard
     */
    async fetchOHLCV(symbol, timeframe, since, limit = 1000) {
        try {
            // Option 1: Sử dụng CCXT (recommended)
            return await super.fetchOHLCV(symbol, timeframe, since, limit);
            
            // Option 2: Custom implementation
            /*
            const interval = this.resolutionToTimeframe(timeframe);
            const url = `${this.baseUrl}/api/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${since}&limit=${limit}`;
            
            const response = await fetch(url);
            const data = await response.json();

            return data.map(bar => ({
                time: bar[0],
                open: parseFloat(bar[1]),
                high: parseFloat(bar[2]),
                low: parseFloat(bar[3]),
                close: parseFloat(bar[4]),
                volume: parseFloat(bar[5])
            }));
            */
        } catch (error) {
            console.error('Error fetching OHLCV:', error);
            return [];
        }
    }

    /**
     * Override: Subscribe WebSocket
     * Required cho realtime data
     */
    subscribeWebSocket(symbol, resolution, callback, subscriberUID) {
        try {
            const symbolLower = symbol.toLowerCase();
            const interval = this.resolutionToTimeframe(resolution);
            
            // Tạo WebSocket connection
            const ws = new WebSocket(`${this.wsUrl}/${symbolLower}@kline_${interval}`);
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Parse data theo format của exchange
                    // Ví dụ format Binance-like:
                    if (data.k) {
                        callback({
                            time: data.k.t,
                            open: parseFloat(data.k.o),
                            high: parseFloat(data.k.h),
                            low: parseFloat(data.k.l),
                            close: parseFloat(data.k.c),
                            volume: parseFloat(data.k.v)
                        });
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket data:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('WebSocket closed for', symbol);
            };

            // Lưu WebSocket connection
            this.websockets[subscriberUID] = ws;
        } catch (error) {
            console.error('Error subscribing WebSocket:', error);
        }
    }

    /**
     * Custom method: Lấy quote data
     * Optional - cho Watchlist
     */
    async getQuoteData(symbol) {
        try {
            // Fetch ticker data
            const ticker = await this.fetchTicker(symbol);
            
            if (!ticker) return null;
            
            return {
                priceChange: ticker.change || 0,
                priceChangePercent: ticker.percentage || 0,
                lastPrice: ticker.last || 0,
                openPrice: ticker.open || 0,
                highPrice: ticker.high || 0,
                lowPrice: ticker.low || 0,
                volume: ticker.baseVolume || 0
            };
        } catch (error) {
            console.error('Error getting quote data:', error);
            return null;
        }
    }

    /**
     * Custom method: Lấy thông tin đặc biệt của exchange
     * Optional - ví dụ: funding rate cho futures
     */
    async getFundingRate(symbol) {
        try {
            // Custom implementation
            const response = await fetch(`${this.baseUrl}/api/v1/fundingRate?symbol=${symbol}`);
            const data = await response.json();
            
            return {
                fundingRate: parseFloat(data.fundingRate),
                nextFundingTime: data.nextFundingTime
            };
        } catch (error) {
            console.error('Error getting funding rate:', error);
            return null;
        }
    }

    /**
     * Override: Cleanup
     */
    destroy() {
        super.destroy();
        
        // Custom cleanup
        // Ví dụ: close custom WebSockets, clear intervals, etc.
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExampleExchange;
}

/**
 * USAGE EXAMPLE:
 * 
 * 1. Trong index.html, thêm script:
 *    <script src="datasource/exchanges/ExampleExchange.js"></script>
 * 
 * 2. Trong app.js hoặc datasource/index.js:
 *    const multiExchange = new MultiExchange();
 *    const exampleExchange = new ExampleExchange({
 *        apiKey: 'your-api-key',
 *        secret: 'your-secret'
 *    });
 *    multiExchange.addExchange('EXAMPLE', exampleExchange);
 * 
 * 3. Sử dụng:
 *    const datafeed = new MultiExchangeDatafeed(multiExchange);
 *    
 *    // Symbols sẽ có format: EXAMPLE:BTCUSDT
 */
