import BaseDataSource from '../BaseDataSource.js';

/**
 * OKX Futures DataSource
 */
class OKXFuturesDataSource extends BaseDataSource {
    constructor(config = {}) {
        super(config);
        this.name = 'OKXFuturesDataSource';
        this.wsConnections = new Map();
        this.subscribers = new Map();
        
        this.apiUrl = 'https://www.okx.com';
        this.wsUrl = 'wss://ws.okx.com:8443/ws/v5/public';
    }

    async onReady() {
        return {
            supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true
        };
    }

    canHandle(symbolName) {
        const { exchange } = this.parseSymbol(symbolName);
        return exchange === 'OKXFUTURES';
    }

    /**
     * Chuyển symbol từ format Binance sang OKX
     * BTCUSDT -> BTC-USDT
     */
    normalizeSymbol(symbol) {
        // Nếu đã có dấu - thì return luôn
        if (symbol.includes('-')) return symbol;
        
        // Tìm vị trí của USDT, USDC, BTC, ETH, etc
        const quoteAssets = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'BUSD'];
        for (const quote of quoteAssets) {
            if (symbol.endsWith(quote)) {
                const base = symbol.slice(0, -quote.length);
                return `${base}-${quote}`;
            }
        }
        
        // Fallback: thêm -USDT
        return `${symbol}-USDT`;
    }

    async searchSymbols(userInput, exchange, symbolType, onResult) {
        onResult([]);
    }

    async resolveSymbol(symbolName, onResolve, onError) {
        try {
            const { exchange, symbol } = this.parseSymbol(symbolName);
            const normalizedSymbol = this.normalizeSymbol(symbol);
            const instId = `${normalizedSymbol}-SWAP`;
            const response = await fetch(`${this.apiUrl}/api/v5/public/instruments?instType=SWAP&instId=${instId}`);
            const data = await response.json();

            if (data.code !== '0' || !data.data || data.data.length === 0) {
                onError('Symbol not found');
                return;
            }

            const symbolData = data.data[0];
            const tickSize = parseFloat(symbolData.tickSz) || 0.01;
            
            // Tính pricescale và minmov
            const { pricescale, minmov } = this.calculatePriceScale(tickSize);
            
            console.log(`[OKXFutures] ${symbolData.instId}: tickSize=${tickSize}, pricescale=${pricescale}, minmov=${minmov}`);

            const symbolInfo = {
                name: symbolName,
                ticker: symbolName,
                description: symbolData.instId,
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
            console.error('[OKXFuturesDataSource] Resolve error:', error);
            onError(error.message);
        }
    }

    resolutionToBar(resolution) {
        const map = {
            '1': '1m',
            '5': '5m',
            '15': '15m',
            '30': '30m',
            '60': '1H',
            '240': '4H',
            'D': '1D',
            'W': '1W',
            'M': '1M'
        };
        return map[resolution] || '1H';
    }

    async getBars(symbolInfo, resolution, periodParams, onResult, onError) {
        try {
            const { symbol } = this.parseSymbol(symbolInfo.name);
            const normalizedSymbol = this.normalizeSymbol(symbol);
            const instId = `${normalizedSymbol}-SWAP`;
            const bar = this.resolutionToBar(resolution);
            const url = `${this.apiUrl}/api/v5/market/candles?instId=${instId}&bar=${bar}&before=${periodParams.from * 1000}&after=${periodParams.to * 1000}&limit=300`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== '0' || !data.data || data.data.length === 0) {
                onResult([], { noData: true });
                return;
            }

            const bars = data.data.reverse().map(bar => ({
                time: parseInt(bar[0]),
                open: parseFloat(bar[1]),
                high: parseFloat(bar[2]),
                low: parseFloat(bar[3]),
                close: parseFloat(bar[4]),
                volume: parseFloat(bar[5])
            }));

            onResult(bars, { noData: false });
        } catch (error) {
            console.error('[OKXFuturesDataSource] GetBars error:', error);
            onError(error.message);
        }
    }

    async subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
        const { symbol } = this.parseSymbol(symbolInfo.name);
        const normalizedSymbol = this.normalizeSymbol(symbol);
        const instId = `${normalizedSymbol}-SWAP`;
        const channel = this.resolutionToBar(resolution);

        const ws = new WebSocket(this.wsUrl);

        ws.onopen = () => {
            ws.send(JSON.stringify({
                op: 'subscribe',
                args: [{
                    channel: `candle${channel}`,
                    instId: instId
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
                onTick(bar);
            }
        };

        ws.onerror = (error) => {
            console.error('[OKXFuturesDataSource] WebSocket error:', error);
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

export default OKXFuturesDataSource;
