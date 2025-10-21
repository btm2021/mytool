// Calculator module for indicator calculations (no longer a worker)
const Calculator = {
    queue: [],
    processing: false,

    calculate(exchangeId, symbol, ohlcv, config, callback) {
        this.queue.push({ exchangeId, symbol, ohlcv, config, callback });
        this.processQueue();
    },

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        const batchSize = Math.min(50, this.queue.length);
        const items = this.queue.splice(0, batchSize);
        
        items.forEach(item => {
            try {
                if (!item.ohlcv || item.ohlcv.length === 0 || item.ohlcv.length < 50) {
                    return;
                }

                const result = Indicators.calculateAll(item.ohlcv, item.config);
                
                if (result && item.callback) {
                    item.callback({
                        exchangeId: item.exchangeId,
                        symbol: item.symbol,
                        indicators: result
                    });
                }
            } catch (error) {
                console.error(`Calculator error for ${item.symbol}:`, error);
            }
        });
        
        this.processing = false;
        
        if (this.queue.length > 0) {
            setTimeout(() => this.processQueue(), 0);
        }
    }
};
