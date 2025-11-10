/**
 * Binance Spot Exchange
 * Kế thừa từ BaseExchange và implement các phương thức đặc thù cho Binance Spot
 */
class BinanceSpotExchange extends BaseExchange {
    constructor(options = {}) {
        super('BINANCE', {
            ...options,
            options: {
                defaultType: 'spot'
            }
        });
        
        this.baseUrl = 'https://api.binance.com';
        this.wsUrl = 'wss://stream.binance.com:9443/ws';
    }

    /**
     * Override: Khởi tạo CCXT (không cần cho Binance Spot vì dùng REST API trực tiếp)
     */
    async initializeCCXT() {
        // Binance Spot không cần CCXT, dùng REST API trực tiếp
        this.marketsLoaded = true;
    }

    /**
     * Override: Đảm bảo markets loaded (không cần cho Binance Spot)
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
            value: 'BINANCE_SPOT',
            name: 'Binance Spot',
            desc: 'Binance Spot'
        };
    }

    /**
     * Override: Tìm kiếm symbols cho Spot
     */
    async searchSymbols(userInput, symbolType = 'spot') {
        try {
            const response = await fetch(`${this.baseUrl}/api/v3/exchangeInfo`);
            const data = await response.json();
            
            let symbols = data.symbols.filter(s => s.status === 'TRADING');

            if (userInput && userInput.trim() !== '') {
                symbols = symbols.filter(s =>
                    s.symbol.includes(userInput.toUpperCase())
                );
            }

            return symbols.slice(0, 100).map(s => ({
                symbol: s.symbol,
                full_name: `BINANCE_SPOT:${s.symbol}`,
                description: `${s.baseAsset}/${s.quoteAsset} Spot`,
                exchange: 'BINANCE_SPOT',
                type: 'spot',
                logo_urls: this.getLogoUrls(s.baseAsset)
            }));
        } catch (error) {
            console.error('Error searching Binance Spot symbols:', error);
            return [];
        }
    }

    /**
     * Override: Lấy OHLCV cho Spot
     */
    async fetchOHLCV(symbol, timeframe, since, limit = 1000) {
        try {
            const interval = this.resolutionToTimeframe(timeframe);
            const url = `${this.baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${since}&limit=${limit}`;
            
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
            console.error('Error fetching Binance Spot OHLCV:', error);
            return [];
        }
    }

    /**
     * Override: Subscribe WebSocket cho Spot
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
     * Lấy ticker 24h cho Spot
     */
    async fetchTicker24hr(symbol) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v3/ticker/24hr?symbol=${symbol}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching 24hr ticker:', error);
            return null;
        }
    }

    /**
     * Lấy tất cả tickers 24h
     */
    async fetchAllTickers24hr() {
        try {
            const response = await fetch(`${this.baseUrl}/api/v3/ticker/24hr`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching all 24hr tickers:', error);
            return [];
        }
    }

    /**
     * Override: Lấy thông tin symbol (không dùng CCXT)
     */
    async getSymbolInfo(symbol) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v3/ticker/price?symbol=${symbol}`);
            const data = await response.json();
            const price = parseFloat(data.price);
            const precision = this.calculatePrecision(price);
            
            return {
                market: { symbol },
                ticker: { last: price },
                precision: precision
            };
        } catch (error) {
            console.error('Error getting symbol info:', error);
            return {
                market: { symbol },
                ticker: { last: 0 },
                precision: { minmov: 1, pricescale: 100 }
            };
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BinanceSpotExchange;
}
