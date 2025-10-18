importScripts('https://cdn.jsdelivr.net/npm/ccxt@4.2.25/dist/ccxt.browser.js');
importScripts('../config.js');

class BaseExchangeWorker {
    constructor(exchangeId, exchangeConfig) {
        this.exchangeId = exchangeId;
        this.config = exchangeConfig;
        this.exchange = null;
        this.weight = 0;
        this.maxWeight = exchangeConfig.maxWeight;
        this.weightCost = exchangeConfig.weightCost;
        this.weightResetTime = Date.now() + (exchangeConfig.weightResetInterval || 60000);
        this.isRunning = false;
        this.isPaused = false;
        this.allSymbols = [];
        this.processedSymbols = {};
        this.currentBatchIndex = 0;
        this.cycleCount = 0;
        this.batchSize = exchangeConfig.batchSize || CONFIG.batchSize;
        this.klineLimit = exchangeConfig.klineLimit || CONFIG.klineLimit;
        this.timeframe = exchangeConfig.timeframe || CONFIG.timeframe;
        this.batchDelay = exchangeConfig.batchDelay || CONFIG.batchDelay;
        this.symbolDelay = exchangeConfig.symbolDelay || CONFIG.symbolDelay;
        this.weightThreshold = exchangeConfig.weightThreshold || CONFIG.weightThreshold;
        this.proxy = exchangeConfig.proxy || null;
    }

    getExchangeOptions() {
        const options = {
            enableRateLimit: true,
            timeout: 30000
        };

        return options;
    }

    applyProxyToExchange() {
        if (this.proxy && this.exchange) {
            // Override fetch method to use proxy
            const originalFetch = this.exchange.fetch.bind(this.exchange);
            this.exchange.fetch = async (url, method = 'GET', headers = undefined, body = undefined) => {
                // Prepend proxy URL to the original URL
                const proxiedUrl = this.proxy + url;
                return originalFetch(proxiedUrl, method, headers, body);
            };
        }
    }

    async init() {
        try {
            const proxyInfo = this.proxy ? ' (via proxy)' : '';
            this.postLog('info', `Initializing ${this.exchangeId}...${proxyInfo}`);

            this.exchange = this.createExchange();
            
            // Apply proxy if configured
            this.applyProxyToExchange();

            this.postStatus('Loading markets...');
            await this.exchange.loadMarkets();

            this.allSymbols = this.filterSymbols();

            this.postLog('success', `Loaded ${this.allSymbols.length} symbols`);
            
            // Send all symbols list to main thread
            this.postMessage({ 
                type: 'symbols_list', 
                symbols: this.allSymbols 
            });

            this.isRunning = true;
            this.startProcessing();

        } catch (error) {
            this.postError(`Init failed: ${error.message}`);
        }
    }

    createExchange() {
        throw new Error('createExchange() must be implemented by subclass');
    }

    filterSymbols() {
        throw new Error('filterSymbols() must be implemented by subclass');
    }

    async startProcessing() {
        // Request processed symbols from main thread
        this.loadProcessedSymbols();

        // Wait a bit for the response
        await this.sleep(100);

        while (this.isRunning) {
            try {
                // Check if paused
                if (this.isPaused) {
                    this.postStatus('Paused');
                    await this.sleep(1000);
                    continue;
                }

                if (Date.now() >= this.weightResetTime) {
                    this.weight = 0;
                    this.weightResetTime = Date.now() + (this.config.weightResetInterval || 60000);
                    this.postLog('info', 'Weight reset');
                }

                if (this.weight >= this.maxWeight * this.weightThreshold) {
                    const waitTime = this.weightResetTime - Date.now();
                    this.postStatus(`Weight limit - waiting ${Math.ceil(waitTime / 1000)}s`);
                    await this.sleep(Math.min(waitTime, 5000));
                    continue;
                }

                await this.processBatch();
                await this.sleep(this.batchDelay);

            } catch (error) {
                this.postError(`Processing error: ${error.message}`);
                await this.sleep(5000);
            }
        }
    }

    loadProcessedSymbols() {
        // Request processed symbols from main thread
        this.postMessage({ type: 'request_processed', exchangeId: this.exchangeId });
    }

    saveProcessedSymbol(symbol) {
        this.processedSymbols[symbol] = Date.now();
        // Send to main thread to save
        this.postMessage({
            type: 'save_processed',
            exchangeId: this.exchangeId,
            symbol: symbol,
            timestamp: Date.now()
        });
    }

    getUnprocessedSymbols() {
        // Get symbols that haven't been processed yet
        return this.allSymbols.filter(symbol => !this.processedSymbols[symbol]);
    }

    resetProcessedSymbols() {
        this.processedSymbols = {};
        // Send to main thread to clear
        this.postMessage({ type: 'clear_processed', exchangeId: this.exchangeId });
    }

    setProcessedSymbols(data) {
        this.processedSymbols = data || {};
    }

    postMessage(data) {
        self.postMessage(data);
    }

