const DatafeedManager = {
    datafeeds: {},
    currentDatafeed: null,
    
    init() {
        this.datafeeds = {
            'Binance Futures': BinanceFutureDatafeed,
            'Binance Spot': BinanceSpotDatafeed,
            'Bybit Futures': BybitFutureDatafeed,
            'Bybit Spot': BybitSpotDatafeed,
            'OKX': OKXDatafeed
        };
        this.currentDatafeed = BinanceFutureDatafeed;
    },

    setDatafeed(exchangeName) {
        if (this.datafeeds[exchangeName]) {
            this.currentDatafeed = this.datafeeds[exchangeName];
            return true;
        }
        return false;
    },

    config: {
        supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '480', '720', '1D', '3D', '1W', '1M'],
        exchanges: [
            { value: 'Binance Futures', name: 'Binance Futures', desc: 'Binance Futures' },
            { value: 'Binance Spot', name: 'Binance Spot', desc: 'Binance Spot' },
            { value: 'Bybit Futures', name: 'Bybit Futures', desc: 'Bybit Futures' },
            { value: 'Bybit Spot', name: 'Bybit Spot', desc: 'Bybit Spot' },
            { value: 'OKX', name: 'OKX', desc: 'OKX' }
        ],
        symbols_types: [{ name: 'crypto', value: 'crypto' }]
    },

    onReady: (callback) => {
        setTimeout(() => callback(DatafeedManager.config), 0);
    },

    searchSymbols: async (userInput, exchange, symbolType, onResultReadyCallback) => {
        let results = [];
        
        if (exchange) {
            const datafeed = DatafeedManager.datafeeds[exchange];
            if (datafeed) {
                const symbols = await datafeed.fetchSymbols();
                results = symbols.filter(s => 
                    s.symbol.toLowerCase().includes(userInput.toLowerCase())
                );
            }
        } else {
            for (const [name, datafeed] of Object.entries(DatafeedManager.datafeeds)) {
                const symbols = await datafeed.fetchSymbols();
                const filtered = symbols.filter(s => 
                    s.symbol.toLowerCase().includes(userInput.toLowerCase())
                );
                results = results.concat(filtered);
            }
        }
        
        onResultReadyCallback(results.slice(0, 30));
    },

    resolveSymbol: async (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
        try {
            let symbol = null;
            let foundDatafeed = null;

            for (const [name, datafeed] of Object.entries(DatafeedManager.datafeeds)) {
                const symbols = await datafeed.fetchSymbols();
                symbol = symbols.find(s => s.symbol === symbolName || s.full_name === symbolName);
                if (symbol) {
                    foundDatafeed = datafeed;
                    DatafeedManager.currentDatafeed = datafeed;
                    break;
                }
            }
            
            if (!symbol) {
                onResolveErrorCallback('Symbol not found');
                return;
            }

            const symbolInfo = {
                ticker: symbol.symbol,
                name: symbol.symbol,
                description: symbol.description,
                type: symbol.type,
                session: '24x7',
                timezone: 'Etc/UTC',
                exchange: symbol.exchange,
                minmov: symbol.minmov,
                pricescale: symbol.pricescale,
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: foundDatafeed.supportedResolutions,
                volume_precision: 2,
                data_status: 'streaming',
                format: 'price'
            };

            onSymbolResolvedCallback(symbolInfo);
        } catch (error) {
            onResolveErrorCallback(error);
        }
    },

    getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
        await DatafeedManager.currentDatafeed.getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback);
    },

    subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
        DatafeedManager.currentDatafeed.subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID);
    },

    unsubscribeBars: (subscriberUID) => {
        DatafeedManager.currentDatafeed.unsubscribeBars(subscriberUID);
    }
};

DatafeedManager.init();
