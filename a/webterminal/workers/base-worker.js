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
        this.allSymbols = [];
        this.currentBatchIndex = 0;
        this.batchSize = exchangeConfig.batchSize || CONFIG.batchSize;
        this.klineLimit = exchangeConfig.klineLimit || CONFIG.klineLimit;
        this.timeframe = exchangeConfig.timeframe || CONFIG.timeframe;
        this.batchDelay = exchangeConfig.batchDelay || CONFIG.batchDelay;
        this.symbolDelay = exchangeConfig.symbolDelay || CONFIG.symbolDelay;
        this.weightThreshold = exchangeConfig.weightThreshold || CONFIG.weightThreshold;
    }

    async init() {
        try {
            this.postLog('info', `Initializing ${this.exchangeId}...`);

            this.exchange = this.createExchange();

            this.postStatus('Loading markets...');
            await this.exchange.loadMarkets();

            this.allSymbols = this.filterSymbols();

            this.postLog('success', `Loaded ${this.allSymbols.length} symbols`);

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
        while (this.isRunning) {
            try {
                if (Date.now() >= this.weightResetTime) {
                    this.weight = 0;
                    this.weightResetTime = Date.now() + (this.config.weightResetInterval || 60000);
                    this.postLog('info', 'Weight reset');
                }

                if (this.weight >= this.maxWeight * this.weightThreshold) {
                    const waitTime = this.weightResetTime - Date.now();
                    this.postStatus(`Waiting ${Math.ceil(waitTime / 1000)}s...`);
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

    async processBatch() {
        const startIndex = this.currentBatchIndex;
        const endIndex = Math.min(startIndex + this.batchSize, this.allSymbols.length);

        if (startIndex >= this.allSymbols.length) {
            this.currentBatchIndex = 0;
            this.postLog('success', `Cycle complete - processed ${this.allSymbols.length} symbols`);
            await this.sleep(5000);
            return;
        }

        const batch = this.allSymbols.slice(startIndex, endIndex);
        this.postStatus(`Processing ${startIndex + 1}-${endIndex}/${this.allSymbols.length}`);
        this.postLog('info', `Batch: ${batch.slice(0, 3).join(', ')}${batch.length > 3 ? '...' : ''}`);

        let successCount = 0;
        let failCount = 0;

        for (const symbol of batch) {
            if (!this.isRunning) break;

            try {
                await this.processSymbol(symbol);
                successCount++;
            } catch (error) {
                failCount++;
                // Continue processing other symbols
            }

            await this.sleep(this.symbolDelay);
        }

        this.postLog('info', `Batch done: ${successCount} success, ${failCount} failed`);
        this.currentBatchIndex = endIndex;
    }

    async processSymbol(symbol) {
        if (this.weight >= this.maxWeight * this.weightThreshold) {
            throw new Error('Weight limit reached');
        }

        try {
            const ohlcv = await this.exchange.fetchOHLCV(symbol, this.timeframe, undefined, this.klineLimit);

            this.weight += this.weightCost;
            this.postWeight();

            if (!ohlcv || ohlcv.length === 0) {
                this.postLog('warn', `${symbol}: No data`);
                return;
            }

            // Accept data even if less than limit (some symbols may have less history)
            if (ohlcv.length < 50) {
                this.postLog('warn', `${symbol}: Only ${ohlcv.length} candles`);
                return;
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

    stop() {
        this.isRunning = false;
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
