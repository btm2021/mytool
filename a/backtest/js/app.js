/**
 * Main Application Controller
 * Coordinates all components and handles user interactions
 */
class CryptoBacktestApp {
    constructor() {
        this.binanceAPI = null;
        this.chartManager = null;
        this.replayManager = null;
        this.currentSymbol = 'BTCUSDT';
        this.currentInterval = '15m';
        this.currentDataLimit = 500;
        this.isLoading = false;
        
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('Initializing Crypto Backtest App...');

            // Initialize API service
            this.binanceAPI = new BinanceAPI();

            // Initialize chart manager
            this.chartManager = new ChartManager('chart');

            // Initialize replay manager
            this.replayManager = new ReplayManager(this.chartManager);

            // Set up event listeners
            this.setupEventListeners();

            // Add keyboard shortcuts
            this.replayManager.addKeyboardShortcuts();

            // Load initial data
            await this.loadInitialData();

            console.log('Application initialized successfully');

        } catch (error) {
            console.error('Error initializing application:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    /**
     * Set up event listeners for UI controls
     */
    setupEventListeners() {
        // Load data button
        const loadDataBtn = document.getElementById('loadData');
        if (loadDataBtn) {
            loadDataBtn.addEventListener('click', () => this.loadData());
        }

        // Symbol selector
        const symbolSelect = document.getElementById('symbol');
        if (symbolSelect) {
            symbolSelect.addEventListener('change', (e) => {
                this.currentSymbol = e.target.value;
            });
        }

        // Interval selector
        const intervalSelect = document.getElementById('interval');
        if (intervalSelect) {
            intervalSelect.addEventListener('change', (e) => {
                this.currentInterval = e.target.value;
            });
        }

        // Data limit selector
        const dataLimitSelect = document.getElementById('dataLimit');
        if (dataLimitSelect) {
            dataLimitSelect.addEventListener('change', (e) => {
                this.currentDataLimit = parseInt(e.target.value);
            });
        }

        // EMA toggle
        const emaToggle = document.getElementById('emaToggle');
        const emaPeriod = document.getElementById('emaPeriod');
        
        if (emaToggle) {
            emaToggle.addEventListener('change', () => this.toggleEMA());
        }
        
        if (emaPeriod) {
            emaPeriod.addEventListener('change', () => this.updateEMA());
        }

        // Window resize handler
        window.addEventListener('resize', () => {
            if (this.chartManager) {
                this.chartManager.handleResize();
            }
        });

        console.log('Event listeners set up');
    }

    /**
     * Load initial data on app start
     */
    async loadInitialData() {
        try {
            await this.loadData();
        } catch (error) {
            console.error('Error loading initial data:', error);
            // Don't show error for initial load failure
        }
    }

    /**
     * Load data from Binance API
     */
    async loadData() {
        if (this.isLoading) {
            return;
        }

        try {
            this.isLoading = true;
            this.showLoading(true);

            console.log(`Loading data for ${this.currentSymbol} ${this.currentInterval}...`);

            // Validate symbol first
            const isValid = await this.binanceAPI.isValidSymbol(this.currentSymbol);
            if (!isValid) {
                throw new Error(`Invalid symbol: ${this.currentSymbol}`);
            }

            // Fetch data from Binance with performance optimization
            console.log(`Fetching ${this.currentDataLimit} candles...`);
            
            let data;
            if (this.currentDataLimit > 1500) {
                // For large datasets, use historical data method with batching
                const endDate = new Date();
                const intervalMs = this.binanceAPI.getIntervalInMs(this.currentInterval);
                const startDate = new Date(endDate.getTime() - (this.currentDataLimit * intervalMs));
                
                data = await this.binanceAPI.fetchHistoricalData(
                    this.currentSymbol,
                    this.currentInterval,
                    startDate,
                    endDate
                );
            } else {
                // For smaller datasets, use regular fetch
                data = await this.binanceAPI.fetchKlines(
                    this.currentSymbol,
                    this.currentInterval,
                    this.currentDataLimit
                );
            }

            if (!data || data.length === 0) {
                throw new Error('No data received from Binance API');
            }

            // Load data into chart
            this.chartManager.loadData(data);

            // Add EMA indicator if enabled
            const emaToggle = document.getElementById('emaToggle');
            if (emaToggle && emaToggle.checked) {
                this.addEMAIndicator();
            }

            // Update UI
            this.updateDataInfo(data);

            console.log(`Successfully loaded ${data.length} candles`);

        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data: ' + error.message);
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * Toggle EMA indicator
     */
    toggleEMA() {
        const emaToggle = document.getElementById('emaToggle');
        
        if (emaToggle && emaToggle.checked) {
            this.addEMAIndicator();
        } else {
            this.chartManager.removeIndicator('EMA');
        }
    }

    /**
     * Update EMA indicator with new period
     */
    updateEMA() {
        const emaToggle = document.getElementById('emaToggle');
        
        if (emaToggle && emaToggle.checked) {
            this.addEMAIndicator();
        }
    }

    /**
     * Add EMA indicator to chart
     */
    addEMAIndicator() {
        const emaPeriod = document.getElementById('emaPeriod');
        const period = emaPeriod ? parseInt(emaPeriod.value) : 21;
        
        if (period < 1 || period > 200) {
            this.showError('EMA period must be between 1 and 200');
            return;
        }

        this.chartManager.addIndicator('EMA', 'ema', { period: period }, '#2196F3');
        console.log(`Added EMA(${period}) indicator`);
    }

    /**
     * Update data information display
     */
    updateDataInfo(data) {
        if (!data || data.length === 0) return;

        const firstCandle = data[0];
        const lastCandle = data[data.length - 1];
        
        console.log(`Data range: ${new Date(firstCandle.time * 1000).toLocaleString()} to ${new Date(lastCandle.time * 1000).toLocaleString()}`);
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            if (show) {
                loading.classList.add('show');
            } else {
                loading.classList.remove('show');
            }
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 400px;
            word-wrap: break-word;
        `;
        errorDiv.textContent = message;

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            float: right;
            margin-left: 10px;
            margin-top: -2px;
        `;
        closeBtn.onclick = () => errorDiv.remove();
        
        errorDiv.appendChild(closeBtn);
        document.body.appendChild(errorDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);

        console.error('Error shown to user:', message);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // Create success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'success-notification';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 400px;
        `;
        successDiv.textContent = message;

        document.body.appendChild(successDiv);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);

        console.log('Success shown to user:', message);
    }

    /**
     * Export current chart data
     */
    exportData() {
        try {
            const data = this.chartManager.getAllData();
            if (!data || data.length === 0) {
                this.showError('No data to export');
                return;
            }

            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentSymbol}_${this.currentInterval}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            this.showSuccess('Data exported successfully');

        } catch (error) {
            console.error('Error exporting data:', error);
            this.showError('Failed to export data: ' + error.message);
        }
    }

    /**
     * Get application state
     */
    getState() {
        return {
            symbol: this.currentSymbol,
            interval: this.currentInterval,
            isLoading: this.isLoading,
            dataLoaded: this.chartManager.getAllData().length > 0,
            replayState: this.replayManager.getState()
        };
    }

    /**
     * Add custom indicator (extensibility)
     */
    addCustomIndicator(name, type, params, color) {
        try {
            this.chartManager.addIndicator(name, type, params, color);
            this.showSuccess(`Added ${name} indicator`);
        } catch (error) {
            console.error('Error adding custom indicator:', error);
            this.showError('Failed to add indicator: ' + error.message);
        }
    }

    /**
     * Clear all data and reset application
     */
    reset() {
        try {
            // Stop replay if running
            if (this.replayManager.getState().isReplaying) {
                this.replayManager.stopReplay();
            }

            // Clear chart
            this.chartManager.clearChart();

            // Clear API cache
            this.binanceAPI.clearCache();

            // Reset UI
            this.showLoading(false);

            this.showSuccess('Application reset successfully');
            console.log('Application reset');

        } catch (error) {
            console.error('Error resetting application:', error);
            this.showError('Failed to reset application: ' + error.message);
        }
    }

    /**
     * Destroy application and clean up resources
     */
    destroy() {
        try {
            if (this.replayManager) {
                this.replayManager.destroy();
            }
            
            if (this.chartManager) {
                this.chartManager.destroy();
            }

            // Remove event listeners
            window.removeEventListener('resize', this.handleResize);

            console.log('Application destroyed');

        } catch (error) {
            console.error('Error destroying application:', error);
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.cryptoBacktestApp = new CryptoBacktestApp();
    
    // Add some helpful console commands for development
    if (typeof window !== 'undefined') {
        window.app = window.cryptoBacktestApp;
        console.log('Crypto Backtest App loaded. Use window.app to access the application instance.');
        console.log('Available commands:');
        console.log('- app.loadData() - Load new data');
        console.log('- app.reset() - Reset application');
        console.log('- app.exportData() - Export current data');
        console.log('- app.getState() - Get current state');
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.cryptoBacktestApp) {
        window.cryptoBacktestApp.destroy();
    }
});
