// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const exchangeId = urlParams.get('exchange') || 'binance';
const symbol = urlParams.get('symbol') || 'BTC/USDT';
let currentTimeframe = '15m';
let chart = null;
let candlestickSeries = null;
let atrBotTrail1Series = null;
let atrBotTrail2Series = null;
let vsrUpperSeries = null;
let vsrLowerSeries = null;
let vwapSeries = null;
let wmaSeries = null;
let exchange = null;
let lastCandle = null;
let updateInterval = null;
let rawOHLCV = []; // Store raw OHLCV for indicator calculations
let vsrFillPrimitive = null; // Store VSR fill primitive for removal
let atrBotFillPrimitive = null; // Store ATR Bot fill primitive for removal

// PNL Calculator state
let pnlMode = false;
let pnlClickCount = 0;
let pnlFirstPoint = null;
let pnlSecondPoint = null;
let pnlMarkers = [];
let pnlHistory = []; // Array to store PNL calculations
let pnlIdCounter = 0;

// Indicator config
let indicatorConfig = {
    atrBot: { atrLength: 14, atrMult: 2.0, emaLength: 30, show: true },
    vsr: { length: 20, threshold: 3.0, show: true },
    vwap: { resetPeriod: 'daily', show: true },
    wma: { period: 60, show: true },
    pnl: { initialCapital: 2000, defaultLeverage: 20 }
};

// UTC+7 offset (Ho Chi Minh timezone)
const UTC7_OFFSET = 7 * 60 * 60 * 1000;

// Load settings from localStorage
function getSettings() {
    try {
        const saved = localStorage.getItem('appSettings');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return null;
}

// Target candles to load
const settings = getSettings();
const TARGET_CANDLES = settings && settings.chartCandlesLimit ? settings.chartCandlesLimit : 5000;

console.log(`Loading ${TARGET_CANDLES} candles from settings`);

// Initialize
async function init() {
    document.getElementById('chartTitle').textContent = `${symbol} - ${exchangeId.toUpperCase()}`;

    try {
        // Load config first before any calculations
        loadIndicatorConfig();

        // Initialize exchange
        const exchangeClass = ccxt[exchangeId];
        exchange = new exchangeClass({
            enableRateLimit: true,
            timeout: 30000
        });

        await loadMarketData();
        await loadChartData(currentTimeframe);
        setupTimeframeButtons();
        setupPNLCalculator();
        setupConfigModal();

    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('loading').textContent = 'Error: ' + error.message;
    }
}

// Load 24h market data
async function loadMarketData() {
    try {
        const ticker = await exchange.fetchTicker(symbol);

        document.getElementById('currentPrice').textContent = formatPrice(ticker.last);

        const change = ticker.percentage;
        const changeEl = document.getElementById('priceChange');
        changeEl.textContent = change ? change.toFixed(2) + '%' : '-';
        changeEl.className = 'info-value ' + (change >= 0 ? 'price-up' : 'price-down');

        document.getElementById('high24h').textContent = ticker.high ? formatPrice(ticker.high) : '-';
        document.getElementById('low24h').textContent = ticker.low ? formatPrice(ticker.low) : '-';
        document.getElementById('volume24h').textContent = ticker.quoteVolume ? formatVolume(ticker.quoteVolume) : '-';

    } catch (error) {
        console.error('Error loading market data:', error);
    }
}

// Load chart data with parallel fetches using Promise.all
async function loadChartData(timeframe) {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('loading').textContent = 'Loading chart data...';

        const tfDuration = getTimeframeDuration(timeframe);
        const batchSize = 1000;
        const batches = Math.ceil(TARGET_CANDLES / batchSize);

        // Create array of promises for parallel fetching
        const fetchPromises = [];
        const startTime = Date.now() - (TARGET_CANDLES * tfDuration);

        for (let i = 0; i < batches; i++) {
            const since = startTime + (i * batchSize * tfDuration);

            fetchPromises.push(
                exchange.fetchOHLCV(symbol, timeframe, since, batchSize)
                    .then(ohlcv => {
                        const loaded = Math.min((i + 1) * batchSize, TARGET_CANDLES);
                        document.getElementById('loading').textContent = `Loading candles... ${loaded}/${TARGET_CANDLES}`;
                        return ohlcv || [];
                    })
                    .catch(error => {
                        console.error(`Error fetching batch ${i + 1}:`, error);
                        return [];
                    })
            );
        }

        // Wait for all fetches to complete
        document.getElementById('loading').textContent = 'Fetching all batches in parallel...';
        const results = await Promise.all(fetchPromises);

        // Combine all results
        let allOHLCV = [];
        for (const ohlcv of results) {
            if (ohlcv && ohlcv.length > 0) {
                allOHLCV = allOHLCV.concat(ohlcv);
            }
        }

        if (allOHLCV.length === 0) {
            throw new Error('No data received');
        }

        document.getElementById('loading').textContent = 'Processing data...';

        // Remove duplicates and sort
        const uniqueOHLCV = [];
        const timestamps = new Set();

        for (const candle of allOHLCV) {
            if (!timestamps.has(candle[0])) {
                timestamps.add(candle[0]);
                uniqueOHLCV.push(candle);
            }
        }

        uniqueOHLCV.sort((a, b) => a[0] - b[0]);

        console.log(`Loaded ${uniqueOHLCV.length} candles`);

        // Store raw OHLCV for indicator calculations
        rawOHLCV = uniqueOHLCV;

        // Convert to UTC+7
        const candleData = uniqueOHLCV.map(candle => ({
            time: convertToUTC7(candle[0]),
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4]
        }));

        lastCandle = candleData[candleData.length - 1];

        // Calculate precision
        const prices = uniqueOHLCV.map(c => c[4]);
        const minPrice = Math.min(...prices);

        let precision = 2;
        if (minPrice < 0.01) precision = 8;
        else if (minPrice < 1) precision = 6;
        else if (minPrice < 100) precision = 4;

        if (!chart) {
            createChart(precision);
        } else {
            candlestickSeries.applyOptions({
                priceFormat: {
                    type: 'price',
                    precision: precision,
                    minMove: 1 / Math.pow(10, precision)
                }
            });
        }

        candlestickSeries.setData(candleData);

        // Calculate and display indicators
        updateATRBotIndicator();
        updateVSRIndicator();
        updateVWAPIndicator();
        updateWMAIndicator();

        //chart.timeScale().fitContent();

        document.getElementById('loading').style.display = 'none';

    } catch (error) {
        console.error('Error loading chart data:', error);
        document.getElementById('loading').textContent = 'Error: ' + error.message;
    }
}

