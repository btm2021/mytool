importScripts('base-worker.js');

class BybitWorker extends BaseExchangeWorker {
    constructor(config) {
        super('bybit', config);
    }

    createExchange() {
        return new ccxt.bybit({
            enableRateLimit: true,
            timeout: 30000,
            options: {
                defaultType: 'linear',
                recvWindow: 10000
            }
        });
    }

    filterSymbols() {
        return Object.keys(this.exchange.markets).filter(symbol => {
            const market = this.exchange.markets[symbol];
            return market.quote === 'USDT' && 
                   market.linear === true && 
                   market.active;
        });
    }
}

let worker = null;

self.onmessage = async function(e) {
    const { type, config } = e.data;
    
    if (type === 'init') {
        worker = new BybitWorker(config);
        await worker.init();
    } else if (type === 'stop') {
        if (worker) worker.stop();
    }
};
