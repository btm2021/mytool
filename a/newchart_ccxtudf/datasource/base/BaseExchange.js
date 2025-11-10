/**
 * Base Exchange Class
 * Sử dụng CCXT để fetch dữ liệu từ các sàn giao dịch
 * Các exchange cụ thể có thể kế thừa và ghi đè các phương thức
 */
class BaseExchange {
    constructor(exchangeId, options = {}) {
        this.exchangeId = exchangeId;
        this.options = options;
        this.ccxtExchange = null;
        this.marketsLoaded = false;
        this.subscribers = {};
        this.quoteSubscribers = {};
        this.websockets = {};
        
        // Initialize CCXT exchange (async, không block constructor)
        this.initializeCCXT().catch(error => {
            console.error(`Failed to initialize CCXT for ${exchangeId}:`, error);
        });
    }

    /**
     * Khởi tạo CCXT exchange instance
     */
    async initializeCCXT() {
        try {
            if (typeof ccxt === 'undefined') {
                console.error('CCXT library not loaded');
                return;
            }

            const ExchangeClass = ccxt[this.exchangeId.toLowerCase()];
            if (!ExchangeClass) {
                console.error(`Exchange ${this.exchangeId} not found in CCXT`);
                return;
            }

            this.ccxtExchange = new ExchangeClass({
                ...this.options,
                enableRateLimit: true
            });

            await this.ccxtExchange.loadMarkets();
            this.marketsLoaded = true;
        } catch (error) {
            console.error(`Error initializing CCXT for ${this.exchangeId}:`, error);
            this.marketsLoaded = false;
        }
    }

    /**
     * Đảm bảo markets đã được load
     */
    async ensureMarketsLoaded() {
        if (!this.ccxtExchange) {
            await this.initializeCCXT();
        }
        
        if (!this.marketsLoaded && this.ccxtExchange) {
            try {
                await this.ccxtExchange.loadMarkets();
                this.marketsLoaded = true;
            } catch (error) {
                console.error(`Error loading markets for ${this.exchangeId}:`, error);
                this.marketsLoaded = false;
            }
        }
    }

    /**
     * Lấy thông tin exchange
     */
    getExchangeInfo() {
        return {
            value: this.exchangeId,
            name: this.exchangeId,
            desc: `${this.exchangeId} Exchange`
        };
    }

    /**
     * Lấy market type (spot/future/swap)
     */
    getMarketType() {
        return this.options?.options?.defaultType || 'spot';
    }

    /**
     * Tìm kiếm symbols
     */
    async searchSymbols(userInput, symbolType) {
        await this.ensureMarketsLoaded();

        try {
            const markets = Object.values(this.ccxtExchange.markets || {});
            let filteredMarkets = markets.filter(m => m.active);

            // Filter theo input
            if (userInput && userInput.trim() !== '') {
                const upperInput = userInput.toUpperCase();
                filteredMarkets = filteredMarkets.filter(m =>
                    m.symbol.includes(upperInput) || 
                    m.base.includes(upperInput) ||
                    m.quote.includes(upperInput)
                );
            }

            // Giới hạn kết quả
            return filteredMarkets.slice(0, 100).map(m => ({
                symbol: m.symbol.replace('/', ''),
                full_name: `${this.exchangeId}:${m.symbol.replace('/', '')}`,
                description: `${m.base}/${m.quote}`,
                exchange: this.exchangeId,
                type: symbolType || 'crypto',
                logo_urls: this.getLogoUrls(m.base)
            }));
        } catch (error) {
            console.error(`Error searching symbols on ${this.exchangeId}:`, error);
            return [];
        }
    }

