import BaseDataSource from '../BaseDataSource.js';

/**
 * Example DataSource - Template để tạo datasource mới
 * Copy file này và customize theo exchange/broker của bạn
 */
class ExampleDataSource extends BaseDataSource {
    constructor(config = {}) {
        super(config);
        this.name = 'ExampleDataSource';
        this.apiUrl = config.apiUrl || 'https://api.example.com';
        this.apiKey = config.apiKey || '';
        
        // WebSocket connections
        this.wsConnections = new Map();
        this.subscribers = new Map();
    }

    /**
     * Trả về config cho TradingView
     */
    async onReady() {
        return {
            supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
            exchanges: [
                { 
                    value: 'EXAMPLE', 
                    name: 'Example Exchange', 
                    desc: 'Example Exchange Description' 
                }
            ]
        };
    }

    /**
     * Kiểm tra datasource có hỗ trợ symbol này không
     */
    canHandle(symbolName) {
        const { exchange } = this.parseSymbol(symbolName);
        return exchange === 'EXAMPLE';
    }

    /**
     * Tìm kiếm symbols
     */
    async searchSymbols(userInput, exchange, symbolType, onResult) {
        if (exchange !== 'EXAMPLE') {
            onResult([]);
            return;
        }

        try {
            // TODO: Call API để lấy danh sách symbols
            // const response = await fetch(`${this.apiUrl}/symbols`);
            // const data = await response.json();

            // Mock data
            const symbols = [
                {
                    symbol: 'BTCUSD',
                    full_name: 'EXAMPLE:BTCUSD',
                    description: 'Bitcoin / US Dollar',
                    exchange: 'EXAMPLE',
                    type: 'crypto'
                }
            ];

            onResult(symbols);
        } catch (error) {
            console.error('[ExampleDataSource] Search error:', error);
            onResult([]);
        }
    }

    /**
     * Resolve symbol info
     */
    async resolveSymbol(symbolName, onResolve, onError) {
        try {
            const { exchange, symbol } = this.parseSymbol(symbolName);

            // TODO: Call API để lấy thông tin symbol
            // const response = await fetch(`${this.apiUrl}/symbol/${symbol}`);
            // const data = await response.json();

            const symbolInfo = {
                name: symbolName,
                ticker: symbolName,
                description: 'Example Symbol',
                type: 'crypto',
                session: '24x7',
                timezone: 'Etc/UTC',
                exchange: exchange,
                minmov: 1,
                pricescale: 100,
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
                volume_precision: 2,
                data_status: 'streaming',
            };

            onResolve(symbolInfo);
        } catch (error) {
            console.error('[ExampleDataSource] Resolve error:', error);
            onError(error.message);
        }
    }

    /**
     * Convert TradingView resolution sang format của exchange
     */
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

    /**
     * Lấy historical bars
     */
    async getBars(symbolInfo, resolution, periodParams, onResult, onError) {
        try {
            const { symbol } = this.parseSymbol(symbolInfo.name);
            const interval = this.resolutionToInterval(resolution);

            // TODO: Call API để lấy historical data
            // const url = `${this.apiUrl}/klines?symbol=${symbol}&interval=${interval}&from=${periodParams.from}&to=${periodParams.to}`;
            // const response = await fetch(url);
            // const data = await response.json();

            // Mock data
            const bars = [];

            if (bars.length === 0) {
                onResult([], { noData: true });
                return;
            }

            onResult(bars, { noData: false });
        } catch (error) {
            console.error('[ExampleDataSource] GetBars error:', error);
            onError(error.message);
        }
    }

    /**
     * Subscribe realtime updates
     */
    async subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
        const { symbol } = this.parseSymbol(symbolInfo.name);
        const interval = this.resolutionToInterval(resolution);

        // TODO: Implement WebSocket hoặc polling
        // Option 1: WebSocket
        // const ws = new WebSocket(`${this.wsUrl}/${symbol}@kline_${interval}`);
        // ws.onmessage = (event) => {
        //     const data = JSON.parse(event.data);
        //     const bar = { time, open, high, low, close, volume };
        //     onTick(bar);
        // };
        // this.wsConnections.set(listenerGuid, ws);

        // Option 2: Polling
        // const pollInterval = setInterval(async () => {
        //     // Fetch latest bar
        //     // onTick(bar);
        // }, 5000);
        // this.wsConnections.set(listenerGuid, pollInterval);

        this.subscribers.set(listenerGuid, { symbolInfo, resolution, onTick });
    }

    /**
     * Unsubscribe realtime updates
     */
    async unsubscribeBars(listenerGuid) {
        const connection = this.wsConnections.get(listenerGuid);
        if (connection) {
            // WebSocket
            if (connection.close) {
                connection.close();
            }
            // Polling interval
            else if (typeof connection === 'number') {
                clearInterval(connection);
            }
            this.wsConnections.delete(listenerGuid);
        }
        this.subscribers.delete(listenerGuid);
    }
}

export default ExampleDataSource;
