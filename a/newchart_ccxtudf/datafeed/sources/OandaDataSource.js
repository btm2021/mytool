import BaseDataSource from '../BaseDataSource.js';

/**
 * OANDA DataSource - Forex trading
 */
class OandaDataSource extends BaseDataSource {
    constructor(config = {}) {
        super(config);
        this.name = 'OandaDataSource';
        this.apiKey = config.apiKey || '';
        this.accountId = config.accountId || '';
        this.practice = config.practice !== false;
        
        this.apiUrl = this.practice 
            ? 'https://api-fxpractice.oanda.com'
            : 'https://api-fxtrade.oanda.com';
        
        this.streamUrl = this.practice
            ? 'https://stream-fxpractice.oanda.com'
            : 'https://stream-fxtrade.oanda.com';

        this.subscribers = new Map();
        this.intervals = new Map();
        this.instrumentsCache = null;
    }

    async onReady() {
        return {
            supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
            exchanges: [
                { value: 'OANDA', name: 'OANDA', desc: 'OANDA Forex' }
            ]
        };
    }

    canHandle(symbolName) {
        const { exchange } = this.parseSymbol(symbolName);
        return exchange === 'OANDA';
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Lấy tất cả instruments từ OANDA
     */
    async getAllInstruments() {
        if (!this.apiKey || !this.accountId) {
            return [];
        }

        if (this.instrumentsCache) {
            return this.instrumentsCache;
        }

        try {
            const response = await fetch(`${this.apiUrl}/v3/accounts/${this.accountId}/instruments`, {
                headers: this.getHeaders()
            });
            const data = await response.json();

            if (!data.instruments) {
                return [];
            }

            this.instrumentsCache = data.instruments.map(inst => {
                // Chuyển EUR_USD thành EURUSD để dễ search
                const normalizedSymbol = inst.name.replace('_', '');
                return {
                    symbol: normalizedSymbol,
                    originalSymbol: inst.name, // Giữ lại format gốc để gọi API
                    baseAsset: inst.name.split('_')[0],
                    quoteAsset: inst.name.split('_')[1],
                    displayName: inst.displayName,
                    exchange: 'OANDA',
                    type: 'forex',
                    searchKey: normalizedSymbol.toLowerCase()
                };
            });

            return this.instrumentsCache;
        } catch (error) {
            console.error('[OandaDataSource] Error loading instruments:', error);
            return [];
        }
    }

    /**
     * Chuyển symbol từ EURUSD sang EUR_USD
     */
    normalizeSymbol(symbol) {
        // Nếu đã có _ thì return luôn
        if (symbol.includes('_')) return symbol;
        
        // Tìm trong cache
        if (this.instrumentsCache) {
            const found = this.instrumentsCache.find(inst => 
                inst.symbol === symbol || inst.originalSymbol === symbol
            );
            if (found) return found.originalSymbol;
        }
        
        // Fallback: thêm _ ở giữa (giả sử 3 ký tự đầu là base)
        if (symbol.length === 6) {
            return `${symbol.slice(0, 3)}_${symbol.slice(3)}`;
        }
        
        return symbol;
    }

    async searchSymbols(userInput, exchange, symbolType, onResult) {
        onResult([]);
    }

    async resolveSymbol(symbolName, onResolve, onError) {
        try {
            const { exchange, symbol } = this.parseSymbol(symbolName);
            const normalizedSymbol = this.normalizeSymbol(symbol);
            
            const response = await fetch(`${this.apiUrl}/v3/accounts/${this.accountId}/instruments`, {
                headers: this.getHeaders()
            });
            const data = await response.json();

            const instrument = data.instruments?.find(inst => inst.name === normalizedSymbol);
            
            if (!instrument) {
                onError('Symbol not found');
                return;
            }

            const displayPrecision = instrument.displayPrecision || 5;
            const pricescale = Math.pow(10, displayPrecision);

            const symbolInfo = {
                name: symbolName,
                ticker: symbolName,
                description: instrument.displayName,
                type: 'forex',
                session: '24x7',
                timezone: 'Etc/UTC',
                exchange: exchange,
                minmov: 1,
                pricescale: pricescale,
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
                volume_precision: 0,
                data_status: 'streaming',
            };

            onResolve(symbolInfo);
        } catch (error) {
            console.error('[OandaDataSource] Resolve error:', error);
            onError(error.message);
        }
    }

    resolutionToGranularity(resolution) {
        const map = {
            '1': 'M1',
            '5': 'M5',
            '15': 'M15',
            '30': 'M30',
            '60': 'H1',
            '240': 'H4',
            'D': 'D',
            'W': 'W',
            'M': 'M'
        };
        return map[resolution] || 'H1';
    }

    async getBars(symbolInfo, resolution, periodParams, onResult, onError) {
        try {
            const { symbol } = this.parseSymbol(symbolInfo.name);
            const normalizedSymbol = this.normalizeSymbol(symbol);
            const granularity = this.resolutionToGranularity(resolution);
            
            // Đảm bảo 'to' không vượt quá thời gian hiện tại
            const now = Date.now();
            const toTime = Math.min(periodParams.to * 1000, now);
            const fromTime = periodParams.from * 1000;
            
            // Nếu fromTime > toTime thì swap
            const actualFrom = Math.min(fromTime, toTime);
            const actualTo = Math.max(fromTime, toTime);
            
            const params = new URLSearchParams({
                granularity: granularity,
                from: new Date(actualFrom).toISOString(),
                to: new Date(actualTo).toISOString(),
                price: 'M' // Mid prices
            });

            const url = `${this.apiUrl}/v3/instruments/${normalizedSymbol}/candles?${params}`;
            
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            const data = await response.json();

            if (data.errorMessage) {
                console.error('[OandaDataSource] API Error:', data.errorMessage);
                onResult([], { noData: true });
                return;
            }

            if (!data.candles || data.candles.length === 0) {
                onResult([], { noData: true });
                return;
            }

            const bars = data.candles
                .filter(candle => candle.complete)
                .map(candle => ({
                    time: new Date(candle.time).getTime(),
                    open: parseFloat(candle.mid.o),
                    high: parseFloat(candle.mid.h),
                    low: parseFloat(candle.mid.l),
                    close: parseFloat(candle.mid.c),
                    volume: parseFloat(candle.volume || 0)
                }));

            onResult(bars, { noData: false });
        } catch (error) {
            console.error('[OandaDataSource] GetBars error:', error);
            onError(error.message);
        }
    }

    async subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
        const { symbol } = this.parseSymbol(symbolInfo.name);
        const normalizedSymbol = this.normalizeSymbol(symbol);

        // Sử dụng pricing stream API của OANDA
        const streamUrl = `${this.streamUrl}/v3/accounts/${this.accountId}/pricing/stream?instruments=${normalizedSymbol}`;
        
        let lastBar = null;
        let currentBar = null;
        const resolutionMs = this.resolutionToMs(resolution);

        const controller = new AbortController();
        
        fetch(streamUrl, {
            headers: this.getHeaders(),
            signal: controller.signal
        })
        .then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const processStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (!line.trim()) continue;
                            
                            try {
                                const data = JSON.parse(line);
                                
                                if (data.type === 'PRICE') {
                                    const price = parseFloat(data.closeoutBid);
                                    const time = new Date(data.time).getTime();
                                    const barTime = Math.floor(time / resolutionMs) * resolutionMs;

                                    if (!currentBar || currentBar.time !== barTime) {
                                        // New bar
                                        if (currentBar) {
                                            lastBar = currentBar;
                                            onTick(currentBar);
                                        }
                                        currentBar = {
                                            time: barTime,
                                            open: price,
                                            high: price,
                                            low: price,
                                            close: price,
                                            volume: 0
                                        };
                                    } else {
                                        // Update current bar
                                        currentBar.high = Math.max(currentBar.high, price);
                                        currentBar.low = Math.min(currentBar.low, price);
                                        currentBar.close = price;
                                        onTick(currentBar);
                                    }
                                }
                            } catch (e) {
                                // Ignore parse errors
                            }
                        }
                    }
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('[OandaDataSource] Stream error:', error);
                    }
                }
            };

            processStream();
        })
        .catch(error => {
            if (error.name !== 'AbortError') {
                console.error('[OandaDataSource] Subscribe error:', error);
            }
        });

        this.intervals.set(listenerGuid, controller);
        this.subscribers.set(listenerGuid, { symbolInfo, resolution, onTick });
    }

    resolutionToMs(resolution) {
        const map = {
            '1': 60 * 1000,
            '5': 5 * 60 * 1000,
            '15': 15 * 60 * 1000,
            '30': 30 * 60 * 1000,
            '60': 60 * 60 * 1000,
            '240': 4 * 60 * 60 * 1000,
            'D': 24 * 60 * 60 * 1000,
            'W': 7 * 24 * 60 * 60 * 1000,
            'M': 30 * 24 * 60 * 60 * 1000
        };
        return map[resolution] || 60 * 60 * 1000;
    }

    async unsubscribeBars(listenerGuid) {
        const controller = this.intervals.get(listenerGuid);
        if (controller) {
            if (controller.abort) {
                controller.abort(); // AbortController
            } else {
                clearInterval(controller); // Fallback for old polling
            }
            this.intervals.delete(listenerGuid);
        }
        this.subscribers.delete(listenerGuid);
    }
}

export default OandaDataSource;
