let tvWidget = null;

async function initChart(symbol = 'BTCUSDT') {
    const widgetOptions = {
        symbol: symbol,
        datafeed: DatafeedManager,
        interval: '15',
        container: 'tv_chart_container',
        library_path: 'charting_library/',
        locale: 'vi',
        disabled_features: [
            'use_localstorage_for_settings'
        ],
        enabled_features: [
            'study_templates',
            'side_toolbar_in_fullscreen_mode',
            'header_symbol_search'
        ],
        fullscreen: false,
        autosize: true,
        theme: 'dark',
        timezone: 'Asia/Ho_Chi_Minh',
        custom_indicators_getter: function (PineJS) {
            return Promise.resolve(createCustomIndicators(PineJS));
        },
        overrides: {
            'mainSeriesProperties.candleStyle.upColor': '#26a69a',
            'mainSeriesProperties.candleStyle.downColor': '#ef5350',
            'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
            'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350'
        }
    };

    tvWidget = new TradingView.widget(widgetOptions);

    tvWidget.onChartReady(() => {
        console.log('Chart ready');

        if (typeof createCustomIndicators === 'function') {
            tvWidget.activeChart().createStudy('ATR Trailing Stop', false, false, {
                atr_length: 14,
                atr_mult: 2.0,
                ema_length: 30
            });

            // tvWidget.activeChart().createStudy('VSR - Volume Support Resistance', false, false, {
            //     vsr_length: 10,
            //     vsr_threshold: 10.0,
            //     show_vsr: true
            // });

            console.log('Custom indicators loaded');
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initChart();
});
