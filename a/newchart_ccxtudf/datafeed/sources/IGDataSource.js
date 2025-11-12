import BaseDataSource from '../BaseDataSource.js';

/**
 * IG DataSource - Forex, Indices, Commodities trading
 * API Documentation: https://labs.ig.com/rest-trading-api-reference
 */
class IGDataSource extends BaseDataSource {
    constructor(config = {}) {
        super(config);
        this.name = 'IGDataSource';
        this.apiKey =  'ce5bf388c563a2de5592c20a318752219d158e74';
        this.username = 'trinhminhbao';
        this.password = 'anhBAO@1991';
        this.demo = true; // Default to demo
        
        // IG API endpoints
        this.apiUrl ='https://demo-api.ig.com/gateway/deal';
        
        this.cst = null; // Client session token
        this.securityToken = null; // X-SECURITY-TOKEN
        this.accountId = null;
        
        this.subscribers = new Map();
        this.intervals = new Map();
        this.marketsCache = null;
        this.authenticated = false;
        this.authenticationPromise = null; // Track ongoing authentication
        this.barsCache = new Map(); // Cache for bars
        this.pendingRequests = new Map(); // Prevent duplicate requests
        
        // Auto-authenticate on initialization
        this.authenticate();
    }

    async onReady() {
        return {
            supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
            exchanges: [
                { value: 'IG', name: 'IG', desc: 'IG Markets' }
            ]
        };
    }

    canHandle(symbolName) {
        const { exchange } = this.parseSymbol(symbolName);
        return exchange === 'IG';
    }

