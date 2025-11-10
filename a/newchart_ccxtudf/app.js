// NOTE: MultiExchangeDatafeed đã được tách ra thành module riêng
// Xem: datasource/MultiExchangeDatafeed.js, datasource/MultiExchange.js
// và các exchange implementations trong datasource/exchanges/

// Global widget instance
let tvWidget = null;

// API to change symbol
window.changeSymbol = function (symbol, exchange = 'BINANCE_FUTURES') {
    if (tvWidget && tvWidget.chart) {
        const fullSymbol = `${exchange}:${symbol}`;
        tvWidget.chart().setSymbol(fullSymbol, () => { });
    }
};




// Initialize TradingView
function initTradingView() {

    // Khởi tạo Datafeed với MultiExchange architecture
    const datafeed = createDatafeed({
        // Binance
        enableBinanceFutures: true,
        enableBinanceSpot: true,
        binanceFuturesOptions: {},
        binanceSpotOptions: {},
        
        // OKX
        enableOKXFutures: true,
        enableOKXSpot: true,
        okxFuturesOptions: {},
        okxSpotOptions: {},
        
        // Bybit
        enableBybitFutures: true,
        enableBybitSpot: true,
        bybitFuturesOptions: {},
        bybitSpotOptions: {}
    });

    const widgetOptions = {
        symbol: 'BINANCE_FUTURES:BTCUSDT',
        datafeed: datafeed,
        interval: '15',
        container: 'tv_chart_container',
        library_path: 'charting_library/',
        locale: 'vi',
        disabled_features: [
            'object_tree', 'tradingview_logo',
            'bottom_toolbar',
            'control_bar', 'open_account_manager', 'trading_account_manager',
            'trading_notifications',
          
            'study_templates'
        ],
        enabled_features: [
            'studies_extend_time_scale',
            'show_symbol_logos',
            'items_favoriting',
            'use_localstorage_for_settings',
            'show_symbol_logo_in_legend',

            'use_localstorage_for_settings',
            'trading_account_manager',
            'chart_hide_close_order_button',

        ],
        fullscreen: false,
        autosize: true,
        theme: 'Dark',


        // Custom indicators
        // custom_indicators_getter: function (PineJS) {
        //     return Promise.resolve([
        //         createATRBot(PineJS),
        //         createVSR(PineJS),
        //         createVSR_HTF(PineJS),
        //         createLWMA(PineJS),
        //         createMarketTrendCandles(PineJS)
        //     ]);
        // },

        widgetbar: {
            details: false,
            watchlist: false,
            watchlist_settings: {
                readonly: false
            },
            datawindow: false,
            news: false
        },
        favorites: {
            intervals: ['1', '3', '5', '15', '30', '60', '240', 'D'], // 5m, 15m, 1h, 4h
            chartTypes: ['candles', 'lines'], // tùy chọn thêm nếu muốn
        },
    };

    tvWidget = new TradingView.widget(widgetOptions);

}


// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTradingView);
} else {
    initTradingView();
}
