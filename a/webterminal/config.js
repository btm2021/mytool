// Configuration for exchanges
const CONFIG = {
    // Proxy configuration
    proxyURL: 'https://autumn-heart-5bf8.trinhminhbao.workers.dev/',

    exchanges: [
        {
            id: 'binance',
            name: 'Binance',
            color: '#F3BA2F',
            maxWeight: 1200,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/binance-worker.js',
            proxyUrl: false,
            whitelist: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT']
        },
        {
            id: 'bybit',
            name: 'Bybit',
            color: '#F7A600',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/bybit-worker.js',
            proxyUrl: false,
            whitelist: ['BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT', 'XRP/USDT:USDT', 'BNB/USDT:USDT', 'ADA/USDT:USDT', 'DOGE/USDT:USDT', 'AVAX/USDT:USDT', 'DOT/USDT:USDT', 'MATIC/USDT:USDT']
        },
        {
            id: 'okx',
            name: 'OKX',
            color: '#00A6FF',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/okx-worker.js',
            proxyUrl: false,
            whitelist: ['BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT', 'XRP/USDT:USDT', 'BNB/USDT:USDT', 'ADA/USDT:USDT', 'DOGE/USDT:USDT', 'AVAX/USDT:USDT', 'DOT/USDT:USDT', 'LINK/USDT:USDT']
        },
        {
            id: 'kucoin',
            name: 'KuCoin Futures',
            color: '#24AE8F',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/kucoin-worker.js',
            proxyUrl: true,
            whitelist: ['BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT', 'XRP/USDT:USDT', 'BNB/USDT:USDT', 'ADA/USDT:USDT', 'DOGE/USDT:USDT', 'AVAX/USDT:USDT', 'DOT/USDT:USDT', 'MATIC/USDT:USDT']
        },
        {
            id: 'bingx',
            name: 'BingX',
            color: '#2B6AFF',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/bingx-worker.js',
            proxyUrl: true,
            whitelist: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT']
        },
        {
            id: 'mexc',
            name: 'MEXC',
            color: '#00B897',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/mexc-worker.js',
            proxyUrl: true,
            whitelist: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT']
        },
        {
            id: 'krakenfutures',
            name: 'Kraken Futures',
            color: '#7B5FE8',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            workerFile: 'workers/kraken-futures-worker.js',
            acceptedQuotes: ['USD', 'USDT'],
            proxyUrl: true,
            whitelist: ['BTC/USD:USD', 'ETH/USD:USD', 'SOL/USD:USD', 'XRP/USD:USD', 'ADA/USD:USD', 'DOGE/USD:USD', 'AVAX/USD:USD', 'DOT/USD:USD', 'MATIC/USD:USD', 'LINK/USD:USD']
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
