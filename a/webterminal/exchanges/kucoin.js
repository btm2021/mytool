class KucoinExchange extends BaseExchange {
    constructor(config) {
        super('kucoin', config);
    }

    createExchange() {
        return new ccxt.kucoinfutures({
            enableRateLimit: true,
            timeout: 30000
        });
    }

    filterSymbols() {
        return Object.keys(this.exchange.markets).filter(symbol => {
            const market = this.exchange.markets[symbol];
            return market.active &&
                (market.settle === 'USDT' || market.quote === 'USDT') &&
                (market.type === 'swap' || market.swap === true);
        });
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

            if (!timestamp || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume) || volume < 0) {
                return null;
            }

            if (open === 0 && high === 0 && low === 0 && close === 0) {
                return null;
            }

            if (high > 0 && low > 0) {
                if (high < low) return null;
                if (open > 0 && (high < open || low > open)) return null;
                if (close > 0 && (high < close || low > close)) return null;
            }

            return [timestamp, open, high, low, close, volume];
        }).filter(candle => candle !== null);
    }
}


window.KucoinExchange = KucoinExchange;