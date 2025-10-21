class BitfinexExchange extends BaseExchange {
    constructor(config) {
        super('bitfinex', config);
    }

    createExchange() {
        return new ccxt.bitfinex({
            enableRateLimit: true,
            timeout: 30000
        });
    }

    filterSymbols() {
        return Object.keys(this.exchange.markets).filter(symbol => {
            const market = this.exchange.markets[symbol];
            return market.quote === 'USD' && market.type === 'spot' && market.active;
        });
    }
}


window.BitfinexExchange = BitfinexExchange;