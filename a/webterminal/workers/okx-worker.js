importScripts('base-worker.js');

class OKXWorker extends BaseExchangeWorker {
    constructor(config) {
        super('okx', config);
    }

    createExchange() {
        return new ccxt.okx({
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
            return market.quote === 'USDT' && 
                   market.type === 'swap' && 
                   market.active;
        });
    }
}

let worker = null;

self.onmessage = async function(e) {
    const { type, config } = e.data;
    
    if (type === 'init') {
        worker = new OKXWorker(config);
        await worker.init();
    } else if (type === 'stop') {
        if (worker) worker.stop();
    }
};
