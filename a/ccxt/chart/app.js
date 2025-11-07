/**
 * Simple Trading Chart App
 * Displays OHLCV data and indicators using CCXT
 * No backtest, replay, or cache features
 */

class SimpleTradingApp {
    constructor() {
        try {
            this.chartManager = new ChartManager('chart');
            this.symbolSelector = new SymbolSelector(new BinanceAPI());
            this.settingsStorage = new SettingsStorage();
            this.ccxtLoader = new CCXTLoader();
            this.currentData = [];

            // Load indicator settings from localStorage
            this.indicatorSettings = this.settingsStorage.load();

            this.initializeEventListeners();
            this.initializeSymbolSelector();
            this.setupMeasureToolHandlers();
            this.updateUI();
        } catch (error) {
            console.error('Error in SimpleTradingApp constructor:', error);
            this.updateStatus('Initialization error', 'error');
        }
    }

    // Initialize symbol selector
    initializeSymbolSelector() {
        document.addEventListener('symbolSelected', (e) => {
            const { symbol } = e.detail;
            console.log('Symbol selected:', symbol);
            setTimeout(() => this.loadData(), 100);
        });
    }

    // Initialize event listeners
    initializeEventListeners() {
        const safeAddEventListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        };

        // Hamburger menu
        safeAddEventListener('hamburgerBtn', 'click', () => this.toggleMobileMenu());

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            const navbarContent = document.getElementById('navbarContent');
            const hamburgerBtn = document.getElementById('hamburgerBtn');
            
