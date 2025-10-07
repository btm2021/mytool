// Global variables for WebSocket data
let globalMarkPriceData = {}; // Realtime mark price from WebSocket
let global24hrData = {}; // 24hr ticker data
let globalSymbolPrices = {}; // All symbol prices for precision calculation
let markPriceWs = null; // WebSocket connection
let ticker24hrInterval = null; // Interval for refreshing 24hr data
let isGlobalDataReady = false; // Flag to check if global data is loaded

// Datafeed for Binance Futures only
class MultiExchangeDatafeed {
    constructor() {
        this.subscribers = {};
        this.quoteSubscribers = {};
        this.exchanges = ['BINANCE'];

        // Initialize WebSocket and 24hr data on construction
        this.initializeGlobalData();
    }

    // Initialize WebSocket and 24hr data
    async initializeGlobalData() {
        // Fetch all symbol prices first (for precision calculation)
        await this.fetchAllSymbolPrices();

        // Connect to Binance mark price WebSocket
        this.connectMarkPriceWebSocket();

        // Fetch 24hr data immediately
        await this.fetch24hrData();

        // Mark global data as ready
        isGlobalDataReady = true;

        // Refresh 24hr data every 5 minutes
        ticker24hrInterval = setInterval(() => {
            this.fetch24hrData();
        }, 5 * 60 * 1000);
    }

    // Fetch all symbol prices at once
    async fetchAllSymbolPrices() {
        try {
            const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/price');
            const data = await response.json();

            // Store all prices in global variable
            data.forEach(item => {
                globalSymbolPrices[item.symbol] = parseFloat(item.price);
            });
        } catch (error) {
            console.error('Error fetching all symbol prices:', error);
        }
    }

