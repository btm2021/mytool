// Datafeed for multiple exchanges
class MultiExchangeDatafeed {
    constructor() {
        this.subscribers = {};
        this.quoteSubscribers = {};
        this.exchanges = ['BINANCE', 'OKX', 'BYBIT'];
    }

    onReady(callback) {
        setTimeout(() => callback({
            supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
            exchanges: [
                { value: 'BINANCE', name: 'Binance', desc: 'Binance Futures' },
                { value: 'OKX', name: 'OKX', desc: 'OKX' },
                { value: 'BYBIT', name: 'Bybit', desc: 'Bybit' }
            ],
            symbols_types: [{ name: 'Crypto', value: 'crypto' }],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true
        }), 0);
    }

    searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
        const searchExchange = exchange || 'BINANCE';
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
                    .slice(0, 50)
                    .map(s => {
                        const baseAsset = s.baseAsset || s.symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');
                        const logoUrls = this.getLocalLogoUrls(baseAsset, searchExchange);

                        return {
                            symbol: s.symbol,
                            full_name: `${searchExchange}:${s.symbol}`,
                            description: s.baseAsset + '/' + s.quoteAsset,
                            exchange: searchExchange,
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

    resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
        const parts = symbolName.split(':');
        const exchange = parts.length > 1 ? parts[0] : 'BINANCE';
        const symbol = parts.length > 1 ? parts[1] : parts[0];

        // Get logo URLs từ local images
        const baseAsset = symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '').replace('PERP', '');
        const logoUrls = this.getLocalLogoUrls(baseAsset, exchange);

        const symbolInfo = {
            name: symbol,
            description: symbol,
            type: 'crypto',
            session: '24x7',
            timezone: 'Etc/UTC',
            ticker: symbol,
            exchange: exchange,
            minmov: 1,
            pricescale: 100,
            has_intraday: true,
            has_daily: true,
            has_weekly_and_monthly: true,
            supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
            volume_precision: 2,
            data_status: 'streaming',
            full_name: `${exchange}:${symbol}`,
            logo_urls: logoUrls
        };

        setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
    }

    // Helper function để lấy logo URLs từ local images
    getLocalLogoUrls(baseAsset, exchange) {
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
            console.log(`Logo not found for ${cryptoKey}, using fallback`);
            logos.push(`images/crypto/${cryptoKey}.svg`);
        }

        // Exchange/Provider logo
        const exchangeMap = {
            'BINANCE': 'BINANCE',
            'OKX': 'OKX',
            'BYBIT': 'BYBIT'
        };

        const providerKey = exchangeMap[exchange];
        if (providerKey && LOGO_MAPS.provider[providerKey]) {
            const providerFile = LOGO_MAPS.provider[providerKey];
            logos.push(`images/provider/${providerFile}`);
        }

        return logos;
    }

    getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        const { from, to } = periodParams;
        const symbol = symbolInfo.name;
        const exchange = symbolInfo.exchange || 'BINANCE';

        const intervalMap = {
            '1': '1m', '5': '5m', '15': '15m', '30': '30m',
            '60': '1h', '240': '4h', '1D': '1d', '1W': '1w', '1M': '1M'
        };
        const interval = intervalMap[resolution] || '15m';