// Create chart
function createChart(precision) {
    const chartContainer = document.getElementById('chart');

    chart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
        layout: {
            background: { color: '#0a0a0a' },
            textColor: '#888',
        },
        grid: {
            vertLines: { color: '#1a1a1a' },
            horzLines: { color: '#1a1a1a' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: '#333',

            scaleMargins: {
                top: 0.1,
                bottom: 0.1,
            },
        },
        timeScale: {
            borderColor: '#333',
            timeVisible: true,
            secondsVisible: false,
        },
    });

    candlestickSeries = chart.addCandlestickSeries({
        priceFormat: {
            type: 'price',
            precision: precision,
            minMove: 1 / Math.pow(10, precision)
        }
    });

    // Add ATR Bot Trail1 line (green line - upper)
    atrBotTrail1Series = chart.addLineSeries({
        color: '#00ff00',
        lineWidth: 0,
        priceLineVisible: false,
        lineStyle: 1, // Dashed
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: {
            type: 'price',
            precision: precision,
            minMove: 1 / Math.pow(10, precision)
        }
    });

    // Add ATR Bot Trail2 line (red line - lower)
    atrBotTrail2Series = chart.addLineSeries({
        color: '#ff0000',
        lineStyle: 2, // Dashed
        lineWidth: 0,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: {
            type: 'price',
            precision: precision,
            minMove: 1 / Math.pow(10, precision)
        }
    });

    // Add VSR Upper line (resistance)
    vsrUpperSeries = chart.addLineSeries({
        color: 'rgba(33, 150, 243, 0.8)',
        lineWidth: 0,
        lineStyle: 2, // Dashed
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: {
            type: 'price',
            precision: precision,
            minMove: 1 / Math.pow(10, precision)
        }
    });

    // Add VSR Lower line (support)
    vsrLowerSeries = chart.addLineSeries({
        color: 'rgba(33, 150, 243, 0.8)',
        lineWidth: 0,
        lineStyle: 2, // Dashed
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: {
            type: 'price',
            precision: precision,
            minMove: 1 / Math.pow(10, precision)
        }
    });

    // Add VWAP line
    vwapSeries = chart.addLineSeries({
        color: 'rgba(255, 152, 0, 0.9)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: false,
        title: 'VWAP',
        priceFormat: {
            type: 'price',
            precision: precision,
            minMove: 1 / Math.pow(10, precision)
        }
    });

    // Add WMA line
    wmaSeries = chart.addLineSeries({
        color: 'rgba(255, 0, 255, 0.8)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: false,
        title: 'WMA(60)',
        priceFormat: {
            type: 'price',
            precision: precision,
            minMove: 1 / Math.pow(10, precision)
        }
    });

    chart.timeScale().applyOptions({
        rightOffset: 25,
        barSpacing: 6,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
    });

    window.addEventListener('resize', () => {
        chart.applyOptions({
            width: chartContainer.clientWidth,
            height: chartContainer.clientHeight
        });
    });

    // Add click handler for PNL calculator
    chart.subscribeClick(handleChartClick);
}


