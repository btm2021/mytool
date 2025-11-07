class PhemexExchange extends BaseExchange {
    constructor() {
        super('phemex', {
            name: 'Phemex Perpetual'
        });
    }

    async initialize() {
        try {
            this.exchange = new ccxt.phemex({
                enableRateLimit: true,
             //   proxy: 'https://autumn-heart-5bf8.trinhminhbao.workers.dev/',
                options: {
                    defaultType: 'swap'
                }
            });
            
            const cachedSymbols = await this.db.getMarkets(this.id);
            
            if (cachedSymbols) {
                this.symbols = cachedSymbols;
                this.log(`Loaded ${this.symbols.length} symbols from cache`, 'info');
            } else {
                await this.exchange.loadMarkets();
                
                const perpetualMarkets = Object.values(this.exchange.markets).filter(m =>
                    m.contract === true &&
                    m.swap === true &&
                    m.linear === true
                );
                
                const allSymbols = perpetualMarkets.map(m => m.symbol);
                this.symbols = allSymbols.filter(s => this.filterSymbol(s));
                await this.db.saveMarkets(this.id, this.symbols);
                this.log(`Fetched and cached ${this.symbols.length} symbols`, 'success');
            }
            
            return true;
        } catch (error) {
            this.log(`Failed to initialize ${this.name}: ${error.message}`, 'error');
            return false;
        }
    }

    filterSymbol(symbol) {
        const excludeCoins = ['USDC', 'BUSD', 'DAI', 'TUSD', 'USDP'];
        for (const coin of excludeCoins) {
            if (symbol.includes(coin)) return false;
        }

        if (symbol.includes('_')) return false;

        const parts = symbol.split(':');
        if (parts.length > 1 && parts[1].includes('-')) return false;

        if (/:\w*\d/.test(symbol) || /\d{4,}/.test(symbol)) return false;

        return symbol.includes('/USDT');
    }
}
