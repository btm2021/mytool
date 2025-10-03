const BybitFutureDatafeed = {
    name: 'Bybit Futures',
    baseUrl: 'https://api.bybit.com',
    wsUrl: 'wss://stream.bybit.com/v5/public/linear',
    
    supportedResolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W', '1M'],
    
    symbolsCache: null,
    lastBarsCache: new Map(),

    async fetchSymbols() {
        if (this.symbolsCache) return this.symbolsCache;
        
        const response = await fetch(`${this.baseUrl}/v5/market/instruments-info?category=linear`);
        const data = await response.json();
        
        this.symbolsCache = data.result.list
            .filter(s => s.status === 'Trading')
            .map(s => {
                const tickSize = parseFloat(s.priceFilter.tickSize);
                const pricePrecision = Math.abs(Math.log10(tickSize));
                
                return {
                    symbol: s.symbol,
                    full_name: `Bybit Futures:${s.symbol}`,
                    description: `${s.baseCoin}/${s.quoteCoin} Perpetual`,
                    exchange: 'Bybit Futures',
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
            '1': '1', '3': '3', '5': '5', '15': '15', '30': '30',
            '60': '60', '120': '120', '240': '240', '360': '360', '720': '720',
            '1D': 'D', '1W': 'W', '1M': 'M'
        };
        return map[resolution] || '60';
    },

    async getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        try {
            const { from, to, firstDataRequest } = periodParams;
            const interval = this.convertResolution(resolution);
            
            const url = `${this.baseUrl}/v5/market/kline?category=linear&symbol=${symbolInfo.ticker}&interval=${interval}&start=${from * 1000}&end=${to * 1000}&limit=1000`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (!data.result || !data.result.list || data.result.list.length === 0) {
                onHistoryCallback([], { noData: true });
                return;
            }

            const bars = data.result.list.reverse().map(kline => ({
                time: parseInt(kline[0]),
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
        const ws = new WebSocket(this.wsUrl);
        
        ws.onopen = () => {
            ws.send(JSON.stringify({
                op: 'subscribe',
                args: [`kline.${interval}.${symbolInfo.ticker}`]
            }));
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.topic && data.data && data.data.length > 0) {
                const kline = data.data[0];
                
                const bar = {
                    time: kline.start,
                    open: parseFloat(kline.open),
                    high: parseFloat(kline.high),
                    low: parseFloat(kline.low),
                    close: parseFloat(kline.close),
                    volume: parseFloat(kline.volume)
                };

                onRealtimeCallback(bar);
            }
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
