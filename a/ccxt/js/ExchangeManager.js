class ExchangeManager {
    constructor() {
        this.exchanges = [];
        this.logger = new Logger();
        this.db = new Database();
    }

    addExchange(exchange) {
        exchange.setLogger(this.logger);
        exchange.setDatabase(this.db);
        // Mỗi exchange có RateLimiter riêng
        const rateLimiter = new RateLimiter(AppConfig.requestsPerMinute);
        exchange.setRateLimiter(rateLimiter);
        this.exchanges.push(exchange);
        this.logger.info(`Added exchange: ${exchange.name}`);
    }

    getExchange(id) {
        return this.exchanges.find(ex => ex.id === id);
    }

    getAllExchanges() {
        return this.exchanges;
    }

    getExchangesInfo() {
        return this.exchanges.map(ex => ex.getInfo());
    }

    getExchangeResults(id) {
        const exchange = this.getExchange(id);
        return exchange ? exchange.getResults() : [];
    }

    async initializeExchange(id) {
        const exchange = this.getExchange(id);
        if (exchange) {
            await exchange.initialize();
        }
    }

    async startExchange(id) {
        const exchange = this.getExchange(id);
        if (exchange) {
            await exchange.start();
        }
    }

    pauseExchange(id) {
        const exchange = this.getExchange(id);
        if (exchange) {
            exchange.pause();
        }
    }

    stopExchange(id) {
        const exchange = this.getExchange(id);
        if (exchange) {
            exchange.stop();
        }
    }

    async reloadExchange(id) {
        const exchange = this.getExchange(id);
        if (exchange) {
            await exchange.reload();
        }
    }

    async startAll() {
        this.logger.info('Starting all exchanges...');
        for (const exchange of this.exchanges) {
            await exchange.start();
        }
    }

    pauseAll() {
        this.logger.info('Pausing all exchanges...');
        this.exchanges.forEach(ex => ex.pause());
    }

    stopAll() {
        this.logger.info('Stopping all exchanges...');
        this.exchanges.forEach(ex => ex.stop());
    }

    getLogs() {
        return this.logger.getLogs();
    }

    getExchangeSymbols(id) {
        const exchange = this.getExchange(id);
        return exchange ? exchange.getSymbols() : [];
    }

    async clearCache() {
        this.logger.info('Clearing all cache...');
        
        // Stop all exchanges first
        this.stopAll();
        
        // Clear database
        const db = new Database();
        await db.db.markets.clear();
        await db.db.ohlcv.clear();
        await db.db.processed.clear();
        
        this.logger.success('Cache cleared successfully');
    }
}
