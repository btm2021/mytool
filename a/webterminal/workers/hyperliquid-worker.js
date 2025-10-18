importScripts('base-worker.js');

class HyperliquidWorker extends BaseExchangeWorker {
    constructor(config) {
        super('hyperliquid', config);
    }

    createExchange() {
        return new ccxt.hyperliquid({
            enableRateLimit: true,
            timeout: 30000
        });
    }

    filterSymbols() {
        return Object.keys(this.exchange.markets).filter(symbol => {
            const market = this.exchange.markets[symbol];
            return market.quote === 'USDC' && 
                   market.type === 'swap' &&
                   market.active;
        });
    }
}

let worker = null;

self.onmessage = async function(e) {
    const { type, config, data } = e.data;
    
    if (type === 'init') {
        worker = new HyperliquidWorker(config);
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
