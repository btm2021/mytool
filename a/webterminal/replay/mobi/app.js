class MobileApp {
    constructor() {
        this.binanceAPI = new BinanceAPI();
        this.chartManager = new ChartManager('chart');
        
        this.currentSymbol = null;
        this.currentTimeframe = '15m';
        this.candleCount = 2000; // Reduced for mobile performance
        this.currentData = [];
        
        // Indicator settings (VSR disabled by default for performance)
        this.indicators = {
            botATR1: true,
            botATR2: true,
            vsr1: false, // Disabled for mobile performance
            vsr2: false, // Disabled for mobile performance
            volume: true,
            donchian: true,
            tenkansen: false
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSymbols();
        this.loadSettings();
    }
    
    setupEventListeners() {
        // Bottom controls
        document.getElementById('symbolBtn').addEventListener('click', () => {
            this.showModal('symbolModal');
        });
        
        document.getElementById('timeframeBtn').addEventListener('click', () => {
            this.showModal('timeframeModal');
        });
        
        document.getElementById('indicatorsBtn').addEventListener('click', () => {
            this.showModal('indicatorsModal');
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showModal('settingsModal');
        });
        
        // Close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal;
                this.hideModal(modalId);
            });
        });
        
        // Symbol search
        document.getElementById('symbolSearch').addEventListener('input', (e) => {
            this.filterSymbols(e.target.value);
        });
        
        // Timeframe selection
        document.querySelectorAll('.timeframe-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTimeframe(e.target.dataset.tf);
            });
        });
        
        // Indicator toggles with debounce
        this.updateChartTimeout = null;
        ['botATR1', 'botATR2', 'vsr1', 'vsr2', 'volume', 'donchian', 'tenkansen'].forEach(id => {
            const toggle = document.getElementById(id + 'Toggle');
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.indicators[id] = e.target.checked;
                    this.saveSettings();
                    
                    // Debounce chart update
                    if (this.updateChartTimeout) {
                        clearTimeout(this.updateChartTimeout);
                    }
                    
                    if (this.currentData.length > 0) {
                        this.showLoading(true);
                        this.updateChartTimeout = setTimeout(() => {
                            this.updateChart();
                            this.showLoading(false);
                        }, 300);
                    }
                });
            }
        });
        
        // Settings
        document.getElementById('candleCount').addEventListener('change', (e) => {
            let value = parseInt(e.target.value);
            // Limit to 3000 for mobile performance
            if (value > 3000) {
                value = 3000;
                e.target.value = 3000;
                alert('Maximum 3000 candles for mobile performance');
            }
            if (value < 100) {
                value = 100;
                e.target.value = 100;
            }
            this.candleCount = value;
            this.saveSettings();
        });
    }
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }
    
    async loadSymbols() {
        try {
            const symbols = await this.binanceAPI.fetchSymbols();
            this.allSymbols = symbols;
            this.renderSymbols(symbols);
        } catch (error) {
            console.error('Error loading symbols:', error);
        }
    }
    
    renderSymbols(symbols) {
        const container = document.getElementById('symbolList');
        if (!symbols || symbols.length === 0) {
            container.innerHTML = '<div class="loading">No symbols found</div>';
            return;
        }
        
        container.innerHTML = symbols.map(s => `
            <div class="symbol-item" data-symbol="${s.symbol}">
                <div class="symbol-info">
                    <div class="symbol-name">${s.symbol}</div>
                    <div class="symbol-volume">Vol: ${this.formatVolume(s.quoteVolume)}</div>
                </div>
                <div class="symbol-price-info">
                    <div class="symbol-price">${this.formatPrice(s.lastPrice)}</div>
                    <div class="symbol-change ${parseFloat(s.priceChangePercent) >= 0 ? 'positive' : 'negative'}">
                        ${parseFloat(s.priceChangePercent).toFixed(2)}%
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        container.querySelectorAll('.symbol-item').forEach(item => {
            item.addEventListener('click', () => {
                const symbol = item.dataset.symbol;
                this.selectSymbol(symbol);
            });
        });
    }
    
    filterSymbols(query) {
        if (!this.allSymbols) return;
        
        const filtered = this.allSymbols.filter(s => 
            s.symbol.toLowerCase().includes(query.toLowerCase())
        );
        this.renderSymbols(filtered);
    }
    
    async selectSymbol(symbol) {
        this.currentSymbol = symbol;
        document.getElementById('symbolName').textContent = symbol;
        this.hideModal('symbolModal');
        await this.loadData();
    }
    
    selectTimeframe(timeframe) {
        this.currentTimeframe = timeframe;
        document.getElementById('currentTimeframe').textContent = timeframe;
        
        // Update active state
        document.querySelectorAll('.timeframe-item').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tf === timeframe) {
                btn.classList.add('active');
            }
        });
        
        this.hideModal('timeframeModal');
        
        if (this.currentSymbol) {
            this.loadData();
        }
    }
    
    async loadData() {
        if (!this.currentSymbol) return;
        
        this.showLoading(true);
        
        try {
            // Fetch directly from API (no cache)
            const data = await this.binanceAPI.fetchHistoricalData(
                this.currentSymbol,
                this.currentTimeframe,
                this.candleCount,
                (current, total, message) => {
                    const progress = Math.round((current / total) * 100);
                    document.querySelector('.loading-text').textContent = `${message} ${progress}%`;
                }
            );
            
            if (data && data.length > 0) {
                this.currentData = data;
                this.updateChart();
                this.updateHeader(data[data.length - 1]);
            } else {
                alert('No data received');
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading data: ' + error.message);
        } finally {
            this.showLoading(false);
            document.querySelector('.loading-text').textContent = 'Loading...';
        }
    }
    
    updateChart() {
        if (!this.currentData || this.currentData.length === 0) return;
        
        const startTime = performance.now();
        const data = this.currentData;
        
        console.log(`[Performance] Updating chart with ${data.length} candles`);
        
        // Clear chart
        this.chartManager.clearChart();
        
        // Set candlestick data
        this.chartManager.setCandlestickData(data);
        console.log(`[Performance] Candlestick data set: ${(performance.now() - startTime).toFixed(2)}ms`);
        
        // Bot ATR 1
        if (this.indicators.botATR1) {
            const botATR1 = new BotATRIndicator(30, 14, 2.0);
            const atrData1 = botATR1.calculateArray(data);
            this.chartManager.setATRBot1Data(atrData1.ema, atrData1.trail, {
                trail1Color: '#00ff00',
                trail1Width: 1,
                trail2Color: '#ff0000',
                trail2Width: 1,
                fillColor: '#808000',
                fillOpacity: 0.2
            });
        }
        
        // Bot ATR 2
        if (this.indicators.botATR2) {
            const botATR2 = new BotATRIndicator(55, 14, 2.0);
            const atrData2 = botATR2.calculateArray(data);
            this.chartManager.setATRBot2Data(atrData2.ema, atrData2.trail, {
                trail1Color: '#0096ff',
                trail1Width: 1,
                trail2Color: '#ff9600',
                trail2Width: 1,
                fillColor: '#80c8ff',
                fillOpacity: 0.15
            });
        }
        
        // VSR 1
        if (this.indicators.vsr1) {
            const vsrStart = performance.now();
            const vsr1 = new VSRIndicator(10, 10);
            const vsr1Data = vsr1.calculateArray(data);
            console.log(`[Performance] VSR1 calculation: ${(performance.now() - vsrStart).toFixed(2)}ms`);
            
            // Optimize: Only pass data points where values change
            const optimizeStart = performance.now();
            const vsr1Optimized = this.optimizeVSRData(vsr1Data.upper, vsr1Data.lower, data);
            console.log(`[Performance] VSR1 optimization: ${(performance.now() - optimizeStart).toFixed(2)}ms, rectangles: ${vsr1Optimized.upper.length}`);
            
            const renderStart = performance.now();
            this.chartManager.setVSR1Data(vsr1Optimized.upper, vsr1Optimized.lower, 'rgba(255, 251, 0, 0.5)');
            console.log(`[Performance] VSR1 render: ${(performance.now() - renderStart).toFixed(2)}ms`);
        }
        
        // VSR 2
        if (this.indicators.vsr2) {
            const vsrStart = performance.now();
            const vsr2 = new VSRIndicator(20, 20);
            const vsr2Data = vsr2.calculateArray(data);
            console.log(`[Performance] VSR2 calculation: ${(performance.now() - vsrStart).toFixed(2)}ms`);
            
            // Optimize: Only pass data points where values change
            const optimizeStart = performance.now();
            const vsr2Optimized = this.optimizeVSRData(vsr2Data.upper, vsr2Data.lower, data);
            console.log(`[Performance] VSR2 optimization: ${(performance.now() - optimizeStart).toFixed(2)}ms, rectangles: ${vsr2Optimized.upper.length}`);
            
            const renderStart = performance.now();
            this.chartManager.setVSR2Data(vsr2Optimized.upper, vsr2Optimized.lower, 'rgba(255, 100, 200, 0.4)');
            console.log(`[Performance] VSR2 render: ${(performance.now() - renderStart).toFixed(2)}ms`);
        }
        
        // Volume
        if (this.indicators.volume) {
            this.chartManager.setVolumeData(data, 'rgba(0, 255, 0, 0.5)', 'rgba(255, 0, 0, 0.5)');
        }
        
        // Donchian
        if (this.indicators.donchian) {
            const donchian = new DonchianIndicator(50, {
                upper: 'rgba(0, 0, 255, 0.8)',
                lower: 'rgba(0, 0, 255, 0.8)',
                middle: 'rgba(0, 0, 255, 0.5)'
            });
            const donchianData = donchian.calculateArray(data);
            this.chartManager.setDonchianData(donchianData, {
                upper: 'rgba(0, 0, 255, 0.8)',
                lower: 'rgba(0, 0, 255, 0.8)',
                middle: 'rgba(0, 0, 255, 0.5)'
            });
        }
        
        // Tenkansen
        if (this.indicators.tenkansen) {
            const tenkansen = new TenkansenIndicator(50, 'rgba(255, 165, 0, 0.8)');
            const tenkansenData = tenkansen.calculateArray(data);
            this.chartManager.setTenkansenData(tenkansenData, 'rgba(255, 165, 0, 0.8)');
        }
        
        const totalTime = performance.now() - startTime;
        console.log(`[Performance] Total chart update: ${totalTime.toFixed(2)}ms`);
    }
    
    optimizeVSRData(upperData, lowerData, candles) {
        // Build complete upper/lower arrays for all candles
        const fullUpper = [];
        const fullLower = [];
        
        let lastUpper = null;
        let lastLower = null;
        let upperIdx = 0;
        let lowerIdx = 0;
        
        for (let i = 0; i < candles.length; i++) {
            const time = candles[i].time;
            
            // Update upper if we have new data
            if (upperIdx < upperData.length && upperData[upperIdx].time === time) {
                lastUpper = upperData[upperIdx].value;
                upperIdx++;
            }
            
            // Update lower if we have new data
            if (lowerIdx < lowerData.length && lowerData[lowerIdx].time === time) {
                lastLower = lowerData[lowerIdx].value;
                lowerIdx++;
            }
            
            // Add current values
            if (lastUpper !== null) {
                fullUpper.push({ time: time, value: lastUpper });
            }
            if (lastLower !== null) {
                fullLower.push({ time: time, value: lastLower });
            }
        }
        
        // Now optimize by keeping only points where values change
        const optimizedUpper = [];
        const optimizedLower = [];
        
        if (fullUpper.length > 0) {
            optimizedUpper.push(fullUpper[0]);
            for (let i = 1; i < fullUpper.length; i++) {
                if (fullUpper[i].value !== fullUpper[i-1].value) {
                    optimizedUpper.push(fullUpper[i]);
                }
            }
            // Always add last point
            if (fullUpper.length > 1 && optimizedUpper[optimizedUpper.length - 1].time !== fullUpper[fullUpper.length - 1].time) {
                optimizedUpper.push(fullUpper[fullUpper.length - 1]);
            }
        }
        
        if (fullLower.length > 0) {
            optimizedLower.push(fullLower[0]);
            for (let i = 1; i < fullLower.length; i++) {
                if (fullLower[i].value !== fullLower[i-1].value) {
                    optimizedLower.push(fullLower[i]);
                }
            }
            // Always add last point
            if (fullLower.length > 1 && optimizedLower[optimizedLower.length - 1].time !== fullLower[fullLower.length - 1].time) {
                optimizedLower.push(fullLower[fullLower.length - 1]);
            }
        }
        
        return { upper: optimizedUpper, lower: optimizedLower };
    }
    
    updateHeader(lastCandle) {
        if (!lastCandle) return;
        
        const price = lastCandle.close;
        const change = ((lastCandle.close - lastCandle.open) / lastCandle.open * 100).toFixed(2);
        
        document.getElementById('currentPrice').textContent = this.formatPrice(price);
        
        const changeEl = document.getElementById('priceChange');
        changeEl.textContent = `${change >= 0 ? '+' : ''}${change}%`;
        changeEl.className = 'price-change ' + (change >= 0 ? 'positive' : 'negative');
    }
    
    formatPrice(price) {
        const p = parseFloat(price);
        if (p < 1) return p.toFixed(6);
        if (p < 10) return p.toFixed(4);
        if (p < 100) return p.toFixed(3);
        return p.toFixed(2);
    }
    
    formatVolume(volume) {
        const v = parseFloat(volume);
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
        return v.toFixed(2);
    }
    
    saveSettings() {
        const settings = {
            timeframe: this.currentTimeframe,
            candleCount: this.candleCount,
            indicators: this.indicators
        };
        localStorage.setItem('mobileSettings', JSON.stringify(settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('mobileSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.currentTimeframe = settings.timeframe || '15m';
                this.candleCount = settings.candleCount || 5000;
                this.indicators = settings.indicators || this.indicators;
                
                // Update UI
                document.getElementById('currentTimeframe').textContent = this.currentTimeframe;
                document.getElementById('candleCount').value = this.candleCount;
                
                // Update indicator toggles
                Object.keys(this.indicators).forEach(key => {
                    const toggle = document.getElementById(key + 'Toggle');
                    if (toggle) {
                        toggle.checked = this.indicators[key];
                    }
                });
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
    }
    
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MobileApp();
});