// Setup timeframe buttons
function setupTimeframeButtons() {
    const buttons = document.querySelectorAll('.timeframe-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const tf = btn.getAttribute('data-tf');
            if (tf === currentTimeframe) return;

            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentTimeframe = tf;

            // Stop updates
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }

            // Reload
            await loadChartData(tf);
        });
    });
}

// Get timeframe duration in ms
function getTimeframeDuration(tf) {
    const map = {
        '1m': 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000
    };
    return map[tf] || 15 * 60 * 1000;
}

// Convert timestamp to UTC+7 (seconds)
function convertToUTC7(timestamp) {
    return Math.floor((timestamp + UTC7_OFFSET) / 1000);
}

// Sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Format price
function formatPrice(price) {
    if (!price) return '-';
    if (price < 0.01) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    if (price < 100) return price.toFixed(4);
    return price.toFixed(2);
}

// Format volume
function formatVolume(volume) {
    if (!volume) return '-';
    if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B';
    if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M';
    if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K';
    return volume.toFixed(2);
}

// Update ATR Bot indicator
function updateATRBotIndicator() {
    if (!rawOHLCV || rawOHLCV.length === 0) return;

    // Hide if disabled
    if (!indicatorConfig.atrBot.show) {
        atrBotTrail1Series.setData([]);
        atrBotTrail2Series.setData([]);

        // Remove fill primitive if exists
        if (atrBotFillPrimitive) {
            candlestickSeries.detachPrimitive(atrBotFillPrimitive);
            atrBotFillPrimitive = null;
        }
        return;
    }

    // Calculate ATR Bot with config
    const atrBotData = Indicators.calculateATRBot(rawOHLCV, indicatorConfig.atrBot);

    if (atrBotData.length === 0) return;

    // Prepare data
    const trail1Data = [];
    const trail2Data = [];

    atrBotData.forEach(item => {
        const time = convertToUTC7(item.time);

        trail1Data.push({
            time,
            value: item.trail1,
            isUptrend: item.isUptrend
        });
        trail2Data.push({
            time,
            value: item.trail2,
            isUptrend: item.isUptrend
        });
    });

    // Remove old fill primitive if exists
    if (atrBotFillPrimitive) {
        candlestickSeries.detachPrimitive(atrBotFillPrimitive);
    }

    // Create and attach new fill primitive
    atrBotFillPrimitive = new ATRBotFillPrimitive(trail1Data, trail2Data, chart, candlestickSeries);
    candlestickSeries.attachPrimitive(atrBotFillPrimitive);

    atrBotTrail1Series.setData(trail1Data);
    atrBotTrail2Series.setData(trail2Data);
}