    // Connect to Binance mark price WebSocket
    connectMarkPriceWebSocket() {
        if (markPriceWs) {
            markPriceWs.close();
        }

        markPriceWs = new WebSocket('wss://fstream.binance.com/ws/!markPrice@arr@1s');

        markPriceWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (Array.isArray(data)) {
                    // Update global mark price data
                    data.forEach(item => {
                        globalMarkPriceData[item.s] = {
                            symbol: item.s,
                            markPrice: parseFloat(item.p),
                            indexPrice: parseFloat(item.i),
                            fundingRate: parseFloat(item.r),
                            nextFundingTime: item.T,
                            time: item.E
                        };
                    });
                }
            } catch (error) {
                console.error('Error parsing mark price data:', error);
            }
        };

        markPriceWs.onerror = (error) => {
            console.error('Mark price WebSocket error:', error);
        };

        markPriceWs.onclose = () => {
            setTimeout(() => this.connectMarkPriceWebSocket(), 5000);
        };
    }

    // Fetch 24hr ticker data
    async fetch24hrData() {
        try {
            const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
            const data = await response.json();

            // Update global 24hr data
            data.forEach(item => {
                global24hrData[item.symbol] = {
                    symbol: item.symbol,
                    priceChange: parseFloat(item.priceChange),
                    priceChangePercent: parseFloat(item.priceChangePercent),
                    lastPrice: parseFloat(item.lastPrice),
                    openPrice: parseFloat(item.openPrice),
                    highPrice: parseFloat(item.highPrice),
                    lowPrice: parseFloat(item.lowPrice),
                    volume: parseFloat(item.volume),
                    quoteVolume: parseFloat(item.quoteVolume),
                    openTime: item.openTime,
                    closeTime: item.closeTime,
                    count: item.count
                };
            });
        } catch (error) {
            console.error('Error fetching 24hr data:', error);
        }
    }

    onReady(callback) {
        setTimeout(() => callback({
            supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
            exchanges: [
                { value: 'BINANCE', name: 'Binance', desc: 'Binance Futures' }
            ],
            symbols_types: [{ name: 'Crypto', value: 'crypto' }],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true
        }), 0);
    }

    searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
        const url = `https://fapi.binance.com/fapi/v1/exchangeInfo`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                let symbols = data.symbols.filter(s => s.status === 'TRADING');

                // Nếu có input, filter theo input
                if (userInput && userInput.trim() !== '') {
                    symbols = symbols.filter(s =>
                        s.symbol.includes(userInput.toUpperCase())
                    );
                }

                // Giới hạn 50 kết quả và thêm logos
                symbols = symbols
                    .slice(0, 100)
                    .map(s => {
                        const baseAsset = s.baseAsset || s.symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');
                        const logoUrls = this.getLocalLogoUrls(baseAsset);

                        return {
                            symbol: s.symbol,
                            full_name: `BINANCE:${s.symbol}`,
                            description: s.baseAsset + '/' + s.quoteAsset,
                            exchange: 'BINANCE',
                            type: 'crypto',
                            logo_urls: logoUrls
                        };
                    });

                onResultReadyCallback(symbols);
            })
            .catch(error => {
                console.error('Search error:', error);
                onResultReadyCallback([]);
            });
    }

    resolveSymbol(symbolName, onSymbolResolvedCallback) {
        const parts = symbolName.split(':');
        const symbol = parts.length > 1 ? parts[1] : parts[0];

        // Get logo URLs từ local images
        const baseAsset = symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '').replace('PERP', '');
        const logoUrls = this.getLocalLogoUrls(baseAsset);

        // Get price info from global data
        this.getSymbolPriceInfo(symbol).then(priceInfo => {
            const symbolInfo = {
                name: symbol,
                description: symbol,
                type: 'crypto',
                session: '24x7',
                timezone: 'Etc/UTC',
                ticker: symbol,
                exchange: 'BINANCE',
                minmov: priceInfo.minmov,
                pricescale: priceInfo.pricescale,
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
                volume_precision: 2,
                data_status: 'streaming',
                full_name: `BINANCE:${symbol}`,
                logo_urls: logoUrls
            };

            onSymbolResolvedCallback(symbolInfo);
        }).catch(error => {
            console.error('Error getting price info:', error);
            // Fallback to default values
            const symbolInfo = {
                name: symbol,
                description: symbol,
                type: 'crypto',
                session: '24x7',
                timezone: 'Etc/UTC',
                ticker: symbol,
                exchange: 'BINANCE',
                minmov: 1,
                pricescale: 100,
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
                volume_precision: 2,
                data_status: 'streaming',
                full_name: `BINANCE:${symbol}`,
                logo_urls: logoUrls
            };
            onSymbolResolvedCallback(symbolInfo);
        });
    }

    // Get price from global data and calculate precision
    async getSymbolPriceInfo(symbol) {
        // Wait for global data to be ready
        if (!isGlobalDataReady) {
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (isGlobalDataReady) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        // Get price from global data
        const price = globalSymbolPrices[symbol] || 0;

        // If price not found in global data, fetch it
        if (price === 0) {
            try {
                const response = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`);
                const data = await response.json();
                const fetchedPrice = parseFloat(data.price);
                globalSymbolPrices[symbol] = fetchedPrice;
                return this.calculatePrecision(fetchedPrice);
            } catch (error) {
                console.error('Error fetching symbol price:', error);
                return { minmov: 1, pricescale: 100 };
            }
        }

        // Tính minmov và pricescale dựa trên giá
        return this.calculatePrecision(price);
    }

    // Tính minmov và pricescale dựa trên giá hiện tại
    calculatePrecision(price) {
        if (price === 0) {
            return { minmov: 1, pricescale: 100 };
        }

        // Xác định số chữ số thập phân cần thiết
        let decimals;

        if (price >= 1000) {
            // BTC, ETH giá cao: 2 decimals (e.g. 50000.12)
            decimals = 2;
        } else if (price >= 100) {
            // Giá trung bình: 2 decimals (e.g. 150.45)
            decimals = 2;
        } else if (price >= 10) {
            // Giá thấp: 3 decimals (e.g. 25.123)
            decimals = 3;
        } else if (price >= 1) {
            // Giá rất thấp: 4 decimals (e.g. 2.1234)
            decimals = 4;
        } else if (price >= 0.1) {
            // Altcoins: 5 decimals (e.g. 0.12345)
            decimals = 5;
        } else if (price >= 0.01) {
            // Shitcoins: 6 decimals (e.g. 0.012345)
            decimals = 6;
        } else if (price >= 0.001) {
            // Micro coins: 7 decimals (e.g. 0.0012345)
            decimals = 7;
        } else {
            // Ultra micro: 8 decimals (e.g. 0.00012345)
            decimals = 8;
        }

        const pricescale = Math.pow(10, decimals);
        const minmov = 1;

        return { minmov, pricescale };
    }

    // Helper function để lấy logo URLs từ local images
    getLocalLogoUrls(baseAsset) {
        const logos = [];

        // Check if LOGO_MAPS exists (from logo-maps.js)
        if (typeof LOGO_MAPS === 'undefined') {
            console.warn('LOGO_MAPS not loaded, using fallback');
            return [`images/crypto/${baseAsset.toUpperCase()}.svg`];
        }

        // Crypto logo - check map for exact file (SVG or PNG)
        const cryptoKey = baseAsset.toUpperCase();
        if (LOGO_MAPS.crypto[cryptoKey]) {
            const cryptoFile = LOGO_MAPS.crypto[cryptoKey];
            logos.push(`images/crypto/${cryptoFile}`);
        } else {
            // Fallback to SVG if not in map
            logos.push(`images/crypto/${cryptoKey}.svg`);
        }

        // Binance provider logo
        if (LOGO_MAPS.provider['BINANCE']) {
            const providerFile = LOGO_MAPS.provider['BINANCE'];
            logos.push(`images/provider/${providerFile}`);
        }

        return logos;
    }

    getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        const { from, to } = periodParams;
        const symbol = symbolInfo.name;

        const intervalMap = {
            '1': '1m', '5': '5m', '15': '15m', '30': '30m',
            '60': '1h', '240': '4h', '1D': '1d', '1W': '1w', '1M': '1M'
        };
        const interval = intervalMap[resolution] || '15m';

        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${from * 1000}&endTime=${to * 1000}&limit=1000`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                let bars = [];

                if (Array.isArray(data)) {
                    bars = data.map(bar => ({
                        time: bar[0],
                        open: parseFloat(bar[1]),
                        high: parseFloat(bar[2]),
                        low: parseFloat(bar[3]),
                        close: parseFloat(bar[4]),
                        volume: parseFloat(bar[5])
                    }));
                }

                if (bars.length === 0) {
                    onHistoryCallback([], { noData: true });
                } else {
                    onHistoryCallback(bars, { noData: false });
                }
            })
            .catch(error => {
                console.error('Error fetching bars:', error);
                onErrorCallback(error);
            });
    }

    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID) {
        const symbol = symbolInfo.name.toLowerCase();

        const intervalMap = {
            '1': '1m', '5': '5m', '15': '15m', '30': '30m',
            '60': '1h', '240': '4h', '1D': '1d', '1W': '1w', '1M': '1M'
        };
        const interval = intervalMap[resolution] || '15m';

        const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol}@kline_${interval}`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.k) {
                onRealtimeCallback({
                    time: data.k.t,
                    open: parseFloat(data.k.o),
                    high: parseFloat(data.k.h),
                    low: parseFloat(data.k.l),
                    close: parseFloat(data.k.c),
                    volume: parseFloat(data.k.v)
                });
            }
        };

        this.subscribers[subscriberUID] = ws;
    }

    unsubscribeBars(subscriberUID) {
        const ws = this.subscribers[subscriberUID];
        if (ws) {
            ws.close();
            delete this.subscribers[subscriberUID];
        }
    }

    // Quote methods for Watchlist
    getQuotes(symbols, onDataCallback, onErrorCallback) {
        const promises = symbols.map(symbol => {
            const parts = symbol.split(':');
            const exchange = parts.length > 1 ? parts[0] : 'BINANCE';
            const symbolName = parts.length > 1 ? parts[1] : parts[0];

            if (exchange === 'BINANCE') {
                return fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbolName}`)
                    .then(response => response.json())
                    .then(data => ({
                        n: symbol,
                        s: 'ok',
                        v: {
                            ch: parseFloat(data.priceChange),
                            chp: parseFloat(data.priceChangePercent),
                            short_name: symbolName,
                            exchange: exchange,
                            description: symbolName,
                            lp: parseFloat(data.lastPrice),
                            ask: parseFloat(data.lastPrice),
                            bid: parseFloat(data.lastPrice),
                            open_price: parseFloat(data.openPrice),
                            high_price: parseFloat(data.highPrice),
                            low_price: parseFloat(data.lowPrice),
                            prev_close_price: parseFloat(data.prevClosePrice),
                            volume: parseFloat(data.volume)
                        }
                    }))
                    .catch(() => ({
                        n: symbol,
                        s: 'error',
                        v: {}
                    }));
            }

            return Promise.resolve({
                n: symbol,
                s: 'error',
                v: {}
            });
        });

        Promise.all(promises)
            .then(quotes => onDataCallback(quotes))
            .catch(error => onErrorCallback(error));
    }

    subscribeQuotes(symbols, fastSymbols, onRealtimeCallback, listenerGUID) {
        const updateQuotes = () => {
            this.getQuotes(symbols, (quotes) => {
                onRealtimeCallback(quotes);
            }, (error) => {
                console.error('Quote subscription error:', error);
            });
        };

        // Update every 3 seconds
        const intervalId = setInterval(updateQuotes, 3000);
        this.quoteSubscribers[listenerGUID] = intervalId;

        // Initial update
        updateQuotes();
    }

    unsubscribeQuotes(listenerGUID) {
        const intervalId = this.quoteSubscribers[listenerGUID];
        if (intervalId) {
            clearInterval(intervalId);
            delete this.quoteSubscribers[listenerGUID];
        }
    }

    // Quote methods for Watchlist - using global data
    getQuotes(symbols, onDataCallback, onErrorCallback) {
        try {
            const quotes = symbols.map(symbol => {
                const parts = symbol.split(':');
                const symbolName = parts.length > 1 ? parts[1] : parts[0];

                // Get data from global variables
                const ticker24hr = global24hrData[symbolName];
                const markPrice = globalMarkPriceData[symbolName];

                if (!ticker24hr && !markPrice) {
                    return {
                        n: symbol,
                        s: 'error',
                        v: {}
                    };
                }

                // Combine 24hr data with realtime mark price
                const lastPrice = markPrice ? markPrice.markPrice : (ticker24hr ? ticker24hr.lastPrice : 0);

                return {
                    n: symbol,
                    s: 'ok',
                    v: {
                        ch: ticker24hr ? ticker24hr.priceChange : 0,
                        chp: ticker24hr ? ticker24hr.priceChangePercent : 0,
                        short_name: symbolName,
                        exchange: 'BINANCE',
                        description: symbolName,
                        lp: lastPrice,
                        ask: lastPrice,
                        bid: lastPrice,
                        open_price: ticker24hr ? ticker24hr.openPrice : 0,
                        high_price: ticker24hr ? ticker24hr.highPrice : 0,
                        low_price: ticker24hr ? ticker24hr.lowPrice : 0,
                        prev_close_price: ticker24hr ? ticker24hr.openPrice : 0,
                        volume: ticker24hr ? ticker24hr.volume : 0
                    }
                };
            });

            onDataCallback(quotes);
        } catch (error) {
            console.error('Error getting quotes:', error);
            onErrorCallback(error);
        }
    }

    subscribeQuotes(symbols, fastSymbols, onRealtimeCallback, listenerGUID) {
        const updateQuotes = () => {
            this.getQuotes(symbols, (quotes) => {
                onRealtimeCallback(quotes);
            }, (error) => {
                console.error('Quote subscription error:', error);
            });
        };

        // Update every 1 second (realtime from WebSocket)
        const intervalId = setInterval(updateQuotes, 1000);
        this.quoteSubscribers[listenerGUID] = intervalId;

        // Initial update
        updateQuotes();
    }
}

