importScripts('indicators.js');

const queue = [];
let processing = false;

self.onmessage = function(e) {
    const { type, exchangeId, symbol, ohlcv, config, batch } = e.data;
    
    if (type === 'calculate') {
        queue.push({ exchangeId, symbol, ohlcv, config });
        processQueue();
    } else if (type === 'calculate_batch') {
        // Process multiple symbols at once
        batch.forEach(item => {
            queue.push(item);
        });
        processQueue();
    }
};

async function processQueue() {
    if (processing || queue.length === 0) return;
    
    processing = true;
    
    // Process up to 50 items at once
    const batchSize = Math.min(50, queue.length);
    const items = queue.splice(0, batchSize);
    
    const results = items.map(item => {
        try {
            if (!item.ohlcv || item.ohlcv.length === 0) {
                return null;
            }

            if (item.ohlcv.length < 50) {
                return null;
            }

            const result = Indicators.calculateAll(item.ohlcv, item.config);
            
            if (!result) {
                return null;
            }

            return {
                type: 'result',
                exchangeId: item.exchangeId,
                symbol: item.symbol,
                indicators: result
            };
        } catch (error) {
            return null;
        }
    });
    
    // Send all results
    results.forEach(result => {
        if (result) {
            self.postMessage(result);
        }
    });
    
    processing = false;
    
    // Continue processing if there are more items
    if (queue.length > 0) {
        setTimeout(processQueue, 0);
    }
}
