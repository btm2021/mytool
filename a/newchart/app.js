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
        load_last_chart:true,
        // Save/Load Adapter for localStorage
        save_load_adapter: saveLoadAdapter.getAdapter(),
        
        // Auto-save interval (5 seconds)
        auto_save_delay: 0.1,

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
            chartTypes: ['Candles', 'Line', 'Heiken Ashi']
        }
    };

    tvWidget = new TradingView.widget(widgetOptions);

    tvWidget.onChartReady(() => {
        const chart = tvWidget.activeChart();

        // Setup watermark
        setupWatermark(tvWidget, chart);

        // Setup auto-save on drawing completion
        setupAutoSaveOnDrawing(tvWidget, chart);

        hideLoading();
    });
}

function setupAutoSaveOnDrawing(widget, chart) {
    let saveTimeout = null;
    let isDrawing = false;
    let lastShapeCount = 0;

    const triggerSave = (reason) => {
        // Debounce save
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        saveTimeout = setTimeout(() => {
            try {
                widget.save((state) => {
                    console.log(`[Auto-Save] Chart saved - Reason: ${reason}`);
                });
            } catch (error) {
                console.error('[Auto-Save] Error saving chart:', error);
            }
        }, 50); // 500ms debounce
    };

    try {
        // Monitor drawing tool selection
        chart.onSelectedLineToolChanged().subscribe(null, (toolName) => {
            if (toolName && toolName !== '') {
                isDrawing = true;
                console.log(`[Auto-Save] Drawing tool selected: ${toolName}`);
            } else {
                // Tool deselected - drawing might be complete
                if (isDrawing) {
                    isDrawing = false;
                    console.log('[Auto-Save] Drawing tool deselected');
                    triggerSave('Drawing tool deselected');
                }
            }
        });

        // Listen for shape/drawing added (vẽ xong)
        chart.onShapeAdded().subscribe(null, (shapeId) => {
            console.log(`[Auto-Save] Shape added: ${shapeId}`);
            triggerSave('Shape added');
        });

        // Listen for shape/drawing removed
        chart.onShapeRemoved().subscribe(null, (shapeId) => {
            console.log(`[Auto-Save] Shape removed: ${shapeId}`);
            triggerSave('Shape removed');
        });

        // Listen for shape/drawing changed (di chuyển, resize)
        chart.onShapeChanged().subscribe(null, (shapeId) => {
            console.log(`[Auto-Save] Shape changed: ${shapeId}`);
            triggerSave('Shape changed');
        });

        // Listen for study (indicator) added
        chart.onStudyAdded().subscribe(null, (studyId) => {
            console.log(`[Auto-Save] Study added: ${studyId}`);
            triggerSave('Study added');
        });

        // Listen for study removed
        chart.onStudyRemoved().subscribe(null, (studyId) => {
            console.log(`[Auto-Save] Study removed: ${studyId}`);
            triggerSave('Study removed');
        });

        // Listen for interval changes
        chart.onIntervalChanged().subscribe(null, (interval) => {
            console.log(`[Auto-Save] Interval changed to: ${interval}`);
            triggerSave('Interval changed');
        });

        // Listen for symbol changes
        chart.onSymbolChanged().subscribe(null, () => {
            console.log('[Auto-Save] Symbol changed');
            triggerSave('Symbol changed');
        });

        // Detect drawing completion via mouseup on chart
        const chartContainer = document.getElementById('tv_chart_container');
        if (chartContainer) {
            chartContainer.addEventListener('mouseup', () => {
                if (isDrawing) {
                    // Check if shape count increased
                    const currentShapes = chart.getAllShapes();
                    if (currentShapes.length > lastShapeCount) {
                        console.log('[Auto-Save] Drawing completed (mouseup)');
                        triggerSave('Drawing completed');
                        lastShapeCount = currentShapes.length;
                    }
                }
            });

            // Update shape count periodically
            setInterval(() => {
                try {
                    lastShapeCount = chart.getAllShapes().length;
                } catch (e) {
                    // Ignore errors
                }
            }, 1000);
        }

        console.log('[Auto-Save] Auto-save listeners initialized successfully');
    } catch (error) {
        console.error('[Auto-Save] Error setting up auto-save:', error);
    }
}

function setupWatermark(widget, chart) {
    try {
        // Get watermark API
        const watermark = widget.watermark();

        // Configure watermark color (màu trắng mờ)
        watermark.color().setValue('rgba(255, 255, 255, 0.08)');

        // Set custom content provider - trả về array of WatermarkLine
        const updateWatermarkContent = () => {
            watermark.setContentProvider(() => {
                try {
                    const symbolInfo = chart.symbolExt();
                    const interval = chart.resolution();
                    
                    // Return array of WatermarkLine objects
                    return [
                        {
                            text: `${symbolInfo.exchange} - ${symbolInfo.name}`,
                            fontSize: 48,
                            lineHeight: 56,
                            verticalOffset: 0
                        },
                        {
                            text: `Timeframe: ${interval}`,
                            fontSize: 32,
                            lineHeight: 40,
                            verticalOffset: 60
                        }
                    ];
                } catch (error) {
                    console.error('Error in watermark content provider:', error);
                    return [
                        {
                            text: '',
                            fontSize: 48,
                            lineHeight: 56,
                            verticalOffset: 0
                        }
                    ];
                }
            });
        };

        // Initial setup
        updateWatermarkContent();

        // Update watermark when symbol or interval changes
        chart.onSymbolChanged().subscribe(null, updateWatermarkContent);
        chart.onIntervalChanged().subscribe(null, updateWatermarkContent);

    } catch (error) {
        console.error('Error setting up watermark:', error);
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

// Debug API - Test search
window.testSearch = function (query) {
    if (tvWidget && tvWidget._options && tvWidget._options.datafeed) {
        const manager = tvWidget._options.datafeed;
        console.log(`\n=== Testing search: "${query}" ===`);
        manager.searchSymbols(query, '', 'crypto', (results) => {
            console.log(`Found ${results.length} results:`);
            results.slice(0, 10).forEach((r, i) => {
                console.log(`${i + 1}. ${r.full_name} - ${r.description}`);
            });
        });
    }
};
