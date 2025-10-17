importScripts('indicators.js');

self.onmessage = function(e) {
    const { type, exchangeId, symbol, ohlcv, config } = e.data;
    
    if (type === 'calculate') {
        try {
            if (!ohlcv || ohlcv.length === 0) {
                throw new Error('No OHLCV data');
            }

            if (ohlcv.length < 50) {
                throw new Error(`Insufficient data: ${ohlcv.length} candles`);
            }

            const result = Indicators.calculateAll(ohlcv, config);
            
            if (!result) {
                throw new Error('Calculation returned null');
            }

            self.postMessage({
                type: 'result',
                exchangeId: exchangeId,
                symbol: symbol,
                indicators: result
            });

        } catch (error) {
            // Log error but don't send to main thread (too noisy)
            console.error(`Calculator error for ${symbol}:`, error.message);
        }
    }
};
