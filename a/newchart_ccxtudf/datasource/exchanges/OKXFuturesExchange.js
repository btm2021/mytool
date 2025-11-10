/**
 * OKX Futures Exchange
 * Kế thừa từ BaseExchange và implement các phương thức đặc thù cho OKX Futures
 */
class OKXFuturesExchange extends BaseExchange {
    constructor(options = {}) {
        super('OKX', {
            ...options,
            options: {
                defaultType: 'swap'
            }
        });
        
        this.baseUrl = 'https://www.okx.com';
        this.wsUrl = 'wss://ws.okx.com:8443/ws/v5/public';
        
        // Global data cho Futures
        this.ticker24hrData = {};
        this.symbolPrices = {};
        this.isDataReady = false;
        
        // Initialize global data
        this.initializeGlobalData();
    }

    /**
     * Override: Khởi tạo CCXT (không cần vì dùng REST API trực tiếp)
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
            value: 'OKX_FUTURES',
            name: 'OKX Futures',
            desc: 'OKX Perpetual Swap'
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
            console.error('Error initializing OKX Futures global data:', error);
        }
    }

    /**
     * Fetch 24hr ticker data
     */
    async fetch24hrData() {
        try {
            const response = await fetch(`${this.baseUrl}/api/v5/market/tickers?instType=SWAP`);
            const result = await response.json();
            
            if (result.code === '0' && result.data) {
                result.data.forEach(item => {
                    const symbol = item.instId.replace('-SWAP', '').replace('-', '');
                    this.ticker24hrData[symbol] = {
                        symbol: symbol,
                        lastPrice: parseFloat(item.last),
                        openPrice: parseFloat(item.open24h),
                        highPrice: parseFloat(item.high24h),
                        lowPrice: parseFloat(item.low24h),
                        volume: parseFloat(item.vol24h),
                        quoteVolume: parseFloat(item.volCcy24h),
                        priceChange: parseFloat(item.last) - parseFloat(item.open24h),
                        priceChangePercent: ((parseFloat(item.last) - parseFloat(item.open24h)) / parseFloat(item.open24h)) * 100
                    };
                    this.symbolPrices[symbol] = parseFloat(item.last);
                });
            }
        } catch (error) {
            console.error('Error fetching OKX 24hr data:', error);
        }
    }

    /**
     * Override: Tìm kiếm symbols cho Futures
     */
    async searchSymbols(userInput, symbolType = 'future') {
        try {
            const response = await fetch(`${this.baseUrl}/api/v5/public/instruments?instType=SWAP`);
            const result = await response.json();
            
            if (result.code !== '0' || !result.data) {
                return [];
            }

            let symbols = result.data.filter(s => s.state === 'live');

            if (userInput && userInput.trim() !== '') {
                const upperInput = userInput.toUpperCase();
                symbols = symbols.filter(s =>
                    s.instId.includes(upperInput)
                );
            }

            return symbols.slice(0, 100).map(s => {
                const symbol = s.instId.replace('-SWAP', '').replace('-', '');
                const baseAsset = s.ctValCcy || symbol.replace('USDT', '');
                
                return {
                    symbol: symbol,
                    full_name: `OKX_FUTURES:${symbol}`,
                    description: `${baseAsset}/USDT Perpetual`,
                    exchange: 'OKX_FUTURES',
                    type: 'future',
                    logo_urls: this.getLogoUrls(baseAsset)
                };
            });
        } catch (error) {
            console.error('Error searching OKX Futures symbols:', error);
            return [];
        }
    }

    /**
     * Override: Lấy OHLCV cho Futures
     */
    async fetchOHLCV(symbol, timeframe, since, limit = 100) {
        try {
            // Convert symbol to OKX format (e.g., BTCUSDT -> BTC-USDT-SWAP)
            const instId = this.toOKXSymbol(symbol);
            const bar = this.resolutionToOKXBar(timeframe);
            
            const url = `${this.baseUrl}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`;
            
            const response = await fetch(url);
            const result = await response.json();

            if (result.code !== '0' || !result.data) {
                return [];
            }

            return result.data.reverse().map(bar => ({
                time: parseInt(bar[0]),
                open: parseFloat(bar[1]),
                high: parseFloat(bar[2]),
                low: parseFloat(bar[3]),
                close: parseFloat(bar[4]),
                volume: parseFloat(bar[5])
            }));
        } catch (error) {
            console.error('Error fetching OKX Futures OHLCV:', error);
            return [];
        }
    }

    /**
     * Convert symbol to OKX format
     */
    toOKXSymbol(symbol) {
        // BTCUSDT -> BTC-USDT-SWAP
        if (symbol.includes('-')) return symbol;
        
        const base = symbol.replace('USDT', '');
        return `${base}-USDT-SWAP`;
    }

    /**
     * Convert resolution to OKX bar format
     */
    resolutionToOKXBar(resolution) {
        const map = {
            '1': '1m',
            '5': '5m',
            '15': '15m',
            '30': '30m',
            '60': '1H',
            '240': '4H',
            '1D': '1D',
            '1W': '1W',
            '1M': '1M'
        };
        return map[resolution] || '15m';
    }

    /**
     * Override: Subscribe WebSocket cho Futures
     */
    subscribeWebSocket(symbol, resolution, callback, subscriberUID) {
        const instId = this.toOKXSymbol(symbol);
        const channel = this.resolutionToOKXBar(resolution).toLowerCase();
        
        const ws = new WebSocket(this.wsUrl);
        
        ws.onopen = () => {
            const subscribeMsg = {
                op: 'subscribe',
                args: [{
                    channel: `candle${channel}`,
                    instId: instId
                }]
            };
            ws.send(JSON.stringify(subscribeMsg));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.data && data.data[0]) {
                    const bar = data.data[0];
                    callback({
                        time: parseInt(bar[0]),
                        open: parseFloat(bar[1]),
                        high: parseFloat(bar[2]),
                        low: parseFloat(bar[3]),
                        close: parseFloat(bar[4]),
                        volume: parseFloat(bar[5])
                    });
                }
            } catch (error) {
                console.error('Error parsing OKX WebSocket data:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('OKX WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('OKX WebSocket closed for', symbol);
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
    module.exports = OKXFuturesExchange;
}
