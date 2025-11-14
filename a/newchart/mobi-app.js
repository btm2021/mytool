// Global widget instance
let tvWidget = null;

// Watchlist symbols
const WATCHLIST_SYMBOLS = [
    { value: 'BINANCE:BTCUSDT', label: 'BTCUSDT', exchange: 'Binance Futures' },
    { value: 'BINANCE:ETHUSDT', label: 'ETHUSDT', exchange: 'Binance Futures' },
    { value: 'BINANCE:IMXUSDT', label: 'IMXUSDT', exchange: 'Binance Futures' },
    { value: 'BINANCE:SOLUSDT', label: 'SOLUSDT', exchange: 'Binance Futures' },
      { value: 'BINANCE:IMXUSDT', label: 'IMXUSDT', exchange: 'Binance Futures' },
        { value: 'OANDA:XAUUSD', label: 'XAUUSD', exchange: 'Oanda' }
];

// Timeframes
const TIMEFRAMES = [
    { value: '1', label: '1m' },
    { value: '5', label: '5m' },
    { value: '15', label: '15m' },
    { value: '30', label: '30m' },
    { value: '60', label: '1h' },
    { value: '240', label: '4h' },
    { value: 'D', label: '1D' },
    { value: 'W', label: '1W' }
];

// Current selections
let currentSymbol = 'BINANCE:BTCUSDT';
let currentTimeframe = '15';

// Initialize Multi-Datafeed Manager
async function initDatafeedManager() {
    const manager = new DatafeedManager();

    manager.registerDatasource(new BinanceFuturesDatasource(), true);
    manager.registerDatasource(new BinanceSpotDatasource());
    manager.registerDatasource(new OKXFuturesDatasource());
    manager.registerDatasource(new OKXSpotDatasource());
    manager.registerDatasource(new BybitFuturesDatasource());
    manager.registerDatasource(new BybitSpotDatasource());
    //manager.registerDatasource(new MEXCFuturesDatasource());
    // manager.registerDatasource(new MEXCSpotDatasource());
    // manager.registerDatasource(new KuCoinFuturesDatasource());
    //manager.registerDatasource(new KuCoinSpotDatasource());
    manager.registerDatasource(new OANDADatasource());

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
            'header_widget',
            'header_symbol_search',
            'header_resolutions',
            'header_chart_type',
            'header_settings',
            'header_indicators',
            'header_compare',
            'header_undo_redo',
            'header_screenshot',
            'header_fullscreen_button',
            'left_toolbar',
            'show_object_tree',
            'popup_hints',
            'tradingview_logo',
            'bottom_toolbar',
            'control_bar',
            'timeframes_toolbar',
            'open_account_manager',
            'trading_account_manager',
            'trading_notifications'
        ],
        enabled_features: [
            'items_favoriting',
            'show_symbol_logos',
            'show_symbol_logo_in_legend',
            'show_exchange_logos',
            'study_templates',
            'hide_left_toolbar_by_default'
        ],
        fullscreen: false,
        autosize: true,
        theme: 'Dark',
        load_last_chart: true,
        // Save/Load Adapter for localStorage
        save_load_adapter: saveLoadAdapter.getAdapter(),
        // Auto-save interval (0.5 seconds)
        auto_save_delay: 0.5,
        // Enable auto-save
        auto_save_chart_enabled: true,
        custom_indicators_getter: function (PineJS) {
            return Promise.resolve([
                createATRBot(PineJS),
                createVSR(PineJS)
            ]);
        },
        widgetbar: {
            details: false,
            watchlist: false,
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
        hideLoading();
    });
    
    // Subscribe to auto-save event
    tvWidget.subscribe('onAutoSaveNeeded', () => {
        console.log('[Mobile] Auto-save triggered');
        tvWidget.saveChartToServer();
    });
}

// Setup mobile toolbar


function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.add('hidden');
    setTimeout(() => overlay.style.display = 'none', 300);
}

