/**
 * Bybit Futures Exchange
 * Kế thừa từ BaseExchange và implement các phương thức đặc thù cho Bybit Futures
 */
class BybitFuturesExchange extends BaseExchange {
    constructor(options = {}) {
        super('BYBIT', {
            ...options,
            options: {
                defaultType: 'linear'
            }
        });
        
        this.baseUrl = 'https://api.bybit.com';
        this.wsUrl = 'wss://stream.bybit.com/v5/public/linear';
        
        // Global data cho Futures
        this.ticker24hrData = {};
        this.symbolPrices = {};
        this.isDataReady = false;
        
        // Initialize global data
        this.initializeGlobalData();
    }

    /**
     * Override: Khởi tạo CCXT
     */
    async initializeCCXT() {
        this.marketsLoaded = true;
    }

    /**
     * Override: Đảm bảo markets loaded
     */
    async ensureMarketsLoaded() {
        this.marketsLoaded = true;
    }

    /**
     * Override: Lấy thông tin exchange
     */
    getExchangeInfo() {
        return {
            value: 'BYBIT_FUTURES',
            name: 'Bybit Futures',
            desc: 'Bybit USDT Perpetual'
        };
    }

    /**
     * Khởi tạo dữ liệu global
     */
    async initializeGlobalData() {
        try {
            await this.fetch24hrData();
            this.isDataReady = true;
            
            // Refresh 24hr data every 5 minutes
            setInterval(() => {
                this.fetch24hrData();
            }, 5 * 60 * 1000);
        } catch (error) {
            console.error('Error initializing Bybit Futures global data:', error);
        }
    }

    /**
     * Fetch 24hr ticker data
     */
    async fetch24hrData() {
        try {
            const response = await fetch(`${this.baseUrl}/v5/market/tickers?category=linear`);
            const result = await response.json();
            
            if (result.retCode === 0 && result.result && result.result.list) {
                result.result.list.forEach(item => {
                    const symbol = item.symbol;
                    this.ticker24hrData[symbol] = {
                        symbol: symbol,
                        lastPrice: parseFloat(item.lastPrice),
                        openPrice: parseFloat(item.prevPrice24h),
                        highPrice: parseFloat(item.highPrice24h),
                        lowPrice: parseFloat(item.lowPrice24h),
                        volume: parseFloat(item.volume24h),
                        quoteVolume: parseFloat(item.turnover24h),
                        priceChange: parseFloat(item.price24hPcnt) * parseFloat(item.prevPrice24h) / 100,
                        priceChangePercent: parseFloat(item.price24hPcnt)
                    };
                    this.symbolPrices[symbol] = parseFloat(item.lastPrice);
                });
            }
        } catch (error) {
            console.error('Error fetching Bybit 24hr data:', error);
        }
    }

    /**
     * Override: Tìm kiếm symbols cho Futures
     */
    async searchSymbols(userInput, symbolType = 'future') {
        try {
            const response = await fetch(`${this.baseUrl}/v5/market/instruments-info?category=linear`);
            const result = await response.json();
            
            if (result.retCode !== 0 || !result.result || !result.result.list) {
                return [];
            }

            let symbols = result.result.list.filter(s => s.status === 'Trading');

            if (userInput && userInput.trim() !== '') {
                const upperInput = userInput.toUpperCase();
                symbols = symbols.filter(s =>
                    s.symbol.includes(upperInput)
                );
            }

            return symbols.slice(0, 100).map(s => {
                const baseAsset = s.baseCoin || s.symbol.replace('USDT', '');
                
                return {
                    symbol: s.symbol,
                    full_name: `BYBIT_FUTURES:${s.symbol}`,
                    description: `${baseAsset}/USDT Perpetual`,
                    exchange: 'BYBIT_FUTURES',
                    type: 'future',
                    logo_urls: this.getLogoUrls(baseAsset)
                };
            });
        } catch (error) {
            console.error('Error searching Bybit Futures symbols:', error);
            return [];
        }
    }

    /**
     * Override: Lấy OHLCV cho Futures
     */
    async fetchOHLCV(symbol, timeframe, since, limit = 200) {
        try {
            const interval = this.resolutionToBybitInterval(timeframe);
            const url = `${this.baseUrl}/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`;
            
            const response = await fetch(url);
            const result = await response.json();

            if (result.retCode !== 0 || !result.result || !result.result.list) {
                return [];
            }

            return result.result.list.reverse().map(bar => ({
                time: parseInt(bar[0]),
                open: parseFloat(bar[1]),
                high: parseFloat(bar[2]),
                low: parseFloat(bar[3]),
                close: parseFloat(bar[4]),
                volume: parseFloat(bar[5])
            }));
        } catch (error) {
            console.error('Error fetching Bybit Futures OHLCV:', error);
            return [];
        }
    }

    /**
     * Convert resolution to Bybit interval
     */
    resolutionToBybitInterval(resolution) {
        const map = {
            '1': '1',
            '5': '5',
            '15': '15',
            '30': '30',
            '60': '60',
            '240': '240',
            '1D': 'D',
            '1W': 'W',
            '1M': 'M'
        };
        return map[resolution] || '15';
    }

    /**
     * Override: Subscribe WebSocket cho Futures
     */
    subscribeWebSocket(symbol, resolution, callback, subscriberUID) {
        const interval = this.resolutionToBybitInterval(resolution);
        
        const ws = new WebSocket(this.wsUrl);
        
        ws.onopen = () => {
            const subscribeMsg = {
                op: 'subscribe',
                args: [`kline.${interval}.${symbol}`]
            };
            ws.send(JSON.stringify(subscribeMsg));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.topic && data.data && data.data[0]) {
                    const bar = data.data[0];
                    callback({
                        time: parseInt(bar.start),
                        open: parseFloat(bar.open),
                        high: parseFloat(bar.high),
                        low: parseFloat(bar.low),
                        close: parseFloat(bar.close),
                        volume: parseFloat(bar.volume)
                    });
                }
            } catch (error) {
                console.error('Error parsing Bybit WebSocket data:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('Bybit WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('Bybit WebSocket closed for', symbol);
        };

        this.websockets[subscriberUID] = ws;
    }

    /**
     * Override: Lấy thông tin symbol
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
        
        if (!ticker24hr) {
            return null;
        }

        return {
            priceChange: ticker24hr.priceChange,
            priceChangePercent: ticker24hr.priceChangePercent,
            lastPrice: ticker24hr.lastPrice,
            openPrice: ticker24hr.openPrice,
            highPrice: ticker24hr.highPrice,
            lowPrice: ticker24hr.lowPrice,
            volume: ticker24hr.volume
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
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BybitFuturesExchange;
}
