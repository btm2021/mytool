// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const exchangeId = urlParams.get('exchange') || 'binance';
const symbol = urlParams.get('symbol') || 'BTC/USDT';
let currentTimeframe = '15m';
let chart = null;
let candlestickSeries = null;
let exchange = null;
let lastCandle = null;
let updateInterval = null;

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

// Load chart data with multiple fetches
async function loadChartData(timeframe) {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('loading').textContent = 'Loading chart data...';

        const tfDuration = getTimeframeDuration(timeframe);
        const batchSize = 1000;
        const batches = Math.ceil(TARGET_CANDLES / batchSize);

        let allOHLCV = [];
        let since = Date.now() - (TARGET_CANDLES * tfDuration);

        for (let i = 0; i < batches; i++) {
            try {
                const loaded = Math.min((i + 1) * batchSize, TARGET_CANDLES);
                document.getElementById('loading').textContent = `Loading candles... ${loaded}/${TARGET_CANDLES}`;

                const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, batchSize);

                if (!ohlcv || ohlcv.length === 0) break;

                allOHLCV = allOHLCV.concat(ohlcv);
                since = ohlcv[ohlcv.length - 1][0] + tfDuration;

                if (ohlcv.length < batchSize) break;

                await sleep(100);

            } catch (error) {
                console.error(`Error fetching batch ${i + 1}:`, error);
                break;
            }
        }

        if (allOHLCV.length === 0) {
            throw new Error('No data received');
        }

        // Remove duplicates
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
    
     chart.timeScale().applyOptions({
            rightOffset: 25,
            barSpacing: 6,           // tăng độ zoom vào
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

// Start real-time updates using polling
function startRealtimeUpdates() {
    document.getElementById('statusText').textContent = 'Live';

    // Update every 3 seconds
    updateInterval = setInterval(async () => {
        try {
            const ohlcv = await exchange.fetchOHLCV(symbol, currentTimeframe, undefined, 2);

            if (ohlcv && ohlcv.length > 0) {
                const latestCandle = ohlcv[ohlcv.length - 1];

                const candle = {
                    time: convertToUTC7(latestCandle[0]),
                    open: latestCandle[1],
                    high: latestCandle[2],
                    low: latestCandle[3],
                    close: latestCandle[4]
                };

                if (candlestickSeries) {
                    candlestickSeries.update(candle);
                    lastCandle = candle;
                }

                document.getElementById('currentPrice').textContent = formatPrice(candle.close);
            }

        } catch (error) {
            console.error('Update error:', error);
        }
    }, 3000);
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

// Start
init();
