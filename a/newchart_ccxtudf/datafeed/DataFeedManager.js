/**
 * DataFeedManager - Quản lý tất cả các datasource
 * Routing requests đến đúng datasource dựa trên symbol
 */
class DataFeedManager {
    constructor() {
        this.dataSources = new Map(); // Map<name, dataSource>
        this.symbolRouting = new Map(); // Map<symbolPattern, dataSourceName>
        this.symbolCache = []; // Cache tất cả symbols
        this.cacheLoaded = false;
        
        this.logoKitApiKey = 'pk_fr3913faea87c0324fc626';
        this.placeholderIcon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMWExYTFhIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMjAiIGZpbGw9IiMzMzMiIHN0cm9rZT0iIzU1NSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iMzIiIHk9IjM4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPj88L3RleHQ+PC9zdmc+';
    }

    getSymbolIcon(baseAsset, type) {
        if (type === 'forex') {
            return this.placeholderIcon;
        }
        
        if (!baseAsset) {
            return this.placeholderIcon;
        }
        //https://huobicfg.s3.amazonaws.com/currency_icon/ltc.png
          return `https://huobicfg.s3.amazonaws.com/currency_icon/${baseAsset.replace(/^1000/, '').toLowerCase()}.png`;
    
       // return `https://icon.gateimg.com/images/coin_icon/64/${baseAsset.toLowerCase()}.png`;
    }

    /**
     * Đăng ký một datasource mới
     * @param {string} name - Tên datasource
     * @param {BaseDataSource} dataSource - Instance của datasource
     * @param {Array<string>} patterns - Mảng các pattern để match symbol (vd: ['BINANCE:*', 'BINANCEFUTURES:*'])
     */
    registerDataSource(name, dataSource, patterns = []) {
        this.dataSources.set(name, dataSource);
        
        // Đăng ký patterns
        patterns.forEach(pattern => {
            this.symbolRouting.set(pattern, name);
        });

        console.log(`[DataFeedManager] Registered datasource: ${name} with patterns:`, patterns);
    }

    /**
     * Tìm datasource phù hợp cho symbol
     * @param {string} symbolName - Tên symbol (format: EXCHANGE:SYMBOL hoặc SYMBOL)
     * @returns {BaseDataSource|null}
     */
    findDataSource(symbolName) {
        // Nếu symbol không có prefix, thử thêm prefix mặc định
        if (!symbolName.includes(':')) {
            // Thử với Binance Spot trước
            const binanceSymbol = `BINANCE:${symbolName}`;
            const dataSource = this.findDataSourceWithPrefix(binanceSymbol);
            if (dataSource) {
                return dataSource;
            }
            
            // Thử với Binance Futures
            const futuresSymbol = `BINANCEFUTURES:${symbolName}`;
            const futuresDataSource = this.findDataSourceWithPrefix(futuresSymbol);
            if (futuresDataSource) {
                return futuresDataSource;
            }

            // Thử với Bybit
            const bybitSymbol = `BYBIT:${symbolName}`;
            const bybitDataSource = this.findDataSourceWithPrefix(bybitSymbol);
            if (bybitDataSource) {
                return bybitDataSource;
            }

            // Thử với OKX
            const okxSymbol = `OKX:${symbolName}`;
            const okxDataSource = this.findDataSourceWithPrefix(okxSymbol);
            if (okxDataSource) {
                return okxDataSource;
            }

            // Thử với OANDA
            const oandaSymbol = `OANDA:${symbolName}`;
            const oandaDataSource = this.findDataSourceWithPrefix(oandaSymbol);
            if (oandaDataSource) {
                return oandaDataSource;
            }
        }

        return this.findDataSourceWithPrefix(symbolName);
    }

    /**
     * Tìm datasource với symbol có prefix
     * @param {string} symbolName - Tên symbol có prefix
     * @returns {BaseDataSource|null}
     */
    findDataSourceWithPrefix(symbolName) {
        // Tìm exact match trước
        for (const [pattern, dataSourceName] of this.symbolRouting.entries()) {
            if (this.matchPattern(symbolName, pattern)) {
                const dataSource = this.dataSources.get(dataSourceName);
                if (dataSource && dataSource.canHandle(symbolName)) {
                    return dataSource;
                }
            }
        }

        // Fallback: tìm datasource đầu tiên có thể handle
        for (const dataSource of this.dataSources.values()) {
            if (dataSource.canHandle(symbolName)) {
                return dataSource;
            }
        }

        return null;
    }

