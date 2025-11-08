class Database {
    constructor() {
        this.db = new Dexie(AppConfig.dbName);
        this.db.version(AppConfig.dbVersion).stores({
            markets: 'id, exchangeId, timestamp',
            ohlcv: '[exchangeId+symbol+timeframe], exchangeId, symbol, timeframe, timestamp',
            processed: '[exchangeId+symbol], exchangeId, symbol, lastProcessed'
        });
    }

    // Markets cache
    async getMarkets(exchangeId) {
        const cached = await this.db.markets.get(exchangeId);
        if (cached && (Date.now() - cached.timestamp < AppConfig.cacheExpiry)) {
            return cached.symbols;
        }
        return null;
    }

    async saveMarkets(exchangeId, symbols) {
        await this.db.markets.put({
            id: exchangeId,
            exchangeId: exchangeId,
            symbols: symbols,
            timestamp: Date.now()
        });
    }

    // OHLCV cache
    async getOHLCV(exchangeId, symbol, timeframe) {
        const key = `${exchangeId}_${symbol}_${timeframe}`;
        return await this.db.ohlcv.get([exchangeId, symbol, timeframe]);
    }

    async saveOHLCV(exchangeId, symbol, timeframe, data) {
        await this.db.ohlcv.put({
            exchangeId: exchangeId,
            symbol: symbol,
            timeframe: timeframe,
            data: data,
            timestamp: Date.now()
        });
    }

    // Processed tracking
    async getProcessed(exchangeId, symbol) {
        return await this.db.processed.get([exchangeId, symbol]);
    }

    async markProcessed(exchangeId, symbol) {
        await this.db.processed.put({
            exchangeId: exchangeId,
            symbol: symbol,
            lastProcessed: Date.now()
        });
    }

    async getAllProcessed(exchangeId) {
        return await this.db.processed.where('exchangeId').equals(exchangeId).toArray();
    }

    async clearProcessed(exchangeId) {
        await this.db.processed.where('exchangeId').equals(exchangeId).delete();
    }
}
