new Vue({
    el: '#app',
    data: {
        exchanges: [],
        symbolsByExchange: {},
        logs: [],
        isRunning: false,
        exchangeWorkers: {},
        calculatorWorker: null,
        activeTab: '',
        symbolFilter: '',
        systemTab: 'logs',
        settings: {
            exchanges: {},
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
        this.loadSettings();
        this.initExchanges();
        this.initCalculatorWorker();
        this.addLog('info', 'System initialized');
    },
    computed: {
        filteredSymbols() {
            const symbols = this.symbolsByExchange[this.activeTab] || [];
            if (!this.symbolFilter) return symbols;
            
            const filter = this.symbolFilter.toLowerCase();
            return symbols.filter(s => s.symbol.toLowerCase().includes(filter));
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
                });
                this.saveSettings();
            }
        },
        
        saveSettings() {
            Utils.storage.set('appSettings', this.settings);
            this.addLog('info', 'Settings saved');
        },
        
        resetSettings() {
            this.settings = {
                exchanges: {},
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
                    status: 'Idle',
                    weight: 0,
                    maxWeight: config.maxWeight,
                    symbolCount: 0,
                    lastMessage: '-'
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
            this.isRunning = true;
            this.addLog('success', 'Starting enabled workers...');
            
            this.exchanges.forEach(exchange => {
                if (this.settings.exchanges[exchange.id]) {
                    this.startExchangeWorker(exchange);
                } else {
                    this.addLog('info', `${exchange.id} disabled, skipping...`);
                }
            });
        },
        
        stopAllWorkers() {
            this.isRunning = false;
            this.addLog('warn', 'Stopping all workers...');
            
            Object.values(this.exchangeWorkers).forEach(worker => {
                worker.postMessage({ type: 'stop' });
                worker.terminate();
            });
            
            this.exchangeWorkers = {};
            this.exchanges.forEach(ex => {
                ex.active = false;
                ex.status = 'Stopped';
            });
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
                    weightThreshold: this.settings.weightThreshold
                })
            });
            
            worker.onmessage = (e) => this.handleExchangeWorkerMessage(exchange, e.data);
            worker.onerror = (error) => {
                this.addLog('error', `${exchange.id}: ${error.message}`);
                exchange.status = 'Error';
            };
            
            this.addLog('info', `Worker started: ${exchange.id}`);
        },
        
        handleExchangeWorkerMessage(exchange, data) {
            exchange.lastMessage = Utils.formatTime();
            
            switch(data.type) {
                case 'status':
                    exchange.status = data.status;
                    break;
                    
                case 'weight':
                    exchange.weight = data.weight;
                    exchange.maxWeight = data.maxWeight;
                    break;
                    
                case 'ohlcv':
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
            
            const symbolData = {
                symbol: symbol,
                close: Utils.formatNumber(indicators.close, 8),
                rsi: Utils.formatNumber(indicators.rsi, 2),
                ema50: Utils.formatNumber(indicators.ema50, 8),
                ema200: Utils.formatNumber(indicators.ema200, 8),
                signal: indicators.signal || 'HOLD',
                time: Utils.formatTime()
            };
            
            if (existingIndex >= 0) {
                this.$set(symbols, existingIndex, symbolData);
            } else {
                symbols.unshift(symbolData);
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
            return {
                color: isActive ? exchange.color : 'var(--color-text-muted)',
                borderBottomColor: isActive ? exchange.color : 'var(--color-bg-primary)'
            };
        },
        
        getStatusClass(exchange) {
            if (!exchange.active) return 'idle';
            if (exchange.status.includes('Error')) return 'error';
            return 'active';
        }
    }
});
