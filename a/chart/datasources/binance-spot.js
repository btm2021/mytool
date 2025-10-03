const BinanceSpotDatafeed = {
    name: 'Binance Spot',
    baseUrl: 'https://api.binance.com',
    wsUrl: 'wss://stream.binance.com:9443/ws',
    
    supportedResolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '480', '720', '1D', '3D', '1W', '1M'],
    
    symbolsCache: null,
    lastBarsCache: new Map(),

    async fetchSymbols() {
        if (this.symbolsCache) return this.symbolsCache;
        
        const response = await fetch(`${this.baseUrl}/api/v3/exchangeInfo`);
        const data = await response.json();
        
        this.symbolsCache = data.symbols
            .filter(s => s.status === 'TRADING')
            .map(s => {
                const priceFilter = s.filters.find(f => f.filterType === 'PRICE_FILTER');
                const tickSize = priceFilter ? parseFloat(priceFilter.tickSize) : 0.00000001;
                const pricePrecision = Math.abs(Math.log10(tickSize));
                
                return {
                    symbol: s.symbol,
                    full_name: `Binance Spot:${s.symbol}`,
                    description: `${s.baseAsset}/${s.quoteAsset}`,
                    exchange: 'Binance Spot',
                    type: 'crypto',
                    pricescale: Math.pow(10, pricePrecision),
                    minmov: 1,
                    ticker: s.symbol
                };
            });
        
        return this.symbolsCache;
    },

    convertResolution: (resolution) => {
        const map = {
            '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m',
            '60': '1h', '120': '2h', '240': '4h', '360': '6h', '480': '8h', '720': '12h',
            '1D': '1d', '3D': '3d', '1W': '1w', '1M': '1M'
        };
        return map[resolution] || '1h';
    },

    async getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        try {
            const { from, to, firstDataRequest } = periodParams;
            const interval = this.convertResolution(resolution);
            
            const url = `${this.baseUrl}/api/v3/klines?symbol=${symbolInfo.ticker}&interval=${interval}&startTime=${from * 1000}&endTime=${to * 1000}&limit=1500`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (!data || data.length === 0) {
                onHistoryCallback([], { noData: true });
                return;
            }

            const bars = data.map(kline => ({
                time: kline[0],
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5])
            }));

            if (firstDataRequest) {
                this.lastBarsCache.set(symbolInfo.ticker, bars[bars.length - 1]);
            }

            onHistoryCallback(bars, { noData: false });
        } catch (error) {
            onErrorCallback(error);
        }
    },

    subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID) => {
        const interval = this.convertResolution(resolution);
        const ws = new WebSocket(`${this.wsUrl}/${symbolInfo.ticker.toLowerCase()}@kline_${interval}`);
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const kline = data.k;
            
            const bar = {
                time: kline.t,
                open: parseFloat(kline.o),
                high: parseFloat(kline.h),
                low: parseFloat(kline.l),
                close: parseFloat(kline.c),
                volume: parseFloat(kline.v)
            };

            onRealtimeCallback(bar);
        };

        this[subscriberUID] = ws;
    },

    unsubscribeBars: (subscriberUID) => {
        const ws = this[subscriberUID];
        if (ws) {
            ws.close();
            delete this[subscriberUID];
        }
    }
};
