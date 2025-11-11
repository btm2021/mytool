import createTradingViewDatafeed from './datafeed/index.js';

let tvWidget = null;





// Initialize TradingView
async function initTradingView() {
    // Show loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    const progressFill = document.getElementById('progress-fill');
    const loadingStatus = document.getElementById('loading-status');

    // ============ API KEYS ============

    // OANDA API Configuration
    // Lấy API key và Account ID từ: https://www.oanda.com/account/tpa/personal_token
    const OANDA_API_KEY = '3913aaef1f74de9e87b329ba62b12c7d-88afda77afc903099c1e33bcca74246c';  // Thay bằng API key của bạn
    const OANDA_ACCOUNT_ID = '101-004-27015242-001';  // Thay bằng Account ID của bạn

    // Khởi tạo Datafeed với kiến trúc mới
    const datafeed = createTradingViewDatafeed({
        binanceSpot: {},
        binanceUSDM: {},
        okxSpot: {},
        okxFutures: {},
        bybitSpot: {},
        bybitFutures: {},
        oanda: {
            apiKey: OANDA_API_KEY,
            accountId: OANDA_ACCOUNT_ID,
            practice: true
        }
    });

    // Load all symbols với progress tracking
    try {
        loadingStatus.textContent = 'Initializing...';

        // Access internal manager để load symbols
        const manager = datafeed._manager || datafeed;

        await manager.loadAllSymbols((completed, total, message) => {
            const progress = (completed / total) * 100;
            progressFill.style.width = `${progress}%`;
            loadingStatus.textContent = message;
        });

        loadingStatus.textContent = 'Loading complete!';
        progressFill.style.width = '100%';

        // Hide loading overlay sau 500ms
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
        }, 500);
    } catch (error) {
        console.error('Error loading symbols:', error);
        loadingStatus.textContent = 'Error loading symbols. Retrying...';
    }

    // Khởi tạo LocalStorage Save/Load Adapter
    const saveLoadAdapter = new LocalStorageSaveLoadAdapter();

    const widgetOptions = {
        symbol_search_request_delay: 0,
        symbol: 'BINANCE:BTCUSDT',
        datafeed: datafeed,
        interval: '15',
        container: 'tv_chart_container',
        library_path: 'charting_library/',
        locale: 'vi',
        timezone: 'Asia/Bangkok',   // <--- Đặt trực tiếp UTC+7

        disabled_features: [
            'object_tree',
            'tradingview_logo',
            'bottom_toolbar',
            'control_bar',
            'open_account_manager',
            'trading_account_manager',
            'trading_notifications',
        ],
        enabled_features: [
            'studies_extend_time_scale',
            'items_favoriting',
            'use_localstorage_for_settings',
            'trading_account_manager',
            'chart_hide_close_order_button',
            'saveload_separate_drawings_storage',
        ],
        fullscreen: false,
        autosize: true,
        theme: 'Dark',

        // Save/Load configuration với LocalStorage
        save_load_adapter: saveLoadAdapter,
        auto_save_delay: 5,
        load_last_chart: false,  // Tắt để test

        // Custom indicators
        custom_indicators_getter: function (PineJS) {
            return Promise.resolve([
                createATRBot(PineJS),
                createVSR(PineJS),
                // createVSR_HTF(PineJS),
                createLWMA(PineJS),
                createMarketTrendCandles(PineJS)
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
            intervals: ['1', '5', '15', '30', '60', '240', 'D'],
            chartTypes: ['candles', 'lines'],
        },
    };

    tvWidget = new TradingView.widget(widgetOptions);


    // tvWidget.onChartReady(() => {
    //     const realChart = tvWidget.chart?.();
    //     console.log(realChart);
    //     realChart._crosshairMoved.subscribe(null, (param) => {
    //         if (!param) return;
    //         console.log('🎯 Crosshair moved:', param);
    //     });
    //     console.log('✅ Widget & Chart are fully initialized!');


    // });

    // tvWidget.onChartReady(() => {
    //     const realChart = tvWidget.chart?.();
    //     const chart = tvWidget.activeChart();

    //     let crosshairLine = null;

    //     console.log(crosshairLine)

    //     realChart._crosshairMoved.subscribe(null, (param) => {
    //         let {time}=param
    //         if (!crosshairLine) {

    //             crosshairLine = chart.createMultipointShape(
    //                 [{ time, price: 0 }, { time, price: 1 }],
    //                 {
    //                     shape: 'trend_line',
    //                     disableSelection: true,
    //                     disableSave: true,
    //                     overrides: {
    //                         color: '#00FF00',
    //                         linewidth: 1,
    //                     },
    //                 }
    //             );

    //         }else{
    //             crosshairLine.setPoints([
    //                 { time: param.time, price: 0 },
    //                 { time: param.time, price: 1 },
    //             ]); 
    //         }
    //        // console.log(param)

    //         // cập nhật tọa độ line theo time
    //         // crosshairLine.setPoints([
    //         //     { time, price: 0 },
    //         //     { time, price: 1 },
    //         // ]);
    //     });

    //     // Xoá line nếu chart bị destroy

    // });
    // tvWidget.onChartReady(() => {
    //     const realChart = tvWidget.chart();           // internal (class ke) - bạn đã có
    //     const chart = tvWidget.activeChart();         // public IChartWidgetApi

    //     let lineId = null;
    //     let lineApi = null; // ILineDataSourceApi

    //     realChart._crosshairMoved.subscribe(null, async (param) => {
    //         if (!param?.time) return;

    //         // 1) tạo lần đầu
    //         if (!lineId) {
    //             lineId = await chart.createShape(
    //                 { time: param.time },                   // 1 điểm => vertical_line
    //                 {
    //                     shape: 'vertical_line',
    //                     disableSelection: true,
    //                     disableSave: true,
    //                     // overrides: { color: '#FF0000', linewidth: 1 } // tùy chọn
    //                 }
    //             ); // <- Promise resolves to drawing ID (not an object)
    //             lineApi = chart.getShapeById(lineId);     // lấy ILineDataSourceApi
    //             return;
    //         }

    //         // 2) cập nhật vị trí khi crosshair di chuyển
    //         // setPoints luôn nhận mảng point, với vertical_line là mảng 1 phần tử
    //         lineApi.setPoints([{ time: param.time }]);
    //     });
    // });
    // tvWidget.onChartReady(() => {
    //   const realChart = tvWidget.chart();
    //   const chart = tvWidget.activeChart();

    //   let lineId = null;
    //   let lineApi = null;
    //   let zoneId = null;
    //   let zoneApi = null;

    //   realChart._crosshairMoved.subscribe(null, async (param) => {
    //     if (!param?.time) return;

    //     const time = param.time;
    //     const visibleRange = chart.getVisibleRange();
    //     if (!visibleRange?.to) return;
    //     const lastTime = visibleRange.to;

    //     // Lấy khoảng giá hiện tại để mở rộng rectangle
    //     const priceRange = chart.getVisiblePriceRange();
    //     if (!priceRange) return;
    //     const bottom = priceRange.from - (priceRange.to - priceRange.from) * 3;
    //     const top = priceRange.to + (priceRange.to - priceRange.from) * 3;

    //     // 1️⃣ Vertical line
    //     if (!lineId) {
    //       lineId = await chart.createShape(
    //         { time },
    //         {
    //           shape: 'vertical_line',
    //           disableSelection: true,
    //           disableSave: true,
    //           lock: true,
    //           overrides: {
    //             color: '#00FF00',
    //             linewidth: 1,
    //           },
    //         }
    //       );
    //       lineApi = chart.getShapeById(lineId);
    //     }

    //     // 2️⃣ Rectangle zone
    //     if (!zoneId) {
    //       zoneId = await chart.createMultipointShape(
    //         [
    //           { time: time, price: bottom },
    //           { time: lastTime, price: top },
    //         ],
    //         {
    //           shape: 'rectangle',
    //           disableSelection: true,
    //           disableSave: true,
    //           lock: true,
    //           overrides: {
    //             color: '#00FF00',
    //             backgroundColor: 'rgba(0,255,0,0.15)',
    //             transparency: 70,
    //             linewidth: 1,
    //             zOrder: 'bottom',
    //           },
    //         }
    //       );
    //       zoneApi = chart.getShapeById(zoneId);
    //     }

    //     // 3️⃣ Update positions
    //     if (lineApi) lineApi.setPoints([{ time }]);
    //     if (zoneApi)
    //       zoneApi.setPoints([
    //         { time: time, price: bottom },
    //         { time: lastTime, price: top },
    //       ]);
    //   });
    // });

    tvWidget.onChartReady(() => {
        const chart = tvWidget.activeChart();
        const realChart = tvWidget.chart();

        let isReplay = false;
        let lineId = null;
        let lineApi = null;
        let zoneId = null;
        let zoneApi = null;
        let crosshairHandler = null;
        let clickHandler = null;

        // 🟩 1️⃣ Nút Replay trong toolbar
        const replayButton = tvWidget.createButton({ align: 'left' });
        replayButton.textContent = '🎬 Replay';
        replayButton.title = 'Toggle Replay Mode';
        replayButton.style.fontWeight = 'bold';
        replayButton.style.cursor = 'pointer';
        replayButton.style.color = '#00FF00';
        replayButton.style.padding = '4px 10px';

        const reflect = () => {
            replayButton.style.color = isReplay ? '#FF4444' : '#00FF00';
        };

        // 🟩 2️⃣ Hàm bật Replay
        const enableReplay = () => {
            if (isReplay) return;
            isReplay = true;
            reflect();

            console.log('▶️ Replay mode ON');

            // --- Crosshair moved ---
            crosshairHandler = async (param) => {
                if (!param?.time) return;

                const time = param.time;
                const visibleRange = chart.getVisibleRange();
                if (!visibleRange?.to) return;
                const lastTime = visibleRange.to;

                // Lấy khoảng giá hiện tại để mở rộng rectangle
                const priceRange = chart.getVisiblePriceRange();
                if (!priceRange) return;

                const span = priceRange.to - priceRange.from;
                const bottom = priceRange.from - span * 3;
                const top = priceRange.to + span * 3;

                // 1️⃣ Vertical line
                if (!lineId) {
                    lineId = await chart.createShape(
                        { time },
                        {
                            shape: 'vertical_line',
                            disableSelection: true,
                            disableSave: true,
                            lock: true,
                            overrides: {
                                color: '#00FF00',
                                linewidth: 1,
                            },
                        }
                    );
                    lineApi = chart.getShapeById(lineId);
                }

                // 2️⃣ Rectangle zone (vùng xanh bên phải)
                if (!zoneId) {
                    zoneId = await chart.createMultipointShape(
                        [
                            { time: time, price: bottom },
                            { time: lastTime, price: top },
                        ],
                        {
                            shape: 'rectangle',
                            disableSelection: true,
                            disableSave: true,
                            lock: true,
                            overrides: {
                                color: '#00FF00',
                                backgroundColor: 'rgba(0,255,0,0.15)',
                                transparency: 70,
                                linewidth: 1,
                                zOrder: 'bottom',
                            },
                        }
                    );
                    zoneApi = chart.getShapeById(zoneId);
                }

                // 3️⃣ Cập nhật vị trí khi crosshair di chuyển
                if (lineApi) lineApi.setPoints([{ time }]);
                if (zoneApi)
                    zoneApi.setPoints([
                        { time: time, price: bottom },
                        { time: lastTime, price: top },
                    ]);
            };

            // Gắn listener crosshair
            realChart._crosshairMoved.subscribe(null, crosshairHandler);

            // --- Click detection (internal delegate) ---
            if (realChart._clicked) {
                clickHandler = (param) => {
                    console.log(param)
                    if (!param?.time || !param?.price) return;
                    console.log('🖱️ Clicked:', {
                        time: param.time,
                        price: param.price,
                        x: param.point?.x,
                        y: param.point?.y,
                    });
                };
                realChart._clicked.subscribe(null, clickHandler);
            } else {
                console.warn('⚠️ realChart._clicked not available in this build');
            }
        };

        // 🟥 3️⃣ Hàm tắt Replay
        const disableReplay = () => {
            if (!isReplay) return;
            isReplay = false;
            reflect();

            console.log('⏹️ Replay mode OFF');

            if (crosshairHandler) {
                try {
                    realChart._crosshairMoved.unsubscribe(crosshairHandler);
                } catch { }
                crosshairHandler = null;
            }

            if (clickHandler && realChart._clicked) {
                try {
                    realChart._clicked.unsubscribe(clickHandler);
                } catch { }
                clickHandler = null;
            }

            lineId = zoneId = null;
            lineApi = zoneApi = null;
        };

        // 🟦 Toggle button
        replayButton.addEventListener('click', () => {
            if (isReplay) disableReplay();
            else enableReplay();
        });
    });


}


// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTradingView);
} else {
    initTradingView();
}
