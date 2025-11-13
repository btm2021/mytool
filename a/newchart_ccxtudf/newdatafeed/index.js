import BinanceUSDMDatafeed from './binance-usdm-datafeed.js';

/**
 * Tạo TradingView Datafeed cho Binance USD-M Futures
 * Đơn giản, không phức tạp
 */
export default function createDatafeed() {
    console.log('[Datafeed] Creating Binance USD-M datafeed');
    return new BinanceUSDMDatafeed();
}
