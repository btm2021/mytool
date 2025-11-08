class OKXExchange extends BaseExchange {
    constructor() {
        super('okx', {
            name: 'OKX Perpetual'
        });
    }

    async initialize() {
        try {
            this.exchange = new ccxt[this.id]({
                enableRateLimit: true,
                options: {
                    defaultType: 'swap'  // perpetual futures
                }
            });
            
            const cachedSymbols = await this.db.getMarkets(this.id);
            
            if (cachedSymbols) {
                this.symbols = cachedSymbols;
                this.log(`Loaded ${this.symbols.length} symbols from cache`, 'info');
            } else {
                await this.exchange.loadMarkets();
                const allSymbols = Object.keys(this.exchange.markets);
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
        // Loại bỏ stablecoins không mong muốn
        const excludeCoins = ['USDC', 'BUSD', 'DAI', 'TUSD', 'USDP'];
        for (const coin of excludeCoins) {
            if (symbol.includes(coin)) return false;
        }

        // Loại bỏ symbols có dấu gạch dưới
        if (symbol.includes('_')) return false;

        // Loại bỏ symbols có dấu gạch ngang sau dấu :
        // Ví dụ: BTC/USDT:USDT-260327-60000-P
        const parts = symbol.split(':');
        if (parts.length > 1 && parts[1].includes('-')) return false;

        // Loại bỏ symbols có chứa số sau dấu : hoặc có nhiều số liên tiếp
        if (/:\w*\d/.test(symbol) || /\d{4,}/.test(symbol)) return false;

        // OKX perpetual format: BTC/USDT:USDT
        return symbol.includes('/USDT:USDT') || symbol.includes('/USDT-SWAP');
    }
}
