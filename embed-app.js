let tvWidget = null;

async function initDatafeedManager() {
    const manager = new DatafeedManager();
    manager.registerDatasource(new OANDADatasource(), true);
    manager.registerDatasource(new BinanceFuturesDatasource());
    await manager.initialize();
    return manager;
}

async function initTradingView() {
    const datafeedManager = await initDatafeedManager();
    const saveLoadAdapter = new SaveLoadAdapter();

    const widgetOptions = {
        symbol: 'OANDA:XAUUSD',
        datafeed: datafeedManager,
        interval: '15',
        container: 'tv_chart_container',
        library_path: 'charting_library/',
        locale: 'vi',
        disabled_features: [
         
            'timeframes_toolbar',
            'show_object_tree',
            'popup_hints',
            'bottom_toolbar',
            'control_bar',
            'open_account_manager',
            'trading_account_manager',
            'trading_notifications'
        ],
        enabled_features: [
               'header_widget',
            'items_favoriting',
            'show_symbol_logos',
            'show_symbol_logo_in_legend',
            'show_exchange_logos',
            'study_templates',
            'side_toolbar_in_fullscreen_mode',
            'iframe_loading_compatibility_mode'
        ],
        theme: 'light',
        fullscreen: false,
        autosize: true,
        load_last_chart: true,
        save_load_adapter: saveLoadAdapter.getAdapter(),
        auto_save_delay: 0.5,
        auto_save_chart_enabled: true,
        widgetbar: {
            details: false,
            watchlist: false,
            datawindow: false,
            news: false
        },
        favorites: {
            intervals: ['1', '15', '60', '240'],
            chartTypes: ['Candles', 'Line']
        },
         custom_indicators_getter: function (PineJS) {
            return Promise.resolve([
                createATRBot(PineJS),
                createVSR(PineJS),

            ]);
        },
      
    };

    tvWidget = new TradingView.widget(widgetOptions);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTradingView);
} else {
    initTradingView();
}

window.embedWidget = {
    setSymbol: function(symbol) {
        if (tvWidget) {
            tvWidget.activeChart().setSymbol(symbol);
        }
    },
    setInterval: function(interval) {
        if (tvWidget) {
            tvWidget.activeChart().setResolution(interval);
        }
    }
};