// Watchlist Wheel Picker
function initWatchlist() {
    const overlay = document.getElementById('watchlist-overlay');
    const openBtn = document.getElementById('open-watchlist');
    const closeBtn = document.getElementById('close-watchlist');
    const applyBtn = document.getElementById('apply-watchlist');
    
    const symbolScroll = document.getElementById('symbol-scroll');
    const timeframeScroll = document.getElementById('timeframe-scroll');
    
    let selectedSymbolIndex = 0;
    let selectedTimeframeIndex = 2; // Default 15m
    
    // Populate symbol picker
    WATCHLIST_SYMBOLS.forEach((symbol, index) => {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.textContent = symbol.label;
        item.dataset.index = index;
        item.dataset.value = symbol.value;
        symbolScroll.appendChild(item);
    });
    
    // Populate timeframe picker
    TIMEFRAMES.forEach((tf, index) => {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.textContent = tf.label;
        item.dataset.index = index;
        item.dataset.value = tf.value;
        timeframeScroll.appendChild(item);
    });
    
    // Wheel picker logic
    function setupWheelPicker(scrollElement, items, initialIndex, onSelect) {
        let currentIndex = initialIndex;
        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        
        function updatePicker(index, animate = true) {
            currentIndex = Math.max(0, Math.min(items.length - 1, index));
            const offset = -currentIndex * 40;
            
            if (animate) {
                scrollElement.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            } else {
                scrollElement.style.transition = 'none';
            }
            
            scrollElement.style.transform = `translateY(${offset}px)`;
            
            // Update selected class
            Array.from(scrollElement.children).forEach((item, i) => {
                item.classList.toggle('selected', i === currentIndex);
            });
            
            onSelect(currentIndex);
        }
        
        // Touch events
        scrollElement.addEventListener('touchstart', (e) => {
            isDragging = true;
            startY = e.touches[0].clientY;
            currentY = startY;
            scrollElement.style.transition = 'none';
        });
        
        scrollElement.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            const offset = -currentIndex * 40 + deltaY;
            scrollElement.style.transform = `translateY(${offset}px)`;
        });
        
        scrollElement.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            
            const deltaY = currentY - startY;
            const deltaIndex = Math.round(-deltaY / 40);
            updatePicker(currentIndex + deltaIndex, true);
        });
        
        // Click events
        Array.from(scrollElement.children).forEach((item, index) => {
            item.addEventListener('click', () => {
                updatePicker(index, true);
            });
        });
        
        // Initial position
        updatePicker(currentIndex, false);
        
        return {
            getCurrentIndex: () => currentIndex,
            setIndex: (index) => updatePicker(index, true)
        };
    }
    
    // Setup pickers
    const symbolPicker = setupWheelPicker(
        symbolScroll,
        WATCHLIST_SYMBOLS,
        selectedSymbolIndex,
        (index) => { selectedSymbolIndex = index; }
    );
    
    const timeframePicker = setupWheelPicker(
        timeframeScroll,
        TIMEFRAMES,
        selectedTimeframeIndex,
        (index) => { selectedTimeframeIndex = index; }
    );
    
    // Open watchlist
    openBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        
        // Set current selections
        const currentSymbolIndex = WATCHLIST_SYMBOLS.findIndex(s => s.value === currentSymbol);
        const currentTimeframeIndex = TIMEFRAMES.findIndex(tf => tf.value === currentTimeframe);
        
        if (currentSymbolIndex >= 0) symbolPicker.setIndex(currentSymbolIndex);
        if (currentTimeframeIndex >= 0) timeframePicker.setIndex(currentTimeframeIndex);
    });
    
    // Close watchlist
    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
    
    // Apply selection
    applyBtn.addEventListener('click', () => {
        const selectedSymbol = WATCHLIST_SYMBOLS[selectedSymbolIndex];
        const selectedTimeframe = TIMEFRAMES[selectedTimeframeIndex];
        
        currentSymbol = selectedSymbol.value;
        currentTimeframe = selectedTimeframe.value;
        
        // Update chart
        if (tvWidget) {
            tvWidget.activeChart().setSymbol(currentSymbol);
            tvWidget.activeChart().setResolution(currentTimeframe);
        }
        
        overlay.classList.remove('active');
        
        console.log(`Applied: ${selectedSymbol.label} - ${selectedTimeframe.label}`);
    });
}

