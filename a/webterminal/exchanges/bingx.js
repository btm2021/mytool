class BingxExchange extends BaseExchange {
    constructor(config) {
        super('bingx', config);
    }

    createExchange() {
        return new ccxt.bingx({
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
            return market.quote === 'USDT' && market.type === 'swap' && market.active;
        });
    }
}


window.BingxExchange = BingxExchange;