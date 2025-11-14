// Global widget instance
let tvWidget = null;

// Initialize Multi-Datafeed Manager
async function initDatafeedManager() {
    const manager = new DatafeedManager();

    // Register Binance Futures (default)
    manager.registerDatasource(
        new BinanceFuturesDatasource(),
        true
    );

    // Register Binance Spot
    manager.registerDatasource(
        new BinanceSpotDatasource()
    );

    // Register OKX Futures
    manager.registerDatasource(
        new OKXFuturesDatasource()
    );

    // Register OKX Spot
    manager.registerDatasource(
        new OKXSpotDatasource()
    );

    // Register Bybit Futures
    manager.registerDatasource(
        new BybitFuturesDatasource()
    );

    // Register Bybit Spot
    manager.registerDatasource(
        new BybitSpotDatasource()
    );

    // Register MEXC Futures
    manager.registerDatasource(
        new MEXCFuturesDatasource()
    );

    // Register MEXC Spot
    manager.registerDatasource(
        new MEXCSpotDatasource()
    );

    // Register KuCoin Futures
    manager.registerDatasource(
        new KuCoinFuturesDatasource()
    );

    // Register KuCoin Spot
    manager.registerDatasource(
        new KuCoinSpotDatasource()
    );


    // Register OANDA
    manager.registerDatasource(
        new OANDADatasource()
    );

    // Initialize - fetch tất cả exchangeInfo một lần
    await manager.initialize();

    return manager;
}

// Initialize TradingView
async function initTradingView() {
    const datafeedManager = await initDatafeedManager();
    const saveLoadAdapter = new SaveLoadAdapter();

    const widgetOptions = {
        symbol: 'BINANCE:BTCUSDT',
        datafeed: datafeedManager,
        interval: '15',
        container: 'tv_chart_container',
        library_path: 'charting_library/',
        locale: 'vi',
        disabled_features: [
            'show_object_tree',
            'popup_hints',
            'tradingview_logo',
            'bottom_toolbar',
            'control_bar',
            'open_account_manager',
            'trading_account_manager',
            'trading_notifications',
            'timeframes_toolbar'
        ],
        enabled_features: [
            'items_favoriting',
            'show_symbol_logos',
            'show_symbol_logo_in_legend',
            'show_exchange_logos',
            'study_templates'
        ],
        fullscreen: false,
        autosize: true,
        theme: 'Dark',
        load_last_chart: true,
        // Save/Load Adapter for localStorage
        save_load_adapter: saveLoadAdapter.getAdapter(),

        // Auto-save interval (1 second)
        auto_save_delay: 0.5,

        // Auto-save callback
        auto_save_chart_enabled: true,

        custom_indicators_getter: function (PineJS) {
            return Promise.resolve([
                createATRBot(PineJS),
                createVSR(PineJS),

            ]);
        },
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
            intervals: ['5', '15', '60', '240', 'D'],
            chartTypes: ['Candles', 'Line', 'Heiken Ashi'],

        },
        custom_css_url: '/charting_library/custom.css'
    };

    tvWidget = new TradingView.widget(widgetOptions);

    tvWidget.onChartReady(() => {

        hideLoading();
    });
    tvWidget.subscribe('onAutoSaveNeeded', () => {
        console.log('Auto-save');
        tvWidget.saveChartToServer()
    });
}



function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.add('hidden');
    setTimeout(() => overlay.style.display = 'none', 300);
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTradingView);
} else {
    initTradingView();
}

// Debug API - Get datafeed info
window.getDatafeedInfo = function () {
    if (tvWidget && tvWidget._options && tvWidget._options.datafeed) {
        const manager = tvWidget._options.datafeed;
        if (manager.getDatasources) {
            const datasources = manager.getDatasources();
            console.log('=== Datafeed Manager Info ===');
            console.log('Total datasources:', datasources.length);
            datasources.forEach((ds, index) => {
                console.log(`\n[${index + 1}] ${ds.name}`);
                console.log('  - ID:', ds.id);
                console.log('  - Exchange:', ds.exchange);
                console.log('  - Resolutions:', ds.supported_resolutions.join(', '));
            });
            return datasources;
        }
    }
    console.log('Datafeed manager not available');
    return null;
};