    /**
     * Lấy logo URLs
     */
    getLogoUrls(baseAsset) {
        const logos = [];

        if (typeof LOGO_MAPS === 'undefined') {
            return [`images/crypto/${baseAsset.toUpperCase()}.svg`];
        }

        const cryptoKey = baseAsset.toUpperCase();
        if (LOGO_MAPS.crypto[cryptoKey]) {
            logos.push(`images/crypto/${LOGO_MAPS.crypto[cryptoKey]}`);
        } else {
            logos.push(`images/crypto/${cryptoKey}.svg`);
        }

        if (LOGO_MAPS.provider[this.exchangeId]) {
            logos.push(`images/provider/${LOGO_MAPS.provider[this.exchangeId]}`);
        }

        return logos;
    }

    /**
     * Lấy thông tin symbol
     */
    async getSymbolInfo(symbol) {
        await this.ensureMarketsLoaded();

        try {
            const market = this.ccxtExchange.market(symbol);
            const ticker = await this.ccxtExchange.fetchTicker(symbol);

            return {
                market,
                ticker,
                precision: this.calculatePrecision(ticker.last)
            };
        } catch (error) {
            console.error(`Error getting symbol info for ${symbol}:`, error);
            return null;
        }
    }

    /**
     * Tính precision dựa trên giá
     */
    calculatePrecision(price) {
        if (!price || price === 0) {
            return { minmov: 1, pricescale: 100 };
        }

        let decimals;
        if (price >= 1000) decimals = 2;
        else if (price >= 100) decimals = 2;
        else if (price >= 10) decimals = 3;
        else if (price >= 1) decimals = 4;
        else if (price >= 0.1) decimals = 5;
        else if (price >= 0.01) decimals = 6;
        else if (price >= 0.001) decimals = 7;
        else decimals = 8;

        return {
            minmov: 1,
            pricescale: Math.pow(10, decimals)
        };
    }

    /**
     * Lấy OHLCV data (bars)
     */
    async fetchOHLCV(symbol, timeframe, since, limit = 1000) {
        await this.ensureMarketsLoaded();

        try {
            const ohlcv = await this.ccxtExchange.fetchOHLCV(symbol, timeframe, since, limit);
            
            return ohlcv.map(bar => ({
                time: bar[0],
                open: bar[1],
                high: bar[2],
                low: bar[3],
                close: bar[4],
                volume: bar[5]
            }));
        } catch (error) {
            console.error(`Error fetching OHLCV for ${symbol}:`, error);
            return [];
        }
    }

    /**
     * Lấy ticker 24h
     */
    async fetchTicker(symbol) {
        await this.ensureMarketsLoaded();

        try {
            return await this.ccxtExchange.fetchTicker(symbol);
        } catch (error) {
            console.error(`Error fetching ticker for ${symbol}:`, error);
            return null;
        }
    }

    /**
     * Lấy tất cả tickers
     */
    async fetchTickers() {
        await this.ensureMarketsLoaded();

        try {
            return await this.ccxtExchange.fetchTickers();
        } catch (error) {
            console.error(`Error fetching tickers:`, error);
            return {};
        }
    }

    /**
     * Convert resolution sang timeframe CCXT
     */
    resolutionToTimeframe(resolution) {
        const map = {
            '1': '1m',
            '5': '5m',
            '15': '15m',
            '30': '30m',
            '60': '1h',
            '240': '4h',
            '1D': '1d',
            '1W': '1w',
            '1M': '1M'
        };
        return map[resolution] || '15m';
    }

    /**
     * Subscribe WebSocket (cần override cho từng exchange)
     */
    subscribeWebSocket(symbol, callback) {
        console.warn(`WebSocket subscription not implemented for ${this.exchangeId}`);
    }

    /**
     * Unsubscribe WebSocket
     */
    unsubscribeWebSocket(subscriberUID) {
        const ws = this.websockets[subscriberUID];
        if (ws) {
            ws.close();
            delete this.websockets[subscriberUID];
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        // Close all websockets
        Object.keys(this.websockets).forEach(uid => {
            this.unsubscribeWebSocket(uid);
        });

        // Clear subscribers
        this.subscribers = {};
        this.quoteSubscribers = {};
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseExchange;
}