// Global widget instance
let tvWidget = null;
let saveLoadAdapter = null;
let autoSaveTimer = null;
let currentChartId = null;

// Cấu hình
const SUPABASE_URL = 'https://vpxjfemszjwsivavgcgq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweGpmZW1zemp3c2l2YXZnY2dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTcxMTIxNiwiZXhwIjoyMDc1Mjg3MjE2fQ.Es1a8TL2uJAcYm4wy21Y3AdKftMbyFtyWyY8RaWGVhM';
const AUTO_SAVE_LAYOUT_NAME = '__autosave__';
const AUTO_SAVE_DELAY = 2000; // 2 giây sau khi có thay đổi

// API to change symbol
window.changeSymbol = function (symbol, exchange = 'BINANCE') {
    if (tvWidget && tvWidget.chart) {
        const fullSymbol = `${exchange}:${symbol}`;
        tvWidget.chart().setSymbol(fullSymbol, () => { });
    }
};

// API để control auto-save
window.autoSave = {
    // Trigger auto-save ngay lập tức
    saveNow: () => {
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        performAutoSave();
    },

    // Load lại layout gần nhất
    loadLatest: () => {
        autoLoadLatestLayout();
    },

    // Xem thông tin auto-save
    getInfo: () => {
        return {
            currentChartId: currentChartId,
            layoutName: AUTO_SAVE_LAYOUT_NAME,
            autoSaveDelay: AUTO_SAVE_DELAY
        };
    }
};

