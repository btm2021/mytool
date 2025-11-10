/**
 * Multi Exchange Datafeed for TradingView
 * Adapter giữa MultiExchange và TradingView Charting Library
 */
class MultiExchangeDatafeed {
    constructor(multiExchange) {
        this.multiExchange = multiExchange;
        this.subscribers = {};
        this.quoteSubscribers = {};
    }

    /**
     * TradingView onReady callback
     */
    onReady(callback) {
        setTimeout(() => {
            const config = {
                supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
                exchanges: this.multiExchange.getExchangesInfo(),
                symbols_types: [
                    { name: 'All', value: '' },
                    { name: 'Spot', value: 'spot' },
                    { name: 'Futures', value: 'future' }
                ],
                supports_marks: false,
                supports_timescale_marks: false,
                supports_time: true
            };
            
            callback(config);
        }, 0);
    }

    /**
     * TradingView searchSymbols
     */
    searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
        this.multiExchange.searchSymbols(userInput, exchange, symbolType)
            .then(symbols => {
                onResultReadyCallback(symbols);
            })
            .catch(error => {
                console.error('Search error:', error);
                onResultReadyCallback([]);
            });
    }

    /**
     * TradingView resolveSymbol
     */
    resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
        const { exchange: exchangeId, symbol } = this.multiExchange.parseSymbol(symbolName);
        const exchange = this.multiExchange.getExchange(exchangeId);
        
        if (!exchange) {
            onResolveErrorCallback('Exchange not found');
            return;
        }

        // Get logo URLs
        const baseAsset = symbol.replace(/USDT|BUSD|USDC|PERP/g, '');
        const logoUrls = exchange.getLogoUrls(baseAsset);

        // Get symbol info
        this.multiExchange.getSymbolInfo(symbolName)
            .then(info => {
                const precision = info ? info.precision : { minmov: 1, pricescale: 100 };
                
                const symbolInfo = {
                    name: symbol,
                    description: symbol,
                    type: 'crypto',
                    session: '24x7',
                    timezone: 'Etc/UTC',
                    ticker: symbol,
                    exchange: exchangeId,
                    minmov: precision.minmov,
                    pricescale: precision.pricescale,
                    has_intraday: true,
                    has_daily: true,
                    has_weekly_and_monthly: true,
                    supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
                    volume_precision: 2,
                    data_status: 'streaming',
                    full_name: `${exchangeId}:${symbol}`,
                    logo_urls: logoUrls
                };

                onSymbolResolvedCallback(symbolInfo);
            })
            .catch(error => {
                console.error('Error resolving symbol:', error);
                
                // Fallback
                const symbolInfo = {
                    name: symbol,
                    description: symbol,
                    type: 'crypto',
                    session: '24x7',
                    timezone: 'Etc/UTC',
                    ticker: symbol,
                    exchange: exchangeId,
                    minmov: 1,
                    pricescale: 100,
                    has_intraday: true,
                    has_daily: true,
                    has_weekly_and_monthly: true,
                    supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
                    volume_precision: 2,
                    data_status: 'streaming',
                    full_name: `${exchangeId}:${symbol}`,
                    logo_urls: logoUrls
                };
                
                onSymbolResolvedCallback(symbolInfo);
            });
    }

    /**
     * TradingView getBars
     */
    getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        const { from, to } = periodParams;
        const symbolString = symbolInfo.full_name || symbolInfo.name;
        
        this.multiExchange.fetchOHLCV(symbolString, resolution, from * 1000, 1000)
            .then(bars => {
                // Filter bars trong khoảng thời gian
                const filteredBars = bars.filter(bar => {
                    const barTime = bar.time / 1000;
                    return barTime >= from && barTime <= to;
                });
                
                if (filteredBars.length === 0) {
                    onHistoryCallback([], { noData: true });
                } else {
                    onHistoryCallback(filteredBars, { noData: false });
                }
            })
            .catch(error => {
                console.error('Error fetching bars:', error);
                onErrorCallback(error);
            });
    }

    /**
     * TradingView subscribeBars
     */
    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
        const symbolString = symbolInfo.full_name || symbolInfo.name;
        
        try {
            this.multiExchange.subscribeWebSocket(
                symbolString,
                resolution,
                onRealtimeCallback,
                subscriberUID
            );
            
            this.subscribers[subscriberUID] = symbolString;
        } catch (error) {
            console.error('Error subscribing bars:', error);
        }
    }

    /**
     * TradingView unsubscribeBars
     */
    unsubscribeBars(subscriberUID) {
        const symbolString = this.subscribers[subscriberUID];
        
        if (symbolString) {
            this.multiExchange.unsubscribeWebSocket(symbolString, subscriberUID);
            delete this.subscribers[subscriberUID];
        }
    }

    /**
     * TradingView getQuotes (for Watchlist)
     */
    getQuotes(symbols, onDataCallback, onErrorCallback) {
        const promises = symbols.map(symbol => {
            return this.multiExchange.getQuoteData(symbol)
                .then(data => {
                    if (!data) {
                        return {
                            n: symbol,
                            s: 'error',
                            v: {}
                        };
                    }

                    const parts = symbol.split(':');
                    const symbolName = parts.length > 1 ? parts[1] : parts[0];
                    const exchangeName = parts.length > 1 ? parts[0] : 'BINANCE';

                    return {
                        n: symbol,
                        s: 'ok',
                        v: {
                            ch: data.priceChange,
                            chp: data.priceChangePercent,
                            short_name: symbolName,
                            exchange: exchangeName,
                            description: symbolName,
                            lp: data.lastPrice,
                            ask: data.lastPrice,
                            bid: data.lastPrice,
                            open_price: data.openPrice,
                            high_price: data.highPrice,
                            low_price: data.lowPrice,
                            prev_close_price: data.openPrice,
                            volume: data.volume
                        }
                    };
                })
                .catch(() => ({
                    n: symbol,
                    s: 'error',
                    v: {}
                }));
        });

        Promise.all(promises)
            .then(quotes => onDataCallback(quotes))
            .catch(error => onErrorCallback(error));
    }

    /**
     * TradingView subscribeQuotes (for Watchlist)
     */
    subscribeQuotes(symbols, fastSymbols, onRealtimeCallback, listenerGUID) {
        const updateQuotes = () => {
            this.getQuotes(symbols, (quotes) => {
                onRealtimeCallback(quotes);
            }, (error) => {
                console.error('Quote subscription error:', error);
            });
        };

        // Update every 1 second
        const intervalId = setInterval(updateQuotes, 1000);
        this.quoteSubscribers[listenerGUID] = intervalId;

        // Initial update
        updateQuotes();
    }

    /**
     * TradingView unsubscribeQuotes
     */
    unsubscribeQuotes(listenerGUID) {
        const intervalId = this.quoteSubscribers[listenerGUID];
        if (intervalId) {
            clearInterval(intervalId);
            delete this.quoteSubscribers[listenerGUID];
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiExchangeDatafeed;
}
