/**
 * Binance Futures Exchange
 * Kế thừa từ BaseExchange và implement các phương thức đặc thù cho Binance Futures
 */
class BinanceFuturesExchange extends BaseExchange {
    constructor(options = {}) {
        super('BINANCE', {
            ...options,
            options: {
                defaultType: 'future'
            }
        });
        
        this.baseUrl = 'https://fapi.binance.com';
        this.wsUrl = 'wss://fstream.binance.com/ws';
        
        // Global data cho Futures
        this.markPriceData = {};
        this.ticker24hrData = {};
        this.symbolPrices = {};
        this.isDataReady = false;
        
        // WebSocket connections
        this.markPriceWs = null;
        this.ticker24hrInterval = null;
        
        // Initialize global data
        this.initializeGlobalData();
    }

    /**
     * Khởi tạo dữ liệu global (mark price, 24hr ticker)
     */
    async initializeGlobalData() {
        try {
            // Fetch all symbol prices
            await this.fetchAllSymbolPrices();
            
            // Connect mark price WebSocket
            this.connectMarkPriceWebSocket();
            
            // Fetch 24hr data
            await this.fetch24hrData();
            
            this.isDataReady = true;
            
            // Refresh 24hr data every 5 minutes
            this.ticker24hrInterval = setInterval(() => {
                this.fetch24hrData();
            }, 5 * 60 * 1000);
        } catch (error) {
            console.error('Error initializing Binance Futures global data:', error);
        }
    }

    /**
     * Fetch tất cả symbol prices
     */
    async fetchAllSymbolPrices() {
        try {
            const response = await fetch(`${this.baseUrl}/fapi/v1/ticker/price`);
            const data = await response.json();
            
            data.forEach(item => {
                this.symbolPrices[item.symbol] = parseFloat(item.price);
            });
        } catch (error) {
            console.error('Error fetching all symbol prices:', error);
        }
    }