// Get Binance API Configuration from URL parameters
function getBinanceConfigFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        apiKey: urlParams.get('apiKey') || '',
        apiSecret: urlParams.get('apiSecret') || '',
        testnet: urlParams.get('testnet') === 'true'
    };
}

// Get News Provider Configuration from URL parameters
function getNewsConfigFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        apiEndpoint: urlParams.get('newsApi') || '',
        useMockData: urlParams.get('newsApi') ? false : true,
        language: urlParams.get('newsLang') || 'en'
    };
}

// Initialize TradingView
function initTradingView() {
    // Khởi tạo Supabase adapter
    saveLoadAdapter = new SupabaseSaveLoadAdapter(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Lấy config từ URL parameters
    const binanceConfig = getBinanceConfigFromURL();

    // Khởi tạo Binance Broker với config từ URL
    const binanceBroker = new BinanceBroker(binanceConfig);

    // Khởi tạo News Provider với config từ URL
    const newsConfig = getNewsConfigFromURL();
    const newsProvider = new NewsProvider(newsConfig);

    const widgetOptions = {
        symbol: 'BINANCE:BTCUSDT',
        datafeed: new MultiExchangeDatafeed(),
        interval: '15',
        container: 'tv_chart_container',
        library_path: 'charting_library/',
        locale: 'en',
        disabled_features: [


        ],
        enabled_features: [
            'studies_extend_time_scale',
            'show_symbol_logos',
            'items_favoriting',
            'use_localstorage_for_settings',
            'show_symbol_logo_in_legend',
            'study_templates',
            'use_localstorage_for_settings',
            'trading_account_manager',
            'replay_mode',                // <--- kích hoạt Replay UI
            'replay_market',              // cho phép mô phỏng replay trên dữ liệu thị trường
            'replay_button',
        ],
        fullscreen: false,
        autosize: true,
        theme: 'Dark',
        broker_factory: (host) => {
            binanceBroker.setHost(host);
            return Promise.resolve(binanceBroker);
        },
        broker_config: {
            supportPositions: true,
            supportOrdersHistory: false,
            supportClosePosition: true,
            supportReversePosition: true,
            supportModifyOrderPrice: true,
            showNotificationsLog: true
        },
        overrides: {
            'mainSeriesProperties.candleStyle.upColor': '#089981',
            'mainSeriesProperties.candleStyle.downColor': '#F23645',
            'mainSeriesProperties.candleStyle.borderUpColor': '#089981',
            'mainSeriesProperties.candleStyle.borderDownColor': '#F23645',
            'mainSeriesProperties.candleStyle.wickUpColor': '#089981',
            'mainSeriesProperties.candleStyle.wickDownColor': '#F23645'
        },
        // Custom indicators
        custom_indicators_getter: function (PineJS) {
            return Promise.resolve([
                createATRBot(PineJS),
                createVSR(PineJS),
                createVSR_HTF(PineJS)
            ]);
        },
        // Sử dụng Supabase adapter
        save_load_adapter: saveLoadAdapter,
        charts_storage_url: 'supabase',
        client_id: 'tradingview_app',
        user_id: 'public_user',
        // News provider
        news_provider: (symbol, callback) => {
            newsProvider.getNews(symbol, callback);
        },
        widgetbar: {
            details: false,
            watchlist: true,
            watchlist_settings: {
                readonly: false
            },
            datawindow: true,
            news: true
        },
    };

    tvWidget = new TradingView.widget(widgetOptions);

    tvWidget.onChartReady(() => {
        hideLoading();

        // Auto-load layout gần nhất khi chart ready
        setTimeout(() => {
            autoLoadLatestLayout();
        }, 1000);

        // Setup auto-save listeners
        setupAutoSave();
    });
}

// Auto-save layout khi có thay đổi
function setupAutoSave() {
    if (!tvWidget) return;

    try {
        // Subscribe to drawing events
        tvWidget.subscribe('drawing_event', (event) => {
            scheduleAutoSave();
        });

        // Subscribe to study events (indicators)
        tvWidget.subscribe('study_event', (event) => {
            scheduleAutoSave();
        });

        // Subscribe to onAutoSaveNeeded
        tvWidget.subscribe('onAutoSaveNeeded', () => {
            scheduleAutoSave();
        });
    } catch (error) {
        console.error('Error setting up auto-save:', error);
    }
}

// Schedule auto-save với debounce
function scheduleAutoSave() {
    // Clear timer cũ
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }

    // Set timer mới
    autoSaveTimer = setTimeout(() => {
        performAutoSave();
    }, AUTO_SAVE_DELAY);
}

