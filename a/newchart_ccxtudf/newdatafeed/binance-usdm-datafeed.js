/**
 * Binance USD-M Futures Datafeed
 * Đơn giản, trực tiếp, không phức tạp
 */

class BinanceUSDMDatafeed {
    constructor() {
        this.name = 'Binance USD-M Futures';
        this.apiUrl = 'https://fapi.binance.com';
        this.wsUrl = 'wss://fstream.binance.com/ws';
        
        // Cache symbols
        this.symbols = [];
        this.symbolsLoaded = false;
        
        // WebSocket connections
        this.wsConnections = new Map();
        
        console.log('[BinanceUSDM] Datafeed initialized');
    }

    // ============ Load All Symbols ============
    async loadSymbols() {
        if (this.symbolsLoaded) {
            console.log('[BinanceUSDM] Symbols already loaded');
            return this.symbols;
        }

        try {
            console.log('[BinanceUSDM] Loading symbols...');
            const response = await fetch(`${this.apiUrl}/fapi/v1/exchangeInfo`);
            const data = await response.json();

            this.symbols = data.symbols
                .filter(s => s.status === 'TRADING')
                .map(s => ({
                    symbol: s.symbol,
                    baseAsset: s.baseAsset,
                    quoteAsset: s.quoteAsset,
                    pricePrecision: s.pricePrecision,
                    quantityPrecision: s.quantityPrecision
                }));

            this.symbolsLoaded = true;
            console.log(`[BinanceUSDM] Loaded ${this.symbols.length} symbols`);
            return this.symbols;
        } catch (error) {
            console.error('[BinanceUSDM] Error loading symbols:', error);
            return [];
        }
    }

    // ============ TradingView API: onReady ============
    onReady(callback) {
        console.log('[BinanceUSDM] onReady called');
        setTimeout(() => {
            callback({
                supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
                supports_marks: false,
                supports_timescale_marks: false,
                supports_time: true
            });
        }, 0);
    }

    // ============ TradingView API: searchSymbols ============
    async searchSymbols(userInput, exchange, symbolType, onResult) {
        console.log('[BinanceUSDM] searchSymbols:', userInput);

        if (!this.symbolsLoaded) {
            await this.loadSymbols();
        }

        const searchTerm = (userInput || '').toLowerCase().trim();
        let results = [];

        if (searchTerm === '') {
            // Hiển thị top symbols
            const topSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
            results = this.symbols
                .filter(s => topSymbols.includes(s.symbol))
                .slice(0, 10);
        } else {
            // Search
            results = this.symbols
                .filter(s => s.symbol.toLowerCase().includes(searchTerm))
                .slice(0, 50);
        }

        const formattedResults = results.map(s => ({
            symbol: s.symbol,
            full_name: s.symbol,
            description: `${s.baseAsset}/${s.quoteAsset} Perpetual`,
            exchange: 'Binance USD-M',
            type: 'crypto'
        }));

        onResult(formattedResults);
    }

    // ============ TradingView API: resolveSymbol ============
    async resolveSymbol(symbolName, onResolve, onError) {
        console.log('[BinanceUSDM] resolveSymbol:', symbolName);

        try {
            // Lấy thông tin symbol từ API
            const response = await fetch(`${this.apiUrl}/fapi/v1/exchangeInfo?symbol=${symbolName}`);
            const data = await response.json();

            if (!data.symbols || data.symbols.length === 0) {
                onError('Symbol not found');
                return;
            }

            const symbolData = data.symbols[0];
            const pricescale = Math.pow(10, symbolData.pricePrecision);

            const symbolInfo = {
                name: symbolName,
                ticker: symbolName,
                description: `${symbolData.baseAsset}/${symbolData.quoteAsset} Perpetual`,
                type: 'crypto',
                session: '24x7',
                timezone: 'Etc/UTC',
                exchange: 'Binance USD-M',
                minmov: 1,
                pricescale: pricescale,
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
                volume_precision: 2,
                data_status: 'streaming'
            };

            console.log('[BinanceUSDM] Symbol resolved:', symbolInfo);
            onResolve(symbolInfo);
        } catch (error) {
            console.error('[BinanceUSDM] Error resolving symbol:', error);
            onError(error.message);
        }
    }

    // ============ Helper: Convert resolution ============
    getInterval(resolution) {
        const map = {
            '1': '1m',
            '5': '5m',
            '15': '15m',
            '30': '30m',
            '60': '1h',
            '240': '4h',
            'D': '1d',
            'W': '1w',
            'M': '1M'
        };
        return map[resolution] || '1h';
    }

    // ============ TradingView API: getBars ============
    async getBars(symbolInfo, resolution, periodParams, onResult, onError) {
        const symbol = symbolInfo.name;
        const interval = this.getInterval(resolution);
        const { from, to } = periodParams;

        console.log('[BinanceUSDM] getBars:', symbol, interval, 'from:', from, 'to:', to);

        try {
            const url = `${this.apiUrl}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${from * 1000}&endTime=${to * 1000}&limit=1500`;
            const response = await fetch(url);
            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                onResult([], { noData: true });
                return;
            }

            const bars = data.map(bar => ({
                time: bar[0],
                open: parseFloat(bar[1]),
                high: parseFloat(bar[2]),
                low: parseFloat(bar[3]),
                close: parseFloat(bar[4]),
                volume: parseFloat(bar[5])
            }));

            console.log(`[BinanceUSDM] Loaded ${bars.length} bars`);
            onResult(bars, { noData: false });
        } catch (error) {
            console.error('[BinanceUSDM] Error getting bars:', error);
            onError(error.message);
        }
    }

    // ============ TradingView API: subscribeBars ============
    subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
        const symbol = symbolInfo.name;
        const interval = this.getInterval(resolution);
        const stream = `${symbol.toLowerCase()}@kline_${interval}`;

        console.log('[BinanceUSDM] subscribeBars:', stream, 'guid:', listenerGuid);

        const ws = new WebSocket(`${this.wsUrl}/${stream}`);

        ws.onopen = () => {
            console.log('[BinanceUSDM] WebSocket connected:', stream);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const kline = data.k;

            if (kline) {
                const bar = {
                    time: kline.t,
                    open: parseFloat(kline.o),
                    high: parseFloat(kline.h),
                    low: parseFloat(kline.l),
                    close: parseFloat(kline.c),
                    volume: parseFloat(kline.v)
                };
                onTick(bar);
            }
        };

        ws.onerror = (error) => {
            console.error('[BinanceUSDM] WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('[BinanceUSDM] WebSocket closed:', stream);
        };

        this.wsConnections.set(listenerGuid, ws);
    }

    // ============ TradingView API: unsubscribeBars ============
    unsubscribeBars(listenerGuid) {
        console.log('[BinanceUSDM] unsubscribeBars:', listenerGuid);
        
        const ws = this.wsConnections.get(listenerGuid);
        if (ws) {
            ws.close();
            this.wsConnections.delete(listenerGuid);
        }
    }
}

export default BinanceUSDMDatafeed;
