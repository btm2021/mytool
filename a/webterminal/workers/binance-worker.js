importScripts('base-worker.js');

class BinanceWorker extends BaseExchangeWorker {
    constructor(config) {
        super('binance', config);
    }

    createExchange() {
        return new ccxt.binance({
            enableRateLimit: true,
            options: {
                defaultType: 'future'
            }
        });
    }

    filterSymbols() {
        return Object.keys(this.exchange.markets).filter(symbol => {
            const market = this.exchange.markets[symbol];
            return market.quote === 'USDT' &&
                market.type === 'swap' &&
                market.active;
        });
    }
}

let worker = null;

self.onmessage = async function (e) {
    const { type, config } = e.data;

    if (type === 'init') {
        worker = new BinanceWorker(config);
        await worker.init();
    } else if (type === 'stop') {
        if (worker) worker.stop();
    }
};