        let url;
        if (exchange === 'BINANCE') {
            url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${from * 1000}&endTime=${to * 1000}&limit=1000`;
        } else if (exchange === 'OKX') {
            url = `https://www.okx.com/api/v5/market/candles?instId=${symbol.replace('USDT', '-USDT')}&bar=${interval}&after=${from * 1000}&before=${to * 1000}&limit=300`;
        } else if (exchange === 'BYBIT') {
            url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${resolution}&start=${from * 1000}&end=${to * 1000}&limit=1000`;
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                let bars = [];

                if (exchange === 'BINANCE' && Array.isArray(data)) {
                    bars = data.map(bar => ({
                        time: bar[0],
                        open: parseFloat(bar[1]),
                        high: parseFloat(bar[2]),
                        low: parseFloat(bar[3]),
                        close: parseFloat(bar[4]),
                        volume: parseFloat(bar[5])
                    }));
                } else if (exchange === 'OKX' && data.data) {
                    bars = data.data.map(bar => ({
                        time: parseInt(bar[0]),
                        open: parseFloat(bar[1]),
                        high: parseFloat(bar[2]),
                        low: parseFloat(bar[3]),
                        close: parseFloat(bar[4]),
                        volume: parseFloat(bar[5])
                    }));
                } else if (exchange === 'BYBIT' && data.result && data.result.list) {
                    bars = data.result.list.map(bar => ({
                        time: parseInt(bar[0]),
                        open: parseFloat(bar[1]),
                        high: parseFloat(bar[2]),
                        low: parseFloat(bar[3]),
                        close: parseFloat(bar[4]),
                        volume: parseFloat(bar[5])
                    })).reverse();
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

    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
        const symbol = symbolInfo.name.toLowerCase();
        const exchange = symbolInfo.exchange || 'BINANCE';

        const intervalMap = {
            '1': '1m', '5': '5m', '15': '15m', '30': '30m',
            '60': '1h', '240': '4h', '1D': '1d', '1W': '1w', '1M': '1M'
        };
        const interval = intervalMap[resolution] || '15m';

        let ws;
        if (exchange === 'BINANCE') {
            ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol}@kline_${interval}`);
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
        }

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
        tvWidget.chart().setSymbol(fullSymbol, () => {
            console.log('Symbol changed to:', fullSymbol);
        });
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

// Initialize TradingView
function initTradingView() {
    // Khởi tạo Supabase adapter
    saveLoadAdapter = new SupabaseSaveLoadAdapter(SUPABASE_URL, SUPABASE_ANON_KEY);
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
            'show_symbol_logos',
            'items_favoriting',
            'use_localstorage_for_settings',
            'show_symbol_logo_in_legend',
            '  study_templates',
            'use_localstorage_for_settings'
        ],
        fullscreen: false,
        autosize: true,
        theme: 'Dark',
        overrides: {
            'mainSeriesProperties.candleStyle.upColor': '#089981',
            'mainSeriesProperties.candleStyle.downColor': '#F23645',
            'mainSeriesProperties.candleStyle.borderUpColor': '#089981',
            'mainSeriesProperties.candleStyle.borderDownColor': '#F23645',
            'mainSeriesProperties.candleStyle.wickUpColor': '#089981',
            'mainSeriesProperties.candleStyle.wickDownColor': '#F23645'
        },
        // Sử dụng Supabase adapter
        save_load_adapter: saveLoadAdapter,
        charts_storage_url: 'supabase',
        client_id: 'tradingview_app',
        user_id: 'public_user',
        widgetbar: {
            details: true,
            watchlist: true,
            watchlist_settings: {
                default_symbols: [
              
                ],
                readonly: false
            }
        },
    };

    tvWidget = new TradingView.widget(widgetOptions);

    tvWidget.onChartReady(() => {
        console.log('Chart ready');
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
            console.log('Drawing event:', event);
            scheduleAutoSave();
        });

        // Subscribe to study events (indicators)
        tvWidget.subscribe('study_event', (event) => {
            console.log('Study event:', event);
            scheduleAutoSave();
        });

        // Subscribe to onAutoSaveNeeded
        tvWidget.subscribe('onAutoSaveNeeded', () => {
            console.log('Auto save needed');
            scheduleAutoSave();
        });

        console.log('Auto-save listeners setup complete');
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
        console.log('Widget or adapter not ready');
        return;
    }

    try {
        console.log('Performing auto-save...');

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
                    console.log('Auto-saved successfully:', chartId);
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
        console.log('Widget or adapter not ready for auto-load');
        return;
    }

    try {
        console.log('Looking for latest layout...');

        // Lấy tất cả layouts
        const charts = await saveLoadAdapter.getAllCharts();

        if (!charts || charts.length === 0) {
            console.log('No saved layouts found');
            return;
        }

        // Tìm autosave layout
        const autoSaveLayout = charts.find(c => c.name === AUTO_SAVE_LAYOUT_NAME);

        if (autoSaveLayout) {
            console.log('Found autosave layout, loading...');
            currentChartId = autoSaveLayout.id;

            // Load layout
            const content = await saveLoadAdapter.getChartContent(autoSaveLayout.id);
            tvWidget.load(content);

            console.log('Auto-loaded layout:', autoSaveLayout.id);
        } else {
            console.log('No autosave layout found');
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
