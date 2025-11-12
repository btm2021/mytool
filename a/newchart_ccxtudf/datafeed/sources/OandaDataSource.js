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

    async getBars(symbolInfo, resolution, periodParams, onResult) {
        const { symbol } = this.parseSymbol(symbolInfo.name);
        const normalizedSymbol = this.normalizeSymbol(symbol);
        
        const fromTime = periodParams.from * 1000;
        const toTime = periodParams.to * 1000;
        const now = Date.now();
        const actualTo = Math.min(toTime, now);
        const actualFrom = fromTime;
        
        console.log(`[OandaDataSource] getBars: ${normalizedSymbol} ${resolution}`);
        console.log(`  Range: ${new Date(actualFrom).toISOString()} -> ${new Date(actualTo).toISOString()}`);
        
        if (actualFrom >= actualTo) {
            console.warn('[OandaDataSource] Invalid time range');
            onResult([], { noData: true });
            return;
        }
        
        try {
            const granularity = this.resolutionToGranularity(resolution);
            let barsCount = this.calculateBarsCount(actualFrom, actualTo, resolution);
            
            // Tăng count để đảm bảo có đủ data (bù weekend/holiday)
            barsCount = Math.max(barsCount, 500);
            barsCount = Math.min(barsCount, 5000); // OANDA max
            
            // Sử dụng count + to để fetch về phía trước
            // OANDA sẽ tự động bỏ qua weekend/holiday
            const params = new URLSearchParams({
                granularity: granularity,
                count: barsCount.toString(),
                to: new Date(actualTo).toISOString(),
                price: 'M'
            });

            const url = `${this.apiUrl}/v3/instruments/${normalizedSymbol}/candles?${params}`;
            
            console.log(`[OandaDataSource] Fetching ${barsCount} bars to ${new Date(actualTo).toISOString()}`);
            
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                console.error('[OandaDataSource] HTTP Error:', response.status);
                onResult([], { noData: false });
                return;
            }
            
            const data = await response.json();

            if (data.errorMessage) {
                console.error('[OandaDataSource] API Error:', data.errorMessage);
                onResult([], { noData: false });
                return;
            }

            if (!data.candles || data.candles.length === 0) {
                console.log('[OandaDataSource] No candles returned - will retry with earlier time');
                // Trả về noData: false để TradingView tiếp tục fetch với range khác
                onResult([], { noData: false });
                return;
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

            // Filter bars trong range
            let filteredBars = bars.filter(bar => bar.time >= actualFrom && bar.time <= actualTo);

            // Nếu không có bars trong range (weekend/holiday)
            if (filteredBars.length === 0) {
                console.log('[OandaDataSource] No bars in requested range');
                console.log(`  Fetched ${bars.length} bars total`);
                
                if (bars.length > 0) {
                    const firstBar = bars[0];
                    const lastBar = bars[bars.length - 1];
                    console.log(`  Fetched range: ${new Date(firstBar.time).toISOString()} -> ${new Date(lastBar.time).toISOString()}`);
                    
                    // Kiểm tra xem bars có nằm trước hay sau range yêu cầu
                    if (lastBar.time < actualFrom) {
                        // Tất cả bars đều cũ hơn range yêu cầu
                        // Trả về để TradingView biết đã hết data lịch sử
                        console.log('[OandaDataSource] All bars are older than requested range - end of history');
                        onResult(bars, { noData: false });
                        return;
                    } else if (firstBar.time > actualTo) {
                        // Tất cả bars đều mới hơn range yêu cầu
                        // Trả về để TradingView tiếp tục fetch
                        console.log('[OandaDataSource] All bars are newer than requested range - continue fetching');
                        onResult([], { noData: false });
                        return;
                    } else {
                        // Bars overlap nhưng không có trong exact range (weekend/holiday gap)
                        // Trả về tất cả bars để TradingView tự xử lý
                        console.log('[OandaDataSource] Weekend/holiday gap - returning all fetched bars');
                        onResult(bars, { noData: false });
                        return;
                    }
                }
                
                // Không có bars nào
                console.log('[OandaDataSource] No bars fetched - continue trying');
                onResult([], { noData: false });
                return;
            }

            console.log(`[OandaDataSource] ✓ Returning ${filteredBars.length} bars (fetched ${bars.length})`);
            onResult(filteredBars, { noData: false });
            
        } catch (error) {
            console.error('[OandaDataSource] Error:', error);
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
