/**
 * Datasource Module Entry Point
 * Export tất cả các classes cần thiết
 */

// Base classes
if (typeof BaseExchange === 'undefined') {
    // Load script nếu chưa có
    const script1 = document.createElement('script');
    script1.src = 'datasource/base/BaseExchange.js';
    document.head.appendChild(script1);
}

// Exchange implementations - Binance
if (typeof BinanceFuturesExchange === 'undefined') {
    const script2 = document.createElement('script');
    script2.src = 'datasource/exchanges/BinanceFuturesExchange.js';
    document.head.appendChild(script2);
}

if (typeof BinanceSpotExchange === 'undefined') {
    const script3 = document.createElement('script');
    script3.src = 'datasource/exchanges/BinanceSpotExchange.js';
    document.head.appendChild(script3);
}

// Exchange implementations - OKX
if (typeof OKXFuturesExchange === 'undefined') {
    const script4 = document.createElement('script');
    script4.src = 'datasource/exchanges/OKXFuturesExchange.js';
    document.head.appendChild(script4);
}

if (typeof OKXSpotExchange === 'undefined') {
    const script5 = document.createElement('script');
    script5.src = 'datasource/exchanges/OKXSpotExchange.js';
    document.head.appendChild(script5);
}

// Exchange implementations - Bybit
if (typeof BybitFuturesExchange === 'undefined') {
    const script6 = document.createElement('script');
    script6.src = 'datasource/exchanges/BybitFuturesExchange.js';
    document.head.appendChild(script6);
}

if (typeof BybitSpotExchange === 'undefined') {
    const script7 = document.createElement('script');
    script7.src = 'datasource/exchanges/BybitSpotExchange.js';
    document.head.appendChild(script7);
}

// Multi exchange manager
if (typeof MultiExchange === 'undefined') {
    const script8 = document.createElement('script');
    script8.src = 'datasource/MultiExchange.js';
    document.head.appendChild(script8);
}

// Datafeed adapter
if (typeof MultiExchangeDatafeed === 'undefined') {
    const script9 = document.createElement('script');
    script9.src = 'datasource/MultiExchangeDatafeed.js';
    document.head.appendChild(script9);
}

/**
 * Factory function để tạo MultiExchange với các exchanges mặc định
 */
function createMultiExchange(config = {}) {
    const multiExchange = new MultiExchange();
    
    // Binance Futures
    if (config.enableBinanceFutures !== false) {
        const binanceFutures = new BinanceFuturesExchange(config.binanceFuturesOptions || {});
        multiExchange.addExchange('BINANCE_FUTURES', binanceFutures);
    }
    
    // Binance Spot
    if (config.enableBinanceSpot === true) {
        const binanceSpot = new BinanceSpotExchange(config.binanceSpotOptions || {});
        multiExchange.addExchange('BINANCE_SPOT', binanceSpot);
    }
    
    // OKX Futures
    if (config.enableOKXFutures === true) {
        const okxFutures = new OKXFuturesExchange(config.okxFuturesOptions || {});
        multiExchange.addExchange('OKX_FUTURES', okxFutures);
    }
    
    // OKX Spot
    if (config.enableOKXSpot === true) {
        const okxSpot = new OKXSpotExchange(config.okxSpotOptions || {});
        multiExchange.addExchange('OKX_SPOT', okxSpot);
    }
    
    // Bybit Futures
    if (config.enableBybitFutures === true) {
        const bybitFutures = new BybitFuturesExchange(config.bybitFuturesOptions || {});
        multiExchange.addExchange('BYBIT_FUTURES', bybitFutures);
    }
    
    // Bybit Spot
    if (config.enableBybitSpot === true) {
        const bybitSpot = new BybitSpotExchange(config.bybitSpotOptions || {});
        multiExchange.addExchange('BYBIT_SPOT', bybitSpot);
    }
    
    return multiExchange;
}

/**
 * Factory function để tạo Datafeed
 */
function createDatafeed(config = {}) {
    const multiExchange = createMultiExchange(config);
    return new MultiExchangeDatafeed(multiExchange);
}

// Export cho browser
if (typeof window !== 'undefined') {
    window.createMultiExchange = createMultiExchange;
    window.createDatafeed = createDatafeed;
}

// Export cho Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BaseExchange,
        BinanceFuturesExchange,
        BinanceSpotExchange,
        MultiExchange,
        MultiExchangeDatafeed,
        createMultiExchange,
        createDatafeed
    };
}
