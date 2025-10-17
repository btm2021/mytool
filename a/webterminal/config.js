// Configuration for exchanges
const CONFIG = {
    exchanges: [
        {
            id: 'binance',
            name: 'Binance Futures',
            color: '#dd112cff',
            maxWeight: 1200,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/binance-worker.js'
        },
        {
            id: 'bybit',
            name: 'Bybit',
            color: '#F7A600',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/bybit-worker.js'
        },
        {
            id: 'okx',
            name: 'OKX',
            color: '#00A6FF',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/okx-worker.js'
        }
    ],

    // Batch processing settings
    batchSize: 20,
    klineLimit: 1000,
    timeframe: '15m',
    batchDelay: 1000,
    symbolDelay: 200,

    // Weight management
    weightThreshold: 0.9, // Stop at 90% of max weight

    // UI settings
    maxLogs: 100,
    maxSymbolsPerExchange: 800,

    // Chart settings
    chartCandlesLimit: 5000, // Number of candles to load for chart

    // Indicator settings
    rsi: {
        period: 14,
        oversold: 30,
        overbought: 70
    },
    ema: {
        short: 50,
        long: 200
    }
};
