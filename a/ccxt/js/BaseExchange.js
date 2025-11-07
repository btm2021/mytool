class BaseExchange {
    constructor(exchangeId, config = {}) {
        this.id = exchangeId;
        this.name = config.name || exchangeId;
        this.exchange = null;
        this.status = 'stopped';
        this.symbols = [];
        this.timeframe = AppConfig.defaultTimeframe;
        this.limit = AppConfig.ohlcvLimit;
        this.interval = null;
        this.results = [];
        this.lastUpdate = null;
        this.logger = null;
        this.db = null;
        this.rateLimiter = null;
        this.currentBatch = 0;
        this.processedSymbols = new Set();
    }

    setLogger(logger) {
        this.logger = logger;
    }

    setDatabase(db) {
        this.db = db;
    }

    setRateLimiter(rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    async initialize() {
        try {
            this.exchange = new ccxt[this.id]({
                enableRateLimit: true
            });
            
            // Check cache first
            const cachedSymbols = await this.db.getMarkets(this.id);
            
            if (cachedSymbols) {
                this.symbols = cachedSymbols;
                this.log(`Loaded ${this.symbols.length} symbols from cache`, 'info');
            } else {
                await this.exchange.loadMarkets();
                const allSymbols = Object.keys(this.exchange.markets);
                this.symbols = allSymbols.filter(s => this.filterSymbol(s));
                await this.db.saveMarkets(this.id, this.symbols);
                this.log(`Fetched and cached ${this.symbols.length} symbols`, 'success');
            }
            
            return true;
        } catch (error) {
            this.log(`Failed to initialize ${this.name}: ${error.message}`, 'error');
            return false;
        }
    }

    // Override this in child classes for custom filtering
    filterSymbol(symbol) {
        // Loại bỏ stablecoins không mong muốn
        const excludeCoins = ['USDC', 'BUSD', 'DAI', 'TUSD', 'USDP'];
        for (const coin of excludeCoins) {
            if (symbol.includes(coin)) return false;
        }

        // Loại bỏ symbols có dấu gạch dưới
        if (symbol.includes('_')) return false;

        // Loại bỏ symbols có dấu gạch ngang sau dấu :
        const parts = symbol.split(':');
        if (parts.length > 1 && parts[1].includes('-')) return false;

        // Loại bỏ symbols có chứa số sau dấu : hoặc có nhiều số liên tiếp (4+ digits)
        if (/:\w*\d/.test(symbol) || /\d{4,}/.test(symbol)) return false;

        return symbol.includes('/USDT');
    }

    async start() {
        if (this.status === 'running') {
            this.log(`${this.name} is already running`, 'warning');
            return;
        }

        if (!this.exchange) {
            const initialized = await this.initialize();
            if (!initialized) return;
        }

        this.status = 'running';
        this.currentBatch = 0;
        this.log(`Started ${this.name} with ${this.symbols.length} symbols`, 'info');
        
        this.processBatch();
    }

    async processBatch() {
        if (this.status !== 'running') return;

        const batchSize = AppConfig.symbolsPerBatch;
        const startIdx = this.currentBatch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, this.symbols.length);
        const batch = this.symbols.slice(startIdx, endIdx);

        if (batch.length === 0) {
            // Reset to beginning
            this.currentBatch = 0;
            this.log(`Completed full cycle, restarting from beginning`, 'info');
            setTimeout(() => this.processBatch(), 5000);
            return;
        }

        this.log(`Processing batch ${this.currentBatch + 1}: ${batch.length} symbols`, 'info');

        // Xử lý batch song song với Promise.all
        const promises = batch.map(symbol => this.fetchAndProcessSymbol(symbol));
        await Promise.allSettled(promises);

        this.currentBatch++;
        
        // Calculate delay to maintain rate limit
        const delayMs = (60000 / AppConfig.requestsPerMinute) * batchSize;
        setTimeout(() => this.processBatch(), delayMs);
    }

    async fetchAndProcessSymbol(symbol) {
        try {
            const ohlcv = await this.rateLimiter.execute(() => 
                this.fetchOHLCV(symbol)
            );

            if (ohlcv && ohlcv.length > 0) {
                const normalized = this.normalizeOHLCV(symbol, ohlcv);
                const analyzed = Analyzer.analyzeMultiple(normalized);
                
                const latest = normalized[normalized.length - 1];
                
                const result = {
                    symbol: symbol,
                    timestamp: this.convertToUTC7(latest.timestamp),
                    open: latest.open,
                    high: latest.high,
                    low: latest.low,
                    close: latest.close,
                    volume: latest.volume,
                    analysis: analyzed
                };

                this.updateResult(result);
                await this.db.markProcessed(this.id, symbol);
                this.processedSymbols.add(symbol);
                
                this.log(`✓ ${symbol}: ${result.close}`, 'success');
            }
        } catch (error) {
            this.log(`✗ ${symbol}: ${error.message}`, 'error');
        }
    }

    pause() {
        if (this.status === 'running') {
            this.status = 'paused';
            this.log(`Paused ${this.name}`, 'info');
        }
    }

    stop() {
        this.status = 'stopped';
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.log(`Stopped ${this.name}`, 'info');
    }

    async reload() {
        this.stop();
        this.results = [];
        this.exchange = null;
        await this.start();
    }

    convertToUTC7(timestamp) {
        const utcTime = new Date(timestamp);
        const utc7Time = new Date(utcTime.getTime() + (7 * 60 * 60 * 1000));
        return dayjs(utc7Time).format('YYYY-MM-DD HH:mm:ss');
    }

    async fetchOHLCV(symbol) {
        const ohlcv = await this.exchange.fetchOHLCV(symbol, this.timeframe, undefined, this.limit);
        return ohlcv;
    }

    // Override this in child classes if needed
    normalizeOHLCV(symbol, ohlcv) {
        return ohlcv.map(candle => ({
            timestamp: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));
    }

    updateResult(data) {
        if (!data) return;
        
        const index = this.results.findIndex(r => r.symbol === data.symbol);
        if (index >= 0) {
            this.results[index] = data;
        } else {
            this.results.push(data);
        }
        
        this.lastUpdate = dayjs().format('HH:mm:ss');
        
        // Trigger callback to notify Vue
        if (this.resultCallback) {
            this.resultCallback(this.id, data);
        }
    }

    getResults() {
        return this.results;
    }

    setResultCallback(callback) {
        this.resultCallback = callback;
    }

    getInfo() {
        return {
            id: this.id,
            name: this.name,
            status: this.status,
            symbolCount: this.symbols.length,
            processedCount: this.processedSymbols.size,
            resultsCount: this.results.length,
            queueLength: this.rateLimiter ? this.rateLimiter.getQueueLength() : 0,
            requestCount: this.rateLimiter ? this.rateLimiter.getRequestCount() : 0,
            lastUpdate: this.lastUpdate || 'Never'
        };
    }

    getSymbols() {
        return this.symbols;
    }

    log(message, type = 'info') {
        if (this.logger) {
            this.logger.log(`[${this.name}] ${message}`, type);
        }
    }
}
