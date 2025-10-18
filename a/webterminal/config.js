// Configuration for exchanges
const CONFIG = {
    exchanges: [
        {
            id: 'binance',
            name: 'Binance',
            color: '#F3BA2F',
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
        },
        {
            id: 'kucoin',
            name: 'KuCoin',
            color: '#24AE8F',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/kucoin-worker.js',
            proxy: 'https://autumn-heart-5bf8.trinhminhbao.workers.dev/'
        },
        {
            id: 'hyperliquid',
            name: 'Hyperliquid',
            color: '#00D4AA',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/hyperliquid-worker.js'
        },
        {
            id: 'bitmex',
            name: 'BitMEX',
            color: '#E3373E',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/bitmex-worker.js'
        },
        {
            id: 'bingx',
            name: 'BingX',
            color: '#2B6AFF',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/bingx-worker.js'
        },
        {
            id: 'mexc',
            name: 'MEXC',
            color: '#00B897',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/mexc-worker.js'
        },
        {
            id: 'htx',
            name: 'HTX',
            color: '#2E7CFF',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/htx-worker.js'
        },
        {
            id: 'kraken',
            name: 'Kraken',
            color: '#5741D9',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/kraken-worker.js'
        },
        {
            id: 'bitfinex',
            name: 'Bitfinex',
            color: '#16B157',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/bitfinex-worker.js'
        }
    ],

    // Batch processing settings
    batchSize: 10,
    klineLimit: 1000,
    timeframe: '15m',
    batchDelay: 2000,
    symbolDelay: 0, // Not used anymore with Promise.all

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
