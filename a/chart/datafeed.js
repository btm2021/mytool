/**
 * Binance Futures Datafeed for TradingView Advanced Chart
 * Implements the TradingView Datafeed API
 */

class BinanceFuturesDatafeed {
    constructor() {
        this.baseUrl = 'https://fapi.binance.com';
        this.supportedResolutions = ['1', '3', '5', '15', '30', '60', '120', '240', '360', '480', '720', '1D', '3D', '1W', '1M'];
        this.config = {
            supported_resolutions: this.supportedResolutions,
            exchanges: [{
                value: 'Binance Futures',
                name: 'Binance Futures',
                desc: 'Binance Futures Exchange'
            }],
            symbols_types: [{
                name: 'crypto',
                value: 'crypto'
            }]
        };
        this.symbols = {};
    }

    /**
     * Convert TradingView resolution to Binance interval
     */
    convertResolution(resolution) {
        const resolutionMap = {
            '1': '1m',
            '3': '3m',
            '5': '5m',
            '15': '15m',
            '30': '30m',
            '60': '1h',
            '120': '2h',
            '240': '4h',
            '360': '6h',
            '480': '8h',
            '720': '12h',
            '1D': '1d',
            '3D': '3d',
            '1W': '1w',
            '1M': '1M'
        };
        return resolutionMap[resolution] || '1h';
    }

    /**
     * Fetch exchange info from Binance
     */
    async getExchangeInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/fapi/v1/exchangeInfo`);
            const data = await response.json();
            return data.symbols.filter(s => s.status === 'TRADING');
        } catch (error) {
            console.error('Error fetching exchange info:', error);
            return [];
        }
    }

    /**
     * TradingView Datafeed API: onReady
     */
    onReady(callback) {
        console.log('[onReady]: Method call');
        setTimeout(() => callback(this.config), 0);
    }

    /**
     * TradingView Datafeed API: searchSymbols
     */
    async searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
        console.log('[searchSymbols]: Method call', userInput);
        const symbols = await this.getExchangeInfo();
        const filteredSymbols = symbols
            .filter(symbol => {
                const symbolName = symbol.symbol.toLowerCase();
                const input = userInput.toLowerCase();
                return symbolName.includes(input);
            })
            .slice(0, 30)
            .map(symbol => ({
                symbol: symbol.symbol,
                full_name: `Binance Futures:${symbol.symbol}`,
                description: `${symbol.baseAsset}/${symbol.quoteAsset}`,
                exchange: 'Binance Futures',
                type: 'crypto'
            }));
        
        onResultReadyCallback(filteredSymbols);
    }

    /**
     * TradingView Datafeed API: resolveSymbol
     */
    async resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
        console.log('[resolveSymbol]: Method call', symbolName);
        
        try {
            const symbols = await this.getExchangeInfo();
            const symbol = symbols.find(s => s.symbol === symbolName);
            
            if (!symbol) {
                onResolveErrorCallback('Symbol not found');
                return;
            }

            // Calculate minmov based on price precision
            // For most symbols, minmov should be 1
            // But we need to ensure pricescale is correct
            const pricescale = Math.pow(10, symbol.pricePrecision);
            
            const symbolInfo = {
                ticker: symbol.symbol,
                name: symbol.symbol,
                description: `${symbol.baseAsset}/${symbol.quoteAsset}`,
                type: 'crypto',
                session: '24x7',
                timezone: 'Etc/UTC',
                exchange: 'Binance Futures',
                minmov: 1,
                pricescale: pricescale,
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: this.supportedResolutions,
                volume_precision: symbol.quantityPrecision,
                data_status: 'streaming',
                format: 'price'
            };

            this.symbols[symbol.symbol] = symbolInfo;
            console.log('[resolveSymbol]: Symbol resolved', symbolInfo);
            onSymbolResolvedCallback(symbolInfo);
        } catch (error) {
            console.error('[resolveSymbol]: Error', error);
            onResolveErrorCallback('Error resolving symbol');
        }
    }

    /**
     * TradingView Datafeed API: getBars
     */
    async getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        const { from, to, firstDataRequest } = periodParams;
        console.log('[getBars]: Method call', symbolInfo.name, resolution, from, to);

        try {
            const interval = this.convertResolution(resolution);
            const limit = 1000;
            
            const url = `${this.baseUrl}/fapi/v1/klines?symbol=${symbolInfo.name}&interval=${interval}&startTime=${from * 1000}&endTime=${to * 1000}&limit=${limit}`;
            
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

            console.log('[getBars]: Returned', bars.length, 'bars');
            onHistoryCallback(bars, { noData: false });
        } catch (error) {
            console.error('[getBars]: Error', error);
            onErrorCallback(error);
        }
    }

    /**
     * TradingView Datafeed API: subscribeBars
     */
    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
        console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
        
        const interval = this.convertResolution(resolution);
        const wsUrl = `wss://fstream.binance.com/ws/${symbolInfo.name.toLowerCase()}@kline_${interval}`;
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('[subscribeBars]: WebSocket connected for', symbolInfo.name);
        };
        
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
        
        ws.onerror = (error) => {
            console.error('[subscribeBars]: WebSocket error', error);
        };
        
        ws.onclose = () => {
            console.log('[subscribeBars]: WebSocket closed');
        };
        
        // Store WebSocket for cleanup
        if (!this.subscribers) {
            this.subscribers = {};
        }
        this.subscribers[subscriberUID] = ws;
    }

    /**
     * TradingView Datafeed API: unsubscribeBars
     */
    unsubscribeBars(subscriberUID) {
        console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
        
        if (this.subscribers && this.subscribers[subscriberUID]) {
            this.subscribers[subscriberUID].close();
            delete this.subscribers[subscriberUID];
        }
    }

    /**
     * TradingView Datafeed API: getServerTime (optional)
     */
    async getServerTime(callback) {
        try {
            const response = await fetch(`${this.baseUrl}/fapi/v1/time`);
            const data = await response.json();
            callback(Math.floor(data.serverTime / 1000));
        } catch (error) {
            console.error('[getServerTime]: Error', error);
        }
    }
}

// Make it globally available
window.BinanceFuturesDatafeed = BinanceFuturesDatafeed;
