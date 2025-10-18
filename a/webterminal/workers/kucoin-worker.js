importScripts('base-worker.js');

class KucoinWorker extends BaseExchangeWorker {
    constructor(config) {
        super('kucoin', config);
    }

    createExchange() {
        const baseOptions = this.getExchangeOptions();

        // KuCoin Futures uses kucoin exchange with futures API
        return new ccxt.kucoinfutures({
            ...baseOptions,
            enableRateLimit: true,
            timeout: 30000
        });
    }

    filterSymbols() {
        return Object.keys(this.exchange.markets).filter(symbol => {
            const market = this.exchange.markets[symbol];
            // Filter for USDT perpetual futures
            return (
                market.active &&
                (market.settle === 'USDT' || market.quote === 'USDT') &&
                (market.type === 'swap' || market.swap === true)
            );
        });
    }

    normalizeSymbol(symbol) {
        // KuCoin futures symbols might be in format like BTC/USDT:USDT
        // Normalize to BTC/USDT format
        if (symbol.includes(':')) {
            return symbol.split(':')[0];
        }
        return symbol;
    }

    normalizeOHLCV(ohlcv) {
        // CCXT already normalizes KuCoin data to standard format
        // Standard format: [timestamp, open, high, low, close, volume]
        if (!ohlcv || !Array.isArray(ohlcv)) {
            return [];
        }

        return ohlcv.map(candle => {
            if (!Array.isArray(candle) || candle.length < 6) {
                return null;
            }

            // CCXT returns standard format: [timestamp(ms), open, high, low, close, volume]
            const timestamp = candle[0];
            const open = parseFloat(candle[1]);
            const high = parseFloat(candle[2]);
            const low = parseFloat(candle[3]);
            const close = parseFloat(candle[4]);
            const volume = parseFloat(candle[5]);

            // Validate values - allow zero values for some fields
            if (
                !timestamp ||
                isNaN(open) ||
                isNaN(high) ||
                isNaN(low) ||
                isNaN(close) ||
                isNaN(volume) || volume < 0
            ) {
                return null;
            }

            // Skip candles with all zero prices (invalid data)
            if (open === 0 && high === 0 && low === 0 && close === 0) {
                return null;
            }

            // Validate OHLC relationship only if values are non-zero
            if (high > 0 && low > 0) {
                if (high < low) {
                    return null;
                }
                if (open > 0 && (high < open || low > open)) {
                    return null;
                }
                if (close > 0 && (high < close || low > close)) {
                    return null;
                }
            }

            // Return in standard format: [timestamp, open, high, low, close, volume]
            return [timestamp, open, high, low, close, volume];
        }).filter(candle => candle !== null);
    }
}

let worker = null;

self.onmessage = async function (e) {
    const { type, config, data } = e.data;

    if (type === 'init') {
        worker = new KucoinWorker(config);
        await worker.init();
    } else if (type === 'pause') {
        if (worker) worker.pause();
    } else if (type === 'resume') {
        if (worker) worker.resume();
    } else if (type === 'stop') {
        if (worker) worker.stop();
    } else if (type === 'set_processed') {
        if (worker) worker.setProcessedSymbols(data);
    }
};
