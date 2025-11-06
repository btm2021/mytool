class CacheManager {
    constructor() {
        this.dbName = 'BinanceChartCache';
        this.dbVersion = 1;
        this.storeName = 'candles';
        this.db = null;
        this.MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
        this.initDB();
    }
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    objectStore.createIndex('symbol', 'symbol', { unique: false });
                    objectStore.createIndex('timeframe', 'timeframe', { unique: false });
                    objectStore.createIndex('lastUpdate', 'lastUpdate', { unique: false });
                }
            };
        });
    }
    
    async ensureDB() {
        if (!this.db) {
            await this.initDB();
        }
    }
    
    getCacheKey(symbol, timeframe) {
        return `${symbol}_${timeframe}`;
    }
    
    async saveToCache(symbol, timeframe, candles) {
        await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const cacheData = {
                id: this.getCacheKey(symbol, timeframe),
                symbol: symbol,
                timeframe: timeframe,
                candles: candles,
                lastUpdate: Date.now(),
                count: candles.length
            };
            
            const request = store.put(cacheData);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
    
    async loadFromCache(symbol, timeframe, limit = null) {
        await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(this.getCacheKey(symbol, timeframe));
            
            request.onsuccess = () => {
                const result = request.result;
                if (!result) {
                    resolve({ candles: [], cached: false });
                    return;
                }
                
                let candles = result.candles;
                if (limit && candles.length > limit) {
                    candles = candles.slice(-limit);
                }
                
                resolve({
                    candles: candles,
                    cached: true,
                    lastUpdate: result.lastUpdate
                });
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async needsMoreData(symbol, timeframe, requestedCount) {
        const cached = await this.loadFromCache(symbol, timeframe);
        
        if (!cached.cached || !cached.candles || cached.candles.length === 0) {
            return {
                needsFetch: true,
                reason: 'no_cache',
                cached: 0,
                additional: requestedCount
            };
        }
        
        const age = Date.now() - cached.lastUpdate;
        if (age > this.MAX_AGE) {
            return {
                needsFetch: true,
                reason: 'data_too_old',
                cached: cached.candles.length,
                additional: requestedCount
            };
        }
        
        if (cached.candles.length < requestedCount) {
            return {
                needsFetch: true,
                reason: 'insufficient_data',
                cached: cached.candles.length,
                additional: requestedCount - cached.candles.length
            };
        }
        
        return {
            needsFetch: false,
            reason: 'cache_sufficient',
            cached: cached.candles.length
        };
    }
    
    async deleteCacheEntry(symbol, timeframe) {
        await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(this.getCacheKey(symbol, timeframe));
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
    
    async clearAllCache() {
        await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAllCachedData() {
        await this.ensureDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const results = request.result || [];
                const formatted = results.map(r => ({
                    symbol: r.symbol,
                    timeframe: r.timeframe,
                    count: r.count,
                    lastUpdate: r.lastUpdate,
                    size: this.formatBytes(JSON.stringify(r.candles).length)
                }));
                resolve(formatted);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
}