            if (navbarContent && navbarContent.classList.contains('active')) {
                if (!navbarContent.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                    this.closeMobileMenu();
                }
            }
        });

        // Load data button
        safeAddEventListener('loadData', 'click', () => {
            this.loadData();
            this.closeMobileMenu();
        });

        // Indicator settings
        safeAddEventListener('indicatorSettingsBtn', 'click', () => {
            this.showIndicatorSettings();
            this.closeMobileMenu();
        });

        // Measure tool
        safeAddEventListener('measureToolBtn', 'click', () => {
            this.toggleMeasureTool();
            this.closeMobileMenu();
        });

        // Enter key on inputs
        safeAddEventListener('candleCount', 'keypress', (e) => {
            if (e.key === 'Enter') this.loadData();
        });
    }

    // Load data using CCXT
    async loadData() {
        const symbol = this.symbolSelector.getSelectedSymbol();
        const timeframe = document.getElementById('timeframe').value;
        const candleCount = parseInt(document.getElementById('candleCount').value);

        if (!symbol) {
            this.updateStatus('Select symbol', 'error');
            return;
        }

        if (candleCount < 100) {
            this.updateStatus('Minimum 100 candles', 'error');
            return;
        }

        const loadBtn = document.getElementById('loadData');
        loadBtn.disabled = true;
        loadBtn.classList.add('loading');

        this.symbolSelector.showLoadingOverlay(`Loading ${symbol} ${timeframe}...`);

        try {
            this.updateStatus(`Loading data...`, 'loading');

            console.log(`📊 Fetching data for ${symbol} ${timeframe} (${candleCount} candles)`);

            // Convert symbol format for CCXT (BTCUSDT -> BTC/USDT:USDT)
            const base = symbol.replace('USDT', '');
            const ccxtSymbol = `${base}/USDT:USDT`;

            // Fetch data from CCXT
            const data = await this.ccxtLoader.fetchOHLCV(
                'binanceusdm',
                ccxtSymbol,
                timeframe,
                candleCount
            );

            if (!data || data.length === 0) {
                throw new Error('No data received');
            }

            console.log(`✓ Loaded ${data.length} candles`);

            this.currentData = data;

            // Display data on chart
            this.displayData(data);

            this.updateStatus(`${symbol} ${timeframe} - ${data.length} candles`, 'success');
            this.updateUI();

        } catch (error) {
            console.error('Error loading data:', error);
            this.updateStatus('Error: ' + error.message, 'error');
        } finally {
            loadBtn.disabled = false;
            loadBtn.classList.remove('loading');
            this.symbolSelector.hideLoadingOverlay();
        }
    }

    // Display data on chart with indicators
    displayData(data) {
        // Clear chart
        this.chartManager.clearChart();

        // Show candlestick data
        this.chartManager.setCandlestickData(data);

        // Calculate and show ATR Bot 1 if enabled
        if (this.indicatorSettings.botATR1.enabled) {
            const botATR1 = new BotATRIndicator(
                this.indicatorSettings.botATR1.emaLength,
                this.indicatorSettings.botATR1.atrLength,
                this.indicatorSettings.botATR1.atrMultiplier
            );
            const atrData1 = botATR1.calculateArray(data);
            this.chartManager.setATRBot1Data(
                atrData1.ema,
                atrData1.trail,
                {
                    trail1Color: this.indicatorSettings.botATR1.trail1Color,
                    trail1Width: this.indicatorSettings.botATR1.trail1Width || 1,
                    trail2Color: this.indicatorSettings.botATR1.trail2Color,
                    trail2Width: this.indicatorSettings.botATR1.trail2Width || 1,
                    fillColor: this.indicatorSettings.botATR1.fillColor || '#808000',
                    fillOpacity: this.indicatorSettings.botATR1.fillOpacity
                }
            );
        }

        // Calculate and show ATR Bot 2 if enabled
        if (this.indicatorSettings.botATR2.enabled) {
            const botATR2 = new BotATRIndicator(
                this.indicatorSettings.botATR2.emaLength,
                this.indicatorSettings.botATR2.atrLength,
                this.indicatorSettings.botATR2.atrMultiplier
            );
            const atrData2 = botATR2.calculateArray(data);
            this.chartManager.setATRBot2Data(
                atrData2.ema,
                atrData2.trail,
                {
                    trail1Color: this.indicatorSettings.botATR2.trail1Color,
                    trail1Width: this.indicatorSettings.botATR2.trail1Width || 1,
                    trail2Color: this.indicatorSettings.botATR2.trail2Color,
                    trail2Width: this.indicatorSettings.botATR2.trail2Width || 1,
                    fillColor: this.indicatorSettings.botATR2.fillColor || '#80c8ff',
                    fillOpacity: this.indicatorSettings.botATR2.fillOpacity
                }
            );
        }

        // Calculate and show VSR1 if enabled
        if (this.indicatorSettings.vsr1.enabled) {
            const vsr1 = new VSRIndicator(
                this.indicatorSettings.vsr1.length,
                this.indicatorSettings.vsr1.threshold
            );
            const vsr1Data = vsr1.calculateArray(data);
            this.chartManager.setVSR1Data(vsr1Data.upper, vsr1Data.lower, this.indicatorSettings.vsr1.fillColor);
        }

        // Calculate and show VSR2 if enabled
        if (this.indicatorSettings.vsr2.enabled) {
            const vsr2 = new VSRIndicator(
                this.indicatorSettings.vsr2.length,
                this.indicatorSettings.vsr2.threshold
            );
            const vsr2Data = vsr2.calculateArray(data);
            this.chartManager.setVSR2Data(vsr2Data.upper, vsr2Data.lower, this.indicatorSettings.vsr2.fillColor);
        }

        // Show volume if enabled
        if (this.indicatorSettings.volume.enabled) {
            this.chartManager.setVolumeData(
                data,
                this.indicatorSettings.volume.upColor,
                this.indicatorSettings.volume.downColor
            );
        }

        // Calculate and show Donchian Channel if enabled
        if (this.indicatorSettings.donchian.enabled) {
            const donchian = new DonchianIndicator(
                this.indicatorSettings.donchian.length,
                this.indicatorSettings.donchian.colors
            );
            const donchianData = donchian.calculateArray(data);
            this.chartManager.setDonchianData(donchianData, this.indicatorSettings.donchian.colors);
        }

        // Calculate and show Tenkan-sen if enabled
        if (this.indicatorSettings.tenkansen.enabled) {
            const tenkansen = new TenkansenIndicator(
                this.indicatorSettings.tenkansen.length,
                this.indicatorSettings.tenkansen.color
            );
            const tenkansenData = tenkansen.calculateArray(data);
            this.chartManager.setTenkansenData(tenkansenData, this.indicatorSettings.tenkansen.color);
        }

        // Calculate and show SMC if enabled
        if (this.indicatorSettings.smc.enabled) {
            const smc = new SMCIndicator({
                leftBars: this.indicatorSettings.smc.leftBars,
                rightBars: this.indicatorSettings.smc.rightBars,
                useBos: this.indicatorSettings.smc.useBos,
                sweepX: this.indicatorSettings.smc.sweepX
            });
            const smcData = smc.calculateArray(data);

            // Color candles based on trend
            const coloredCandles = data.map(candle => {
                const trend = smcData.marketTrends.find(t =>
                    candle.time >= t.startTime &&
                    (!t.endTime || candle.time <= t.endTime)
                );

                if (trend) {
                    const color = trend.direction === 'bullish' ?
                        'rgba(14, 203, 129, 0.8)' :
                        'rgba(246, 70, 93, 0.8)';
                    return {
                        ...candle,
                        color: color,
                        wickColor: color
                    };
                }
                return candle;
            });

            this.chartManager.setCandlestickData(coloredCandles);
            this.chartManager.setSMCData(smcData, this.indicatorSettings.smc.colors, data);
        }
    }

    // Update UI state
    updateUI() {
        const hasData = this.currentData && this.currentData.length > 0;
        document.getElementById('loadData').disabled = false;
    }

    // Toggle mobile menu
    toggleMobileMenu() {
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const navbarContent = document.getElementById('navbarContent');
        const body = document.body;

        if (!hamburgerBtn || !navbarContent) return;

        const isActive = navbarContent.classList.contains('active');

        if (isActive) {
            hamburgerBtn.classList.remove('active');
            navbarContent.classList.remove('active');
            body.classList.remove('menu-open');
        } else {
            hamburgerBtn.classList.add('active');
            navbarContent.classList.add('active');
            body.classList.add('menu-open');
        }
    }

    // Close mobile menu
    closeMobileMenu() {
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const navbarContent = document.getElementById('navbarContent');
        const body = document.body;

        if (hamburgerBtn) hamburgerBtn.classList.remove('active');
        if (navbarContent) navbarContent.classList.remove('active');
        body.classList.remove('menu-open');
    }

    // Update status message
    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-${type}`;
        }
    }

    // Show indicator settings modal
    showIndicatorSettings() {
        const modal = document.getElementById('indicatorSettingsModal');
        if (!modal) return;

        // Populate current settings
        this.populateSettingsModal();

        modal.style.display = 'block';

        // Setup event listeners if not already done
        if (!this._settingsListenersSetup) {
            this.setupSettingsModalListeners();
            this._settingsListenersSetup = true;
        }
    }

    // Populate settings modal with current values
    populateSettingsModal() {
        const settings = this.indicatorSettings;

        // Bot ATR 1
        this.setToggleState('botATR1Toggle', settings.botATR1.enabled);
        document.getElementById('bot1-ema-length').value = settings.botATR1.emaLength;
        document.getElementById('bot1-atr-length').value = settings.botATR1.atrLength;
        document.getElementById('bot1-atr-multiplier').value = settings.botATR1.atrMultiplier;
        document.getElementById('bot1-trail1-color').value = settings.botATR1.trail1Color || '#00ff00';
        document.getElementById('bot1-trail1-width').value = settings.botATR1.trail1Width || 1;
        document.getElementById('bot1-trail2-color').value = settings.botATR1.trail2Color || '#ff0000';
        document.getElementById('bot1-trail2-width').value = settings.botATR1.trail2Width || 1;
        document.getElementById('bot1-fill-color').value = settings.botATR1.fillColor || '#808000';
        document.getElementById('bot1-fill-opacity').value = settings.botATR1.fillOpacity;

        // Bot ATR 2
        this.setToggleState('botATR2Toggle', settings.botATR2.enabled);
        document.getElementById('bot2-ema-length').value = settings.botATR2.emaLength;
        document.getElementById('bot2-atr-length').value = settings.botATR2.atrLength;
        document.getElementById('bot2-atr-multiplier').value = settings.botATR2.atrMultiplier;
        document.getElementById('bot2-trail1-color').value = settings.botATR2.trail1Color || '#0096ff';
        document.getElementById('bot2-trail1-width').value = settings.botATR2.trail1Width || 1;
        document.getElementById('bot2-trail2-color').value = settings.botATR2.trail2Color || '#ff9600';
        document.getElementById('bot2-trail2-width').value = settings.botATR2.trail2Width || 1;
        document.getElementById('bot2-fill-color').value = settings.botATR2.fillColor || '#80c8ff';
        document.getElementById('bot2-fill-opacity').value = settings.botATR2.fillOpacity;

        // VSR1
        this.setToggleState('vsr1Toggle', settings.vsr1.enabled);
        document.getElementById('vsr1-length').value = settings.vsr1.length;
        document.getElementById('vsr1-threshold').value = settings.vsr1.threshold;

        // VSR2
        this.setToggleState('vsr2Toggle', settings.vsr2.enabled);
        document.getElementById('vsr2-length').value = settings.vsr2.length;
        document.getElementById('vsr2-threshold').value = settings.vsr2.threshold;

        // Volume
        this.setToggleState('volumeToggle', settings.volume.enabled);

        // Donchian
        this.setToggleState('donchianToggle', settings.donchian.enabled);
        document.getElementById('donchian-length').value = settings.donchian.length;
        document.getElementById('donchian-upper-color').value = settings.donchian.colors.upper || '#0000ff';
        document.getElementById('donchian-lower-color').value = settings.donchian.colors.lower || '#0000ff';
        document.getElementById('donchian-middle-color').value = settings.donchian.colors.middle || '#0000ff';

        // Tenkansen
        this.setToggleState('tenkansenToggle', settings.tenkansen.enabled);
        document.getElementById('tenkansen-length').value = settings.tenkansen.length;
        document.getElementById('tenkansen-color').value = settings.tenkansen.color || '#ffa500';

        // SMC
        this.setToggleState('smcToggle', settings.smc.enabled);
        document.getElementById('smc-left-bars').value = settings.smc.leftBars;
        document.getElementById('smc-right-bars').value = settings.smc.rightBars;
        document.getElementById('smc-use-bos').checked = settings.smc.useBos;
        document.getElementById('smc-sweep-x').checked = settings.smc.sweepX;
    }

    // Setup settings modal event listeners
    setupSettingsModalListeners() {
        // Close button
        const closeBtn = document.querySelector('.settings-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSettingsModal());
        }

        // Click outside to close
        const modal = document.getElementById('indicatorSettingsModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeSettingsModal();
                }
            });
        }

        // Toggle switches
        this.setupToggle('botATR1Toggle');
        this.setupToggle('botATR2Toggle');
        this.setupToggle('vsr1Toggle');
        this.setupToggle('vsr2Toggle');
        this.setupToggle('volumeToggle');
        this.setupToggle('donchianToggle');
        this.setupToggle('tenkansenToggle');
        this.setupToggle('smcToggle');

        // Apply button
        const applyBtn = document.getElementById('applySettingsBtn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applySettings());
        }

        // Reset button
        const resetBtn = document.getElementById('resetSettingsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }
    }

    // Setup toggle switch
    setupToggle(toggleId) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                const label = toggle.parentElement.querySelector('.toggle-label');
                if (label) {
                    label.textContent = toggle.classList.contains('active') ? 'Enabled' : 'Disabled';
                }
            });
        }
    }

    // Set toggle state
    setToggleState(toggleId, enabled) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            if (enabled) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
            const label = toggle.parentElement.querySelector('.toggle-label');
            if (label) {
                label.textContent = enabled ? 'Enabled' : 'Disabled';
            }
        }
    }

    // Get toggle state
    getToggleState(toggleId) {
        const toggle = document.getElementById(toggleId);
        return toggle ? toggle.classList.contains('active') : false;
    }

    // Apply settings
    applySettings() {
        // Read all settings from modal
        this.indicatorSettings = {
            botATR1: {
                enabled: this.getToggleState('botATR1Toggle'),
                emaLength: parseInt(document.getElementById('bot1-ema-length').value),
                atrLength: parseInt(document.getElementById('bot1-atr-length').value),
                atrMultiplier: parseFloat(document.getElementById('bot1-atr-multiplier').value),
                trail1Color: document.getElementById('bot1-trail1-color').value,
                trail1Width: parseInt(document.getElementById('bot1-trail1-width').value),
                trail2Color: document.getElementById('bot1-trail2-color').value,
                trail2Width: parseInt(document.getElementById('bot1-trail2-width').value),
                fillColor: document.getElementById('bot1-fill-color').value,
                fillOpacity: parseFloat(document.getElementById('bot1-fill-opacity').value)
            },
            botATR2: {
                enabled: this.getToggleState('botATR2Toggle'),
                emaLength: parseInt(document.getElementById('bot2-ema-length').value),
                atrLength: parseInt(document.getElementById('bot2-atr-length').value),
                atrMultiplier: parseFloat(document.getElementById('bot2-atr-multiplier').value),
                trail1Color: document.getElementById('bot2-trail1-color').value,
                trail1Width: parseInt(document.getElementById('bot2-trail1-width').value),
                trail2Color: document.getElementById('bot2-trail2-color').value,
                trail2Width: parseInt(document.getElementById('bot2-trail2-width').value),
                fillColor: document.getElementById('bot2-fill-color').value,
                fillOpacity: parseFloat(document.getElementById('bot2-fill-opacity').value)
            },
            vsr1: {
                enabled: this.getToggleState('vsr1Toggle'),
                length: parseInt(document.getElementById('vsr1-length').value),
                threshold: parseInt(document.getElementById('vsr1-threshold').value),
                fillColor: 'rgba(255, 251, 0, 0.5)'
            },
            vsr2: {
                enabled: this.getToggleState('vsr2Toggle'),
                length: parseInt(document.getElementById('vsr2-length').value),
                threshold: parseInt(document.getElementById('vsr2-threshold').value),
                fillColor: 'rgba(255, 100, 200, 0.4)'
            },
            volume: {
                enabled: this.getToggleState('volumeToggle'),
                upColor: 'rgba(0, 255, 0, 0.5)',
                downColor: 'rgba(255, 0, 0, 0.5)'
            },
            donchian: {
                enabled: this.getToggleState('donchianToggle'),
                length: parseInt(document.getElementById('donchian-length').value),
                colors: {
                    upper: document.getElementById('donchian-upper-color').value,
                    lower: document.getElementById('donchian-lower-color').value,
                    middle: document.getElementById('donchian-middle-color').value
                }
            },
            tenkansen: {
                enabled: this.getToggleState('tenkansenToggle'),
                length: parseInt(document.getElementById('tenkansen-length').value),
                color: document.getElementById('tenkansen-color').value
            },
            smc: {
                enabled: this.getToggleState('smcToggle'),
                leftBars: parseInt(document.getElementById('smc-left-bars').value),
                rightBars: parseInt(document.getElementById('smc-right-bars').value),
                useBos: document.getElementById('smc-use-bos').checked,
                sweepX: document.getElementById('smc-sweep-x').checked,
                colors: {
                    chochBullish: '#0ecb81',
                    chochBearish: '#f6465d',
                    bosBullish: 'rgba(14, 203, 129, 0.7)',
                    bosBearish: 'rgba(246, 70, 93, 0.7)',
                    strongHigh: '#e53935',
                    strongLow: '#00897b',
                    weakHigh: '#f57f17',
                    weakLow: '#43a047'
                }
            },
            tradeMarkers: {
                enabled: false
            }
        };

        // Save to localStorage
        this.settingsStorage.save(this.indicatorSettings);

        // Reload data with new settings
        if (this.currentData && this.currentData.length > 0) {
            this.displayData(this.currentData);
        }

        this.closeSettingsModal();
        this.updateStatus('Settings applied', 'success');
    }

    // Reset settings to default
    resetSettings() {
        if (confirm('Reset all settings to default?')) {
            this.settingsStorage.reset();
            this.indicatorSettings = this.settingsStorage.load();
            this.populateSettingsModal();
            this.updateStatus('Settings reset', 'info');
        }
    }

    // Close settings modal
    closeSettingsModal() {
        const modal = document.getElementById('indicatorSettingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Setup measure tool handlers
    setupMeasureToolHandlers() {
        // Measure tool will be handled by chart-manager
    }

    // Toggle measure tool
    toggleMeasureTool() {
        if (this.chartManager && this.chartManager.toggleMeasureTool) {
            this.chartManager.toggleMeasureTool();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Simple Trading App...');
    window.app = new SimpleTradingApp();
    console.log('✓ App initialized');
});