// Update VSR indicator
function updateVSRIndicator() {
    if (!rawOHLCV || rawOHLCV.length === 0) return;

    // Hide if disabled
    if (!indicatorConfig.vsr.show) {
        vsrUpperSeries.setData([]);
        vsrLowerSeries.setData([]);

        // Remove fill primitive if exists
        if (vsrFillPrimitive) {
            candlestickSeries.detachPrimitive(vsrFillPrimitive);
            vsrFillPrimitive = null;
        }
        return;
    }

    // Calculate VSR with config
    const vsrData = Indicators.calculateVSR(rawOHLCV, indicatorConfig.vsr);

    if (vsrData.length === 0) return;

    // Prepare data for upper and lower lines
    const upperData = [];
    const lowerData = [];

    vsrData.forEach(item => {
        if (item.upper !== null && item.lower !== null) {
            const time = convertToUTC7(item.time);
            upperData.push({ time, value: item.upper });
            lowerData.push({ time, value: item.lower });
        }
    });

    // Debug: log if no data
    if (upperData.length === 0) {
        console.log('VSR: No signals found with current threshold. Try lowering threshold or length.');
        console.log('VSR Config:', indicatorConfig.vsr);
        console.log('Total VSR data points:', vsrData.length);
        console.log('Signals found:', vsrData.filter(d => d.hasSignal).length);
    }

    // Remove old fill primitive if exists
    if (vsrFillPrimitive) {
        candlestickSeries.detachPrimitive(vsrFillPrimitive);
    }

    // Create and attach new fill primitive with chart and series references
    vsrFillPrimitive = new VSRFillPrimitive(upperData, lowerData, chart, candlestickSeries);
    candlestickSeries.attachPrimitive(vsrFillPrimitive);

    // Set data for lines
    vsrUpperSeries.setData(upperData);
    vsrLowerSeries.setData(lowerData);
}

// Update VWAP indicator
function updateVWAPIndicator() {
    if (!rawOHLCV || rawOHLCV.length === 0) return;

    // Hide if disabled
    if (!indicatorConfig.vwap.show) {
        vwapSeries.setData([]);
        return;
    }

    // Calculate VWAP with config
    const vwapData = Indicators.calculateVWAP(rawOHLCV, indicatorConfig.vwap);

    if (vwapData.length === 0) return;

    // Prepare data for VWAP line
    const vwapLineData = vwapData.map(item => ({
        time: convertToUTC7(item.time),
        value: item.vwap
    }));

    vwapSeries.setData(vwapLineData);
}

// Update WMA indicator
function updateWMAIndicator() {
    if (!rawOHLCV || rawOHLCV.length === 0) return;

    // Hide if disabled or config not available
    if (!indicatorConfig.wma || !indicatorConfig.wma.show) {
        wmaSeries.setData([]);
        return;
    }

    // Calculate WMA with config
    const wmaData = Indicators.calculateWMASeries(rawOHLCV, indicatorConfig.wma);

    if (wmaData.length === 0) return;

    // Prepare data for WMA line
    const wmaLineData = wmaData.map(item => ({
        time: convertToUTC7(item.time),
        value: item.wma
    }));

    wmaSeries.setData(wmaLineData);
}

// Setup PNL Calculator
function setupPNLCalculator() {
    const pnlBtn = document.getElementById('pnlBtn');
    const pnlResult = document.getElementById('pnlResult');
    const leverageInput = document.getElementById('pnlLeverage');

    pnlBtn.addEventListener('click', () => {
        pnlMode = !pnlMode;

        if (pnlMode) {
            pnlBtn.classList.add('active');
            pnlBtn.style.background = '#ff8c00';
            pnlBtn.style.color = '#000';
            pnlClickCount = 0;
            pnlFirstPoint = null;
            pnlSecondPoint = null;
            pnlResult.textContent = 'Click 2 points on chart...';

            // Clear existing markers
            clearPNLMarkers();
            updatePNLPanel();
        } else {
            pnlBtn.classList.remove('active');
            pnlBtn.style.background = '';
            pnlBtn.style.color = '';
            pnlResult.textContent = '';
            clearPNLMarkers();
            pnlFirstPoint = null;
            pnlSecondPoint = null;
            updatePNLPanel();
        }
    });

    // Update PNL when leverage changes
    leverageInput.addEventListener('input', () => {
        if (pnlFirstPoint && pnlSecondPoint) {
            updatePNLPanel();
        }
    });
}

