// Global widget instance
let tvWidget = null;


// Initialize TradingView
function initTradingView() {
    const widgetOptions = {
        symbol: 'BINANCE:BTCUSDT',
        datafeed: new BinanceDatafeed(),
        interval: '15',
        container: 'tv_chart_container',
        library_path: 'charting_library/',
        locale: 'vi',
        disabled_features: [
            'object_tree',
            'tradingview_logo',
            'bottom_toolbar',
            'control_bar',
            'open_account_manager',
            'trading_account_manager',
            'trading_notifications',
            'timeframes_toolbar', 'study_templates', 'use_localstorage_for_settings'
        ],
        enabled_features: [
            'items_favoriting',
            'show_symbol_logos',
            'show_symbol_logo_in_legend',
            'show_exchange_logos'
        ],
        fullscreen: false,
        autosize: true,
        theme: 'Dark',

        custom_indicators_getter: function (PineJS) {
            return Promise.resolve([
                createATRBot(PineJS),
                createVSR(PineJS),

                //  createLWMA(PineJS),
                // createMarketTrendCandles(PineJS)
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
            chartTypes: ['candles', 'lines']
        }
    };

    tvWidget = new TradingView.widget(widgetOptions);

    tvWidget.onChartReady(() => {
        const chart = tvWidget.activeChart();

        // Add watermark
        updateWatermark(chart);

        // Update watermark when symbol or interval changes
        chart.onSymbolChanged().subscribe(null, () => updateWatermark(chart));
        chart.onIntervalChanged().subscribe(null, () => updateWatermark(chart));

        hideLoading();
    });
}

function updateWatermark(chart) {
    try {
        const symbolInfo = chart.symbolExt();
        const interval = chart.resolution();

        // Format: BINANCE - BTCUSDT - 15m
        const watermarkText = `${symbolInfo.exchange} - ${symbolInfo.name} - ${interval}`;

        // Update watermark element
        let watermark = document.getElementById('chart-watermark');
        if (!watermark) {
            watermark = document.createElement('div');
            watermark.id = 'chart-watermark';
            document.getElementById('tv_chart_container').appendChild(watermark);
        }
        watermark.textContent = watermarkText;

    } catch (error) {
        console.error('Error updating watermark:', error);
    }
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

// Debug API - Check cache status
window.checkCache = function () {
    if (window.BINANCE && window.BINANCE.exchangeInfo) {
        const symbolCount = window.BINANCE.exchangeInfo.symbols ? window.BINANCE.exchangeInfo.symbols.length : 0;
        const lastFetch = window.BINANCE.lastFetch ? new Date(window.BINANCE.lastFetch).toLocaleString() : 'Never';
        const age = window.BINANCE.lastFetch ? Math.round((Date.now() - window.BINANCE.lastFetch) / 1000) : 0;

        console.log('=== BINANCE Cache Status ===');
        console.log('Symbols cached:', symbolCount);
        console.log('Last fetch:', lastFetch);
        console.log('Cache age:', age, 'seconds');
        console.log('Cache valid:', age < 300 ? 'Yes' : 'No (expired)');

        return {
            symbolCount,
            lastFetch,
            cacheAge: age,
            isValid: age < 300
        };
    } else {
        console.log('No cache available');
        return null;
    }
};

// Debug API - Clear cache
window.clearCache = function () {
    if (window.BINANCE) {
        window.BINANCE.exchangeInfo = null;
        window.BINANCE.lastFetch = null;
        console.log('Cache cleared');
    }
};
