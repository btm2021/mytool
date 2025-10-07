let tvWidget = null;
let saveLoadEngine = null;

// Khởi tạo SaveLoad Engine
function initSaveLoadEngine() {
    try {
        // Kiểm tra xem createSaveLoadEngine có tồn tại không
        if (typeof window.createSaveLoadEngine !== 'function') {
            throw new Error('createSaveLoadEngine function not found');
        }

        // Tạo SaveLoad Engine instance
        saveLoadEngine = window.createSaveLoadEngine({
            userId: 'btm', // Set user ID để hỗ trợ save/load
            autoSave: true,
            autoSaveDelay: 1000, // 8 giây
            pocketbaseUrl: 'https://crypto.pockethost.io'
        });

        console.log('✅ SaveLoad Engine initialized successfully');
        return saveLoadEngine;

    } catch (error) {
        console.error('❌ Failed to initialize SaveLoad Engine:', error);
        return null;
    }
}

async function initChart(symbol = 'BTCUSDT') {
    // Khởi tạo SaveLoad Engine trước
    initSaveLoadEngine();

    const widgetOptions = {
        symbol: symbol,
        datafeed: DatafeedManager,
        interval: '15',
        container: 'tv_chart_container',
        library_path: 'charting_library/',
        locale: 'vi',
        disabled_features: [],
        enabled_features: [
            'side_toolbar_in_fullscreen_mode',
            'header_symbol_search',
            'study_templates'
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

    // Thêm SaveLoad adapter nếu đã khởi tạo thành công
    if (saveLoadEngine) {
        widgetOptions.save_load_adapter = saveLoadEngine;
        console.log('✅ SaveLoad adapter attached to TradingView widget');
        console.log('SaveLoad adapter methods:', Object.keys(saveLoadEngine));
    } else {
        console.warn('⚠️ SaveLoad Engine not initialized, save/load features will not work');
    }

    tvWidget = new TradingView.widget(widgetOptions);

    tvWidget.onChartReady(() => {
        console.log('📊 Chart is ready');

        // Test SaveLoad adapter
        if (saveLoadEngine) {
            console.log('🧪 Testing SaveLoad adapter functions...');
            console.log('canSaveChart:', saveLoadEngine.canSaveChart());
            console.log('canLoadChart:', saveLoadEngine.canLoadChart());
            console.log('getDefaultChartName:', saveLoadEngine.getDefaultChartName());
        }

        if (typeof createCustomIndicators === 'function') {
            tvWidget.activeChart().createStudy('ATR Trailing Stop', false, false, {
                atr_length: 14,
                atr_mult: 2.0,
                ema_length: 30
            });
        }
    });
}

// Expose functions for manual testing
window.testSave = function () {
    if (tvWidget && saveLoadEngine) {
        console.log('🧪 Manual save test...');
        tvWidget.save((chartData) => {
            console.log('Chart data from widget:', chartData);
            saveLoadEngine.saveChartToServer(chartData)
                .then(result => console.log('Save result:', result))
                .catch(error => console.error('Save error:', error));
        });
    } else {
        console.error('Widget or SaveLoad engine not available');
    }
};

window.testLoad = function () {
    if (saveLoadEngine) {
        console.log('🧪 Manual load test...');
        saveLoadEngine.getAllCharts()
            .then(charts => {
                console.log('Available charts:', charts);
                if (charts.length > 0) {
                    return saveLoadEngine.loadChartFromServer(charts[0].id);
                }
            })
            .then(chartData => {
                if (chartData) {
                    console.log('Loaded chart data:', chartData);
                }
            })
            .catch(error => console.error('Load error:', error));
    }
};

window.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 Checking dependencies...');
    console.log('PocketBase available:', typeof window.PocketBase);
    console.log('createSaveLoadEngine available:', typeof window.createSaveLoadEngine);
    console.log('TradingView available:', typeof window.TradingView);

    initChart();

    // Expose for debugging
    setTimeout(() => {
        window.tvWidget = tvWidget;
        window.saveLoadEngine = saveLoadEngine;
        console.log('🔧 Debug: tvWidget and saveLoadEngine exposed to window');
        console.log('🔧 Try: testSave() or testLoad() in console');
    }, 3000);
});