// Indicator Menu
const INDICATORS = [
    // Custom Indicators
    {
        id: 'ATR Bot',
        name: 'ATR Dynamic Trail with EMA and State Change Detection',
        shortName: 'ATR Bot',
        description: 'ATR Dynamic Trail with EMA',
        category: 'Custom'
    },
    {
        id: 'VSR',
        name: 'Volume Spike Reversal Levels',
        shortName: 'VSR',
        description: 'Volume Spike Reversal Levels',
        category: 'Custom'
    },
    
    // Built-in Indicators - Moving Averages
    {
        id: 'Moving Average',
        name: 'Moving Average',
        shortName: 'MA',
        description: 'Simple Moving Average',
        category: 'Built-in'
    },
    {
        id: 'Moving Average Exponential',
        name: 'Moving Average Exponential',
        shortName: 'EMA',
        description: 'Exponential Moving Average',
        category: 'Built-in'
    },
    {
        id: 'Moving Average Weighted',
        name: 'Moving Average Weighted',
        shortName: 'WMA',
        description: 'Weighted Moving Average',
        category: 'Built-in'
    },
    
    // Oscillators
    {
        id: 'RSI',
        name: 'RSI',
        shortName: 'RSI',
        description: 'Relative Strength Index',
        category: 'Built-in'
    },
    {
        id: 'MACD',
        name: 'MACD',
        shortName: 'MACD',
        description: 'Moving Average Convergence Divergence',
        category: 'Built-in'
    },
    {
        id: 'Stochastic',
        name: 'Stochastic',
        shortName: 'Stoch',
        description: 'Stochastic Oscillator',
        category: 'Built-in'
    },
    {
        id: 'Stochastic RSI',
        name: 'Stochastic RSI',
        shortName: 'Stoch RSI',
        description: 'Stochastic RSI',
        category: 'Built-in'
    },
    {
        id: 'Awesome Oscillator',
        name: 'Awesome Oscillator',
        shortName: 'AO',
        description: 'Awesome Oscillator',
        category: 'Built-in'
    },
    {
        id: 'Momentum',
        name: 'Momentum',
        shortName: 'MOM',
        description: 'Momentum Indicator',
        category: 'Built-in'
    },
    {
        id: 'CCI',
        name: 'CCI',
        shortName: 'CCI',
        description: 'Commodity Channel Index',
        category: 'Built-in'
    },
    {
        id: 'Williams %R',
        name: 'Williams %R',
        shortName: 'Will %R',
        description: 'Williams Percent Range',
        category: 'Built-in'
    },
    
    // Volatility
    {
        id: 'Bollinger Bands',
        name: 'Bollinger Bands',
        shortName: 'BB',
        description: 'Volatility Bands',
        category: 'Built-in'
    },
    {
        id: 'ATR',
        name: 'ATR',
        shortName: 'ATR',
        description: 'Average True Range',
        category: 'Built-in'
    },
    {
        id: 'Keltner Channels',
        name: 'Keltner Channels',
        shortName: 'KC',
        description: 'Volatility-based Channels',
        category: 'Built-in'
    },
    {
        id: 'Donchian Channels',
        name: 'Donchian Channels',
        shortName: 'DC',
        description: 'Price Channel Indicator',
        category: 'Built-in'
    },
    
    // Volume
    {
        id: 'Volume',
        name: 'Volume',
        shortName: 'Vol',
        description: 'Trading Volume',
        category: 'Built-in'
    },
    {
        id: 'Volume Oscillator',
        name: 'Volume Oscillator',
        shortName: 'Vol Osc',
        description: 'Volume-based Oscillator',
        category: 'Built-in'
    },
    {
        id: 'On Balance Volume',
        name: 'On Balance Volume',
        shortName: 'OBV',
        description: 'On Balance Volume',
        category: 'Built-in'
    },
    {
        id: 'Accumulation/Distribution',
        name: 'Accumulation/Distribution',
        shortName: 'A/D',
        description: 'Accumulation/Distribution',
        category: 'Built-in'
    },
    {
        id: 'Chaikin Money Flow',
        name: 'Chaikin Money Flow',
        shortName: 'CMF',
        description: 'Chaikin Money Flow',
        category: 'Built-in'
    },
    {
        id: 'Money Flow Index',
        name: 'Money Flow Index',
        shortName: 'MFI',
        description: 'Money Flow Index',
        category: 'Built-in'
    },
    
    // Trend
    {
        id: 'Parabolic SAR',
        name: 'Parabolic SAR',
        shortName: 'PSAR',
        description: 'Stop and Reverse',
        category: 'Built-in'
    },
    {
        id: 'Ichimoku Cloud',
        name: 'Ichimoku Cloud',
        shortName: 'Ichimoku',
        description: 'Ichimoku Cloud',
        category: 'Built-in'
    },
    {
        id: 'ADX',
        name: 'ADX',
        shortName: 'ADX',
        description: 'Average Directional Index',
        category: 'Built-in'
    },
    {
        id: 'Aroon',
        name: 'Aroon',
        shortName: 'Aroon',
        description: 'Aroon Indicator',
        category: 'Built-in'
    },
    {
        id: 'Supertrend',
        name: 'Supertrend',
        shortName: 'ST',
        description: 'Supertrend Indicator',
        category: 'Built-in'
    },
    
    // Pivot Points
    {
        id: 'Pivot Points Standard',
        name: 'Pivot Points Standard',
        shortName: 'Pivot',
        description: 'Standard Pivot Points',
        category: 'Built-in'
    },
    {
        id: 'Pivot Points High Low',
        name: 'Pivot Points High Low',
        shortName: 'Pivot HL',
        description: 'Pivot Points High Low',
        category: 'Built-in'
    },
    
    // Other Popular Indicators
    {
        id: 'Price Channel',
        name: 'Price Channel',
        shortName: 'PC',
        description: 'Price Channel',
        category: 'Built-in'
    },
    {
        id: 'Envelope',
        name: 'Envelope',
        shortName: 'ENV',
        description: 'Moving Average Envelope',
        category: 'Built-in'
    },
    {
        id: 'VWAP',
        name: 'VWAP',
        shortName: 'VWAP',
        description: 'Volume Weighted Average Price',
        category: 'Built-in'
    },
    {
        id: 'Compare',
        name: 'Compare',
        shortName: 'Compare',
        description: 'Compare Symbols',
        category: 'Built-in'
    },
    {
        id: 'Overlay',
        name: 'Overlay',
        shortName: 'Overlay',
        description: 'Overlay Symbol',
        category: 'Built-in'
    }
];

