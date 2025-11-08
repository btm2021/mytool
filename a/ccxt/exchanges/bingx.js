class BingXExchange extends BaseExchange {
    constructor() {
        super('bingx', {
            name: 'BingX Perpetual'
        });
        // BingX has a limit of 1440 candles per request
        this.limit = 1440;
    }

    async initialize() {
        try {
            this.exchange = new ccxt.bingx({
                enableRateLimit: true,
                proxy: 'https://regional-nicole-mycop-df54b780.koyeb.app/'
                //proxy: 'https://regional-nicole-mycop-df54b780.koyeb.app/'
                //   proxy: 'https://autumn-heart-5bf8.trinhminhbao.workers.dev/'
            });

            // Check cache first
            const cachedSymbols = await this.db.getMarkets(this.id);

            if (cachedSymbols) {
                this.symbols = cachedSymbols;
                this.log(`Loaded ${this.symbols.length} symbols from cache`, 'info');
            } else {
                await this.exchange.loadMarkets();

                // Lọc markets perpetual
                const perpetualMarkets = Object.values(this.exchange.markets).filter(m =>
                    m.contract === true &&
                    m.linear === true &&
                    m.swap === true
                );

                // Lấy symbols và filter thêm
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
        // Loại bỏ stablecoins không mong muốn
        const excludeCoins = ['USDC', 'BUSD', 'DAI', 'TUSD', 'USDP'];
        for (const coin of excludeCoins) {
            if (symbol.includes(coin)) return false;
        }

        // Loại bỏ symbols có dấu gạch dưới
        if (symbol.includes('_')) return false;

        // Loại bỏ symbols có dấu gạch ngang sau dấu :
        const parts = symbol.split(':');
        if (parts.length > 1 && parts[1].includes('-')) return false;

        // Loại bỏ symbols có chứa số sau dấu : hoặc có nhiều số liên tiếp (4+ digits)
        if (/:\w*\d/.test(symbol) || /\d{4,}/.test(symbol)) return false;

        return symbol.includes('/USDT');
    }
}
