import BaseDataSource from '../BaseDataSource.js';

/**
 * Bybit Spot DataSource
 */
class BybitSpotDataSource extends BaseDataSource {
    constructor(config = {}) {
        super(config);
        this.name = 'BybitSpotDataSource';
        this.wsConnections = new Map();
        this.subscribers = new Map();
        
        this.apiUrl = 'https://api.bybit.com';
        this.wsUrl = 'wss://stream.bybit.com/v5/public/spot';
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
        return exchange === 'BYBITSPOT';
    }

    async searchSymbols(userInput, exchange, symbolType, onResult) {
        onResult([]);
    }

    async resolveSymbol(symbolName, onResolve, onError) {
        try {
            const { exchange, symbol } = this.parseSymbol(symbolName);
            
            const response = await fetch(`${this.apiUrl}/v5/market/instruments-info?category=spot&symbol=${symbol}`);
            const data = await response.json();

            if (data.retCode !== 0 || !data.result.list || data.result.list.length === 0) {
                onError('Symbol not found');
                return;
            }

            const symbolData = data.result.list[0];

            const symbolInfo = {
                name: symbolName,
                ticker: symbolName,
                description: symbolData.symbol,
                type: 'crypto',
                session: '24x7',
                timezone: 'Etc/UTC',
                exchange: exchange,
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
                volume_precision: 2,
                data_status: 'streaming',
            };

            onResolve(symbolInfo);
        } catch (error) {
            console.error('[BybitSpotDataSource] Resolve error:', error);
            onError(error.message);
        }
    }

    resolutionToInterval(resolution) {
        const map = {
            '1': '1',
            '5': '5',
            '15': '15',
            '30': '30',
            '60': '60',
            '240': '240',
            'D': 'D',
            'W': 'W',
            'M': 'M'
        };
        return map[resolution] || '60';
    }

    async getBars(symbolInfo, resolution, periodParams, onResult, onError) {
        try {
            const { symbol } = this.parseSymbol(symbolInfo.name);
            const interval = this.resolutionToInterval(resolution);
            const url = `${this.apiUrl}/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&start=${periodParams.from * 1000}&end=${periodParams.to * 1000}&limit=1000`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.retCode !== 0 || !data.result.list || data.result.list.length === 0) {
                onResult([], { noData: true });
                return;
            }

            const bars = data.result.list.reverse().map(bar => {
                const open = parseFloat(bar[1]);
                const high = parseFloat(bar[2]);
                const low = parseFloat(bar[3]);
                const close = parseFloat(bar[4]);
                const volume = parseFloat(bar[5]);
                
                // Validate all values
                if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume)) {
                    return null;
                }
                
                return {
                    time: parseInt(bar[0]),
                    open: open,
                    high: high,
                    low: low,
                    close: close,
                    volume: volume
                };
            }).filter(bar => bar !== null);

            onResult(bars, { noData: false });
        } catch (error) {
            console.error('[BybitSpotDataSource] GetBars error:', error);
            onError(error.message);
        }
    }

    async subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
        const { symbol } = this.parseSymbol(symbolInfo.name);
        const interval = this.resolutionToInterval(resolution);

        const ws = new WebSocket(this.wsUrl);

        ws.onopen = () => {
            ws.send(JSON.stringify({
                op: 'subscribe',
                args: [`kline.${interval}.${symbol}`]
            }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.topic && data.data) {
                const kline = data.data[0];
                if (kline) {
                    const bar = {
                        time: parseInt(kline.start),
                        open: parseFloat(kline.open),
                        high: parseFloat(kline.high),
                        low: parseFloat(kline.low),
                        close: parseFloat(kline.close),
                        volume: parseFloat(kline.volume)
                    };
                    onTick(bar);
                }
            }
        };

        ws.onerror = (error) => {
            console.error('[BybitSpotDataSource] WebSocket error:', error);
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

export default BybitSpotDataSource;
