// Chart Vue App
new Vue({
    el: '#app',
    data: {
        // URL params
        exchangeId: new URLSearchParams(window.location.search).get('exchange') || 'binance',
        symbol: new URLSearchParams(window.location.search).get('symbol') || 'BTC/USDT',

        // Chart state
        chartTitle: 'Loading...',
        currentTimeframe: '15m',
        timeframes: ['1m', '5m', '15m', '1h', '4h', '1d'],
        loading: true,
        loadingText: 'Loading chart data...',
        statusText: 'Connecting...',

        // Market data
        marketData: {
            price: '-',
            change: '-',
            changeClass: '',
            high: '-',
            low: '-',
            volume: '-'
        },

        // PNL state
        pnlMode: false,
        pnlMessage: '',
        pnlClickCount: 0,
        pnlFirstPoint: null,
        pnlSecondPoint: null,
        pnlMarkers: [],
        pnlHistory: [],
        pnlIdCounter: 0,

        pnl: {
            direction: '-',
            entryPrice: '-',
            exitPrice: '-',
            priceChange: '-',
            leverage: 20,
            pnlPercent: '-',
            pnlAmount: '-',
            finalCapital: '-',
            pnlClass: '',
            finalClass: ''
        },

        // Config
        showConfigModal: false,
        config: {
            atrBot: { atrLength: 14, atrMult: 2.0, emaLength: 30, show: true },
            vsr: { length: 20, threshold: 3.0, show: true },
            vwap: { resetPeriod: 'daily', show: false },
            wma: { period: 60, show: false },
            hma: { period: 60, show: false },
            pnl: { initialCapital: 200, defaultLeverage: 20 }
        },

        // Chart instances
        chart: null,
        candlestickSeries: null,
        exchange: null,
        rawOHLCV: [],

        // Indicator series
        atrBotTrail1Series: null,
        atrBotTrail2Series: null,
        vsrUpperSeries: null,
        vsrLowerSeries: null,
        vwapSeries: null,
        wmaSeries: null,
        hmaSeries: null,

        // Constants
        UTC7_OFFSET: 7 * 60 * 60 * 1000,
        TARGET_CANDLES: 5000
    },

    mounted() {
        this.chartTitle = `${this.symbol} - ${this.exchangeId.toUpperCase()}`;
        this.loadConfig();
        this.init();
    },

    methods: {
        async init() {
            try {
                // Initialize exchange
                const exchangeClass = ccxt[this.exchangeId];
                this.exchange = new exchangeClass({
                    enableRateLimit: true,
                    timeout: 30000
                });

                await this.loadMarketData();
                await this.loadChartData(this.currentTimeframe);
                this.setupChartClickHandler();

            } catch (error) {
                console.error('Initialization error:', error);
                this.loadingText = 'Error: ' + error.message;
            }
        },

        async loadMarketData() {
            try {
                const ticker = await this.exchange.fetchTicker(this.symbol);

                this.marketData.price = this.formatPrice(ticker.last);
                const change = ticker.percentage;
                this.marketData.change = change ? change.toFixed(2) + '%' : '-';
                this.marketData.changeClass = change >= 0 ? 'price-up' : 'price-down';
                this.marketData.high = this.formatPrice(ticker.high);
                this.marketData.low = this.formatPrice(ticker.low);
                this.marketData.volume = this.formatVolume(ticker.quoteVolume || ticker.baseVolume);

            } catch (error) {
                console.error('Error loading market data:', error);
            }
        },

        async loadChartData(timeframe) {
            this.loading = true;
            this.loadingText = 'Loading chart data...';
            this.statusText = 'Loading...';

            try {
                const limit = 1000;
                const batches = Math.ceil(this.TARGET_CANDLES / limit);
                const promises = [];

                for (let i = 0; i < batches; i++) {
                    const since = Date.now() - (this.TARGET_CANDLES - i * limit) * this.getTimeframeDuration(timeframe);
                    promises.push(this.exchange.fetchOHLCV(this.symbol, timeframe, since, limit));
                    await this.sleep(100);
                }

                const results = await Promise.all(promises);
                let allOHLCV = [];
                results.forEach(batch => {
                    if (batch && batch.length > 0) {
                        allOHLCV = allOHLCV.concat(batch);
                    }
                });

                // Remove duplicates
                const uniqueMap = new Map();
                allOHLCV.forEach(candle => {
                    uniqueMap.set(candle[0], candle);
                });
                this.rawOHLCV = Array.from(uniqueMap.values()).sort((a, b) => a[0] - b[0]);

                this.createChart();
                this.updateAllIndicators();

                this.loading = false;
                this.statusText = 'Live';

            } catch (error) {
                console.error('Error loading chart data:', error);
                this.loadingText = 'Error: ' + error.message;
            }
        },

        createChart() {
            const chartContainer = document.getElementById('chart');
            chartContainer.innerHTML = '';

            this.chart = LightweightCharts.createChart(chartContainer, {
                width: chartContainer.clientWidth,
                height: chartContainer.clientHeight,
                layout: {
                    background: { color: '#0a0a0a' },
                    textColor: '#e0e0e0'
                },
                grid: {
                    vertLines: { color: '#1a1a1a' },
                    horzLines: { color: '#1a1a1a' }
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                    borderColor: '#333'
                },
                rightPriceScale: {
                    borderColor: '#333'
                }
            });

            this.candlestickSeries = this.chart.addCandlestickSeries({
                upColor: '#00ff00',
                downColor: '#ff0000',
                borderUpColor: '#00ff00',
                borderDownColor: '#ff0000',
                wickUpColor: '#00ff00',
                wickDownColor: '#ff0000'
            });

            const chartData = this.rawOHLCV.map(candle => ({
                time: this.convertToUTC7(candle[0]),
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4]
            }));

            this.candlestickSeries.setData(chartData);

            window.addEventListener('resize', () => {
                this.chart.applyOptions({
                    width: chartContainer.clientWidth,
                    height: chartContainer.clientHeight
                });
            });
        },

        updateAllIndicators() {
            this.updateATRBot();
            this.updateVSR();
            this.updateVWAP();
            this.updateWMA();
            this.updateHMA();
        },

        updateATRBot() {
            if (this.atrBotTrail1Series) {
                this.chart.removeSeries(this.atrBotTrail1Series);
                this.atrBotTrail1Series = null;
            }
            if (this.atrBotTrail2Series) {
                this.chart.removeSeries(this.atrBotTrail2Series);
                this.atrBotTrail2Series = null;
            }

            if (!this.config.atrBot.show || !this.rawOHLCV.length) return;

            const data = Indicators.calculateATRBot(this.rawOHLCV, this.config.atrBot);
            if (!data.length) return;

            this.atrBotTrail1Series = this.chart.addLineSeries({
                color: '#2962FF',
                lineWidth: 2,
                title: 'ATR Bot Trail1'
            });

            this.atrBotTrail2Series = this.chart.addLineSeries({
                color: '#FF6D00',
                lineWidth: 2,
                title: 'ATR Bot Trail2'
            });

            const trail1Data = data.map(d => ({ time: this.convertToUTC7(d.time), value: d.trail1 }));
            const trail2Data = data.map(d => ({ time: this.convertToUTC7(d.time), value: d.trail2 }));

            this.atrBotTrail1Series.setData(trail1Data);
            this.atrBotTrail2Series.setData(trail2Data);
        },

        updateVSR() {
            if (this.vsrUpperSeries) {
                this.chart.removeSeries(this.vsrUpperSeries);
                this.vsrUpperSeries = null;
            }
            if (this.vsrLowerSeries) {
                this.chart.removeSeries(this.vsrLowerSeries);
                this.vsrLowerSeries = null;
            }

            if (!this.config.vsr.show || !this.rawOHLCV.length) return;

            const data = Indicators.calculateVSR(this.rawOHLCV, this.config.vsr);
            if (!data.length) return;

            this.vsrUpperSeries = this.chart.addLineSeries({
                color: '#26a69a',
                lineWidth: 1,
                lineStyle: 2,
                title: 'VSR Upper'
            });

            this.vsrLowerSeries = this.chart.addLineSeries({
                color: '#ef5350',
                lineWidth: 1,
                lineStyle: 2,
                title: 'VSR Lower'
            });

            const upperData = data.map(d => ({ time: this.convertToUTC7(d.time), value: d.upper }));
            const lowerData = data.map(d => ({ time: this.convertToUTC7(d.time), value: d.lower }));

            this.vsrUpperSeries.setData(upperData);
            this.vsrLowerSeries.setData(lowerData);
        },

        updateVWAP() {
            if (this.vwapSeries) {
                this.chart.removeSeries(this.vwapSeries);
                this.vwapSeries = null;
            }

            if (!this.config.vwap.show || !this.rawOHLCV.length) return;

            const data = Indicators.calculateVWAP(this.rawOHLCV, this.config.vwap);
            if (!data.length) return;

            this.vwapSeries = this.chart.addLineSeries({
                color: '#9C27B0',
                lineWidth: 2,
                title: 'VWAP'
            });

            const vwapData = data.map(d => ({ time: this.convertToUTC7(d.time), value: d.vwap }));
            this.vwapSeries.setData(vwapData);
        },

        updateWMA() {
            if (this.wmaSeries) {
                this.chart.removeSeries(this.wmaSeries);
                this.wmaSeries = null;
            }

            if (!this.config.wma.show || !this.rawOHLCV.length) return;

            const data = Indicators.calculateWMASeries(this.rawOHLCV, this.config.wma);
            if (!data.length) return;

            this.wmaSeries = this.chart.addLineSeries({
                color: '#00BCD4',
                lineWidth: 2,
                title: `WMA ${this.config.wma.period}`
            });

            const wmaData = data.map(d => ({ time: this.convertToUTC7(d.time), value: d.wma }));
            this.wmaSeries.setData(wmaData);
        },

        updateHMA() {
            if (this.hmaSeries) {
                this.chart.removeSeries(this.hmaSeries);
                this.hmaSeries = null;
            }

            if (!this.config.hma.show || !this.rawOHLCV.length) return;

            const data = Indicators.calculateHMASeries(this.rawOHLCV, this.config.hma);
            if (!data.length) return;

            this.hmaSeries = this.chart.addLineSeries({
                color: '#FF9800',
                lineWidth: 2,
                title: `HMA ${this.config.hma.period}`
            });

            const hmaData = data.map(d => ({ time: this.convertToUTC7(d.time), value: d.hma }));
            this.hmaSeries.setData(hmaData);
        },

        async changeTimeframe(tf) {
            this.currentTimeframe = tf;
            await this.loadChartData(tf);
        },

        togglePNL() {
            this.pnlMode = !this.pnlMode;
            if (this.pnlMode) {
                this.pnlMessage = 'Click on chart to select entry point';
            } else {
                this.pnlMessage = '';
                this.clearPNLMarkers();
                this.pnlClickCount = 0;
                this.pnlFirstPoint = null;
                this.pnlSecondPoint = null;
            }
        },

        setupChartClickHandler() {
            this.chart.subscribeClick((param) => {
                if (!this.pnlMode || !param.time) return;

                const price = param.seriesData.get(this.candlestickSeries)?.close;
                if (!price) return;

                this.handlePNLClick(param.time, price);
            });
        },

        handlePNLClick(time, price) {
            this.pnlClickCount++;

            if (this.pnlClickCount === 1) {
                const isLong = confirm('Click OK for LONG, Cancel for SHORT');
                this.pnlFirstPoint = {
                    time: time,
                    price: price,
                    position: isLong ? 'belowBar' : 'aboveBar',
                    isLong: isLong
                };

                const marker = {
                    time: time,
                    position: this.pnlFirstPoint.position,
                    color: isLong ? '#00ff00' : '#ff0000',
                    shape: 'arrowUp',
                    text: isLong ? 'LONG' : 'SHORT'
                };

                this.pnlMarkers.push(marker);
                const allMarkers = [...this.candlestickSeries.markers(), marker];
                this.candlestickSeries.setMarkers(allMarkers);

                this.pnlMessage = 'Click on chart to select exit point';

            } else if (this.pnlClickCount === 2) {
                this.pnlSecondPoint = {
                    time: time,
                    price: price,
                    position: this.pnlFirstPoint.position === 'belowBar' ? 'aboveBar' : 'belowBar'
                };

                const marker = {
                    time: time,
                    position: this.pnlSecondPoint.position,
                    color: '#ffb000',
                    shape: 'arrowDown',
                    text: 'EXIT'
                };

                this.pnlMarkers.push(marker);
                const allMarkers = [...this.candlestickSeries.markers(), marker];
                this.candlestickSeries.setMarkers(allMarkers);

                this.calculatePNL();
                this.addPNLToHistory();

                this.pnlClickCount = 0;
                this.pnlFirstPoint = null;
                this.pnlSecondPoint = null;
                this.pnlMarkers = [];
                this.pnlMessage = 'Click on chart to select entry point';
            }
        },

        calculatePNL() {
            if (!this.pnlFirstPoint || !this.pnlSecondPoint) return;

            const entryPrice = this.pnlFirstPoint.price;
            const exitPrice = this.pnlSecondPoint.price;
            const isLong = this.pnlFirstPoint.isLong;
            const capital = this.config.pnl.initialCapital;

            const priceChange = exitPrice - entryPrice;
            const priceChangePercent = (priceChange / entryPrice) * 100;
            const pnlPercent = isLong ? priceChangePercent * this.pnl.leverage : -priceChangePercent * this.pnl.leverage;
            const pnlAmount = (capital * pnlPercent) / 100;
            const finalCapital = capital + pnlAmount;

            this.pnl.direction = isLong ? 'LONG' : 'SHORT';
            this.pnl.entryPrice = this.formatPrice(entryPrice);
            this.pnl.exitPrice = this.formatPrice(exitPrice);
            this.pnl.priceChange = priceChangePercent.toFixed(2) + '%';
            this.pnl.pnlPercent = pnlPercent.toFixed(2) + '%';
            this.pnl.pnlAmount = '$' + pnlAmount.toFixed(2);
            this.pnl.finalCapital = '$' + finalCapital.toFixed(2);
            this.pnl.pnlClass = pnlPercent >= 0 ? 'positive' : 'negative';
            this.pnl.finalClass = finalCapital >= capital ? 'positive' : 'negative';
        },

        updatePNL() {
            if (this.pnlFirstPoint && this.pnlSecondPoint) {
                this.calculatePNL();
            }
        },

        addPNLToHistory() {
            if (!this.pnlFirstPoint || !this.pnlSecondPoint) return;

            const entryPrice = this.pnlFirstPoint.price;
            const exitPrice = this.pnlSecondPoint.price;
            const isLong = this.pnlFirstPoint.isLong;
            const capital = this.config.pnl.initialCapital;
            const priceChange = exitPrice - entryPrice;
            const priceChangePercent = (priceChange / entryPrice) * 100;
            const pnlPercent = isLong ? priceChangePercent * this.pnl.leverage : -priceChangePercent * this.pnl.leverage;
            const pnlAmount = (capital * pnlPercent) / 100;

            this.pnlHistory.unshift({
                id: this.pnlIdCounter++,
                direction: isLong ? 'LONG' : 'SHORT',
                entryPrice: entryPrice,
                exitPrice: exitPrice,
                leverage: this.pnl.leverage,
                pnlPercent: pnlPercent,
                pnlAmount: pnlAmount,
                markers: [...this.pnlMarkers]
            });
        },

        deletePNLRecord(id) {
            const recordIndex = this.pnlHistory.findIndex(r => r.id === id);
            if (recordIndex === -1) return;

            const record = this.pnlHistory[recordIndex];
            const currentMarkers = this.candlestickSeries.markers();
            const filteredMarkers = currentMarkers.filter(m =>
                !record.markers.some(rm => rm.time === m.time && rm.position === m.position)
            );
            this.candlestickSeries.setMarkers(filteredMarkers);

            this.pnlHistory.splice(recordIndex, 1);
        },

        clearPNLMarkers() {
            if (this.pnlMarkers.length > 0) {
                const currentMarkers = this.candlestickSeries.markers();
                const historyMarkers = this.pnlHistory.flatMap(h => h.markers);
                const filteredMarkers = currentMarkers.filter(m =>
                    historyMarkers.some(hm => hm.time === m.time && hm.position === m.position)
                );
                this.candlestickSeries.setMarkers(filteredMarkers);
                this.pnlMarkers = [];
            }
        },

        saveConfig() {
            try {
                localStorage.setItem('indicatorConfig', JSON.stringify(this.config));
                this.showConfigModal = false;
                this.updateAllIndicators();
            } catch (error) {
                console.error('Error saving config:', error);
            }
        },

        loadConfig() {
            try {
                const saved = localStorage.getItem('indicatorConfig');
                if (saved) {
                    const config = JSON.parse(saved);
                    Object.assign(this.config, config);
                    this.pnl.leverage = this.config.pnl.defaultLeverage;
                }
            } catch (error) {
                console.error('Error loading config:', error);
            }
        },

        // Utility methods
        convertToUTC7(timestamp) {
            return Math.floor((timestamp + this.UTC7_OFFSET) / 1000);
        },

        formatPrice(price) {
            if (!price) return '-';
            if (price < 0.01) return price.toFixed(8);
            if (price < 1) return price.toFixed(6);
            return price.toFixed(2);
        },

        formatVolume(volume) {
            if (!volume) return '-';
            if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B';
            if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M';
            if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K';
            return volume.toFixed(2);
        },

        getTimeframeDuration(tf) {
            const map = {
                '1m': 60 * 1000,
                '5m': 5 * 60 * 1000,
                '15m': 15 * 60 * 1000,
                '1h': 60 * 60 * 1000,
                '4h': 4 * 60 * 60 * 1000,
                '1d': 24 * 60 * 60 * 1000
            };
            return map[tf] || 15 * 60 * 1000;
        },

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }
});
