// Base class for all exchange implementations
class BaseExchange {
    constructor(exchangeId, config) {
        this.exchangeId = exchangeId;
        this.config = config;
        this.exchange = null;
        this.weight = 0;
        this.maxWeight = config.maxWeight;
        this.weightCost = config.weightCost;
        this.weightResetTime = Date.now() + (config.weightResetInterval || 60000);
        this.isRunning = false;
        this.isPaused = false;
        this.allSymbols = [];
        this.symbolMap = {};
        this.processedSymbols = {};
        this.currentBatchIndex = 0;
        this.cycleCount = 0;
        this.proxy = (config.proxyUrl === true && CONFIG.proxyURL) ? CONFIG.proxyURL : null;
        
        // Settings
        this.batchSize = config.batchSize || CONFIG.batchSize;
        this.klineLimit = config.klineLimit || CONFIG.klineLimit;
        this.timeframe = config.timeframe || CONFIG.timeframe;
        this.batchDelay = config.batchDelay || CONFIG.batchDelay;
        this.symbolDelay = config.symbolDelay || CONFIG.symbolDelay;
        this.weightThreshold = config.weightThreshold || CONFIG.weightThreshold;
        this.cycleDelay = config.cycleDelay || 10000;
        this.whitelist = config.whitelist || [];
        
        // Callbacks
        this.onStatus = null;
        this.onWeight = null;
        this.onProgress = null;
        this.onOHLCV = null;
        this.onLog = null;
        this.onError = null;
        this.onCountdown = null;
    }

    async init() {
        try {
            const proxyInfo = this.proxy ? ' (via proxy)' : '';
            this.log('info', `Initializing ${this.exchangeId}...${proxyInfo}`);

            this.exchange = this.createExchange();
            
            if (this.proxy) {
                this.applyProxy();
            }

            this.setStatus('Loading markets...');
            await this.exchange.loadMarkets();

            const filteredSymbols = this.filterSymbols();
            
            this.allSymbols = [];
            this.symbolMap = {};

            filteredSymbols.forEach(originalSymbol => {
                const normalizedSymbol = this.normalizeSymbol(originalSymbol);
                this.allSymbols.push(normalizedSymbol);
                this.symbolMap[normalizedSymbol] = originalSymbol;
            });

            this.log('info', `Total symbols from exchange: ${this.allSymbols.length}`);

            if (this.whitelist && this.whitelist.length > 0) {
                this.log('info', `Whitelist config: ${this.whitelist.length} symbols`);
                
                const whitelistNormalized = new Set();
                this.whitelist.forEach(wSymbol => {
                    whitelistNormalized.add(this.normalizeSymbol(wSymbol));
                });

                const matchedSymbols = this.allSymbols.filter(symbol => 
                    whitelistNormalized.has(this.normalizeSymbol(symbol))
                );

                this.allSymbols = matchedSymbols;
                this.log('info', `Whitelist applied: ${this.allSymbols.length}/${this.whitelist.length} matched`);
            }

            this.log('success', `Loaded ${this.allSymbols.length} symbols`);
            return this.allSymbols;

        } catch (error) {
            this.error(`Init failed: ${error.message}`);
            throw error;
        }
    }

    createExchange() {
        throw new Error('createExchange() must be implemented by subclass');
    }

    filterSymbols() {
        throw new Error('filterSymbols() must be implemented by subclass');
    }

    normalizeSymbol(symbol) {
        if (!symbol) return symbol;
        return symbol.split(':')[0];
    }

    applyProxy() {
        if (this.proxy && this.exchange) {
            const originalFetch = this.exchange.fetch.bind(this.exchange);
            this.exchange.fetch = async (url, method = 'GET', headers = undefined, body = undefined) => {
                const proxiedUrl = this.proxy + url;
                return originalFetch(proxiedUrl, method, headers, body);
            };
        }
    }

    async start() {
        this.isRunning = true;
        this.isPaused = false;
        await this.processLoop();
    }

    pause() {
        this.isPaused = true;
        this.log('info', 'Paused');
    }

    resume() {
        this.isPaused = false;
        this.log('info', 'Resumed');
    }

    stop() {
        this.isRunning = false;
        this.log('info', 'Stopped');
    }

    async processLoop() {
        while (this.isRunning) {
            try {
                if (this.isPaused) {
                    this.setStatus('Paused');
                    await this.sleep(1000);
                    continue;
                }

                if (Date.now() >= this.weightResetTime) {
                    this.weight = 0;
                    this.weightResetTime = Date.now() + (this.config.weightResetInterval || 60000);
                    this.log('info', 'Weight reset');
                }

                if (this.weight >= this.maxWeight * this.weightThreshold) {
                    const waitTime = this.weightResetTime - Date.now();
                    this.setStatus(`Weight limit - waiting ${Math.ceil(waitTime / 1000)}s`);
                    await this.sleep(Math.min(waitTime, 5000));
                    continue;
                }

                await this.processBatch();
                await this.sleep(this.batchDelay);

            } catch (error) {
                this.error(`Processing error: ${error.message}`);
                await this.sleep(5000);
            }
        }
    }

