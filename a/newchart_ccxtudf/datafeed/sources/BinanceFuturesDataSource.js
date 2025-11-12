import BaseDataSource from '../BaseDataSource.js';

/**
 * Binance USDⓈ-M Futures DataSource
 */
class BinanceFuturesDataSource extends BaseDataSource {
    constructor(config = {}) {
        super(config);
        this.name = 'BinanceUSDMDataSource';
        this.wsConnections = new Map();
        this.subscribers = new Map();
        
        this.apiUrl = 'https://fapi.binance.com';
        this.wsUrl = 'wss://fstream.binance.com/ws';
    }

    async onReady() {
        return {
            supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
            exchanges: [
                { value: 'BINANCEUSDM', name: 'Binance USDⓈ-M', desc: 'Binance USDⓈ-M Futures' }
            ]
        };
    }

    canHandle(symbolName) {
        const { exchange } = this.parseSymbol(symbolName);
        return exchange === 'BINANCEUSDM';
    }

    async searchSymbols(userInput, exchange, symbolType, onResult) {
        if (exchange !== 'BINANCEUSDM') {
            onResult([]);
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/fapi/v1/exchangeInfo`);
            const data = await response.json();

            const symbols = data.symbols
                .filter(s => s.status === 'TRADING')
                .filter(s => !userInput || s.symbol.toLowerCase().includes(userInput.toLowerCase()))
                .slice(0, 30)
                .map(s => ({
                    symbol: s.symbol,
                    full_name: `BINANCEUSDM:${s.symbol}`,
                    description: `${s.baseAsset}/${s.quoteAsset}`,
                    exchange: 'BINANCEUSDM',
                    type: 'crypto'
                }));

            onResult(symbols);
        } catch (error) {
            console.error('[BinanceUSDMDataSource] Search error:', error);
            onResult([]);
        }
    }

    async resolveSymbol(symbolName, onResolve, onError) {
        try {
            const { exchange, symbol } = this.parseSymbol(symbolName);
            const response = await fetch(`${this.apiUrl}/fapi/v1/exchangeInfo?symbol=${symbol}`);
            const data = await response.json();

            if (!data.symbols || data.symbols.length === 0) {
                onError('Symbol not found');
                return;
            }

            const symbolData = data.symbols[0];
            
            // Tìm filter PRICE_FILTER để lấy tickSize chính xác
            const priceFilter = symbolData.filters?.find(f => f.filterType === 'PRICE_FILTER');
            const tickSize = priceFilter ? parseFloat(priceFilter.tickSize) : 0.01;
            
            // Tính pricescale và minmov
            const { pricescale, minmov } = this.calculatePriceScale(tickSize);
            
            console.log(`[BinanceFutures] ${symbolData.symbol}: tickSize=${tickSize}, pricescale=${pricescale}, minmov=${minmov}`);

            const symbolInfo = {
                name: symbolName,
                ticker: symbolName,
                description: `${symbolData.baseAsset}/${symbolData.quoteAsset}`,
                type: 'crypto',
                session: '24x7',
                timezone: 'Etc/UTC',
                exchange: exchange,
                minmov: minmov,
                pricescale: pricescale,
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
                volume_precision: 2,
                data_status: 'streaming',
            };

            onResolve(symbolInfo);
        } catch (error) {
            console.error('[BinanceUSDMDataSource] Resolve error:', error);
            onError(error.message);
        }
    }

    resolutionToInterval(resolution) {
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

    async getBars(symbolInfo, resolution, periodParams, onResult, onError) {
        try {
            const { symbol } = this.parseSymbol(symbolInfo.name);
            const interval = this.resolutionToInterval(resolution);
            const url = `${this.apiUrl}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${periodParams.from * 1000}&endTime=${periodParams.to * 1000}&limit=1000`;

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

            onResult(bars, { noData: false });
        } catch (error) {
            console.error('[BinanceUSDMDataSource] GetBars error:', error);
            onError(error.message);
        }
    }

    async subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
        const { symbol } = this.parseSymbol(symbolInfo.name);
        const interval = this.resolutionToInterval(resolution);
        const stream = `${symbol.toLowerCase()}@kline_${interval}`;

        const ws = new WebSocket(`${this.wsUrl}/${stream}`);

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
            console.error('[BinanceUSDMDataSource] WebSocket error:', error);
        };

        this.wsConnections.set(listenerGuid, ws);
        this.subscribers.set(listenerGuid, { symbolInfo, resolution, onTick });
    }

    async unsubscribeBars(listenerGuid) {
        const ws = this.wsConnections.get(listenerGuid);
        if (ws) {
            ws.close();
            this.wsConnections.delete(listenerGuid);
        }
        this.subscribers.delete(listenerGuid);
    }
}

export default BinanceFuturesDataSource;
