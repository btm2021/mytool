class BitmexExchange extends BaseExchange {
    constructor(config) {
        super('bitmex', config);
    }

    createExchange() {
        return new ccxt.bitmex({
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


window.BitmexExchange = BitmexExchange;