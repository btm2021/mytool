class BinanceExchange extends BaseExchange {
    constructor(config) {
        super('binance', config);
        this.ws = null;
        this.wsReconnectAttempts = 0;
        this.wsMaxReconnectAttempts = 5;
        this.wsReconnectDelay = 5000;
        this.displayedSymbols = new Set();
        this.onPriceUpdate = null;
    }

    createExchange() {
        return new ccxt.binance({
            enableRateLimit: true,
            options: {
                defaultType: 'future'
            }
        });
    }

    filterSymbols() {
        return Object.keys(this.exchange.markets).filter(symbol => {
            const market = this.exchange.markets[symbol];
            return market.quote === 'USDT' && market.type === 'swap' && market.active;
        });
    }

    async init() {
        await super.init();
        this.connectWebSocket();
        return this.allSymbols;
    }

    connectWebSocket() {
        try {
            const wsUrl = 'wss://fstream.binance.com/ws/!miniTicker@arr';
            
            this.log('info', 'Connecting to WebSocket...');
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.wsReconnectAttempts = 0;
                this.log('success', '✓ WebSocket connected - receiving realtime prices');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (Array.isArray(data)) {
                        this.processMiniTickers(data);
                    }
                } catch (error) {
                    this.log('error', `WS parse error: ${error.message}`);
                }
            };

            this.ws.onerror = (error) => {
                this.log('error', `WebSocket error: ${error.message || 'Connection failed'}`);
            };

            this.ws.onclose = () => {
                this.log('warn', 'WebSocket disconnected');
                this.reconnectWebSocket();
            };

        } catch (error) {
            this.log('error', `WS connection failed: ${error.message}`);
            this.reconnectWebSocket();
        }
    }

    reconnectWebSocket() {
        if (!this.isRunning) return;

        if (this.wsReconnectAttempts < this.wsMaxReconnectAttempts) {
            this.wsReconnectAttempts++;
            this.log('info', `Reconnecting WebSocket (${this.wsReconnectAttempts}/${this.wsMaxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connectWebSocket();
            }, this.wsReconnectDelay);
        } else {
            this.log('error', 'WebSocket max reconnection attempts reached');
        }
    }

    processMiniTickers(tickers) {
        const updates = [];
        
        tickers.forEach(ticker => {
            const rawSymbol = ticker.s;
            const normalizedSymbol = this.convertBinanceSymbol(rawSymbol);
            
            if (this.displayedSymbols.has(normalizedSymbol)) {
                updates.push({
                    symbol: normalizedSymbol,
                    price: parseFloat(ticker.c),
                    change: parseFloat(ticker.P),
                    volume: parseFloat(ticker.v)
                });
            }
        });

        if (updates.length > 0 && this.onPriceUpdate) {
            this.onPriceUpdate(updates);
        }
    }

    convertBinanceSymbol(binanceSymbol) {
        if (binanceSymbol.endsWith('USDT')) {
            const base = binanceSymbol.slice(0, -4);
            return `${base}/USDT`;
        }
        return binanceSymbol;
    }

    updateDisplayedSymbols(symbols) {
        this.displayedSymbols = new Set(symbols);
    }

    stop() {
        super.stop();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.log('info', 'WebSocket closed');
        }
    }
}

// Expose to global scope
window.BinanceExchange = BinanceExchange;