    /**
     * Connect mark price WebSocket
     */
    connectMarkPriceWebSocket() {
        if (this.markPriceWs) {
            this.markPriceWs.close();
        }

        this.markPriceWs = new WebSocket(`${this.wsUrl}/!markPrice@arr@1s`);

        this.markPriceWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        this.markPriceData[item.s] = {
                            symbol: item.s,
                            markPrice: parseFloat(item.p),
                            indexPrice: parseFloat(item.i),
                            fundingRate: parseFloat(item.r),
                            nextFundingTime: item.T,
                            time: item.E
                        };
                    });
                }
            } catch (error) {
                console.error('Error parsing mark price data:', error);
            }
        };

        this.markPriceWs.onerror = (error) => {
            console.error('Mark price WebSocket error:', error);
        };

        this.markPriceWs.onclose = () => {
            setTimeout(() => this.connectMarkPriceWebSocket(), 5000);
        };
    }

    /**
     * Fetch 24hr ticker data
     */
    async fetch24hrData() {
        try {
            const response = await fetch(`${this.baseUrl}/fapi/v1/ticker/24hr`);
            const data = await response.json();
            
            data.forEach(item => {
                this.ticker24hrData[item.symbol] = {
                    symbol: item.symbol,
                    priceChange: parseFloat(item.priceChange),
                    priceChangePercent: parseFloat(item.priceChangePercent),
                    lastPrice: parseFloat(item.lastPrice),
                    openPrice: parseFloat(item.openPrice),
                    highPrice: parseFloat(item.highPrice),
                    lowPrice: parseFloat(item.lowPrice),
                    volume: parseFloat(item.volume),
                    quoteVolume: parseFloat(item.quoteVolume),
                    openTime: item.openTime,
                    closeTime: item.closeTime,
                    count: item.count
                };
            });
        } catch (error) {
            console.error('Error fetching 24hr data:', error);
        }
    }

    /**
     * Override: Khởi tạo CCXT (không cần cho Binance Futures vì dùng REST API trực tiếp)
     */
    async initializeCCXT() {
        // Binance Futures không cần CCXT, dùng REST API trực tiếp
        this.marketsLoaded = true;
    }

    /**
     * Override: Đảm bảo markets loaded (không cần cho Binance Futures)
     */
    async ensureMarketsLoaded() {
        // Không cần load markets vì không dùng CCXT
        this.marketsLoaded = true;
    }

    /**
     * Override: Lấy thông tin exchange
     */
    getExchangeInfo() {
        return {
            value: 'BINANCE_FUTURES',
            name: 'Binance Futures',
            desc: 'Binance Futures'
        };
    }

    /**
     * Override: Tìm kiếm symbols cho Futures
     */
    async searchSymbols(userInput, symbolType = 'future') {
        try {
            const response = await fetch(`${this.baseUrl}/fapi/v1/exchangeInfo`);
            const data = await response.json();
            
            let symbols = data.symbols.filter(s => s.status === 'TRADING');

            if (userInput && userInput.trim() !== '') {
                symbols = symbols.filter(s =>
                    s.symbol.includes(userInput.toUpperCase())
                );
            }

            return symbols.slice(0, 100).map(s => ({
                symbol: s.symbol,
                full_name: `BINANCE_FUTURES:${s.symbol}`,
                description: `${s.baseAsset}/${s.quoteAsset} Futures`,
                exchange: 'BINANCE_FUTURES',
                type: 'future',
                logo_urls: this.getLogoUrls(s.baseAsset)
            }));
        } catch (error) {
            console.error('Error searching Binance Futures symbols:', error);
            return [];
        }
    }

    /**
     * Override: Lấy OHLCV cho Futures
     */
    async fetchOHLCV(symbol, timeframe, since, limit = 1000) {
        try {
            const interval = this.resolutionToTimeframe(timeframe);
            const url = `${this.baseUrl}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${since}&limit=${limit}`;
            
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
        } catch (error) {
            console.error('Error fetching Binance Futures OHLCV:', error);
            return [];
        }
    }

    /**
     * Override: Subscribe WebSocket cho Futures
     */
    subscribeWebSocket(symbol, resolution, callback, subscriberUID) {
        const symbolLower = symbol.toLowerCase();
        const interval = this.resolutionToTimeframe(resolution);
        
        const ws = new WebSocket(`${this.wsUrl}/${symbolLower}@kline_${interval}`);
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
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

        this.websockets[subscriberUID] = ws;
    }

    /**
     * Override: Lấy thông tin symbol (không dùng CCXT)
     */
    async getSymbolInfo(symbol) {
        await this.waitForDataReady();
        
        const price = this.symbolPrices[symbol] || 0;
        const precision = this.calculatePrecision(price);
        
        return {
            market: { symbol },
            ticker: { last: price },
            precision: precision
        };
    }

    /**
     * Lấy quote data từ global data
     */
    getQuoteData(symbol) {
        const ticker24hr = this.ticker24hrData[symbol];
        const markPrice = this.markPriceData[symbol];
        
        if (!ticker24hr && !markPrice) {
            return null;
        }

        const lastPrice = markPrice ? markPrice.markPrice : (ticker24hr ? ticker24hr.lastPrice : 0);

        return {
            priceChange: ticker24hr ? ticker24hr.priceChange : 0,
            priceChangePercent: ticker24hr ? ticker24hr.priceChangePercent : 0,
            lastPrice: lastPrice,
            openPrice: ticker24hr ? ticker24hr.openPrice : 0,
            highPrice: ticker24hr ? ticker24hr.highPrice : 0,
            lowPrice: ticker24hr ? ticker24hr.lowPrice : 0,
            volume: ticker24hr ? ticker24hr.volume : 0,
            markPrice: markPrice ? markPrice.markPrice : lastPrice,
            fundingRate: markPrice ? markPrice.fundingRate : 0
        };
    }

    /**
     * Wait for data ready
     */
    async waitForDataReady() {
        if (this.isDataReady) return;
        
        return new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (this.isDataReady) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Override: Cleanup
     */
    destroy() {
        super.destroy();
        
        if (this.markPriceWs) {
            this.markPriceWs.close();
        }
        
        if (this.ticker24hrInterval) {
            clearInterval(this.ticker24hrInterval);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BinanceFuturesExchange;
}
