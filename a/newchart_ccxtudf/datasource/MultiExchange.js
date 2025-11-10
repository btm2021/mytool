/**
 * Multi Exchange Manager
 * Quản lý nhiều exchanges và cung cấp interface thống nhất
 */
class MultiExchange {
    constructor() {
        this.exchanges = new Map();
        this.defaultExchange = null;
    }

    /**
     * Thêm exchange vào manager
     */
    addExchange(exchangeId, exchangeInstance) {
        this.exchanges.set(exchangeId, exchangeInstance);
        
        // Set default exchange nếu chưa có
        if (!this.defaultExchange) {
            this.defaultExchange = exchangeId;
        }
    }

    /**
     * Lấy exchange instance
     */
    getExchange(exchangeId) {
        return this.exchanges.get(exchangeId) || this.exchanges.get(this.defaultExchange);
    }

    /**
     * Lấy tất cả exchanges
     */
    getAllExchanges() {
        return Array.from(this.exchanges.keys());
    }

    /**
     * Lấy thông tin tất cả exchanges cho TradingView
     */
    getExchangesInfo() {
        const exchangesInfo = [];
        
        this.exchanges.forEach((exchange, exchangeId) => {
            exchangesInfo.push(exchange.getExchangeInfo());
        });
        
        return exchangesInfo;
    }

    /**
     * Parse symbol string (format: EXCHANGE:SYMBOL hoặc SYMBOL)
     */
    parseSymbol(symbolString) {
        const parts = symbolString.split(':');
        
        if (parts.length > 1) {
            return {
                exchange: parts[0],
                symbol: parts[1]
            };
        }
        
        return {
            exchange: this.defaultExchange,
            symbol: parts[0]
        };
    }

    /**
     * Tìm kiếm symbols trên tất cả exchanges
     */
    async searchSymbols(userInput, exchangeFilter = null, symbolType = null) {
        const results = [];
        
        // Nếu có filter exchange, chỉ search trên exchange đó
        if (exchangeFilter) {
            const exchange = this.getExchange(exchangeFilter);
            if (exchange) {
                const symbols = await exchange.searchSymbols(userInput, symbolType);
                results.push(...symbols);
            }
        } else {
            // Search trên tất cả exchanges
            const promises = [];
            
            this.exchanges.forEach((exchange, exchangeId) => {
                // Nếu có filter symbolType, chỉ search exchanges phù hợp
                if (symbolType) {
                    const marketType = exchange.getMarketType();
                    if (marketType !== symbolType) {
                        return; // Skip exchange này
                    }
                }
                
                promises.push(
                    exchange.searchSymbols(userInput, symbolType)
                        .catch(error => {
                            console.error(`Error searching on ${exchangeId}:`, error);
                            return [];
                        })
                );
            });
            
            const allResults = await Promise.all(promises);
            allResults.forEach(symbols => results.push(...symbols));
        }
        
        return results;
    }

    /**
     * Lấy thông tin symbol
     */
    async getSymbolInfo(symbolString) {
        const { exchange: exchangeId, symbol } = this.parseSymbol(symbolString);
        const exchange = this.getExchange(exchangeId);
        
        if (!exchange) {
            throw new Error(`Exchange ${exchangeId} not found`);
        }
        
        return await exchange.getSymbolInfo(symbol);
    }

    /**
     * Lấy OHLCV data
     */
    async fetchOHLCV(symbolString, timeframe, since, limit = 1000) {
        const { exchange: exchangeId, symbol } = this.parseSymbol(symbolString);
        const exchange = this.getExchange(exchangeId);
        
        if (!exchange) {
            throw new Error(`Exchange ${exchangeId} not found`);
        }
        
        return await exchange.fetchOHLCV(symbol, timeframe, since, limit);
    }

    /**
     * Subscribe WebSocket
     */
    subscribeWebSocket(symbolString, resolution, callback, subscriberUID) {
        const { exchange: exchangeId, symbol } = this.parseSymbol(symbolString);
        const exchange = this.getExchange(exchangeId);
        
        if (!exchange) {
            throw new Error(`Exchange ${exchangeId} not found`);
        }
        
        exchange.subscribeWebSocket(symbol, resolution, callback, subscriberUID);
    }

    /**
     * Unsubscribe WebSocket
     */
    unsubscribeWebSocket(symbolString, subscriberUID) {
        const { exchange: exchangeId } = this.parseSymbol(symbolString);
        const exchange = this.getExchange(exchangeId);
        
        if (exchange) {
            exchange.unsubscribeWebSocket(subscriberUID);
        }
    }

    /**
     * Lấy quote data
     */
    async getQuoteData(symbolString) {
        const { exchange: exchangeId, symbol } = this.parseSymbol(symbolString);
        const exchange = this.getExchange(exchangeId);
        
        if (!exchange) {
            return null;
        }
        
        // Nếu exchange có method getQuoteData (như Binance Futures)
        if (typeof exchange.getQuoteData === 'function') {
            return exchange.getQuoteData(symbol);
        }
        
        // Fallback: fetch ticker
        const ticker = await exchange.fetchTicker(symbol);
        if (!ticker) return null;
        
        return {
            priceChange: ticker.change || 0,
            priceChangePercent: ticker.percentage || 0,
            lastPrice: ticker.last || 0,
            openPrice: ticker.open || 0,
            highPrice: ticker.high || 0,
            lowPrice: ticker.low || 0,
            volume: ticker.baseVolume || 0
        };
    }

    /**
     * Cleanup tất cả exchanges
     */
    destroy() {
        this.exchanges.forEach(exchange => {
            exchange.destroy();
        });
        this.exchanges.clear();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiExchange;
}
