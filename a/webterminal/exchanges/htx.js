class HtxExchange extends BaseExchange {
    constructor(config) {
        super('htx', config);
    }

    createExchange() {
        return new ccxt.htx({
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


window.HtxExchange = HtxExchange;