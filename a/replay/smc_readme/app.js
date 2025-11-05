document.addEventListener('DOMContentLoaded', async () => {
    // --- GLOBAL DOM ELEMENTS ---
    const symbolListDiv = document.getElementById('symbol-list');
    const symbolSearchInput = document.getElementById('symbol-search');
    const currentSymbolEl = document.getElementById('current-symbol');
    const currentPriceEl = document.getElementById('current-price');
    const priceChangeEl = document.getElementById('price-change');
    const panelTabs = document.querySelectorAll('.panel-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const syncChartsBtn = document.getElementById('sync-charts-btn');

    // --- ANALYSIS PANEL (for Chart 1) ---
    const currentTrendEl = document.getElementById('current-trend');
    const lastBosEl = document.getElementById('last-bos');
    const lastChochEl = document.getElementById('last-choch');
    const structureCountEl = document.getElementById('structure-count');
    const sweepCountEl = document.getElementById('sweep-count');
    const lastSweepEl = document.getElementById('last-sweep');
    const strongHlCountEl = document.getElementById('strong-hl-count');
    const weakHlCountEl = document.getElementById('weak-hl-count');

    // --- GLOBAL STATE ---
    let currentSymbol = 'BTCUSDT';
    let allSymbols = [];
    let symbolPrices = {};
    let ws = null;
    let isSyncEnabled = true;
    let syncInProgress = false;

    // --- DUAL CHART STATE MANAGEMENT ---
    const chartStates = {
        'chart1': {
            id: 'chart1',
            container: document.getElementById('chart-container-1'),
            timeframeSelect: document.getElementById('timeframe-select-1'),
            config: {
                leftBarsInput: document.getElementById('left-bars'),
                rightBarsInput: document.getElementById('right-bars'),
                useBosCheckbox: document.getElementById('use-bos'),
                sweepXCheckbox: document.getElementById('sweep-x'),
                applyBtn: document.getElementById('apply-config'),
            },
            toolBtns: {},
            show: { bos: true, choch: true, ls: false, trend: true, hl: true },
            chart: null, candleSeries: null, timeframe: '15m',
            smcConfig: { leftBars: 8, rightBars: 8, useBos: true, sweepX: true },
            activeLineSeries: {}, smcData: null, candles: [],
            syncPriceLine: null, // To hold the sync price line object
        },
        'chart2': {
            id: 'chart2',
            container: document.getElementById('chart-container-2'),
            timeframeSelect: document.getElementById('timeframe-select-2'),
            config: {
                leftBarsInput: document.getElementById('left-bars-2'),
                rightBarsInput: document.getElementById('right-bars-2'),
                useBosCheckbox: document.getElementById('use-bos-2'),
                sweepXCheckbox: document.getElementById('sweep-x-2'),
                applyBtn: document.getElementById('apply-config-2'),
            },
            toolBtns: {},
            show: { bos: true, choch: true, ls: false, trend: true, hl: true },
            chart: null, candleSeries: null, timeframe: '15m',
            smcConfig: { leftBars: 15, rightBars: 15, useBos: true, sweepX: true },
            activeLineSeries: {}, smcData: null, candles: [],
            syncPriceLine: null, // To hold the sync price line object
        }
    };

    // --- COOKIE & CONFIG FUNCTIONS ---
    function setCookie(name, value, days = 365) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${JSON.stringify(value)};expires=${expires.toUTCString()};path=/`;
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(nameEQ) === 0) try { return JSON.parse(c.substring(nameEQ.length, c.length)); } catch (e) { return null; }
        }
        return null;
    }

    function loadSMCConfig(chartId) {
        const state = chartStates[chartId];
        const savedConfig = getCookie(`smcConfig-${chartId}`);
        if (savedConfig) state.smcConfig = { ...state.smcConfig, ...savedConfig };
        state.config.leftBarsInput.value = state.smcConfig.leftBars;
        state.config.rightBarsInput.value = state.smcConfig.rightBars;
        state.config.useBosCheckbox.checked = state.smcConfig.useBos;
        state.config.sweepXCheckbox.checked = state.smcConfig.sweepX;
    }

    function saveSMCConfig(chartId) {
        setCookie(`smcConfig-${chartId}`, chartStates[chartId].smcConfig);
    }

    // --- CHART FUNCTIONS ---
    function initializeChart(chartId) {
        const state = chartStates[chartId];
        if (state.chart) state.chart.remove();
        state.chart = LightweightCharts.createChart(state.container, {
            width: state.container.offsetWidth, height: state.container.offsetHeight,
            layout: { background: { color: '#0b0e11' }, textColor: '#eaecef' },
            grid: { vertLines: { color: '#1e2329' }, horzLines: { color: '#1e2329' } },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            timeScale: { borderColor: '#2b3139', timeVisible: true, secondsVisible: false, rightOffset: 12 },
            priceScale: { borderColor: '#2b3139', autoScale: true },
        });
        state.candleSeries = state.chart.addCandlestickSeries({
            upColor: 'rgba(14, 203, 129, 0.8)', downColor: 'rgba(246, 70, 93, 0.8)',
            borderVisible: false, wickUpColor: '#0ecb81', wickDownColor: '#f6465d',
        });
        state.timeframe = state.timeframeSelect.value;
        new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== state.container) return;
            state.chart.applyOptions({ width: state.container.offsetWidth, height: state.container.offsetHeight });
        }).observe(state.container);
    }

    async function loadChart(chartId, symbol, interval) {
        const state = chartStates[chartId];
        state.timeframe = interval;
        const limit = 1500;
        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.code && data.msg) throw new Error(data.msg);
            state.candles = data.map(d => ({
                time: d[0] / 1000, open: parseFloat(d[1]), high: parseFloat(d[2]),
                low: parseFloat(d[3]), close: parseFloat(d[4]), volume: parseFloat(d[5]),
                timestamp: d[0]
            }));
            if (state.candles.length === 0) throw new Error('No candle data');
            
            const smc = new SMC(state.smcConfig);
            state.smcData = smc.analyze(state.candles);
            
            const coloredCandles = state.candles.map(c => {
                let candleColor = null;
                const trend = smc.getTrendAtTime(c.timestamp);
                if (state.show.trend && trend) {
                    if (trend.direction === 'bullish') candleColor = 'rgba(14, 203, 129, 0.8)';
                    else if (trend.direction === 'bearish') candleColor = 'rgba(246, 70, 93, 0.8)';
                }
                return { ...c, ...(candleColor && { color: candleColor, wickColor: candleColor }) };
            });
            state.candleSeries.setData(coloredCandles);
            drawSMCStructures(chartId, state.candles, state.smcData);
            if (chartId === 'chart1') updateAnalysisPanel(state.smcData);
        } catch (error) {
            console.error(`Error loading chart ${chartId}:`, error);
            clearChart(chartId);
        }
    }

    function clearChart(chartId) {
        const state = chartStates[chartId];
        if (state.candleSeries) {
            state.candleSeries.setData([]);
            state.candleSeries.setMarkers([]);
        }
        clearLineSeries(chartId);
    }

    function clearLineSeries(chartId) {
        const state = chartStates[chartId];
        Object.values(state.activeLineSeries).flat().forEach(series => {
            if (series) state.chart.removeSeries(series);
        });
        state.activeLineSeries = {};
    }

    function drawSMCStructures(chartId, candles, smcData) {
        clearLineSeries(chartId);
        const state = chartStates[chartId];
        if(!state || !candles || !smcData) return;
        const markers = [];
        const linesData = { bos: [], choch: [], ls: [], hl: [] };
        if (state.show.choch) smcData.chochPoints?.forEach(p => linesData.choch.push({ data: [{ time: candles[p.startIndex].time, value: p.price }, { time: candles[p.endIndex].time, value: p.price }], color: p.direction === 'bullish' ? '#0ecb81' : '#f6465d', style: LightweightCharts.LineStyle.Solid, text: 'CHoCH' }));
        if (state.show.bos) smcData.bosPoints?.forEach(p => linesData.bos.push({ data: [{ time: candles[p.startIndex].time, value: p.price }, { time: candles[p.endIndex].time, value: p.price }], color: p.direction === 'bullish' ? 'rgba(14, 203, 129, 0.7)' : 'rgba(246, 70, 93, 0.7)', style: LightweightCharts.LineStyle.Dotted, text: 'BoS' }));
        if (state.show.ls) smcData.liquiditySweeps?.forEach(p => linesData.ls.push({ data: [{ time: candles[p.startIndex].time, value: p.price }, { time: candles[p.endIndex].time, value: p.price }], color: '#f0b90b', style: LightweightCharts.LineStyle.Dashed, text: 'LS' }));
        const lastCandleTime = candles.length > 0 ? candles[candles.length - 1].time : 0;
        if (state.show.hl) {
            smcData.strongHighs?.filter(p => p.isLast).forEach(p => linesData.hl.push({ data: [{ time: candles[p.index].time, value: p.price }, { time: lastCandleTime, value: p.price }], color: '#e53935', style: LightweightCharts.LineStyle.Dashed, text: 'SH' }));
            smcData.weakHighs?.filter(p => p.isLast).forEach(p => linesData.hl.push({ data: [{ time: candles[p.index].time, value: p.price }, { time: lastCandleTime, value: p.price }], color: '#f57f17', style: LightweightCharts.LineStyle.Dashed, text: 'WH' }));
            smcData.strongLows?.filter(p => p.isLast).forEach(p => linesData.hl.push({ data: [{ time: candles[p.index].time, value: p.price }, { time: lastCandleTime, value: p.price }], color: '#00897b', style: LightweightCharts.LineStyle.Dashed, text: 'SL' }));
            smcData.weakLows?.filter(p => p.isLast).forEach(p => linesData.hl.push({ data: [{ time: candles[p.index].time, value: p.price }, { time: lastCandleTime, value: p.price }], color: '#43a047', style: LightweightCharts.LineStyle.Dashed, text: 'WL' }));
        }
        for (const type in linesData) {
            state.activeLineSeries[type] = [];
            linesData[type].forEach(line => {
                const lineSeries = state.chart.addLineSeries({ color: line.color, lineWidth: 2, lineStyle: line.style, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });
                lineSeries.setData(line.data);
                state.activeLineSeries[type].push(lineSeries);
                const posIndex = candles.findIndex(c => c.time === line.data[0].time);
                if(posIndex !== -1) markers.push({ time: line.data[0].time, position: line.text.includes('H') || (line.text ==='LS' && line.data[0].value > candles[posIndex].close) ? 'aboveBar' : 'belowBar', color: line.color, shape: 'arrowDown', text: line.text, size: 1 });
            });
        }
        if (state.candleSeries) state.candleSeries.setMarkers(markers);
    }
    
    // --- UI UPDATE FUNCTIONS ---
    function updateAnalysisPanel(smcData) {
        const lastTrend = smcData.marketTrends?.[smcData.marketTrends.length - 1];
        if(lastTrend) { currentTrendEl.textContent = lastTrend.direction.toUpperCase(); currentTrendEl.className = `trend-value ${lastTrend.direction}`; }
        else { currentTrendEl.textContent = 'NEUTRAL'; currentTrendEl.className = 'trend-value'; }
        const lastBos = smcData.bosPoints?.[smcData.bosPoints.length - 1]; lastBosEl.textContent = lastBos ? `${formatPrice(lastBos.price)} (${lastBos.direction})` : 'None';
        const lastChoch = smcData.chochPoints?.[smcData.chochPoints.length - 1]; lastChochEl.textContent = lastChoch ? `${formatPrice(lastChoch.price)} (${lastChoch.direction})` : 'None';
        structureCountEl.textContent = (smcData.bosPoints?.length || 0) + (smcData.chochPoints?.length || 0);
        sweepCountEl.textContent = smcData.liquiditySweeps?.length || 0;
        const lastSweep = smcData.liquiditySweeps?.[smcData.liquiditySweeps.length - 1]; lastSweepEl.textContent = lastSweep ? `${formatPrice(lastSweep.price)} (${lastSweep.direction})` : 'None';
        strongHlCountEl.textContent = (smcData.strongHighs?.filter(p=>p.isLast).length || 0) + (smcData.strongLows?.filter(p=>p.isLast).length || 0);
        weakHlCountEl.textContent = (smcData.weakHighs?.filter(p=>p.isLast).length || 0) + (smcData.weakLows?.filter(p=>p.isLast).length || 0);
    }

    function updatePriceDisplay(price, change) {
        currentPriceEl.textContent = formatPrice(price);
        priceChangeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        priceChangeEl.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
    }

    function formatPrice(price) {
        price = parseFloat(price);
        if (price >= 1000) return price.toFixed(2); if (price >= 10) return price.toFixed(3); if (price >= 1) return price.toFixed(4); return price.toFixed(6);
    }
    
    function displaySymbols(symbolsToDisplay) {
        symbolListDiv.innerHTML = '';
        symbolsToDisplay.forEach(symbol => {
            const item = document.createElement('div');
            item.className = 'symbol-item'; if (symbol === currentSymbol) item.classList.add('active');
            item.dataset.symbol = symbol;
            item.innerHTML = `<div class="symbol-name">${symbol.replace('USDT', '')}</div><div class="symbol-price" id="price-${symbol}">${symbolPrices[symbol] ? formatPrice(symbolPrices[symbol]) : '--'}</div>`;
            symbolListDiv.appendChild(item);
        });
    }

    function updateSymbolPriceInList(symbol, price) {
        const el = document.getElementById(`price-${symbol}`); if (el) el.textContent = formatPrice(price);
    }
    
    function updateActiveSymbol(symbol) {
        document.querySelectorAll('.symbol-item').forEach(item => {
            item.classList.toggle('active', item.dataset.symbol === symbol);
            if (item.dataset.symbol === symbol) item.scrollIntoView({ block: 'nearest' });
        });
    }
    
    // --- DATA & WEBSOCKET ---
    async function fetchSymbols() {
        try {
            const response = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
            const data = await response.json();
            allSymbols = data.symbols.filter(s => s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT' && s.status === 'TRADING' && !s.symbol.includes('_')).map(s => s.symbol).sort();
            displaySymbols(allSymbols);
            initializeWebSocket();
        } catch (error) {
            console.error('Error fetching symbols:', error);
            symbolListDiv.innerHTML = '<p style="color: #f6465d; padding: 20px;">Failed to load symbols</p>';
        }
    }

    function initializeWebSocket() {
        if (ws) ws.close();
        ws = new WebSocket('wss://fstream.binance.com/ws/!ticker@arr');
        ws.onmessage = event => {
            JSON.parse(event.data).forEach(item => {
                if (allSymbols.includes(item.s)) {
                    symbolPrices[item.s] = parseFloat(item.p);
                    if (item.s === currentSymbol) updatePriceDisplay(parseFloat(item.p), parseFloat(item.P));
                    updateSymbolPriceInList(item.s, parseFloat(item.p));
                }
            });
        };
        ws.onerror = error => console.error('WebSocket error:', error);
        ws.onclose = () => setTimeout(initializeWebSocket, 5000);
    }

    // --- CHART SYNCHRONIZATION (REVISED AND CORRECTED) ---
    function setupChartSync() {
        const chart1 = chartStates.chart1.chart;
        const chart2 = chartStates.chart2.chart;

        // Sync Time Scale (Pan & Zoom)
        chart1.timeScale().subscribeVisibleLogicalRangeChange(range => {
            if (!isSyncEnabled || syncInProgress) return;
            syncInProgress = true;
            chart2.timeScale().setVisibleLogicalRange(range);
            syncInProgress = false;
        });

        chart2.timeScale().subscribeVisibleLogicalRangeChange(range => {
            if (!isSyncEnabled || syncInProgress) return;
            syncInProgress = true;
            chart1.timeScale().setVisibleLogicalRange(range);
            syncInProgress = false;
        });

        // Sync Crosshair using Price Lines (Corrected Logic)
        const syncCrosshairUsingPriceLine = (sourceState, targetState, param) => {
            if (!isSyncEnabled || !param.point) {
                // If there's no point, it means the mouse left the chart.
                // Remove the existing price line from the target chart.
                if (targetState.syncPriceLine) {
                    targetState.candleSeries.removePriceLine(targetState.syncPriceLine);
                    targetState.syncPriceLine = null;
                }
                return;
            }

            // Get the price from the crosshair position on the source chart
            const price = sourceState.candleSeries.coordinateToPrice(param.point.y);
            
            // Remove the old price line if it exists
            if (targetState.syncPriceLine) {
                targetState.candleSeries.removePriceLine(targetState.syncPriceLine);
            }

            // Create a new price line on the target chart
            targetState.syncPriceLine = targetState.candleSeries.createPriceLine({
                price: price,
                color: '#cccccc',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                axisLabelVisible: true,
                title: '',
            });
        };

        chart1.subscribeCrosshairMove(param => {
            syncCrosshairUsingPriceLine(chartStates.chart1, chartStates.chart2, param);
        });

        chart2.subscribeCrosshairMove(param => {
            syncCrosshairUsingPriceLine(chartStates.chart2, chartStates.chart1, param);
        });
    }
    
    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        symbolListDiv.addEventListener('click', event => {
            const item = event.target.closest('.symbol-item');
            if (item && item.dataset.symbol !== currentSymbol) {
                currentSymbol = item.dataset.symbol;
                currentSymbolEl.textContent = currentSymbol.replace('USDT', '');
                updateActiveSymbol(currentSymbol);
                loadChart('chart1', currentSymbol, chartStates.chart1.timeframe);
                loadChart('chart2', currentSymbol, chartStates.chart2.timeframe);
            }
        });

        symbolSearchInput.addEventListener('input', e => displaySymbols(allSymbols.filter(s => s.includes(e.target.value.toUpperCase()))));
        
        panelTabs.forEach(tab => tab.addEventListener('click', () => {
            panelTabs.forEach(t => t.classList.remove('active')); tab.classList.add('active');
            tabContents.forEach(c => c.classList.remove('active')); document.getElementById(tab.dataset.tab).classList.add('active');
        }));

        syncChartsBtn.addEventListener('click', () => {
            isSyncEnabled = !isSyncEnabled;
            syncChartsBtn.classList.toggle('active');

            // If sync is turned off, remove any existing price lines
            if (!isSyncEnabled) {
                if (chartStates.chart1.syncPriceLine) {
                    chartStates.chart1.candleSeries.removePriceLine(chartStates.chart1.syncPriceLine);
                    chartStates.chart1.syncPriceLine = null;
                }
                if (chartStates.chart2.syncPriceLine) {
                    chartStates.chart2.candleSeries.removePriceLine(chartStates.chart2.syncPriceLine);
                    chartStates.chart2.syncPriceLine = null;
                }
            }
        });

        for (const chartId in chartStates) {
            const state = chartStates[chartId];
            state.timeframeSelect.addEventListener('change', e => loadChart(chartId, currentSymbol, e.target.value));
            state.config.applyBtn.addEventListener('click', () => {
                state.smcConfig = { leftBars: parseInt(state.config.leftBarsInput.value), rightBars: parseInt(state.config.rightBarsInput.value), useBos: state.config.useBosCheckbox.checked, sweepX: state.config.sweepXCheckbox.checked };
                saveSMCConfig(chartId);
                loadChart(chartId, currentSymbol, state.timeframe);
            });
            
            for (const tool in state.toolBtns) {
                state.toolBtns[tool].addEventListener('click', () => {
                    state.show[tool] = !state.show[tool];
                    state.toolBtns[tool].classList.toggle('active');
                    if (tool === 'trend') loadChart(chartId, currentSymbol, state.timeframe);
                    else drawSMCStructures(chartId, state.candles, state.smcData);
                });
            }
        }
    }

    // --- INITIALIZATION ---
    async function init() {
        for (const chartId in chartStates) {
            const chartNum = chartId.slice(-1);
            const state = chartStates[chartId];
            state.toolBtns = {
                bos: document.getElementById(`toggle-bos-${chartNum}`), choch: document.getElementById(`toggle-choch-${chartNum}`),
                ls: document.getElementById(`toggle-ls-${chartNum}`), trend: document.getElementById(`toggle-trend-${chartNum}`),
                hl: document.getElementById(`toggle-hl-${chartNum}`),
            };
            loadSMCConfig(chartId);
            initializeChart(chartId);
        }
        
        setupEventListeners();
        await fetchSymbols();
        setupChartSync(); // Setup sync after charts are initialized

        const defaultSymbol = allSymbols.includes('BTCUSDT') ? 'BTCUSDT' : (allSymbols[0] || '');
        if (defaultSymbol) {
            currentSymbol = defaultSymbol;
            currentSymbolEl.textContent = defaultSymbol.replace('USDT','');
            updateActiveSymbol(defaultSymbol);
            await Promise.all([
                loadChart('chart1', currentSymbol, chartStates.chart1.timeframe),
                loadChart('chart2', currentSymbol, chartStates.chart2.timeframe)
            ]);
        }
    }

    init();
});