new Vue({
    el: '#app',
    data: {
        exchanges: [],
        symbolsByExchange: {},
        allSymbolsByExchange: {},
        logs: [],
        isRunning: false,
        exchangeInstances: {},
        activeTab: '',
        symbolFilter: '',
        whitelistFilter: '',
        exchangeSymbolFilter: '',
        systemTab: 'logs',
        showExchangeModal: false,
        selectedExchange: null,
        tempWhitelist: [],
        originalWhitelist: [],
        isLoadingSymbols: false,
        isSavingWhitelist: false,
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
            cycleDelay: (CONFIG.cycleDelay || 10000) / 1000,
            rsi: { ...CONFIG.rsi },
            ema: { ...CONFIG.ema }
        }
    },
    mounted() {
        this.clearAllProcessedStorage();
        this.loadSettings();
        this.initExchanges();
        this.addLog('info', 'System initialized - storage cleared');
    },
    watch: {
        activeTab(newTab) {
            if (newTab) {
                this.updateDisplayedSymbols(newTab);
            }
        }
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
        availableSymbols() {
            if (!this.selectedExchange) return [];
            const allSymbols = this.selectedExchange.allSymbols || [];
            return allSymbols.filter(s => !this.tempWhitelist.includes(s));
        },
        filteredWhitelist() {
            if (!this.whitelistFilter) return this.tempWhitelist;
            const filter = this.whitelistFilter.toLowerCase();
            return this.tempWhitelist.filter(s => s.toLowerCase().includes(filter));
        },
        filteredExchangeSymbols() {
            let symbols = this.availableSymbols;
            if (this.exchangeSymbolFilter) {
                const filter = this.exchangeSymbolFilter.toLowerCase();
                symbols = symbols.filter(s => s.toLowerCase().includes(filter));
            }
            return symbols;
        },
        hasWhitelistChanges() {
            if (!this.selectedExchange) return false;
            const original = this.settings.whitelists[this.selectedExchange.id] || [];
            if (original.length !== this.tempWhitelist.length) return true;
            return !original.every(s => this.tempWhitelist.includes(s));
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
            CONFIG.exchanges.forEach(ex => {
                if (!this.settings.whitelists[ex.id]) {
                    this.$set(this.settings.whitelists, ex.id, ex.whitelist || []);
                }
            });
        },
        saveSettings() {
            Utils.storage.set('appSettings', this.settings);
        },
        applySettings() {
            this.addLog('info', '⚙ Applying new settings...');
            this.saveSettings();
            
            const activeExchanges = this.exchanges.filter(ex => ex.active);
            if (activeExchanges.length > 0) {
                this.addLog('info', `Stopping ${activeExchanges.length} active exchanges...`);
                activeExchanges.forEach(exchange => {
                    this.stopExchange(exchange);
                });
            }
            
            this.clearAllProcessedStorage();
            this.exchanges.forEach(exchange => {
                this.symbolsByExchange[exchange.id] = [];
                exchange.symbolCount = 0;
                exchange.processed = 0;
                exchange.total = 0;
                exchange.cycleComplete = false;
                exchange.countdownSeconds = 0;
            });
            
            if (!this.settings.exchanges[this.activeTab]) {
                const firstEnabled = this.exchanges.find(ex => this.settings.exchanges[ex.id]);
                if (firstEnabled) {
                    this.activeTab = firstEnabled.id;
                }
            }
            
            this.addLog('success', '✓ Settings applied successfully');
            
            setTimeout(() => {
                const enabledExchanges = this.exchanges.filter(ex => this.settings.exchanges[ex.id]);
                if (enabledExchanges.length > 0) {
                    this.addLog('info', `Restarting ${enabledExchanges.length} enabled exchanges...`);
                    enabledExchanges.forEach(exchange => {
                        this.startExchange(exchange);
                    });
                }
            }, 1000);
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
                cycleDelay: (CONFIG.cycleDelay || 10000) / 1000,
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
                    moduleFile: config.moduleFile,
                    className: config.className,
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
                    lastUpdateTimestamp: null,
                    cycleComplete: false,
                    countdownSeconds: 0
                });
                this.symbolsByExchange[config.id] = [];
            });
            if (this.exchanges.length > 0) {
                this.activeTab = this.exchanges[0].id;
            }
        },
        startAllWorkers() {
            this.addLog('success', 'Starting all enabled exchanges...');
            this.exchanges.forEach(exchange => {
                if (this.settings.exchanges[exchange.id] && !exchange.active) {
                    this.startExchange(exchange);
                }
            });
        },
        pauseAllWorkers() {
            this.addLog('info', 'Pausing all exchanges...');
            this.exchanges.forEach(exchange => {
                if (exchange.active && !exchange.paused) {
                    this.pauseExchange(exchange);
                }
            });
        },
        stopAllWorkers() {
            this.addLog('warn', 'Stopping all exchanges and clearing storage...');
            this.exchanges.forEach(exchange => {
                const key = `processed_${exchange.id}`;
                Utils.storage.remove(key);
            });
            this.exchanges.forEach(exchange => {
                if (exchange.active) {
                    this.stopExchange(exchange);
                }
            });
            this.addLog('success', 'All exchanges stopped and storage cleared');
        },
        async startExchange(exchange) {
            if (exchange.paused) {
                const instance = this.exchangeInstances[exchange.id];
                if (instance) {
                    instance.resume();
                    exchange.paused = false;
                    this.addLog('success', `${exchange.id}: Resumed`);
                }
            } else if (!exchange.active) {
                await this.startExchangeInstance(exchange);
            }
        },
        pauseExchange(exchange) {
            if (exchange.active && !exchange.paused) {
                const instance = this.exchangeInstances[exchange.id];
                if (instance) {
                    instance.pause();
                    exchange.paused = true;
                    this.addLog('info', `${exchange.id}: Paused`);
                }
            }
        },
        stopExchange(exchange) {
            if (exchange.active) {
                const instance = this.exchangeInstances[exchange.id];
                if (instance) {
                    instance.stop();
                    delete this.exchangeInstances[exchange.id];
                }
                exchange.active = false;
                exchange.paused = false;
                exchange.status = 'Stopped';
                exchange.processed = 0;
                exchange.total = 0;
                const key = `processed_${exchange.id}`;
                Utils.storage.remove(key);
                this.addLog('warn', `${exchange.id}: Stopped and cleared`);
            }
        },
        async startExchangeInstance(exchange) {
            try {
                const config = CONFIG.exchanges.find(e => e.id === exchange.id);
                const ExchangeClass = window[config.className];
                
                if (!ExchangeClass) {
                    this.addLog('error', `${exchange.id}: Class ${config.className} not found`);
                    return;
                }
                
                const mergedConfig = Utils.merge(config, {
                    batchSize: this.settings.batchSize,
                    klineLimit: this.settings.klineLimit,
                    timeframe: this.settings.timeframe,
                    batchDelay: this.settings.batchDelay,
                    symbolDelay: this.settings.symbolDelay,
                    weightThreshold: this.settings.weightThreshold,
                    cycleDelay: this.settings.cycleDelay * 1000,
                    whitelist: this.settings.whitelists[exchange.id] || []
                });
                
                const instance = new ExchangeClass(mergedConfig);
                
                instance.onStatus = (status) => {
                    exchange.status = status;
                    exchange.lastMessage = Utils.formatTime();
                    exchange.lastUpdateTimestamp = Date.now();
                };
                
                instance.onWeight = (weight, maxWeight) => {
                    exchange.weight = weight;
                    exchange.maxWeight = maxWeight;
                    exchange.lastMessage = Utils.formatTime();
                    exchange.lastUpdateTimestamp = Date.now();
                };
                
                instance.onProgress = (processed, total) => {
                    exchange.processed = processed || 0;
                    exchange.total = total || 0;
                    exchange.cycleComplete = (total > 0 && processed === total);
                    exchange.lastMessage = Utils.formatTime();
                    exchange.lastUpdateTimestamp = Date.now();
                };
                
                instance.onCountdown = (seconds) => {
                    exchange.countdownSeconds = seconds || 0;
                };
                
                instance.onOHLCV = (data) => {
                    Calculator.calculate(
                        exchange.id,
                        data.symbol,
                        data.ohlcv,
                        {
                            rsiPeriod: this.settings.rsi.period,
                            emaShort: this.settings.ema.short,
                            emaLong: this.settings.ema.long
                        },
                        (result) => {
                            this.updateSymbol(result.exchangeId, result.symbol, result.indicators);
                        }
                    );
                };
                
                instance.onLog = (level, message) => {
                    this.addLog(level, `${exchange.id}: ${message}`);
                };
                
                instance.onError = (message) => {
                    this.addLog('error', `${exchange.id}: ${message}`);
                };
                
                if (instance.onPriceUpdate) {
                    instance.onPriceUpdate = (updates) => {
                        this.updateRealtimePrices(exchange.id, updates);
                    };
                }
                
                this.exchangeInstances[exchange.id] = instance;
                exchange.active = true;
                exchange.status = 'Starting...';
                
                this.addLog('info', `Starting ${exchange.id}...`);
                
                const symbols = await instance.init();
                this.$set(exchange, 'allSymbols', symbols || []);
                
                const key = `processed_${exchange.id}`;
                const stored = Utils.storage.get(key, {});
                instance.processedSymbols = stored;
                
                instance.start();
                
            } catch (error) {
                this.addLog('error', `${exchange.id}: Failed to start - ${error.message}`);
                exchange.status = 'Error';
                exchange.active = false;
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
                updated: true,
                priceChange: 0
            };
            
            if (existingIndex >= 0) {
                this.$set(symbols, existingIndex, symbolData);
                setTimeout(() => {
                    if (symbols[existingIndex]) {
                        this.$set(symbols[existingIndex], 'updated', false);
                    }
                }, 1000);
            } else {
                symbols.unshift(symbolData);
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
            
            const instance = this.exchangeInstances[exchangeId];
            if (instance && instance.processedSymbols) {
                instance.processedSymbols[symbol] = Date.now();
                const key = `processed_${exchangeId}`;
                Utils.storage.set(key, instance.processedSymbols);
            }
            
            this.updateDisplayedSymbols(exchangeId);
        },
        updateRealtimePrices(exchangeId, updates) {
            const symbols = this.symbolsByExchange[exchangeId];
            if (!symbols) return;
            
            updates.forEach(update => {
                const index = symbols.findIndex(s => s.symbol === update.symbol);
                if (index >= 0) {
                    const symbol = symbols[index];
                    const oldPrice = parseFloat(symbol.close);
                    const newPrice = update.price;
                    
                    this.$set(symbols[index], 'close', Utils.formatNumber(newPrice, 8));
                    this.$set(symbols[index], 'priceChange', update.change);
                    this.$set(symbols[index], 'priceFlash', newPrice > oldPrice ? 'up' : (newPrice < oldPrice ? 'down' : ''));
                    
                    setTimeout(() => {
                        if (symbols[index]) {
                            this.$set(symbols[index], 'priceFlash', '');
                        }
                    }, 500);
                }
            });
        },
        updateDisplayedSymbols(exchangeId) {
            const instance = this.exchangeInstances[exchangeId];
            if (!instance || !instance.updateDisplayedSymbols) return;
            
            const symbols = this.symbolsByExchange[exchangeId] || [];
            const displayedSymbols = symbols.map(s => s.symbol);
            instance.updateDisplayedSymbols(displayedSymbols);
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
        getWhitelistCount(exchangeId) {
            const whitelist = this.settings.whitelists[exchangeId] || [];
            return whitelist.length;
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
                if (remaining === 0) return 'Cycle complete';
                return `${percent}%`;
            }
            return exchange.status || 'Running';
        },
        clearProcessedSymbols() {
            this.clearAllProcessedStorage();
            this.addLog('success', 'Cleared all processed symbols tracking');
        },
        clearAllProcessedStorage() {
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
            event.target.src = Utils.crypto.placeholderUrl;
        },
        openExchangeModal(exchange) {
            this.selectedExchange = exchange;
            this.tempWhitelist = [...(this.settings.whitelists[exchange.id] || [])];
            this.originalWhitelist = [...(this.settings.whitelists[exchange.id] || [])];
            this.whitelistFilter = '';
            this.exchangeSymbolFilter = '';
            this.showExchangeModal = true;
            this.loadExchangeInfo(exchange);
        },
        async loadExchangeInfo(exchange) {
            if (exchange.allSymbols && exchange.allSymbols.length > 0) {
                this.addLog('info', `${exchange.id}: Using cached ${exchange.allSymbols.length} symbols`);
                return;
            }
            this.isLoadingSymbols = true;
            this.addLog('info', `${exchange.id}: Loading symbols...`);
            
            try {
                const config = CONFIG.exchanges.find(e => e.id === exchange.id);
                const ExchangeClass = window[config.className];
                const tempInstance = new ExchangeClass(Utils.merge(config, { whitelist: [] }));
                const symbols = await tempInstance.init();
                this.$set(exchange, 'allSymbols', symbols || []);
                this.addLog('success', `${exchange.id}: Loaded ${exchange.allSymbols.length} symbols`);
            } catch (error) {
                this.addLog('error', `${exchange.id}: Failed to load - ${error.message}`);
            } finally {
                this.isLoadingSymbols = false;
            }
        },
        addToWhitelist(symbol) {
            if (!this.tempWhitelist.includes(symbol)) {
                this.tempWhitelist.unshift(symbol);
            }
        },
        isNewSymbol(symbol) {
            return !this.originalWhitelist.includes(symbol);
        },
        removeFromWhitelist(symbol) {
            const index = this.tempWhitelist.indexOf(symbol);
            if (index >= 0) {
                this.tempWhitelist.splice(index, 1);
            }
        },
        saveWhitelist() {
            if (!this.selectedExchange) return;
            this.isSavingWhitelist = true;
            const exchangeId = this.selectedExchange.id;
            this.$set(this.settings.whitelists, exchangeId, [...this.tempWhitelist]);
            this.saveSettings();
            this.originalWhitelist = [...this.tempWhitelist];
            setTimeout(() => {
                this.isSavingWhitelist = false;
                this.addLog('success', `${exchangeId}: Whitelist saved (${this.tempWhitelist.length} symbols)`);
                if (this.selectedExchange.active) {
                    this.addLog('info', `${exchangeId}: Restarting with updated whitelist...`);
                    this.stopExchange(this.selectedExchange);
                    setTimeout(() => {
                        this.startExchange(this.selectedExchange);
                    }, 500);
                }
            }, 500);
        },
        cancelWhitelist() {
            this.tempWhitelist = [...this.originalWhitelist];
            this.showExchangeModal = false;
        },
        closeExchangeModal() {
            this.showExchangeModal = false;
            this.selectedExchange = null;
            this.tempWhitelist = [];
            this.originalWhitelist = [];
            this.whitelistFilter = '';
            this.exchangeSymbolFilter = '';
        },
        openChart(symbol) {
            const url = `chart/index.html?exchange=${this.activeTab}&symbol=${encodeURIComponent(symbol.symbol)}`;
            window.open(url, '_blank');
        },
        formatCountdown(seconds) {
            if (seconds <= 0) return '';
            if (seconds < 60) return `${seconds}s`;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}m ${secs}s`;
        }
    }
});
