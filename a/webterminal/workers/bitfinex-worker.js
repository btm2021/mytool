importScripts('base-worker.js');

class BitfinexWorker extends BaseExchangeWorker {
    constructor(config) {
        super('bitfinex', config);
    }

    createExchange() {
        return new ccxt.bitfinex({
            enableRateLimit: true,
            timeout: 30000,
            options: {
                defaultType: 'swap'
            }
        });
    }

    filterSymbols() {
        return Object.keys(this.exchange.markets).filter(symbol => {
            const market = this.exchange.markets[symbol];
            return (market.quote === 'USDT' || market.quote === 'USD') && 
                   market.type === 'swap' &&
                   market.active;
        });
    }
}

let worker = null;

self.onmessage = async function(e) {
    const { type, config, data } = e.data;
    
    if (type === 'init') {
        worker = new BitfinexWorker(config);
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