// Clear PNL markers (only clears current working markers, not history)
function clearPNLMarkers() {
    if (pnlMarkers.length > 0) {
        const currentMarkers = candlestickSeries.markers();
        const remainingMarkers = currentMarkers.filter(marker => {
            return !pnlMarkers.some(pm =>
                pm.time === marker.time && pm.text === marker.text
            );
        });
        candlestickSeries.setMarkers(remainingMarkers);
        pnlMarkers = [];
    }
}

// Update PNL panel display
function updatePNLPanel() {
    const leverage = parseFloat(document.getElementById('pnlLeverage').value) || indicatorConfig.pnl.defaultLeverage;
    const capital = indicatorConfig.pnl.initialCapital;

    if (!pnlFirstPoint || !pnlSecondPoint) {
        // Reset display
        document.getElementById('pnlEntryPrice').textContent = '-';
        document.getElementById('pnlExitPrice').textContent = '-';
        document.getElementById('pnlChange').textContent = '-';
        document.getElementById('pnlChangePercent').textContent = '-';
        document.getElementById('pnlROE').textContent = '-';
        document.getElementById('pnlAmount').textContent = '-';

        // Remove color classes
        document.getElementById('pnlChange').className = 'pnl-value';
        document.getElementById('pnlChangePercent').className = 'pnl-value';
        document.getElementById('pnlROE').className = 'pnl-value';
        document.getElementById('pnlAmount').className = 'pnl-value';
        return;
    }

    const entryPrice = pnlFirstPoint.price;
    const exitPrice = pnlSecondPoint.price;
    const change = exitPrice - entryPrice;
    const changePercent = (change / entryPrice) * 100;
    const roe = changePercent * leverage;
    const pnlAmount = capital * (roe / 100);

    // Always use neutral color
    document.getElementById('pnlEntryPrice').textContent = formatPrice(entryPrice);
    document.getElementById('pnlExitPrice').textContent = formatPrice(exitPrice);

    document.getElementById('pnlChange').textContent = formatPrice(Math.abs(change));
    document.getElementById('pnlChange').className = 'pnl-value';

    document.getElementById('pnlChangePercent').textContent = changePercent.toFixed(2) + '%';
    document.getElementById('pnlChangePercent').className = 'pnl-value';

    document.getElementById('pnlROE').textContent = roe.toFixed(2) + '%';
    document.getElementById('pnlROE').className = 'pnl-value';

    document.getElementById('pnlAmount').textContent = pnlAmount.toFixed(2) + ' USDT';
    document.getElementById('pnlAmount').className = 'pnl-value';
}

// Add PNL to history
function addPNLToHistory() {
    if (!pnlFirstPoint || !pnlSecondPoint) return;

    const leverage = parseFloat(document.getElementById('pnlLeverage').value) || indicatorConfig.pnl.defaultLeverage;
    const capital = indicatorConfig.pnl.initialCapital;
    const entryPrice = pnlFirstPoint.price;
    const exitPrice = pnlSecondPoint.price;
    const change = exitPrice - entryPrice;
    const changePercent = (change / entryPrice) * 100;
    const roe = changePercent * leverage;
    const pnlAmount = capital * (roe / 100);

    const pnlRecord = {
        id: pnlIdCounter++,
        entryPrice: entryPrice,
        exitPrice: exitPrice,
        change: change,
        changePercent: changePercent,
        roe: roe,
        pnlAmount: pnlAmount,
        leverage: leverage,
        markers: [...pnlMarkers],
        timestamp: Date.now()
    };

    pnlHistory.push(pnlRecord);
    updatePNLHistoryTable();
}