    /**
     * Authenticate with IG API - Only once
     */
    async authenticate() {
        // If already authenticated, return immediately
        if (this.authenticated && this.cst && this.securityToken) {
            return true;
        }

        // If authentication is in progress, wait for it
        if (this.authenticationPromise) {
            console.log('[IGDataSource] Authentication already in progress, waiting...');
            return await this.authenticationPromise;
        }

        // Check credentials
        if (!this.apiKey || !this.username || !this.password) {
            console.warn('[IGDataSource] Missing credentials');
            return false;
        }

        console.log('[IGDataSource] Starting authentication...');

        // Create authentication promise
        this.authenticationPromise = (async () => {
            try {
                const response = await fetch(`${this.apiUrl}/session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json; charset=UTF-8',
                        'VERSION': '2',
                        'X-IG-API-KEY': this.apiKey
                    },
                    body: JSON.stringify({
                        identifier: this.username,
                        password: this.password
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[IGDataSource] Authentication failed:', response.status, errorText);
                    this.authenticationPromise = null;
                    return false;
                }

                // Get tokens from headers
                this.cst = response.headers.get('CST');
                this.securityToken = response.headers.get('X-SECURITY-TOKEN');
                
                const data = await response.json();
                this.accountId = data.currentAccountId;
                this.authenticated = true;

                console.log('[IGDataSource] ✅ Authentication successful - Account:', this.accountId);
                return true;
            } catch (error) {
                console.error('[IGDataSource] Authentication error:', error);
                this.authenticationPromise = null;
                return false;
            }
        })();

        return await this.authenticationPromise;
    }

    /**
     * Get authenticated headers
     */
    getHeaders(version = '1') {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json; charset=UTF-8',
            'VERSION': version,
            'X-IG-API-KEY': this.apiKey,
            'CST': this.cst,
            'X-SECURITY-TOKEN': this.securityToken
        };
    }

    /**
     * Get all forex markets from IG - using fixed list
     */
    async getAllMarkets() {
        if (this.marketsCache) {
            return this.marketsCache;
        }

        // Fixed list of supported markets
        const fixedMarkets = [
            { pair: 'XAU/USD', symbol: 'XAUUSD', epic: 'CS.D.CFPGOLD.CFP.IP', displayName: 'Gold', baseAsset: 'XAU', quoteAsset: 'USD' },
            { pair: 'EUR/USD', symbol: 'EURUSD', epic: 'CS.D.EURUSD.CFD.IP', displayName: 'EUR/USD', baseAsset: 'EUR', quoteAsset: 'USD' },
            { pair: 'GBP/USD', symbol: 'GBPUSD', epic: 'CS.D.GBPUSD.CFD.IP', displayName: 'GBP/USD', baseAsset: 'GBP', quoteAsset: 'USD' },
            { pair: 'USD/JPY', symbol: 'USDJPY', epic: 'CS.D.USDJPY.CFD.IP', displayName: 'USD/JPY', baseAsset: 'USD', quoteAsset: 'JPY' },
            { pair: 'USD/CHF', symbol: 'USDCHF', epic: 'CS.D.USDCHF.CFD.IP', displayName: 'USD/CHF', baseAsset: 'USD', quoteAsset: 'CHF' },
            { pair: 'USD/CAD', symbol: 'USDCAD', epic: 'CS.D.USDCAD.CFD.IP', displayName: 'USD/CAD', baseAsset: 'USD', quoteAsset: 'CAD' },
            { pair: 'AUD/USD', symbol: 'AUDUSD', epic: 'CS.D.AUDUSD.CFD.IP', displayName: 'AUD/USD', baseAsset: 'AUD', quoteAsset: 'USD' },
            { pair: 'NZD/USD', symbol: 'NZDUSD', epic: 'CS.D.NZDUSD.CFD.IP', displayName: 'NZD/USD', baseAsset: 'NZD', quoteAsset: 'USD' }
        ];

        this.marketsCache = fixedMarkets.map(market => ({
            symbol: market.symbol,
            epic: market.epic,
            displayName: market.displayName,
            baseAsset: market.baseAsset,
            quoteAsset: market.quoteAsset,
            exchange: 'IG',
            type: 'forex',
            searchKey: market.symbol.toLowerCase()
        }));

        console.log(`[IGDataSource] Loaded ${this.marketsCache.length} fixed forex markets`);
        return this.marketsCache;
    }

    /**
     * Find market by symbol - use fixed list
     */
    async findMarket(symbol) {
        // Get from fixed list (no authentication needed for fixed list)
        const markets = await this.getAllMarkets();
        const market = markets.find(m => 
            m.symbol === symbol || 
            m.symbol.toLowerCase() === symbol.toLowerCase()
        );

        if (!market) {
            console.warn('[IGDataSource] Market not found:', symbol);
        }

        return market;
    }

    async searchSymbols(_userInput, _exchange, _symbolType, onResult) {
        onResult([]);
    }

    async resolveSymbol(symbolName, onResolve, onError) {
        try {
            // Wait for authentication if not ready
            if (!this.authenticated) {
                console.log('[IGDataSource] Waiting for authentication...');
                const authenticated = await this.authenticate();
                if (!authenticated) {
                    onError('Authentication failed');
                    return;
                }
            }

            const { exchange, symbol } = this.parseSymbol(symbolName);
            
            const market = await this.findMarket(symbol);
            
            if (!market) {
                onError('Symbol not found');
                return;
            }

            console.log('[IGDataSource] Resolved market:', market);

            // Get market details
            const response = await fetch(`${this.apiUrl}/markets/${market.epic}`, {
                headers: this.getHeaders('3')
            });

            if (!response.ok) {
                onError('Failed to get market details');
                return;
            }

            const data = await response.json();
            const instrument = data.instrument;

            const symbolInfo = {
                name: symbolName,
                ticker: symbolName,
                description: market.displayName,
                type: 'forex',
                session: '24x7',
                timezone: 'Etc/UTC',
                exchange: exchange,
                minmov: 1,
                pricescale: Math.pow(10, instrument.valueOfOnePip ? String(instrument.valueOfOnePip).split('.')[1]?.length || 4 : 4),
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
                volume_precision: 0,
                data_status: 'streaming',
                epic: market.epic // Store epic for later use
            };

            onResolve(symbolInfo);
        } catch (error) {
            console.error('[IGDataSource] Resolve error:', error);
            onError(error.message);
        }
    }

    /**
     * Convert resolution to IG resolution format
     */
    resolutionToIGResolution(resolution) {
        const resolutionMap = {
            '1': 'MINUTE',
            '5': 'MINUTE_5',
            '15': 'MINUTE_15',
            '30': 'MINUTE_30',
            '60': 'HOUR',
            '240': 'HOUR_4',
            'D': 'DAY',
            'W': 'WEEK',
            'M': 'MONTH'
        };
        return resolutionMap[resolution] || 'HOUR';
    }

    /**
     * Get historical bars - Simple version following IG API docs
     * IG API: GET /prices/{epic}?resolution={resolution}&from={from}&to={to}
     */
    async getBars(symbolInfo, resolution, periodParams, onResult, onError) {
        try {
            // Ensure authenticated
            if (!this.authenticated) {
                await this.authenticate();
            }

            // Get market epic
            const { symbol } = this.parseSymbol(symbolInfo.name);
            const market = await this.findMarket(symbol);
            
            if (!market) {
                onError('Market not found');
                return;
            }

            // Convert resolution
            const igResolution = this.resolutionToIGResolution(resolution);
            
            // Build API URL with query parameters
            const fromDate = new Date(periodParams.from * 1000).toISOString();
            const toDate = new Date(periodParams.to * 1000).toISOString();
            
            const url = `${this.apiUrl}/prices/${market.epic}?resolution=${igResolution}&from=${fromDate}&to=${toDate}&max=5000&pageSize=2000&pageNumber=1`;
            
            console.log('[IGDataSource] Fetching:', {
                from: fromDate,
                to: toDate,
                resolution: igResolution,
                firstRequest: periodParams.firstDataRequest
            });

            // Fetch data from IG API
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders('3')
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[IGDataSource] API Error:', response.status, errorText);
                onError(`API Error: ${response.status}`);
                return;
            }

            const data = await response.json();

            // Check if we have data
            if (!data.prices || data.prices.length === 0) {
                console.log('[IGDataSource] No data - reached end of history');
                onResult([], { noData: true });
                return;
            }

            // Convert IG prices to TradingView bars
            const bars = data.prices.map(price => {
                const timeStr = price.snapshotTime || price.snapshotTimeUTC;
                const timestamp = new Date(timeStr).getTime();
                
                // Calculate mid price from bid/ask
                const open = (price.openPrice.bid + price.openPrice.ask) / 2;
                const high = (price.highPrice.bid + price.highPrice.ask) / 2;
                const low = (price.lowPrice.bid + price.lowPrice.ask) / 2;
                const close = (price.closePrice.bid + price.closePrice.ask) / 2;

                return {
                    time: timestamp,
                    open: open,
                    high: high,
                    low: low,
                    close: close,
                    volume: price.lastTradedVolume || 0
                };
            });

            // Sort by time
            bars.sort((a, b) => a.time - b.time);

            console.log('[IGDataSource] ✅ Returned', bars.length, 'bars, first:', new Date(bars[0].time).toISOString());
            
            // IMPORTANT: If we got less bars than expected, tell TradingView there's no more data
            // This prevents infinite loading
            const expectedBars = Math.floor((periodParams.to - periodParams.from) / (this.resolutionToMs(resolution) / 1000));
            const noMoreData = bars.length < Math.min(expectedBars * 0.5, 100); // If less than 50% or less than 100 bars
            
            onResult(bars, { noData: noMoreData });

        } catch (error) {
            console.error('[IGDataSource] getBars error:', error);
            onError(error.message);
        }
    }

    resolutionToMs(resolution) {
        const resolutionMap = {
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
        return resolutionMap[resolution] || 60 * 60 * 1000;
    }

    async subscribeBars(symbolInfo, resolution, onTick, listenerGuid, _onResetCacheNeededCallback) {
        const { symbol } = this.parseSymbol(symbolInfo.name);
        const market = await this.findMarket(symbol);
        
        if (!market) {
            console.error('[IGDataSource] Market not found for subscription');
            return;
        }

        console.log('[IGDataSource] Subscribing to:', market.epic);

        // IG Lightstreamer WebSocket endpoint
        const streamUrl = this.demo
            ? 'https://demo-apd.marketdatasys.com'
            : 'https://apd.marketdatasys.com';

        let lastBar = null;
        const resolutionMs = this.resolutionToMs(resolution);
        
        try {
            // Create Lightstreamer session
            const sessionResponse = await fetch(`${streamUrl}/lightstreamer/create_session.txt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    LS_op2: 'create',
                    LS_cid: 'mgQkwtwdysogQz2BJ4Ji kOj2Bg',
                    LS_adapter_set: 'DEFAULT',
                    LS_user: this.accountId,
                    LS_password: `CST-${this.cst}|XST-${this.securityToken}`
                })
            });

            const sessionText = await sessionResponse.text();
            const sessionMatch = sessionText.match(/SessionId:(\w+)/);
            
            if (!sessionMatch) {
                console.error('[IGDataSource] Failed to create Lightstreamer session');
                // Fallback to polling
                this.subscribeBarsPolling(market, resolution, onTick, listenerGuid, resolutionMs);
                return;
            }

            const sessionId = sessionMatch[1];
            console.log('[IGDataSource] Lightstreamer session created:', sessionId);

            // Subscribe to market updates
            const subscribeUrl = `${streamUrl}/lightstreamer/control.txt`;
            const subscribeResponse = await fetch(subscribeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    LS_session: sessionId,
                    LS_op: 'add',
                    LS_subId: '1',
                    LS_mode: 'MERGE',
                    LS_group: `MARKET:${market.epic}`,
                    LS_schema: 'BID OFFER UPDATE_TIME',
                    LS_snapshot: 'true'
                })
            });

            if (!subscribeResponse.ok) {
                console.error('[IGDataSource] Failed to subscribe to market');
                this.subscribeBarsPolling(market, resolution, onTick, listenerGuid, resolutionMs);
                return;
            }

            // Listen to stream
            const streamResponse = await fetch(`${streamUrl}/lightstreamer/bind_session.txt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    LS_session: sessionId
                })
            });

            const reader = streamResponse.body.getReader();
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
                            
                            // Parse Lightstreamer update
                            const parts = line.split('|');
                            if (parts.length >= 3) {
                                const bid = parseFloat(parts[0]);
                                const offer = parseFloat(parts[1]);
                                
                                if (!isNaN(bid) && !isNaN(offer)) {
                                    const price = (bid + offer) / 2;
                                    const time = Date.now();
                                    const barTime = Math.floor(time / resolutionMs) * resolutionMs;

                                    if (!lastBar || lastBar.time !== barTime) {
                                        if (lastBar) {
                                            onTick(lastBar);
                                        }
                                        lastBar = {
                                            time: barTime,
                                            open: price,
                                            high: price,
                                            low: price,
                                            close: price,
                                            volume: 0
                                        };
                                    } else {
                                        lastBar.high = Math.max(lastBar.high, price);
                                        lastBar.low = Math.min(lastBar.low, price);
                                        lastBar.close = price;
                                        onTick(lastBar);
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('[IGDataSource] Stream error:', error);
                    }
                }
            };
//https://demo-api.ig.com/gateway/deal/prices/CS.D.EURUSD.CFD.IP?resolution=MINUTE_15&from=2025-11-09T00:36:57.000Z&to=2025-11-12T10:51:57.000Z
            processStream();

            // Store session info for cleanup
            this.intervals.set(listenerGuid, { sessionId, reader });
            this.subscribers.set(listenerGuid, { symbolInfo, resolution, onTick });

        } catch (error) {
            console.error('[IGDataSource] WebSocket setup error:', error);
            // Fallback to polling
            this.subscribeBarsPolling(market, resolution, onTick, listenerGuid, resolutionMs);
        }
    }

    subscribeBarsPolling(market, resolution, onTick, listenerGuid, resolutionMs) {
        console.log('[IGDataSource] Using polling fallback');
        
        let lastBar = null;
        const pollInterval = Math.min(resolutionMs / 10, 5000);

        const poll = async () => {
            try {
                const response = await fetch(`${this.apiUrl}/markets/${market.epic}`, {
                    headers: this.getHeaders('3')
                });

                if (!response.ok) return;

                const data = await response.json();
                const snapshot = data.snapshot;
                
                if (!snapshot) return;

                const price = (snapshot.bid + snapshot.offer) / 2;
                const time = new Date(snapshot.updateTime).getTime();
                const barTime = Math.floor(time / resolutionMs) * resolutionMs;

                if (!lastBar || lastBar.time !== barTime) {
                    if (lastBar) {
                        onTick(lastBar);
                    }
                    lastBar = {
                        time: barTime,
                        open: price,
                        high: price,
                        low: price,
                        close: price,
                        volume: 0
                    };
                } else {
                    lastBar.high = Math.max(lastBar.high, price);
                    lastBar.low = Math.min(lastBar.low, price);
                    lastBar.close = price;
                    onTick(lastBar);
                }
            } catch (error) {
                console.error('[IGDataSource] Poll error:', error);
            }
        };

        const intervalId = setInterval(poll, pollInterval);
        this.intervals.set(listenerGuid, intervalId);
        this.subscribers.set(listenerGuid, { symbolInfo: { name: market.epic }, resolution, onTick });

        poll();
    }

    async unsubscribeBars(listenerGuid) {
        const subscription = this.intervals.get(listenerGuid);
        if (subscription) {
            if (typeof subscription === 'number') {
                // Polling interval
                clearInterval(subscription);
            } else if (subscription.reader) {
                // WebSocket reader
                try {
                    await subscription.reader.cancel();
                } catch (err) {
                    console.warn('[IGDataSource] Error canceling reader:', err);
                }
            }
            this.intervals.delete(listenerGuid);
        }
        this.subscribers.delete(listenerGuid);
    }
}

export default IGDataSource;
