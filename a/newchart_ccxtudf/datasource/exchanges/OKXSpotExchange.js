/**
 * OKX Spot Exchange
 * Kế thừa từ BaseExchange và implement các phương thức đặc thù cho OKX Spot
 */
class OKXSpotExchange extends BaseExchange {
    constructor(options = {}) {
        super('OKX', {
            ...options,
            options: {
                defaultType: 'spot'
            }
        });
        
        this.baseUrl = 'https://www.okx.com';
        this.wsUrl = 'wss://ws.okx.com:8443/ws/v5/public';
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
            value: 'OKX_SPOT',
            name: 'OKX Spot',
            desc: 'OKX Spot'
        };
    }

    /**
     * Override: Tìm kiếm symbols cho Spot
     */
    async searchSymbols(userInput, symbolType = 'spot') {
        try {
            const response = await fetch(`${this.baseUrl}/api/v5/public/instruments?instType=SPOT`);
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
                const symbol = s.instId.replace('-', '');
                const parts = s.instId.split('-');
                const baseAsset = parts[0];
                const quoteAsset = parts[1];
                
                return {
                    symbol: symbol,
                    full_name: `OKX_SPOT:${symbol}`,
                    description: `${baseAsset}/${quoteAsset} Spot`,
                    exchange: 'OKX_SPOT',
                    type: 'spot',
                    logo_urls: this.getLogoUrls(baseAsset)
                };
            });
        } catch (error) {
            console.error('Error searching OKX Spot symbols:', error);
            return [];
        }
    }

    /**
     * Override: Lấy OHLCV cho Spot
     */
    async fetchOHLCV(symbol, timeframe, since, limit = 100) {
        try {
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
            console.error('Error fetching OKX Spot OHLCV:', error);
            return [];
        }
    }

    /**
     * Convert symbol to OKX format
     */
    toOKXSymbol(symbol) {
        // BTCUSDT -> BTC-USDT
        if (symbol.includes('-')) return symbol;
        
        const base = symbol.replace('USDT', '');
        return `${base}-USDT`;
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
     * Override: Subscribe WebSocket cho Spot
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
        try {
            const instId = this.toOKXSymbol(symbol);
            const response = await fetch(`${this.baseUrl}/api/v5/market/ticker?instId=${instId}`);
            const result = await response.json();
            
            if (result.code === '0' && result.data && result.data[0]) {
                const price = parseFloat(result.data[0].last);
                const precision = this.calculatePrecision(price);
                
                return {
                    market: { symbol },
                    ticker: { last: price },
                    precision: precision
                };
            }
        } catch (error) {
            console.error('Error getting OKX symbol info:', error);
        }
        
        return {
            market: { symbol },
            ticker: { last: 0 },
            precision: { minmov: 1, pricescale: 100 }
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OKXSpotExchange;
}