function initIndicatorMenu() {
    const overlay = document.getElementById('indicator-overlay');
    const openBtn = document.getElementById('open-indicator');
    const closeBtn = document.getElementById('close-indicator');
    const searchInput = document.getElementById('indicator-search');
    const indicatorList = document.getElementById('indicator-list');
    
    let filteredIndicators = [...INDICATORS];
    
    // Render indicator list
    function renderIndicators(indicators) {
        indicatorList.innerHTML = '';
        
        // Group by category - Custom first, then Built-in
        const categoryOrder = ['Custom', 'Built-in'];
        const categories = {};
        
        indicators.forEach(indicator => {
            if (!categories[indicator.category]) {
                categories[indicator.category] = [];
            }
            categories[indicator.category].push(indicator);
        });
        
        // Render each category in order
        categoryOrder.forEach(category => {
            if (!categories[category]) return;
            
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'indicator-category';
            categoryDiv.textContent = category;
            indicatorList.appendChild(categoryDiv);
            
            categories[category].forEach(indicator => {
                const item = document.createElement('div');
                item.className = 'indicator-item';
                item.innerHTML = `
                    <div class="indicator-item-info">
                        <div class="indicator-item-name">${indicator.shortName}</div>
                        <div class="indicator-item-desc">${indicator.description}</div>
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    addIndicator(indicator);
                    overlay.classList.remove('active');
                });
                
                indicatorList.appendChild(item);
            });
        });
    }
    
    // Add indicator to chart
    function addIndicator(indicator) {
        if (!tvWidget) return;
        
        try {
            const chart = tvWidget.activeChart();
            
            // For custom indicators, use the name instead of id
            // Custom indicators are registered via custom_indicators_getter
            if (indicator.category === 'Custom') {
                chart.createStudy(indicator.name, false, false);
            } else {
                // For built-in indicators, use the id
                chart.createStudy(indicator.id, false, false);
            }
            
            console.log(`Added indicator: ${indicator.name}`);
        } catch (error) {
            console.error(`Failed to add indicator ${indicator.name}:`, error);
        }
    }
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        if (query === '') {
            filteredIndicators = [...INDICATORS];
        } else {
            filteredIndicators = INDICATORS.filter(indicator => 
                indicator.name.toLowerCase().includes(query) ||
                indicator.description.toLowerCase().includes(query)
            );
        }
        
        renderIndicators(filteredIndicators);
    });
    
    // Open indicator menu
    openBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        searchInput.value = '';
        filteredIndicators = [...INDICATORS];
        renderIndicators(filteredIndicators);
    });
    
    // Close indicator menu
    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
    
    // Initial render
    renderIndicators(filteredIndicators);
}

// Drawing Tools
const DRAWING_TOOLS = [
    {
        id: 'trend_line',
        name: 'Trend Line',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="20" x2="20" y2="4"/>
            <circle cx="4" cy="20" r="2" fill="currentColor"/>
            <circle cx="20" cy="4" r="2" fill="currentColor"/>
        </svg>`
    },
    {
        id: 'horizontal_line',
        name: 'Horizontal',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="12" x2="20" y2="12"/>
            <circle cx="4" cy="12" r="2" fill="currentColor"/>
            <circle cx="20" cy="12" r="2" fill="currentColor"/>
        </svg>`
    },
    {
        id: 'vertical_line',
        name: 'Vertical',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="4" x2="12" y2="20"/>
            <circle cx="12" cy="4" r="2" fill="currentColor"/>
            <circle cx="12" cy="20" r="2" fill="currentColor"/>
        </svg>`
    },
    {
        id: 'rectangle',
        name: 'Rectangle',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="6" width="16" height="12" rx="2"/>
        </svg>`
    },
    {
        id: 'circle',
        name: 'Circle',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="8"/>
        </svg>`
    },
    {
        id: 'arrow',
        name: 'Arrow',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="19" x2="19" y2="5"/>
            <polyline points="13 5 19 5 19 11"/>
        </svg>`
    },
    {
        id: 'fib_retracement',
        name: 'Fib Retrace',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="6" y1="20" x2="18" y2="4"/>
            <line x1="6" y1="20" x2="18" y2="20" stroke-dasharray="2 2" opacity="0.6"/>
            <line x1="6" y1="16" x2="18" y2="16" stroke-dasharray="2 2" opacity="0.6"/>
            <line x1="6" y1="12" x2="18" y2="12" stroke-dasharray="2 2" opacity="0.6"/>
            <line x1="6" y1="8" x2="18" y2="8" stroke-dasharray="2 2" opacity="0.6"/>
            <line x1="6" y1="4" x2="18" y2="4" stroke-dasharray="2 2" opacity="0.6"/>
        </svg>`
    },
    {
        id: 'text',
        name: 'Text',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="4 7 4 4 20 4 20 7"/>
            <line x1="9" y1="20" x2="15" y2="20"/>
            <line x1="12" y1="4" x2="12" y2="20"/>
        </svg>`
    },
    {
        id: 'ruler',
        name: 'Ruler',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="20" x2="20" y2="4"/>
            <line x1="7" y1="20" x2="9" y2="18"/>
            <line x1="10" y1="17" x2="12" y2="15"/>
            <line x1="13" y1="14" x2="15" y2="12"/>
            <line x1="16" y1="11" x2="18" y2="9"/>
        </svg>`
    },
    {
        id: 'anchored_vwap',
        name: 'VWAP',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <path d="M4 12 Q8 8, 12 12 T20 12" stroke-dasharray="3 3"/>
            <line x1="12" y1="4" x2="12" y2="20" opacity="0.5"/>
        </svg>`
    }
];

function initDrawingTools() {
    const overlay = document.getElementById('drawing-overlay');
    const openBtn = document.getElementById('btn-explore');
    const closeBtn = document.getElementById('close-drawing');
    const drawingScroll = document.getElementById('drawing-scroll');
    
    console.log('🎨 initDrawingTools called');
    console.log('Overlay:', overlay);
    console.log('Open button:', openBtn);
    console.log('Close button:', closeBtn);
    console.log('Drawing scroll:', drawingScroll);
    
    if (!overlay || !openBtn || !closeBtn || !drawingScroll) {
        console.error('❌ Drawing tools elements not found!');
        return;
    }
    
    // Render drawing tools
    function renderDrawingTools() {
        console.log('📝 Rendering drawing tools...');
        drawingScroll.innerHTML = '';
        
        console.log(`Total tools: ${DRAWING_TOOLS.length}`);
        drawingScroll.innerHTML = '';
        
        DRAWING_TOOLS.forEach(tool => {
            const card = document.createElement('div');
            card.className = 'drawing-tool-card';
            card.innerHTML = `
                <div class="drawing-tool-icon">${tool.icon}</div>
                <div class="drawing-tool-name">${tool.name}</div>
            `;
            
            card.addEventListener('click', () => {
                console.log(`🖱️ Tool clicked: ${tool.name}`);
                activateDrawingTool(tool);
                overlay.classList.remove('active');
            });
            
            drawingScroll.appendChild(card);
        });
    }
    
    // Activate drawing tool
    async function activateDrawingTool(tool) {
        if (!tvWidget) {
            console.error('TradingView widget not initialized');
            return;
        }
        
        try {
            const chart = tvWidget.activeChart();
            const visibleRange = chart.getVisibleRange();
            const priceScale = chart.getPanes()[0].getMainSourcePriceScale();
            
            if (!priceScale) {
                console.error('Price scale not available');
                return;
            }
            
            const priceRange = priceScale.getVisiblePriceRange();
            const middleTime = Math.floor((visibleRange.from + visibleRange.to) / 2);
            const quarterTime = Math.floor((visibleRange.from + middleTime) / 2);
            const threeQuarterTime = Math.floor((middleTime + visibleRange.to) / 2);
            const middlePrice = (priceRange.from + priceRange.to) / 2;
            const topPrice = priceRange.to - (priceRange.to - priceRange.from) * 0.2;
            const bottomPrice = priceRange.from + (priceRange.to - priceRange.from) * 0.2;
            
            let drawingId;
            
            switch (tool.id) {
                case 'horizontal_line':
                    drawingId = await chart.createShape(
                        { price: middlePrice },
                        { shape: 'horizontal_line' }
                    );
                    break;
                    
                case 'vertical_line':
                    drawingId = await chart.createShape(
                        { time: middleTime },
                        { shape: 'vertical_line' }
                    );
                    break;
                    
                case 'trend_line':
                    drawingId = await chart.createMultipointShape(
                        [
                            { time: quarterTime, price: bottomPrice },
                            { time: threeQuarterTime, price: topPrice }
                        ],
                        { shape: 'trend_line' }
                    );
                    break;
                    
                case 'rectangle':
                    drawingId = await chart.createMultipointShape(
                        [
                            { time: quarterTime, price: topPrice },
                            { time: threeQuarterTime, price: bottomPrice }
                        ],
                        { shape: 'rectangle' }
                    );
                    break;
                    
                case 'circle':
                    drawingId = await chart.createMultipointShape(
                        [
                            { time: quarterTime, price: middlePrice },
                            { time: threeQuarterTime, price: middlePrice }
                        ],
                        { shape: 'ellipse' }
                    );
                    break;
                    
                case 'arrow':
                    drawingId = await chart.createMultipointShape(
                        [
                            { time: quarterTime, price: bottomPrice },
                            { time: threeQuarterTime, price: topPrice }
                        ],
                        { shape: 'arrow' }
                    );
                    break;
                    
                case 'fib_retracement':
                    drawingId = await chart.createMultipointShape(
                        [
                            { time: quarterTime, price: bottomPrice },
                            { time: threeQuarterTime, price: topPrice }
                        ],
                        { shape: 'fib_retracement' }
                    );
                    break;
                    
                case 'text':
                    drawingId = await chart.createShape(
                        { time: middleTime, price: middlePrice },
                        { shape: 'text', text: 'Text' }
                    );
                    break;
                    
                case 'ruler':
                    drawingId = await chart.createMultipointShape(
                        [
                            { time: quarterTime, price: bottomPrice },
                            { time: threeQuarterTime, price: topPrice }
                        ],
                        { shape: 'price_note' }
                    );
                    break;
                    
                case 'anchored_vwap':
                    drawingId = await chart.createShape(
                        { time: middleTime },
                        { shape: 'anchored_vwap' }
                    );
                    break;
            }
            
            console.log(`✓ Created ${tool.name} (ID: ${drawingId})`);
            
        } catch (error) {
            console.error(`✗ Failed to create ${tool.name}:`, error);
            alert(`Unable to create ${tool.name}`);
        }
    }
    
    // Open drawing tools
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            console.log('🖱️ Explore button clicked!');
            overlay.classList.add('active');
            renderDrawingTools();
        });
        console.log('✓ Click listener added to Explore button');
    } else {
        console.error('❌ Explore button not found!');
    }
    
    // Close drawing tools
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
        });
    }
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
}

// Symbol List
function initSymbolList() {
    const overlay = document.getElementById('symbol-overlay');
    const openBtn = document.querySelector('.nav-btn:nth-child(2)'); // Chart button
    const closeBtn = document.getElementById('close-symbol');
    const searchInput = document.getElementById('symbol-search');
    const symbolList = document.getElementById('symbol-list');
    
    let allSymbols = [];
    let filteredSymbols = [];
    
    // Get all symbols from window.symbolConfig
    function getAllSymbols() {
        const symbols = [];
        
        if (window.symbolConfig) {
            Object.keys(window.symbolConfig).forEach(datasourceId => {
                const datasourceSymbols = window.symbolConfig[datasourceId];
                
                datasourceSymbols.forEach(symbol => {
                    symbols.push({
                        symbol: symbol.symbol,
                        description: symbol.description || symbol.symbol,
                        exchange: symbol.exchange || datasourceId.toUpperCase(),
                        datasourceId: datasourceId
                    });
                });
            });
        }
        
        return symbols;
    }
    
    // Render symbols grouped by exchange
    function renderSymbols(symbols) {
        symbolList.innerHTML = '';
        
        if (symbols.length === 0) {
            symbolList.innerHTML = '<div style="padding: 20px; text-align: center; color: #787B86;">No symbols found</div>';
            return;
        }
        
        // Group by exchange
        const grouped = {};
        symbols.forEach(symbol => {
            if (!grouped[symbol.exchange]) {
                grouped[symbol.exchange] = [];
            }
            grouped[symbol.exchange].push(symbol);
        });
        
        // Render each group
        Object.keys(grouped).sort().forEach(exchange => {
            const group = document.createElement('div');
            group.className = 'symbol-exchange-group';
            
            const header = document.createElement('div');
            header.className = 'symbol-exchange-header';
            header.textContent = `${exchange} (${grouped[exchange].length})`;
            group.appendChild(header);
            
            grouped[exchange].forEach(symbol => {
                const item = document.createElement('div');
                item.className = 'symbol-item';
                item.innerHTML = `
                    <div class="symbol-item-info">
                        <div class="symbol-item-name">${symbol.symbol}</div>
                        <div class="symbol-item-desc">${symbol.description}</div>
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    loadSymbol(symbol);
                    overlay.classList.remove('active');
                });
                
                group.appendChild(item);
            });
            
            symbolList.appendChild(group);
        });
    }
    
    // Load symbol to chart
    function loadSymbol(symbol) {
        if (!tvWidget) {
            console.error('TradingView widget not initialized');
            return;
        }
        
        try {
            const fullSymbol = symbol.symbol.includes(':') ? symbol.symbol : `${symbol.exchange}:${symbol.symbol}`;
            const chart = tvWidget.activeChart();
            
            console.log(`Loading symbol: ${fullSymbol} with 15m timeframe`);
            
            // First set resolution to 15m
            chart.setResolution('15', () => {
                console.log('✓ Resolution set to 15m');
                
                // Then set symbol (without specifying interval in setSymbol)
                chart.setSymbol(fullSymbol, () => {
                    console.log(`✓ Loaded symbol: ${fullSymbol}`);
                    currentSymbol = fullSymbol;
                    currentTimeframe = '15';
                });
            });
        } catch (error) {
            console.error('Failed to load symbol:', error);
        }
    }
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        if (query === '') {
            filteredSymbols = [...allSymbols];
        } else {
            filteredSymbols = allSymbols.filter(symbol => 
                symbol.symbol.toLowerCase().includes(query) ||
                symbol.description.toLowerCase().includes(query)
            );
        }
        
        renderSymbols(filteredSymbols);
    });
    
    // Open symbol list
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            overlay.classList.add('active');
            
            // Load symbols if not loaded yet
            if (allSymbols.length === 0) {
                allSymbols = getAllSymbols();
                filteredSymbols = [...allSymbols];
            }
            
            searchInput.value = '';
            renderSymbols(filteredSymbols);
        });
    }
    
    // Close symbol list
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
        });
    }
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initTradingView();
        initWatchlist();
        initIndicatorMenu();
        initDrawingTools();
        initSymbolList();
    });
} else {
    initTradingView();
    initWatchlist();
    initIndicatorMenu();
    initDrawingTools();
    initSymbolList();
}