    /**
     * Match pattern với symbol name
     * @param {string} symbolName - Tên symbol
     * @param {string} pattern - Pattern (hỗ trợ wildcard *)
     * @returns {boolean}
     */
    matchPattern(symbolName, pattern) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
        return regex.test(symbolName);
    }

    /**
     * Lấy tất cả datasources đã đăng ký
     * @returns {Array<Object>}
     */
    getAllDataSources() {
        return Array.from(this.dataSources.entries()).map(([name, dataSource]) => ({
            name,
            dataSource
        }));
    }

    /**
     * Load tất cả symbols từ các datasources song song với Promise.all
     */
    async loadAllSymbols(onProgress) {
        if (this.cacheLoaded) return;

        console.log('[DataFeedManager] Loading all symbols...');
        
        const loadTasks = [];
        let completed = 0;

        const createLoadTask = (name, label, loadFn) => {
            if (!this.dataSources.get(name)) return null;
            return loadFn().then(symbols => {
                completed++;
                if (onProgress) onProgress(completed, loadTasks.length, `Loaded ${label}`);
                console.log(`[DataFeedManager] Loaded ${symbols.length} ${label} symbols`);
                return symbols;
            }).catch(error => {
                console.error(`[DataFeedManager] Error loading ${label}:`, error);
                completed++;
                if (onProgress) onProgress(completed, loadTasks.length, `Error: ${label}`);
                return [];
            });
        };

        // Binance Spot
        const task1 = createLoadTask('binanceSpot', 'Binance Spot', async () => {
            const res = await fetch('https://api.binance.com/api/v3/exchangeInfo');
            const data = await res.json();
            return data.symbols.filter(s => s.status === 'TRADING').map(s => ({
                symbol: s.symbol, baseAsset: s.baseAsset, quoteAsset: s.quoteAsset,
                exchange: 'BINANCE', type: 'crypto', searchKey: s.symbol.toLowerCase()
            }));
        });
        if (task1) loadTasks.push(task1);

        // Binance USDⓈ-M
        const task2 = createLoadTask('binanceUSDM', 'Binance USDⓈ-M', async () => {
            const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
            const data = await res.json();
            return data.symbols.filter(s => s.status === 'TRADING').map(s => ({
                symbol: s.symbol, baseAsset: s.baseAsset, quoteAsset: s.quoteAsset,
                exchange: 'BINANCEUSDM', type: 'futures', searchKey: s.symbol.toLowerCase()
            }));
        });
        if (task2) loadTasks.push(task2);

        // OKX Spot
        const task3 = createLoadTask('okxSpot', 'OKX Spot', async () => {
            const res = await fetch('https://www.okx.com/api/v5/public/instruments?instType=SPOT');
            const data = await res.json();
            if (data.code === '0' && data.data) {
                return data.data.filter(s => s.state === 'live').map(s => ({
                    symbol: s.instId.replace('-', ''), baseAsset: s.baseCcy, quoteAsset: s.quoteCcy,
                    exchange: 'OKXSPOT', type: 'crypto', searchKey: s.instId.replace('-', '').toLowerCase()
                }));
            }
            return [];
        });
        if (task3) loadTasks.push(task3);

        // OKX Futures
        const task4 = createLoadTask('okxFutures', 'OKX Futures', async () => {
            const res = await fetch('https://www.okx.com/api/v5/public/instruments?instType=SWAP');
            const data = await res.json();
            if (data.code === '0' && data.data) {
                return data.data.filter(s => s.state === 'live').map(s => ({
                    symbol: s.instId.replace('-SWAP', '').replace('-', ''), baseAsset: s.ctValCcy, quoteAsset: s.settleCcy,
                    exchange: 'OKXFUTURES', type: 'futures', searchKey: s.instId.replace('-SWAP', '').replace('-', '').toLowerCase()
                }));
            }
            return [];
        });
        if (task4) loadTasks.push(task4);

        // Bybit Spot
        const task5 = createLoadTask('bybitSpot', 'Bybit Spot', async () => {
            const res = await fetch('https://api.bybit.com/v5/market/instruments-info?category=spot');
            const data = await res.json();
            if (data.retCode === 0 && data.result.list) {
                return data.result.list.filter(s => s.status === 'Trading').map(s => ({
                    symbol: s.symbol, baseAsset: s.baseCoin, quoteAsset: s.quoteCoin,
                    exchange: 'BYBITSPOT', type: 'crypto', searchKey: s.symbol.toLowerCase()
                }));
            }
            return [];
        });
        if (task5) loadTasks.push(task5);

        // Bybit Futures
        const task6 = createLoadTask('bybitFutures', 'Bybit Futures', async () => {
            const res = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear');
            const data = await res.json();
            if (data.retCode === 0 && data.result.list) {
                return data.result.list.filter(s => s.status === 'Trading').map(s => ({
                    symbol: s.symbol, baseAsset: s.baseCoin, quoteAsset: s.quoteCoin,
                    exchange: 'BYBITFUTURES', type: 'futures', searchKey: s.symbol.toLowerCase()
                }));
            }
            return [];
        });
        if (task6) loadTasks.push(task6);

        // OANDA
        const task7 = createLoadTask('oanda', 'OANDA Forex', async () => {
            const oanda = this.dataSources.get('oanda');
            if (!oanda) return [];
            return await oanda.getAllInstruments();
        });
        if (task7) loadTasks.push(task7);

        // Load tất cả song song với Promise.all
        const results = await Promise.all(loadTasks);
        const allSymbols = results.flat();

        this.symbolCache = allSymbols;
        this.cacheLoaded = true;
        console.log(`[DataFeedManager] Total symbols loaded: ${allSymbols.length}`);
    }

    // ============ TradingView Datafeed API Methods ============

    async onReady(callback) {
        const mergedConfig = {
            supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
            symbols_types: [
                { name: 'All types', value: '' },
                { name: 'Crypto', value: 'crypto' },
                { name: 'Futures', value: 'futures' },
                { name: 'Forex', value: 'forex' }
            ],
            exchanges: [
                { value: '', name: 'All Exchanges', desc: '' },
                { value: 'BINANCE', name: 'Binance Spot', desc: 'Binance Spot', logo: '/iconexchange/binance.svg' },
                { value: 'BINANCEUSDM', name: 'Binance Futures', desc: 'Binance USDⓈ-M Futures', logo: '/iconexchange/binance.svg' },
                { value: 'OKXSPOT', name: 'OKX Spot', desc: 'OKX Spot', logo: '/iconexchange/okx.svg' },
                { value: 'OKXFUTURES', name: 'OKX Futures', desc: 'OKX Perpetual Futures', logo: '/iconexchange/okx.svg' },
                { value: 'BYBITSPOT', name: 'Bybit Spot', desc: 'Bybit Spot', logo: '/iconexchange/bybit.svg' },
                { value: 'BYBITFUTURES', name: 'Bybit Futures', desc: 'Bybit Linear Futures', logo: '/iconexchange/bybit.svg' },
                { value: 'OANDA', name: 'OANDA', desc: 'OANDA Forex', logo: '/iconexchange/oanda.svg' }
            ]
        };

        callback(mergedConfig);
    }

    async searchSymbols(userInput, exchange, symbolType, onResult) {
        if (!this.cacheLoaded) {
            await this.loadAllSymbols();
        }

        const searchTerm = (userInput || '').toLowerCase().trim();
        
        if (searchTerm === '') {
            const topSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
            let filtered = this.symbolCache.filter(s => topSymbols.includes(s.symbol));
            
            if (exchange) {
                filtered = filtered.filter(s => s.exchange === exchange);
            }
            if (symbolType) {
                filtered = filtered.filter(s => s.type === symbolType);
            }
            
            filtered = filtered.slice(0, 10);
            
            const logoMap = {
                'BINANCE': '/iconexchange/binance.svg',
                'BINANCEUSDM': '/iconexchange/binance.svg',
                'OKXSPOT': '/iconexchange/okx.svg',
                'OKXFUTURES': '/iconexchange/okx.svg',
                'BYBITSPOT': '/iconexchange/bybit.svg',
                'BYBITFUTURES': '/iconexchange/bybit.svg',
                'OANDA': '/iconexchange/oanda.svg'
            };

            const results = filtered.map(s => ({
                symbol: s.symbol,
                full_name: `${s.exchange}:${s.symbol}`,
                description: s.baseAsset && s.quoteAsset ? `${s.baseAsset}/${s.quoteAsset}` : s.symbol,
                exchange: s.exchange,
                type: s.type,
                ticker: `${s.exchange}:${s.symbol}`,
                logo_urls: [this.getSymbolIcon(s.baseAsset, s.type)],
                exchange_logo: logoMap[s.exchange] || ''
            }));
            
            onResult(results);
            return;
        }

        const isPerpetual = searchTerm.endsWith('.p');
        const hasPartialP = searchTerm.endsWith('.') && !isPerpetual;
        const cleanSearchTerm = isPerpetual ? searchTerm.slice(0, -2) : (hasPartialP ? searchTerm.slice(0, -1) : searchTerm);

        let filtered = this.symbolCache.filter(s => {
            if (!s.searchKey.includes(cleanSearchTerm)) {
                return false;
            }

            if (isPerpetual || hasPartialP) {
                if (s.type !== 'futures') return false;
            }

            if (exchange && s.exchange !== exchange) {
                return false;
            }

            if (symbolType && s.type !== symbolType) {
                return false;
            }

            return true;
        });

        filtered.sort((a, b) => {
            const aExact = a.searchKey === cleanSearchTerm;
            const bExact = b.searchKey === cleanSearchTerm;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return a.searchKey.localeCompare(b.searchKey);
        });

        filtered = filtered.slice(0, 50);

        const logoMap = {
            'BINANCE': '/iconexchange/binance.svg',
            'BINANCEUSDM': '/iconexchange/binance.svg',
            'OKXSPOT': '/iconexchange/okx.svg',
            'OKXFUTURES': '/iconexchange/okx.svg',
            'BYBITSPOT': '/iconexchange/bybit.svg',
            'BYBITFUTURES': '/iconexchange/bybit.svg',
            'OANDA': '/iconexchange/oanda.svg'
        };

        const results = filtered.map(s => {
            const displaySymbol = s.type === 'futures' ? `${s.symbol}.P` : s.symbol;
            return {
                symbol: displaySymbol,
                full_name: `${s.exchange}:${s.symbol}`,
                description: s.baseAsset && s.quoteAsset ? `${s.baseAsset}/${s.quoteAsset}` : s.symbol,
                exchange: s.exchange,
                type: s.type,
                ticker: `${s.exchange}:${s.symbol}`,
                logo_urls: [this.getSymbolIcon(s.baseAsset, s.type)],
                exchange_logo: logoMap[s.exchange] || ''
            };
        });

        onResult(results);
    }

    async resolveSymbol(symbolName, onResolve, onError) {
        // Xử lý .P suffix cho futures
        let normalizedSymbol = symbolName;
        let cleanSymbol = symbolName;
        
        if (symbolName.endsWith('.P')) {
            cleanSymbol = symbolName.slice(0, -2);
            // Nếu có .P thì là futures
            if (!cleanSymbol.includes(':')) {
                normalizedSymbol = `BINANCEFUTURES:${cleanSymbol}`;
            } else {
                normalizedSymbol = cleanSymbol;
            }
        } else {
            // Không có .P, normalize bình thường
            if (!symbolName.includes(':')) {
                normalizedSymbol = `BINANCE:${symbolName}`;
            }
        }

        const dataSource = this.findDataSource(normalizedSymbol);

        if (!dataSource) {
            onError(`No datasource found for symbol: ${symbolName}`);
            return;
        }

        console.log(`[DataFeedManager] Routing ${normalizedSymbol} to ${dataSource.name}`);
        await dataSource.resolveSymbol(normalizedSymbol, onResolve, onError);
    }

    async getBars(symbolInfo, resolution, periodParams, onResult, onError) {
        let symbolName = symbolInfo.name || symbolInfo.ticker;
        
        // Xử lý .P suffix
        if (symbolName.endsWith('.P')) {
            const cleanSymbol = symbolName.slice(0, -2);
            if (!cleanSymbol.includes(':')) {
                symbolName = `BINANCEFUTURES:${cleanSymbol}`;
            } else {
                symbolName = cleanSymbol;
            }
            symbolInfo.name = symbolName;
            symbolInfo.ticker = symbolName;
        } else if (!symbolName.includes(':')) {
            symbolName = `BINANCE:${symbolName}`;
            symbolInfo.name = symbolName;
            symbolInfo.ticker = symbolName;
        }

        const dataSource = this.findDataSource(symbolName);

        if (!dataSource) {
            onError(`No datasource found for symbol: ${symbolName}`);
            return;
        }

        await dataSource.getBars(symbolInfo, resolution, periodParams, onResult, onError);
    }

    async subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
        let symbolName = symbolInfo.name || symbolInfo.ticker;
        
        // Xử lý .P suffix
        if (symbolName.endsWith('.P')) {
            const cleanSymbol = symbolName.slice(0, -2);
            if (!cleanSymbol.includes(':')) {
                symbolName = `BINANCEFUTURES:${cleanSymbol}`;
            } else {
                symbolName = cleanSymbol;
            }
            symbolInfo.name = symbolName;
            symbolInfo.ticker = symbolName;
        } else if (!symbolName.includes(':')) {
            symbolName = `BINANCE:${symbolName}`;
            symbolInfo.name = symbolName;
            symbolInfo.ticker = symbolName;
        }

        const dataSource = this.findDataSource(symbolName);

        if (!dataSource) {
            console.error(`No datasource found for symbol: ${symbolName}`);
            return;
        }

        await dataSource.subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback);
    }

    async unsubscribeBars(listenerGuid) {
        // Unsubscribe trên tất cả datasources
        const promises = Array.from(this.dataSources.values()).map(ds => 
            ds.unsubscribeBars(listenerGuid).catch(err => console.error(err))
        );
        await Promise.all(promises);
    }
}

export default DataFeedManager;
