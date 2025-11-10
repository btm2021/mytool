/**
 * Bybit Spot Exchange
 * Kế thừa từ BaseExchange và implement các phương thức đặc thù cho Bybit Spot
 */
class BybitSpotExchange extends BaseExchange {
    constructor(options = {}) {
        super('BYBIT', {
            ...options,
            options: {
                defaultType: 'spot'
            }
        });
        
        this.baseUrl = 'https://api.bybit.com';
        this.wsUrl = 'wss://stream.bybit.com/v5/public/spot';
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
            value: 'BYBIT_SPOT',
            name: 'Bybit Spot',
            desc: 'Bybit Spot'
        };
    }

    /**
     * Override: Tìm kiếm symbols cho Spot
     */
    async searchSymbols(userInput, symbolType = 'spot') {
        try {
            const response = await fetch(`${this.baseUrl}/v5/market/instruments-info?category=spot`);
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
                const quoteAsset = s.quoteCoin || 'USDT';
                
                return {
                    symbol: s.symbol,
                    full_name: `BYBIT_SPOT:${s.symbol}`,
                    description: `${baseAsset}/${quoteAsset} Spot`,
                    exchange: 'BYBIT_SPOT',
                    type: 'spot',
                    logo_urls: this.getLogoUrls(baseAsset)
                };
            });
        } catch (error) {
            console.error('Error searching Bybit Spot symbols:', error);
            return [];
        }
    }

    /**
     * Override: Lấy OHLCV cho Spot
     */
    async fetchOHLCV(symbol, timeframe, since, limit = 200) {
        try {
            const interval = this.resolutionToBybitInterval(timeframe);
            const url = `${this.baseUrl}/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`;
            
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
            console.error('Error fetching Bybit Spot OHLCV:', error);
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
     * Override: Subscribe WebSocket cho Spot
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
        try {
            const response = await fetch(`${this.baseUrl}/v5/market/tickers?category=spot&symbol=${symbol}`);
            const result = await response.json();
            
            if (result.retCode === 0 && result.result && result.result.list && result.result.list[0]) {
                const price = parseFloat(result.result.list[0].lastPrice);
                const precision = this.calculatePrecision(price);
                
                return {
                    market: { symbol },
                    ticker: { last: price },
                    precision: precision
                };
            }
        } catch (error) {
            console.error('Error getting Bybit symbol info:', error);
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
    module.exports = BybitSpotExchange;
}
