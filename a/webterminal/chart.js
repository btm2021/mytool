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
let exchange = null;
let lastCandle = null;
let updateInterval = null;
let rawOHLCV = []; // Store raw OHLCV for indicator calculations

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
        // Initialize exchange
        const exchangeClass = ccxt[exchangeId];
        exchange = new exchangeClass({
            enableRateLimit: true,
            timeout: 30000
        });

        await loadMarketData();
        await loadChartData(currentTimeframe);
        setupTimeframeButtons();
        // startRealtimeUpdates();

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
        lineWidth: 1,
        priceLineVisible: false,
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
        lineWidth: 1,
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
        lineWidth: 2,
        lineStyle: 2, // Dashed
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        priceFormat: {
            type: 'price',
            precision: precision,
            minMove: 1 / Math.pow(10, precision)
        }
    });

    // Add VSR Lower line (support)
    vsrLowerSeries = chart.addLineSeries({
        color: 'rgba(33, 150, 243, 0.8)',
        lineWidth: 2,
        lineStyle: 2, // Dashed
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
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
        crosshairMarkerVisible: true,
        title: 'VWAP',
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

            // Restart updates
            startRealtimeUpdates();
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

    // Calculate ATR Bot
    const atrBotData = Indicators.calculateATRBot(rawOHLCV, {
        atrLength: 14,
        atrMult: 2.0,
        emaLength: 30
    });

    if (atrBotData.length === 0) return;

    // Prepare data with dynamic colors based on trend
    const trail1Data = [];
    const trail2Data = [];

    atrBotData.forEach(item => {
        const time = convertToUTC7(item.time);
        const color = item.isUptrend ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';

        trail1Data.push({
            time,
            value: item.trail1
        });
        trail2Data.push({
            time,
            value: item.trail2
        });
    });

    atrBotTrail1Series.setData(trail1Data);
    atrBotTrail2Series.setData(trail2Data);
}

// Update VSR indicator
function updateVSRIndicator() {
    if (!rawOHLCV || rawOHLCV.length === 0) return;

    // Calculate VSR
    const vsrData = Indicators.calculateVSR(rawOHLCV, {
        length: 20,
        threshold: 3.0
    });

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

    vsrUpperSeries.setData(upperData);
    vsrLowerSeries.setData(lowerData);
}

// Update VWAP indicator
function updateVWAPIndicator() {
    if (!rawOHLCV || rawOHLCV.length === 0) return;

    // Calculate VWAP
    const vwapData = Indicators.calculateVWAP(rawOHLCV, {
        resetPeriod: 'daily' // Reset VWAP daily
    });

    if (vwapData.length === 0) return;

    // Prepare data for VWAP line
    const vwapLineData = vwapData.map(item => ({
        time: convertToUTC7(item.time),
        value: item.vwap
    }));

    vwapSeries.setData(vwapLineData);
}

// Start
init();