// Update PNL history display
function updatePNLHistoryTable() {
    const tbody = document.getElementById('pnlHistoryBody');
    tbody.innerHTML = '';

    if (pnlHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888; padding: 20px;">No history yet</td></tr>';
        return;
    }

    pnlHistory.forEach(record => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${formatPrice(record.entryPrice)}</td>
            <td>${formatPrice(record.exitPrice)}</td>
            <td>${record.roe.toFixed(2)}%</td>
            <td>${record.pnlAmount.toFixed(2)}</td>
            <td><button class="pnl-delete-btn" data-id="${record.id}">×</button></td>
        `;

        tbody.appendChild(row);
    });

    // Add delete event listeners
    document.querySelectorAll('.pnl-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            deletePNLRecord(id);
        });
    });
}

// Delete PNL record
function deletePNLRecord(id) {
    const recordIndex = pnlHistory.findIndex(r => r.id === id);
    if (recordIndex === -1) return;

    const record = pnlHistory[recordIndex];

    // Remove markers from chart
    const currentMarkers = candlestickSeries.markers();
    const remainingMarkers = currentMarkers.filter(marker => {
        return !record.markers.some(rm =>
            rm.time === marker.time && rm.text === marker.text
        );
    });

    candlestickSeries.setMarkers(remainingMarkers);

    // Remove from history
    pnlHistory.splice(recordIndex, 1);
    updatePNLHistoryTable();
}

// Handle chart click for PNL
function handleChartClick(param) {
    if (!pnlMode || !param.time) return;

    const time = param.time;

    // Find the candle data at this time
    const candleIndex = rawOHLCV.findIndex(c => convertToUTC7(c[0]) === time);
    if (candleIndex === -1) return;

    const candle = rawOHLCV[candleIndex];
    const high = candle[2];
    const low = candle[3];

    if (pnlClickCount === 0) {
        // First click - record high price
        pnlFirstPoint = {
            time: time,
            price: high,
            candle: candle
        };

        // Add marker
        const marker = {
            time: time,
            position: 'aboveBar',
            color: '#ffb000',
            shape: 'arrowDown',
            text: 'Entry: ' + formatPrice(high)
        };

        // Get all existing markers and add new one
        const existingMarkers = candlestickSeries.markers();
        candlestickSeries.setMarkers([...existingMarkers, marker]);
        pnlMarkers.push(marker);

        pnlClickCount = 1;
        document.getElementById('pnlResult').textContent = `Entry: ${formatPrice(high)} - Click exit point...`;

        // Update panel with entry only
        document.getElementById('pnlEntryPrice').textContent = formatPrice(high);

    } else if (pnlClickCount === 1) {
        // Second click - record low price and calculate
        pnlSecondPoint = {
            time: time,
            price: low,
            candle: candle
        };

        // Calculate PNL %
        const entryPrice = pnlFirstPoint.price;
        const exitPrice = pnlSecondPoint.price;
        const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
        const pnlColor = pnlPercent >= 0 ? '#00ff00' : '#ff0000';

        // Add exit marker
        const marker = {
            time: time,
            position: 'belowBar',
            color: '#ffb000',
            shape: 'arrowUp',
            text: 'Exit: ' + formatPrice(low)
        };

        // Get all existing markers and add new one
        const existingMarkers = candlestickSeries.markers();
        candlestickSeries.setMarkers([...existingMarkers, marker]);
        pnlMarkers.push(marker);

        // Display result in header
        const resultText = `PNL: ${pnlPercent.toFixed(2)}%`;
        document.getElementById('pnlResult').textContent = resultText;
        document.getElementById('pnlResult').style.color = '#ffb000'; // Neutral color

        // Update panel with full calculation
        updatePNLPanel();

        // Add to history
        addPNLToHistory();

        // Reset for next calculation but keep markers
        pnlClickCount = 0;
        pnlMarkers = []; // Clear current markers array (they're saved in history)

    }
}

// ATR Bot Fill Primitive
class ATRBotFillPrimitive {
    constructor(trail1Data, trail2Data, chartInstance, seriesInstance) {
        this._trail1Data = trail1Data;
        this._trail2Data = trail2Data;
        this._chart = chartInstance;
        this._series = seriesInstance;
    }

    updateAllViews() {
        // Required method
    }

    paneViews() {
        return [this];
    }

    renderer() {
        return new ATRBotFillRenderer(this._trail1Data, this._trail2Data, this._chart, this._series);
    }
}

class ATRBotFillRenderer {
    constructor(trail1Data, trail2Data, chartInstance, seriesInstance) {
        this._trail1Data = trail1Data;
        this._trail2Data = trail2Data;
        this._chart = chartInstance;
        this._series = seriesInstance;
    }

    draw(target) {
        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;

            if (!this._trail1Data || this._trail1Data.length === 0) return;
            if (!this._trail2Data || this._trail2Data.length === 0) return;

            ctx.save();
            ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);

            const timeScale = this._chart.timeScale();

            // Group by trend
            let segments = [];
            let currentSegment = null;

            for (let i = 0; i < this._trail1Data.length; i++) {
                const trail1Point = this._trail1Data[i];
                const trail2Point = this._trail2Data[i];

                const x = timeScale.timeToCoordinate(trail1Point.time);
                const y1 = this._series.priceToCoordinate(trail1Point.value);
                const y2 = this._series.priceToCoordinate(trail2Point.value);

                if (x === null || y1 === null || y2 === null) continue;

                if (!currentSegment || currentSegment.isUptrend !== trail1Point.isUptrend) {
                    if (currentSegment && currentSegment.points.length > 0) {
                        segments.push(currentSegment);
                    }
                    currentSegment = {
                        isUptrend: trail1Point.isUptrend,
                        points: []
                    };
                }

                currentSegment.points.push({ x, y1, y2 });
            }

            if (currentSegment && currentSegment.points.length > 0) {
                segments.push(currentSegment);
            }

            // Draw each segment
            segments.forEach(segment => {
                if (segment.points.length < 2) return;

                const color = segment.isUptrend
                    ? 'rgba(0, 255, 0, 0.15)'
                    : 'rgba(255, 0, 0, 0.15)';

                ctx.fillStyle = color;
                ctx.beginPath();

                // Draw trail1 line
                ctx.moveTo(segment.points[0].x, segment.points[0].y1);
                for (let i = 1; i < segment.points.length; i++) {
                    ctx.lineTo(segment.points[i].x, segment.points[i].y1);
                }

                // Draw trail2 line in reverse
                for (let i = segment.points.length - 1; i >= 0; i--) {
                    ctx.lineTo(segment.points[i].x, segment.points[i].y2);
                }

                ctx.closePath();
                ctx.fill();
            });

            ctx.restore();
        });
    }
}

// VSR Fill Primitive
class VSRFillPrimitive {
    constructor(upperData, lowerData, chartInstance, seriesInstance) {
        this._upperData = upperData;
        this._lowerData = lowerData;
        this._chart = chartInstance;
        this._series = seriesInstance;
    }

    updateAllViews() {
        // Required method
    }

    paneViews() {
        return [this];
    }

    renderer() {
        return new VSRFillRenderer(this._upperData, this._lowerData, this._chart, this._series);
    }
}

class VSRFillRenderer {
    constructor(upperData, lowerData, chartInstance, seriesInstance) {
        this._upperData = upperData;
        this._lowerData = lowerData;
        this._chart = chartInstance;
        this._series = seriesInstance;
    }

    draw(target) {
        target.useBitmapCoordinateSpace(scope => {
            const ctx = scope.context;

            if (!this._upperData || this._upperData.length === 0) return;
            if (!this._lowerData || this._lowerData.length === 0) return;

            ctx.save();
            ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);

            const points = [];
            const timeScale = this._chart.timeScale();

            // Collect points
            for (let i = 0; i < this._upperData.length; i++) {
                const upperPoint = this._upperData[i];
                const lowerPoint = this._lowerData[i];

                const x = timeScale.timeToCoordinate(upperPoint.time);
                const y1 = this._series.priceToCoordinate(upperPoint.value);
                const y2 = this._series.priceToCoordinate(lowerPoint.value);

                if (x !== null && y1 !== null && y2 !== null) {
                    points.push({ x, y1, y2 });
                }
            }

            if (points.length < 2) {
                ctx.restore();
                return;
            }

            // Draw fill
            ctx.fillStyle = 'rgba(33, 150, 243, 0.15)';
            ctx.beginPath();

            // Draw upper line
            ctx.moveTo(points[0].x, points[0].y1);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y1);
            }

            // Draw lower line in reverse
            for (let i = points.length - 1; i >= 0; i--) {
                ctx.lineTo(points[i].x, points[i].y2);
            }

            ctx.closePath();
            ctx.fill();

            ctx.restore();
        });
    }
}

// Setup config modal
function setupConfigModal() {
    const modal = document.getElementById('configModal');
    const configBtn = document.getElementById('configBtn');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelConfig');
    const saveBtn = document.getElementById('saveConfig');

    // Open modal
    configBtn.addEventListener('click', () => {
        loadConfigToModal();
        modal.classList.add('show');
    });

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Save config
    saveBtn.addEventListener('click', () => {
        saveIndicatorConfig();
        modal.classList.remove('show');

        // Reload page to apply new settings
        location.reload();
    });
}

// Load config from localStorage
function loadIndicatorConfig() {
    try {
        const saved = localStorage.getItem('indicatorConfig');
        if (saved) {
            const savedConfig = JSON.parse(saved);

            // Merge with defaults to handle missing properties
            indicatorConfig = {
                atrBot: { ...indicatorConfig.atrBot, ...savedConfig.atrBot },
                vsr: { ...indicatorConfig.vsr, ...savedConfig.vsr },
                vwap: { ...indicatorConfig.vwap, ...savedConfig.vwap },
                wma: { ...indicatorConfig.wma, ...(savedConfig.wma || {}) },
                pnl: { ...indicatorConfig.pnl, ...savedConfig.pnl }
            };
        }

        // Set leverage input
        document.getElementById('pnlLeverage').value = indicatorConfig.pnl.defaultLeverage;
    } catch (error) {
        console.error('Error loading indicator config:', error);
    }
}

// Load config values to modal inputs
function loadConfigToModal() {
    document.getElementById('showATRBot').checked = indicatorConfig.atrBot.show !== false;
    document.getElementById('atrLength').value = indicatorConfig.atrBot.atrLength;
    document.getElementById('atrMult').value = indicatorConfig.atrBot.atrMult;
    document.getElementById('emaLength').value = indicatorConfig.atrBot.emaLength;

    document.getElementById('showVSR').checked = indicatorConfig.vsr.show !== false;
    document.getElementById('vsrLength').value = indicatorConfig.vsr.length;
    document.getElementById('vsrThreshold').value = indicatorConfig.vsr.threshold;

    document.getElementById('showVWAP').checked = indicatorConfig.vwap.show !== false;
    document.getElementById('vwapReset').value = indicatorConfig.vwap.resetPeriod;

    document.getElementById('showWMA').checked = indicatorConfig.wma?.show !== false;
    document.getElementById('wmaPeriod').value = indicatorConfig.wma?.period || 60;

    document.getElementById('initialCapital').value = indicatorConfig.pnl.initialCapital;
    document.getElementById('defaultLeverage').value = indicatorConfig.pnl.defaultLeverage;
}

// Save config to localStorage
function saveIndicatorConfig() {
    indicatorConfig.atrBot.show = document.getElementById('showATRBot').checked;
    indicatorConfig.atrBot.atrLength = parseInt(document.getElementById('atrLength').value);
    indicatorConfig.atrBot.atrMult = parseFloat(document.getElementById('atrMult').value);
    indicatorConfig.atrBot.emaLength = parseInt(document.getElementById('emaLength').value);

    indicatorConfig.vsr.show = document.getElementById('showVSR').checked;
    indicatorConfig.vsr.length = parseInt(document.getElementById('vsrLength').value);
    indicatorConfig.vsr.threshold = parseFloat(document.getElementById('vsrThreshold').value);

    indicatorConfig.vwap.show = document.getElementById('showVWAP').checked;
    indicatorConfig.vwap.resetPeriod = document.getElementById('vwapReset').value;

    indicatorConfig.wma.show = document.getElementById('showWMA').checked;
    indicatorConfig.wma.period = parseInt(document.getElementById('wmaPeriod').value);

    indicatorConfig.pnl.initialCapital = parseFloat(document.getElementById('initialCapital').value);
    indicatorConfig.pnl.defaultLeverage = parseInt(document.getElementById('defaultLeverage').value);

    try {
        localStorage.setItem('indicatorConfig', JSON.stringify(indicatorConfig));
        console.log('Indicator config saved');
    } catch (error) {
        console.error('Error saving indicator config:', error);
    }
}

// Start
init();
