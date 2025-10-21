// Configuration for exchanges
const CONFIG = {
    // Proxy configuration
    proxyURL: 'https://autumn-heart-5bf8.trinhminhbao.workers.dev/',

    // Cycle delay (milliseconds)
    cycleDelay: 10000,

    exchanges: [
        {
            id: 'binance',
            name: 'Binance',
            color: '#21e9ceff',
            maxWeight: 1200,
            weightCost: 1,
            weightResetInterval: 60000,
            moduleFile: 'exchanges/binance.js',
            className: 'BinanceExchange',
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
            moduleFile: 'exchanges/bybit.js',
            className: 'BybitExchange',
            proxyUrl: false,
            whitelist: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT']
        },
        {
            id: 'okx',
            name: 'OKX',
            color: '#00A6FF',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            moduleFile: 'exchanges/okx.js',
            className: 'OKXExchange',
            proxyUrl: false,
            whitelist: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'LINK/USDT']
        },
        {
            id: 'kucoin',
            name: 'KuCoin Futures',
            color: '#24AE8F',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            moduleFile: 'exchanges/kucoin.js',
            className: 'KucoinExchange',
            proxyUrl: true,
            whitelist: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT']
        },
        {
            id: 'bingx',
            name: 'BingX',
            color: '#2B6AFF',
            maxWeight: 1000,
            weightCost: 1,
            weightResetInterval: 60000,
            moduleFile: 'exchanges/bingx.js',
            className: 'BingxExchange',
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
            moduleFile: 'exchanges/mexc.js',
            className: 'MexcExchange',
            proxyUrl: true,
            whitelist: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT']
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
