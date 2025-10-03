const OKXDatafeed = {
    name: 'OKX',
    baseUrl: 'https://www.okx.com',
    wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
    
    supportedResolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W', '1M'],
    
    symbolsCache: null,
    lastBarsCache: new Map(),

    async fetchSymbols() {
        if (this.symbolsCache) return this.symbolsCache;
        
        const response = await fetch(`${this.baseUrl}/api/v5/public/instruments?instType=SWAP`);
        const data = await response.json();
        
        this.symbolsCache = data.data
            .filter(s => s.state === 'live')
            .map(s => {
                const tickSize = parseFloat(s.tickSz);
                const pricePrecision = Math.abs(Math.log10(tickSize));
                
                return {
                    symbol: s.instId,
                    full_name: `OKX:${s.instId}`,
                    description: `${s.instId} Perpetual`,
                    exchange: 'OKX',
                    type: 'crypto',
                    pricescale: Math.pow(10, pricePrecision),
                    minmov: 1,
                    ticker: s.instId
                };
            });
        
        return this.symbolsCache;
    },

    convertResolution: (resolution) => {
        const map = {
            '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m',
            '60': '1H', '120': '2H', '240': '4H', '360': '6H', '720': '12H',
            '1D': '1D', '1W': '1W', '1M': '1M'
        };
        return map[resolution] || '1H';
    },

    async getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        try {
            const { from, to, firstDataRequest } = periodParams;
            const interval = this.convertResolution(resolution);
            
            const url = `${this.baseUrl}/api/v5/market/candles?instId=${symbolInfo.ticker}&bar=${interval}&after=${from * 1000}&before=${to * 1000}&limit=300`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                onHistoryCallback([], { noData: true });
                return;
            }

            const bars = data.data.reverse().map(kline => ({
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
                args: [{
                    channel: `candle${interval}`,
                    instId: symbolInfo.ticker
                }]
            }));
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.data && data.data.length > 0) {
                const kline = data.data[0];
                
                const bar = {
                    time: parseInt(kline[0]),
                    open: parseFloat(kline[1]),
                    high: parseFloat(kline[2]),
                    low: parseFloat(kline[3]),
                    close: parseFloat(kline[4]),
                    volume: parseFloat(kline[5])
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
