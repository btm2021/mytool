importScripts('base-worker.js');

class HyperliquidWorker extends BaseExchangeWorker {
    constructor(config) {
        super('hyperliquid', config);
    }

    createExchange() {
        const baseOptions = this.getExchangeOptions();
        
        return new ccxt.hyperliquid({
            ...baseOptions,
            options: {
                defaultType: 'swap'
            }
        });
    }

    filterSymbols() {
        return Object.keys(this.exchange.markets).filter(symbol => {
            const market = this.exchange.markets[symbol];
            // Hyperliquid uses USDC as quote currency for perpetual futures
            return (
                market.active &&
                (market.settle === 'USDC' || market.quote === 'USDC') &&
                (market.type === 'swap' || market.swap === true)
            );
        });
    }

    normalizeSymbol(symbol) {
        // Hyperliquid might use format like BTC/USDC:USDC
        // Normalize to BTC/USDC format
        if (symbol.includes(':')) {
            return symbol.split(':')[0];
        }
        return symbol;
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
