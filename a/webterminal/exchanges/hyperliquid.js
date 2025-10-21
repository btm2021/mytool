class HyperliquidExchange extends BaseExchange {
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
            return market.active && market.type === 'swap';
        });
    }
}


window.HyperliquidExchange = HyperliquidExchange;