    async processBatch() {
        const unprocessed = this.getUnprocessedSymbols();
        const processedCount = this.allSymbols.length - unprocessed.length;

        this.updateProgress(processedCount, this.allSymbols.length);

        if (unprocessed.length === 0) {
            this.cycleCount++;
            this.log('success', `✓ Cycle ${this.cycleCount} complete - all ${this.allSymbols.length} symbols processed`);

            const delaySeconds = Math.floor(this.cycleDelay / 1000);
            this.log('info', `Waiting ${delaySeconds}s before next cycle...`);

            for (let i = delaySeconds; i > 0; i--) {
                this.updateCountdown(i);
                await this.sleep(1000);
            }
            this.updateCountdown(0);

            this.processedSymbols = {};
            this.currentBatchIndex = 0;
            return;
        }

        const startIndex = this.currentBatchIndex;
        const endIndex = Math.min(startIndex + this.batchSize, unprocessed.length);
        const batch = unprocessed.slice(startIndex, endIndex);

        this.setStatus(`Processing batch ${Math.floor(startIndex / this.batchSize) + 1}`);
        this.log('info', `Batch [${batch.length}]: ${batch.slice(0, 3).join(', ')}${batch.length > 3 ? '...' : ''}`);

        const promises = batch.map(symbol => this.processSymbol(symbol));
        const results = await Promise.allSettled(promises);

        let successCount = 0;
        let failCount = 0;

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successCount++;
                this.processedSymbols[batch[index]] = Date.now();
            } else {
                failCount++;
            }
        });

        this.log('info', `✓ Batch done: ${successCount} success, ${failCount} failed`);

        if (endIndex >= unprocessed.length) {
            this.currentBatchIndex = 0;
        } else {
            this.currentBatchIndex = endIndex;
        }
    }

    async processSymbol(symbol) {
        if (this.weight >= this.maxWeight * this.weightThreshold) {
            throw new Error('Weight limit reached');
        }

        try {
            const originalSymbol = this.symbolMap[symbol] || symbol;
            const rawOhlcv = await this.exchange.fetchOHLCV(originalSymbol, this.timeframe, undefined, this.klineLimit);

            this.weight += this.weightCost;
            this.updateWeight();

            if (!rawOhlcv || rawOhlcv.length === 0) {
                this.log('warn', `${symbol}: No data`);
                return;
            }

            const ohlcv = this.normalizeOHLCV(rawOhlcv);

            if (ohlcv.length === 0) {
                this.log('warn', `${symbol}: Invalid data after normalization`);
                return;
            }

            if (ohlcv.length < 50) {
                this.log('warn', `${symbol}: Only ${ohlcv.length} candles`);
                return;
            }

            if (this.onOHLCV) {
                this.onOHLCV({ symbol, ohlcv });
            }

        } catch (error) {
            this.log('error', `${symbol}: ${error.message}`);
            throw error;
        }
    }

    normalizeOHLCV(ohlcv) {
        if (!ohlcv || !Array.isArray(ohlcv)) return [];

        return ohlcv.map(candle => {
            if (!Array.isArray(candle) || candle.length < 6) return null;

            const timestamp = candle[0];
            const open = parseFloat(candle[1]);
            const high = parseFloat(candle[2]);
            const low = parseFloat(candle[3]);
            const close = parseFloat(candle[4]);
            const volume = parseFloat(candle[5]);

            if (!timestamp || isNaN(open) || open <= 0 || isNaN(high) || high <= 0 ||
                isNaN(low) || low <= 0 || isNaN(close) || close <= 0 || isNaN(volume) || volume < 0) {
                return null;
            }

            if (high < low || high < open || high < close || low > open || low > close) {
                return null;
            }

            return [timestamp, open, high, low, close, volume];
        }).filter(candle => candle !== null);
    }

    getUnprocessedSymbols() {
        return this.allSymbols.filter(symbol => !this.processedSymbols[symbol]);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setStatus(status) {
        if (this.onStatus) this.onStatus(status);
    }

    updateWeight() {
        if (this.onWeight) this.onWeight(this.weight, this.maxWeight);
    }

    updateProgress(processed, total) {
        if (this.onProgress) this.onProgress(processed, total);
    }

    updateCountdown(seconds) {
        if (this.onCountdown) this.onCountdown(seconds);
    }

    log(level, message) {
        if (this.onLog) this.onLog(level, message);
    }

    error(message) {
        if (this.onError) this.onError(message);
    }
}