    async processBatch() {
        // Get unprocessed symbols first
        const unprocessed = this.getUnprocessedSymbols();
        const processedCount = this.allSymbols.length - unprocessed.length;

        // Post progress
        this.postProgress(processedCount, this.allSymbols.length);

        // If all symbols processed, reset and start new cycle
        if (unprocessed.length === 0) {
            this.cycleCount++;
            this.postLog('success', `✓ Cycle ${this.cycleCount} complete - all ${this.allSymbols.length} symbols processed`);

            // Only delay from cycle 2 onwards
            if (this.cycleCount > 1) {
                this.postLog('info', 'Waiting 10s before next cycle...');
                await this.sleep(10000);
            }

            this.resetProcessedSymbols();
            this.currentBatchIndex = 0;
            return;
        }

        const startIndex = this.currentBatchIndex;
        const endIndex = Math.min(startIndex + this.batchSize, unprocessed.length);
        const batch = unprocessed.slice(startIndex, endIndex);

        this.postStatus(`Processing batch ${Math.floor(startIndex / this.batchSize) + 1}`);
        this.postLog('info', `Batch [${batch.length}]: ${batch.slice(0, 3).join(', ')}${batch.length > 3 ? '...' : ''}`);

        // Fetch all symbols in batch concurrently using Promise.all
        const promises = batch.map(symbol => this.processSymbol(symbol));
        const results = await Promise.allSettled(promises);

        let successCount = 0;
        let failCount = 0;

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successCount++;
                this.saveProcessedSymbol(batch[index]);
            } else {
                failCount++;
            }
        });

        this.postLog('info', `✓ Batch done: ${successCount} success, ${failCount} failed`);

        // Move to next batch
        if (endIndex >= unprocessed.length) {
            this.currentBatchIndex = 0;
        } else {
            this.currentBatchIndex = endIndex;
        }
    }

    normalizeOHLCV(ohlcv) {
        // Normalize OHLCV data to standard format
        // Standard format: [timestamp, open, high, low, close, volume]
        // Some exchanges may return different formats or have null values
        
        if (!ohlcv || !Array.isArray(ohlcv)) {
            return [];
        }

        return ohlcv.map(candle => {
            if (!Array.isArray(candle) || candle.length < 6) {
                return null;
            }

            // Extract values with fallbacks
            const timestamp = candle[0];
            const open = parseFloat(candle[1]);
            const high = parseFloat(candle[2]);
            const low = parseFloat(candle[3]);
            const close = parseFloat(candle[4]);
            const volume = parseFloat(candle[5]);

            // Validate all values are valid numbers
            if (
                !timestamp ||
                isNaN(open) || open <= 0 ||
                isNaN(high) || high <= 0 ||
                isNaN(low) || low <= 0 ||
                isNaN(close) || close <= 0 ||
                isNaN(volume) || volume < 0
            ) {
                return null;
            }

            // Validate OHLC relationship (high >= low, high >= open/close, low <= open/close)
            if (high < low || high < open || high < close || low > open || low > close) {
                return null;
            }

            return [timestamp, open, high, low, close, volume];
        }).filter(candle => candle !== null); // Remove invalid candles
    }

    async processSymbol(symbol) {
        if (this.weight >= this.maxWeight * this.weightThreshold) {
            throw new Error('Weight limit reached');
        }

        try {
            const rawOhlcv = await this.exchange.fetchOHLCV(symbol, this.timeframe, undefined, this.klineLimit);

            this.weight += this.weightCost;
            this.postWeight();

            if (!rawOhlcv || rawOhlcv.length === 0) {
                this.postLog('warn', `${symbol}: No data`);
                return;
            }

            // Normalize OHLCV data
            const ohlcv = this.normalizeOHLCV(rawOhlcv);

            if (ohlcv.length === 0) {
                this.postLog('warn', `${symbol}: Invalid data after normalization`);
                return;
            }

            // Accept data even if less than limit (some symbols may have less history)
            if (ohlcv.length < 50) {
                this.postLog('warn', `${symbol}: Only ${ohlcv.length} candles (${rawOhlcv.length} raw)`);
                return;
            }

            // Log if significant data was filtered out
            if (rawOhlcv.length - ohlcv.length > 10) {
                this.postLog('warn', `${symbol}: Filtered ${rawOhlcv.length - ohlcv.length} invalid candles`);
            }

            this.postOHLCV({
                symbol: symbol,
                ohlcv: ohlcv
            });

        } catch (error) {
            this.postLog('error', `${symbol}: ${error.message}`);
            throw error;
        }
    }

    pause() {
        this.isPaused = true;
        this.postLog('info', 'Paused');
    }

    resume() {
        this.isPaused = false;
        this.postLog('info', 'Resumed');
    }

    stop() {
        this.isRunning = false;
        this.postLog('info', 'Stopped');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    postStatus(status) {
        self.postMessage({ type: 'status', status: status });
    }

    postWeight() {
        self.postMessage({ type: 'weight', weight: this.weight, maxWeight: this.maxWeight });
    }

    postProgress(processed, total) {
        self.postMessage({ type: 'progress', processed: processed, total: total });
    }

    postOHLCV(data) {
        self.postMessage({ type: 'ohlcv', data: data });
    }

    postLog(level, message) {
        self.postMessage({ type: 'log', level: level, message: message });
    }

    postError(message) {
        self.postMessage({ type: 'error', message: message });
    }
}