// Thực hiện auto-save
async function performAutoSave() {
    if (!tvWidget || !saveLoadAdapter) {
        return;
    }

    try {
        // Lấy state hiện tại của chart
        tvWidget.save((chartData) => {
            // Save với tên đặc biệt cho autosave
            const saveData = {
                id: currentChartId,
                name: AUTO_SAVE_LAYOUT_NAME,
                content: chartData
            };

            saveLoadAdapter.saveChart(saveData)
                .then((chartId) => {
                    currentChartId = chartId;
                })
                .catch((error) => {
                    console.error('Auto-save failed:', error);
                });
        });
    } catch (error) {
        console.error('Error during auto-save:', error);
    }
}

// Auto-load layout gần nhất
async function autoLoadLatestLayout() {
    if (!tvWidget || !saveLoadAdapter) {
        return;
    }

    try {
        // Lấy tất cả layouts
        const charts = await saveLoadAdapter.getAllCharts();

        if (!charts || charts.length === 0) {
            return;
        }

        // Tìm autosave layout
        const autoSaveLayout = charts.find(c => c.name === AUTO_SAVE_LAYOUT_NAME);

        if (autoSaveLayout) {
            currentChartId = autoSaveLayout.id;

            // Load layout
            const content = await saveLoadAdapter.getChartContent(autoSaveLayout.id);
            tvWidget.load(content);
        }
    } catch (error) {
        console.error('Error during auto-load:', error);
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
