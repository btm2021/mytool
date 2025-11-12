import BaseDataSource from '../BaseDataSource.js';

/**
 * OANDA DataSource - Forex trading
 * Simple version without cache
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
        
        // Cache system: 9900 bars per symbol+resolution
        // Key: `${symbol}_${resolution}`, Value: { bars: [], minTime: number, maxTime: number, isFull: boolean }
        this.barsCache = new Map();
        this.CACHE_TARGET = 9900; // Target cache size
        this.FETCH_SIZE = 5000; // Max per fetch
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
                const normalizedSymbol = inst.name.replace('_', '');
                return {
                    symbol: normalizedSymbol,
                    originalSymbol: inst.name,
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
        if (symbol.includes('_')) return symbol;
        
        if (this.instrumentsCache) {
            const found = this.instrumentsCache.find(inst => 
                inst.symbol === symbol || inst.originalSymbol === symbol
            );
            if (found) return found.originalSymbol;
        }
        
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

            console.log(`[OandaDataSource] ${normalizedSymbol}: pricescale=${pricescale}`);
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

    /**
     * Tính số bars cần fetch dựa trên khoảng thời gian
     */
    calculateBarsCount(fromTime, toTime, resolution) {
        const resolutionMs = this.resolutionToMs(resolution);
        const timeDiff = toTime - fromTime;
        const barsCount = Math.ceil(timeDiff / resolutionMs);
        
        // Thêm 20% buffer để đảm bảo có đủ data (do weekend/holiday)
        const bufferedCount = Math.ceil(barsCount * 1.2);
        
        // OANDA max = 5000
        return Math.min(bufferedCount, 5000);
    }

    /**
     * Fetch bars từ OANDA API
     */
    async fetchBarsFromAPI(normalizedSymbol, resolution, toTime, count) {
        const granularity = this.resolutionToGranularity(resolution);
        
        const params = new URLSearchParams({
            granularity: granularity,
            count: count.toString(),
            to: new Date(toTime).toISOString(),
            price: 'M'
        });

        const url = `${this.apiUrl}/v3/instruments/${normalizedSymbol}/candles?${params}`;
        
        console.log(`[OandaDataSource] 📡 Fetching ${count} bars to ${new Date(toTime).toISOString()}`);
        
        const response = await fetch(url, {
            headers: this.getHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();

        if (data.errorMessage) {
            throw new Error(data.errorMessage);
        }

        if (!data.candles || data.candles.length === 0) {
            return [];
        }

        // Parse candles
        const bars = data.candles
            .map(candle => {
                if (!candle.mid) return null;
                return {
                    time: new Date(candle.time).getTime(),
                    open: parseFloat(candle.mid.o),
                    high: parseFloat(candle.mid.h),
                    low: parseFloat(candle.mid.l),
                    close: parseFloat(candle.mid.c),
                    volume: parseFloat(candle.volume || 0)
                };
            })
            .filter(bar => bar !== null)
            .sort((a, b) => a.time - b.time);

        return bars;
    }

    /**
     * Build initial cache với 9900 bars
     */
    async buildCache(normalizedSymbol, resolution) {
        const cacheKey = `${normalizedSymbol}_${resolution}`;
        const now = Date.now();
        
        console.log(`[OandaDataSource] 🔨 Building cache for ${cacheKey}...`);
        
        try {
            // Fetch 1: 5000 bars gần nhất
            const bars1 = await this.fetchBarsFromAPI(normalizedSymbol, resolution, now, this.FETCH_SIZE);
            
            if (bars1.length === 0) {
                console.log('[OandaDataSource] ❌ No bars in first fetch');
                return null;
            }
            
            console.log(`[OandaDataSource] ✓ Fetched batch 1: ${bars1.length} bars`);
            
            // Fetch 2: 5000 bars tiếp theo (từ thời điểm đầu tiên của batch 1)
            const oldestTime1 = bars1[0].time;
            const bars2 = await this.fetchBarsFromAPI(normalizedSymbol, resolution, oldestTime1, this.FETCH_SIZE);
            
            console.log(`[OandaDataSource] ✓ Fetched batch 2: ${bars2.length} bars`);
            
            // Merge và remove duplicates
            const barsMap = new Map();
            bars2.forEach(bar => barsMap.set(bar.time, bar));
            bars1.forEach(bar => barsMap.set(bar.time, bar));
            
            const allBars = Array.from(barsMap.values()).sort((a, b) => a.time - b.time);
            
            if (allBars.length === 0) {
                return null;
            }
            
            const cache = {
                bars: allBars,
                minTime: allBars[0].time,
                maxTime: allBars[allBars.length - 1].time,
                isFull: allBars.length >= this.CACHE_TARGET * 0.9 // 90% of target
            };
            
            this.barsCache.set(cacheKey, cache);
            
            console.log(`[OandaDataSource] 💾 Cache built: ${allBars.length} bars`);
            console.log(`  Range: ${new Date(cache.minTime).toISOString()} -> ${new Date(cache.maxTime).toISOString()}`);
            
            return cache;
            
        } catch (error) {
            console.error('[OandaDataSource] Cache build error:', error);
            return null;
        }
    }

    async getBars(symbolInfo, resolution, periodParams, onResult) {
        const { symbol } = this.parseSymbol(symbolInfo.name);
        const normalizedSymbol = this.normalizeSymbol(symbol);
        
        const fromTime = periodParams.from * 1000;
        const toTime = periodParams.to * 1000;
        const now = Date.now();
        const actualTo = Math.min(toTime, now);
        const actualFrom = fromTime;
        
        console.log(`[OandaDataSource] getBars: ${normalizedSymbol} ${resolution}`);
        console.log(`  Request: ${new Date(actualFrom).toISOString()} -> ${new Date(actualTo).toISOString()}`);
        
        if (actualFrom >= actualTo) {
            console.warn('[OandaDataSource] Invalid time range');
            onResult([], { noData: true });
            return;
        }
        
        const cacheKey = `${normalizedSymbol}_${resolution}`;
        let cache = this.barsCache.get(cacheKey);
        
        // ===== BUILD CACHE NẾU CHƯA CÓ =====
        if (!cache) {
            console.log('[OandaDataSource] 🆕 No cache, building...');
            cache = await this.buildCache(normalizedSymbol, resolution);
            
            if (!cache) {
                console.log('[OandaDataSource] ❌ Failed to build cache');
                onResult([], { noData: false });
                return;
            }
        }
        
        // ===== KIỂM TRA CACHE =====
        console.log(`[OandaDataSource] 📦 Cache: ${cache.bars.length} bars [${new Date(cache.minTime).toISOString()} -> ${new Date(cache.maxTime).toISOString()}]`);
        
        // Filter bars từ cache
        const filteredBars = cache.bars.filter(bar => bar.time >= actualFrom && bar.time <= actualTo);
        
        if (filteredBars.length > 0) {
            console.log(`[OandaDataSource] 🎯 CACHE HIT: ${filteredBars.length} bars`);
            onResult(filteredBars, { noData: false });
            return;
        }
        
        // ===== CACHE MISS =====
        console.log('[OandaDataSource] ⚠️ CACHE MISS');
        
        // Kiểm tra xem request có nằm ngoài cache range không
        if (actualTo < cache.minTime) {
            // Request cũ hơn cache - cần fetch historical data
            console.log('[OandaDataSource] 📜 Request is older than cache - need historical data');
            
            try {
                const bars = await this.fetchBarsFromAPI(normalizedSymbol, resolution, cache.minTime, this.FETCH_SIZE);
                
                if (bars.length === 0) {
                    console.log('[OandaDataSource] No historical data available');
                    onResult([], { noData: false });
                    return;
                }
                
                // Merge vào cache
                const barsMap = new Map();
                bars.forEach(bar => barsMap.set(bar.time, bar));
                cache.bars.forEach(bar => barsMap.set(bar.time, bar));
                
                const mergedBars = Array.from(barsMap.values()).sort((a, b) => a.time - b.time);
                
                cache.bars = mergedBars;
                cache.minTime = mergedBars[0].time;
                cache.maxTime = mergedBars[mergedBars.length - 1].time;
                
                console.log(`[OandaDataSource] 💾 Cache extended: ${cache.bars.length} bars`);
                
                // Filter lại
                const result = cache.bars.filter(bar => bar.time >= actualFrom && bar.time <= actualTo);
                
                if (result.length > 0) {
                    console.log(`[OandaDataSource] ✓ Returning ${result.length} bars after extension`);
                    onResult(result, { noData: false });
                } else {
                    console.log('[OandaDataSource] Still no bars in range');
                    onResult([], { noData: false });
                }
                
            } catch (error) {
                console.error('[OandaDataSource] Error fetching historical:', error);
                onResult([], { noData: false });
            }
            
        } else if (actualFrom > cache.maxTime) {
            // Request mới hơn cache - cần fetch realtime data
            console.log('[OandaDataSource] 🔄 Request is newer than cache - need realtime data');
            
            try {
                const bars = await this.fetchBarsFromAPI(normalizedSymbol, resolution, now, 500);
                
                if (bars.length === 0) {
                    console.log('[OandaDataSource] No realtime data available');
                    onResult([], { noData: false });
                    return;
                }
                
                // Merge vào cache
                const barsMap = new Map();
                cache.bars.forEach(bar => barsMap.set(bar.time, bar));
                bars.forEach(bar => barsMap.set(bar.time, bar));
                
                const mergedBars = Array.from(barsMap.values()).sort((a, b) => a.time - b.time);
                
                cache.bars = mergedBars;
                cache.minTime = mergedBars[0].time;
                cache.maxTime = mergedBars[mergedBars.length - 1].time;
                
                console.log(`[OandaDataSource] 💾 Cache updated: ${cache.bars.length} bars`);
                
                // Filter lại
                const result = cache.bars.filter(bar => bar.time >= actualFrom && bar.time <= actualTo);
                
                if (result.length > 0) {
                    console.log(`[OandaDataSource] ✓ Returning ${result.length} bars after update`);
                    onResult(result, { noData: false });
                } else {
                    console.log('[OandaDataSource] Still no bars in range');
                    onResult([], { noData: false });
                }
                
            } catch (error) {
                console.error('[OandaDataSource] Error fetching realtime:', error);
                onResult([], { noData: false });
            }
            
        } else {
            // Request nằm trong cache range nhưng không có bars (weekend/holiday)
            console.log('[OandaDataSource] 📅 Weekend/holiday gap in cache');
            onResult([], { noData: false });
        }
    }

    async subscribeBars(symbolInfo, resolution, onTick, listenerGuid) {
        const { symbol } = this.parseSymbol(symbolInfo.name);
        const normalizedSymbol = this.normalizeSymbol(symbol);

        const streamUrl = `${this.streamUrl}/v3/accounts/${this.accountId}/pricing/stream?instruments=${normalizedSymbol}`;
        
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
                                        if (currentBar) {
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

    async unsubscribeBars(listenerGuid) {
        const controller = this.intervals.get(listenerGuid);
        if (controller) {
            if (controller.abort) {
                controller.abort();
            } else {
                clearInterval(controller);
            }
            this.intervals.delete(listenerGuid);
        }
        this.subscribers.delete(listenerGuid);
    }
}

export default OandaDataSource;
