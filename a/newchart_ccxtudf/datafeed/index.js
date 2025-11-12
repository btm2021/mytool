import DataFeedManager from './DataFeedManager.js';
import BinanceSpotDataSource from './sources/BinanceSpotDataSource.js';
import BinanceFuturesDataSource from './sources/BinanceFuturesDataSource.js';
import BybitSpotDataSource from './sources/BybitSpotDataSource.js';
import BybitFuturesDataSource from './sources/BybitDataSource.js';
import OKXSpotDataSource from './sources/OKXSpotDataSource.js';
import OKXFuturesDataSource from './sources/OKXDataSource.js';
import OandaDataSource from './sources/OandaDataSource.js';
import IGDataSource from './sources/IGDataSource.js';
import { CONFIG } from '../config.js';

/**
 * Khởi tạo và cấu hình DataFeed Manager
 * @param {Object} config - Configuration object
 * @returns {DataFeedManager}
 */
export function createDataFeed(config = {}) {
    const manager = new DataFeedManager();

    // Binance Spot
    const binanceSpot = new BinanceSpotDataSource(config.binanceSpot || {});
    manager.registerDataSource('binanceSpot', binanceSpot, ['BINANCE:*']);

    // Binance USDⓈ-M Futures
    const binanceUSDM = new BinanceFuturesDataSource(config.binanceUSDM || {});
    manager.registerDataSource('binanceUSDM', binanceUSDM, ['BINANCEUSDM:*']);

    // OKX Spot
    const okxSpot = new OKXSpotDataSource(config.okxSpot || {});
    manager.registerDataSource('okxSpot', okxSpot, ['OKXSPOT:*']);

    // OKX Futures
    const okxFutures = new OKXFuturesDataSource(config.okxFutures || {});
    manager.registerDataSource('okxFutures', okxFutures, ['OKXFUTURES:*']);

    // Bybit Spot
    const bybitSpot = new BybitSpotDataSource(config.bybitSpot || {});
    manager.registerDataSource('bybitSpot', bybitSpot, ['BYBITSPOT:*']);

    // Bybit Futures
    const bybitFutures = new BybitFuturesDataSource(config.bybitFutures || {});
    manager.registerDataSource('bybitFutures', bybitFutures, ['BYBITFUTURES:*']);

    // OANDA Forex
    if (config.oanda && config.oanda.apiKey && config.oanda.accountId) {
        const oanda = new OandaDataSource(config.oanda);
        manager.registerDataSource('oanda', oanda, ['OANDA:*']);
    }

    // IG Markets Forex - use config from config.js
    const igConfig = config.ig || CONFIG.ig;
    if (igConfig && igConfig.apiKey && igConfig.username && igConfig.password) {
        const ig = new IGDataSource(igConfig);
        manager.registerDataSource('ig', ig, ['IG:*']);
    }

    return manager;
}

/**
 * Export để sử dụng với TradingView widget
 */
export function createTradingViewDatafeed(config = {}) {
    const manager = createDataFeed(config);

    const datafeed = {
        _manager: manager, // Expose manager để access từ app.js
        loadAllSymbols: (onProgress) => manager.loadAllSymbols(onProgress),
        onReady: (callback) => manager.onReady(callback),
        searchSymbols: (userInput, exchange, symbolType, onResult) => 
            manager.searchSymbols(userInput, exchange, symbolType, onResult),
        resolveSymbol: (symbolName, onResolve, onError) => 
            manager.resolveSymbol(symbolName, onResolve, onError),
        getBars: (symbolInfo, resolution, periodParams, onResult, onError) => 
            manager.getBars(symbolInfo, resolution, periodParams, onResult, onError),
        subscribeBars: (symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) => 
            manager.subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback),
        unsubscribeBars: (listenerGuid) => 
            manager.unsubscribeBars(listenerGuid)
    };

    return datafeed;
}

export { DataFeedManager };
export default createTradingViewDatafeed;
