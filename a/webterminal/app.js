new Vue({
    el: '#app',
    data: {
        exchanges: [],
        symbolsByExchange: {},
        allSymbolsByExchange: {},
        logs: [],
        isRunning: false,
        exchangeWorkers: {},
        calculatorWorker: null,
        activeTab: '',
        symbolFilter: '',
        modalSymbolFilter: '',
        systemTab: 'logs',
        showExchangeModal: false,
        selectedExchange: null,
        settings: {
            exchanges: {},
            whitelists: {},
            batchSize: CONFIG.batchSize,
            klineLimit: CONFIG.klineLimit,
            timeframe: CONFIG.timeframe,
            batchDelay: CONFIG.batchDelay,
            symbolDelay: CONFIG.symbolDelay,
            weightThreshold: CONFIG.weightThreshold,
            maxSymbolsPerExchange: CONFIG.maxSymbolsPerExchange,
            chartCandlesLimit: CONFIG.chartCandlesLimit,
            rsi: { ...CONFIG.rsi },
            ema: { ...CONFIG.ema }
        }
    },
    mounted() {
        // Clear all processed symbols storage on page load
        this.clearAllProcessedStorage();

        this.loadSettings();
        this.initExchanges();
        this.initCalculatorWorker();
        this.addLog('info', 'System initialized - storage cleared');
    },
    computed: {
        filteredSymbols() {
            const symbols = this.symbolsByExchange[this.activeTab] || [];
            if (!this.symbolFilter) return symbols;

            const filter = this.symbolFilter.toLowerCase();
            return symbols.filter(s => s.symbol.toLowerCase().includes(filter));
        },

        enabledExchanges() {
            return this.exchanges.filter(ex => this.settings.exchanges[ex.id]);
        },

        modalFilteredSymbols() {
            if (!this.selectedExchange) return [];
            const symbols = this.selectedExchange.allSymbols || [];
            if (!this.modalSymbolFilter) return symbols;

            const filter = this.modalSymbolFilter.toLowerCase();
            return symbols.filter(s => s.toLowerCase().includes(filter));
        },

        currentWhitelist() {
            if (!this.selectedExchange) return [];
            return this.settings.whitelists[this.selectedExchange.id] || [];
        }
    },
    methods: {
        loadSettings() {
            const saved = Utils.storage.get('appSettings');
            if (saved) {
                this.settings = Utils.merge(this.settings, saved);
            } else {
                CONFIG.exchanges.forEach(ex => {
                    this.$set(this.settings.exchanges, ex.id, true);
                    this.$set(this.settings.whitelists, ex.id, ex.whitelist || []);
                });
                this.saveSettings();
            }

            // Ensure whitelists exist for all exchanges
            CONFIG.exchanges.forEach(ex => {
                if (!this.settings.whitelists[ex.id]) {
                    this.$set(this.settings.whitelists, ex.id, ex.whitelist || []);
                }
            });
        },

        saveSettings() {
            // Check for disabled exchanges and stop them
            this.exchanges.forEach(exchange => {
                if (!this.settings.exchanges[exchange.id] && exchange.active) {
                    // Stop and clear this exchange
                    this.stopExchange(exchange);
                    this.addLog('warn', `${exchange.id}: Disabled and stopped`);
                }
            });

            Utils.storage.set('appSettings', this.settings);

            // Update active tab if current tab is disabled
            if (!this.settings.exchanges[this.activeTab]) {
                const firstEnabled = this.exchanges.find(ex => this.settings.exchanges[ex.id]);
                if (firstEnabled) {
                    this.activeTab = firstEnabled.id;
                }
            }

            this.addLog('info', 'Settings saved');
        },

        resetSettings() {
            this.settings = {
                exchanges: {},
                whitelists: {},
                batchSize: CONFIG.batchSize,
                klineLimit: CONFIG.klineLimit,
                timeframe: CONFIG.timeframe,
                batchDelay: CONFIG.batchDelay,
                symbolDelay: CONFIG.symbolDelay,
                weightThreshold: CONFIG.weightThreshold,
                maxSymbolsPerExchange: CONFIG.maxSymbolsPerExchange,
                chartCandlesLimit: CONFIG.chartCandlesLimit,
                rsi: { ...CONFIG.rsi },
                ema: { ...CONFIG.ema }
            };
            CONFIG.exchanges.forEach(ex => {
                this.$set(this.settings.exchanges, ex.id, true);
                this.$set(this.settings.whitelists, ex.id, ex.whitelist || []);
            });
            this.saveSettings();
            this.addLog('success', 'Settings reset to default');
        },

        initExchanges() {
            CONFIG.exchanges.forEach(config => {
                this.exchanges.push({
                    id: config.id,
                    name: config.name,
                    color: config.color,
                    workerFile: config.workerFile,
                    active: false,
                    paused: false,
                    status: 'Idle',
                    weight: 0,
                    maxWeight: config.maxWeight,
                    symbolCount: 0,
                    processed: 0,
                    total: 0,
                    allSymbols: [],
                    lastMessage: '-',
                    lastUpdateTimestamp: null
                });

                this.symbolsByExchange[config.id] = [];
            });

            if (this.exchanges.length > 0) {
                this.activeTab = this.exchanges[0].id;
            }
        },

        initCalculatorWorker() {
            this.calculatorWorker = new Worker('calculator-worker.js');
            this.calculatorWorker.onmessage = (e) => {
                if (e.data.type === 'result') {
                    this.updateSymbol(e.data.exchangeId, e.data.symbol, e.data.indicators);
                } else if (e.data.type === 'error') {
                    console.error(`Calculator error for ${e.data.symbol}:`, e.data.message);
                }
            };
            this.calculatorWorker.onerror = (error) => {
                console.error('Calculator worker error:', error);
            };
        },

        startAllWorkers() {
            this.addLog('success', 'Starting all enabled workers...');
            this.exchanges.forEach(exchange => {
                if (this.settings.exchanges[exchange.id] && !exchange.active) {
                    this.startExchange(exchange);
                }
            });
        },

        pauseAllWorkers() {
            this.addLog('info', 'Pausing all workers...');
            this.exchanges.forEach(exchange => {
                if (exchange.active && !exchange.paused) {
                    this.pauseExchange(exchange);
                }
            });
        },

        stopAllWorkers() {
            this.addLog('warn', 'Stopping all workers and clearing storage...');

            // Clear all processed symbols storage
            this.exchanges.forEach(exchange => {
                const key = `processed_${exchange.id}`;
                Utils.storage.remove(key);
            });

            // Stop all workers
            this.exchanges.forEach(exchange => {
                if (exchange.active) {
                    const worker = this.exchangeWorkers[exchange.id];
                    if (worker) {
                        worker.postMessage({ type: 'stop' });
                        worker.terminate();
                        delete this.exchangeWorkers[exchange.id];
                    }
                    exchange.active = false;
                    exchange.paused = false;
                    exchange.status = 'Stopped';
                    exchange.processed = 0;
                    exchange.total = 0;
                }
            });

            this.addLog('success', 'All workers stopped and storage cleared');
        },

        startExchange(exchange) {
            if (exchange.paused) {
                // Resume from pause
                const worker = this.exchangeWorkers[exchange.id];
                if (worker) {
                    worker.postMessage({ type: 'resume' });
                    exchange.paused = false;
                    this.addLog('success', `${exchange.id}: Resumed`);
                }
            } else if (!exchange.active) {
                // Start new worker
                this.startExchangeWorker(exchange);
            }
        },

        pauseExchange(exchange) {
            if (exchange.active && !exchange.paused) {
                const worker = this.exchangeWorkers[exchange.id];
                if (worker) {
                    worker.postMessage({ type: 'pause' });
                    exchange.paused = true;
                    this.addLog('info', `${exchange.id}: Paused`);
                }
            }
        },

        stopExchange(exchange) {
            if (exchange.active) {
                const worker = this.exchangeWorkers[exchange.id];
                if (worker) {
                    worker.postMessage({ type: 'stop' });
                    worker.terminate();
                    delete this.exchangeWorkers[exchange.id];
                }
                exchange.active = false;
                exchange.paused = false;
                exchange.status = 'Stopped';
                exchange.processed = 0;
                exchange.total = 0;

                // Clear processed symbols storage for this exchange
                const key = `processed_${exchange.id}`;
                Utils.storage.remove(key);

                this.addLog('warn', `${exchange.id}: Stopped and cleared`);
            }
        },

        startExchangeWorker(exchange) {
            const worker = new Worker(exchange.workerFile);
            this.exchangeWorkers[exchange.id] = worker;

            exchange.active = true;
            exchange.status = 'Starting...';

            const config = CONFIG.exchanges.find(e => e.id === exchange.id);

            worker.postMessage({
                type: 'init',
                config: Utils.merge(config, {
                    batchSize: this.settings.batchSize,
                    klineLimit: this.settings.klineLimit,
                    timeframe: this.settings.timeframe,
                    batchDelay: this.settings.batchDelay,
                    symbolDelay: this.settings.symbolDelay,
                    weightThreshold: this.settings.weightThreshold,
                    whitelist: this.settings.whitelists[exchange.id] || []
                })
            });

            worker.onmessage = (e) => this.handleExchangeWorkerMessage(exchange, e.data, worker);
            worker.onerror = (error) => {
                this.addLog('error', `${exchange.id}: ${error.message}`);
                exchange.status = 'Error';
            };

            this.addLog('info', `Worker started: ${exchange.id}`);
        },

        handleExchangeWorkerMessage(exchange, data, worker) {
            exchange.lastMessage = Utils.formatTime();
            exchange.lastUpdateTimestamp = Date.now();

            switch (data.type) {
                case 'status':
                    exchange.status = data.status;
                    break;

                case 'weight':
                    exchange.weight = data.weight;
                    exchange.maxWeight = data.maxWeight;
                    break;

                case 'progress':
                    exchange.processed = data.processed || 0;
                    exchange.total = data.total || 0;
                    break;

                case 'symbols_list':
                    exchange.allSymbols = data.symbols || [];
                    this.addLog('info', `${exchange.id}: Loaded ${exchange.allSymbols.length} symbols`);
                    break;

                case 'request_processed':
                    // Worker requests processed symbols data
                    const key = `processed_${data.exchangeId}`;
                    const stored = Utils.storage.get(key, {});
                    worker.postMessage({
                        type: 'set_processed',
                        data: stored
                    });
                    break;

                case 'save_processed':
                    // Worker wants to save a processed symbol
                    const saveKey = `processed_${data.exchangeId}`;
                    const current = Utils.storage.get(saveKey, {});
                    current[data.symbol] = data.timestamp;
                    Utils.storage.set(saveKey, current);
                    break;

                case 'clear_processed':
                    // Worker wants to clear processed symbols
                    const clearKey = `processed_${data.exchangeId}`;
                    Utils.storage.remove(clearKey);
                    break;

                case 'ohlcv':
                    // Send to calculator worker
                    this.calculatorWorker.postMessage({
                        type: 'calculate',
                        exchangeId: exchange.id,
                        symbol: data.data.symbol,
                        ohlcv: data.data.ohlcv,
                        config: {
                            rsiPeriod: this.settings.rsi.period,
                            emaShort: this.settings.ema.short,
                            emaLong: this.settings.ema.long
                        }
                    });
                    break;

                case 'log':
                    this.addLog(data.level || 'info', `${exchange.id}: ${data.message}`);
                    break;

                case 'error':
                    this.addLog('error', `${exchange.id}: ${data.message}`);
                    break;
            }
        },

        updateSymbol(exchangeId, symbol, indicators) {
            const symbols = this.symbolsByExchange[exchangeId];
            const existingIndex = symbols.findIndex(s => s.symbol === symbol);

            const baseSymbol = Utils.crypto.extractSymbol(symbol);
            const quoteSymbol = Utils.crypto.extractQuote(symbol);

            const symbolData = {
                symbol: symbol,
                displaySymbol: `${baseSymbol}/${quoteSymbol}`,
                baseSymbol: baseSymbol,
                quoteSymbol: quoteSymbol,
                baseIcon: Utils.crypto.getIconUrl(baseSymbol),
                quoteIcon: Utils.crypto.getIconUrl(quoteSymbol),
                close: Utils.formatNumber(indicators.close, 8),
                rsi: Utils.formatNumber(indicators.rsi, 2),
                ema50: Utils.formatNumber(indicators.ema50, 8),
                ema200: Utils.formatNumber(indicators.ema200, 8),
                signal: indicators.signal || 'HOLD',
                time: Utils.formatTime(),
                updated: true // Flag for animation
            };

            if (existingIndex >= 0) {
                this.$set(symbols, existingIndex, symbolData);
                // Remove animation flag after animation completes
                setTimeout(() => {
                    if (symbols[existingIndex]) {
                        this.$set(symbols[existingIndex], 'updated', false);
                    }
                }, 1000);
            } else {
                symbols.unshift(symbolData);
                // Remove animation flag for new items
                setTimeout(() => {
                    const idx = symbols.findIndex(s => s.symbol === symbol);
                    if (idx >= 0) {
                        this.$set(symbols[idx], 'updated', false);
                    }
                }, 1000);
            }

            if (symbols.length > this.settings.maxSymbolsPerExchange) {
                this.symbolsByExchange[exchangeId] = symbols.slice(0, this.settings.maxSymbolsPerExchange);
            }

            const exchange = this.exchanges.find(e => e.id === exchangeId);
            if (exchange) {
                exchange.symbolCount = symbols.length;
            }
        },

        addLog(level, message) {
            this.logs.unshift({
                time: Utils.formatTime(),
                level: level,
                message: message
            });

            if (this.logs.length > CONFIG.maxLogs) {
                this.logs = this.logs.slice(0, CONFIG.maxLogs);
            }
        },

        getRsiClass(rsi) {
            if (!rsi || rsi === '-') return '';
            const value = parseFloat(rsi);
            if (value < this.settings.rsi.oversold) return 'rsi-oversold';
            if (value > this.settings.rsi.overbought) return 'rsi-overbought';
            return '';
        },

        getSymbolCount(exchangeId) {
            return (this.symbolsByExchange[exchangeId] || []).length;
        },

        getTabStyle(exchange) {
            const isActive = this.activeTab === exchange.id;
            const hexToRgba = (hex, alpha) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };

            return {
                color: isActive ? exchange.color : 'var(--color-text-muted)',
                borderBottomColor: isActive ? exchange.color : 'var(--color-bg-primary)',
                background: isActive ? hexToRgba(exchange.color, 0.1) : 'transparent'
            };
        },

        getStatusClass(exchange) {
            if (!exchange.active) return 'idle';
            if (exchange.paused) return 'paused';
            if (exchange.status.includes('Error')) return 'error';
            return 'active';
        },

        getExchangeStatus(exchange) {
            if (!exchange.active) return 'Idle';
            if (exchange.paused) return 'Paused';
            if (exchange.status.includes('Error')) return exchange.status;

            if (exchange.total > 0) {
                const percent = Math.round((exchange.processed / exchange.total) * 100);
                const remaining = exchange.total - exchange.processed;

                if (remaining === 0) {
                    return 'Cycle complete';
                }

                return `${percent}%`;
            }

            return exchange.status || 'Running';
        },

        clearProcessedSymbols() {
            this.clearAllProcessedStorage();
            this.addLog('success', 'Cleared all processed symbols tracking');
        },

        clearAllProcessedStorage() {
            // Clear all processed symbols from localStorage
            CONFIG.exchanges.forEach(config => {
                const key = `processed_${config.id}`;
                Utils.storage.remove(key);
            });
        },

        getLastUpdateTime(exchange) {
            if (!exchange.lastUpdateTimestamp) return '-';

            const now = Date.now();
            const diff = now - exchange.lastUpdateTimestamp;
            const seconds = Math.floor(diff / 1000);

            if (seconds < 10) return 'just now';
            if (seconds < 60) return `${seconds}s ago`;

            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;

            const hours = Math.floor(minutes / 60);
            return `${hours}h ago`;
        },

        handleIconError(event) {
            // Fallback to placeholder when icon fails to load
            event.target.src = Utils.crypto.placeholderUrl;
        },

        openExchangeModal(exchange) {
            this.selectedExchange = exchange;
            this.showExchangeModal = true;

            // Load exchange info immediately if not already loaded
            if (!exchange.allSymbols || exchange.allSymbols.length === 0) {
                this.loadExchangeInfo(exchange);
            }
        },

        async loadExchangeInfo(exchange) {
            if (exchange.active) {
                this.addLog('info', `${exchange.id}: Already running, symbols loaded`);
                return;
            }

            this.addLog('info', `${exchange.id}: Loading exchange info...`);

            const worker = new Worker(exchange.workerFile);
            const config = CONFIG.exchanges.find(e => e.id === exchange.id);

            worker.postMessage({
                type: 'init',
                config: Utils.merge(config, {
                    batchSize: this.settings.batchSize,
                    klineLimit: this.settings.klineLimit,
                    timeframe: this.settings.timeframe,
                    batchDelay: this.settings.batchDelay,
                    symbolDelay: this.settings.symbolDelay,
                    weightThreshold: this.settings.weightThreshold,
                    whitelist: [] // Don't apply whitelist when loading all symbols for modal
                })
            });

            worker.onmessage = (e) => {
                if (e.data.type === 'symbols_list') {
                    exchange.allSymbols = e.data.symbols || [];
                    this.addLog('success', `${exchange.id}: Loaded ${exchange.allSymbols.length} symbols`);
                    worker.postMessage({ type: 'stop' });
                    worker.terminate();
                }
            };

            worker.onerror = (error) => {
                this.addLog('error', `${exchange.id}: Failed to load info - ${error.message}`);
                worker.terminate();
            };
        },

        isInWhitelist(symbol) {
            if (!this.selectedExchange) return false;
            const whitelist = this.settings.whitelists[this.selectedExchange.id] || [];
            return whitelist.includes(symbol);
        },

        toggleWhitelist(symbol) {
            if (!this.selectedExchange) return;

            const exchangeId = this.selectedExchange.id;
            const whitelist = this.settings.whitelists[exchangeId] || [];
            const index = whitelist.indexOf(symbol);

            if (index >= 0) {
                // Remove from whitelist
                whitelist.splice(index, 1);
                this.addLog('info', `${exchangeId}: Removed ${symbol} from whitelist`);
            } else {
                // Add to whitelist
                whitelist.push(symbol);
                this.addLog('success', `${exchangeId}: Added ${symbol} to whitelist`);
            }

            this.$set(this.settings.whitelists, exchangeId, whitelist);
            this.saveSettings();

            // Restart exchange if it's running
            if (this.selectedExchange.active) {
                this.addLog('info', `${exchangeId}: Restarting with updated whitelist...`);
                this.stopExchange(this.selectedExchange);
                setTimeout(() => {
                    this.startExchange(this.selectedExchange);
                }, 500);
            }
        },

        closeExchangeModal() {
            this.showExchangeModal = false;
            this.selectedExchange = null;
            this.modalSymbolFilter = '';
        }
    }
});
