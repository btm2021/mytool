importScripts('base-worker.js');

class BinanceWorker extends BaseExchangeWorker {
    constructor(config) {
        super('binance', config);
        this.ws = null;
        this.wsReconnectAttempts = 0;
        this.wsMaxReconnectAttempts = 5;
        this.wsReconnectDelay = 5000;
        this.displayedSymbols = new Set(); // Track symbols currently displayed in UI
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
            return market.quote === 'USDT' &&
                market.type === 'swap' &&
                market.active;
        });
    }

    async init() {
        await super.init();
        // Start WebSocket after initialization
        this.connectWebSocket();
    }

    connectWebSocket() {
        try {
            // Binance Futures WebSocket endpoint for all miniTicker
            const wsUrl = 'wss://fstream.binance.com/ws/!miniTicker@arr';
            
            this.postLog('info', 'Connecting to WebSocket...');
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.wsReconnectAttempts = 0;
                this.postLog('success', '✓ WebSocket connected - receiving realtime prices');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (Array.isArray(data)) {
                        // Process miniTicker array
                        this.processMiniTickers(data);
                    }
                } catch (error) {
                    this.postLog('error', `WS parse error: ${error.message}`);
                }
            };

            this.ws.onerror = (error) => {
                this.postLog('error', `WebSocket error: ${error.message || 'Connection failed'}`);
            };

            this.ws.onclose = () => {
                this.postLog('warn', 'WebSocket disconnected');
                this.reconnectWebSocket();
            };

        } catch (error) {
            this.postLog('error', `WS connection failed: ${error.message}`);
            this.reconnectWebSocket();
        }
    }

    reconnectWebSocket() {
        if (!this.isRunning) return;

        if (this.wsReconnectAttempts < this.wsMaxReconnectAttempts) {
            this.wsReconnectAttempts++;
            this.postLog('info', `Reconnecting WebSocket (${this.wsReconnectAttempts}/${this.wsMaxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connectWebSocket();
            }, this.wsReconnectDelay);
        } else {
            this.postLog('error', 'WebSocket max reconnection attempts reached');
        }
    }

    processMiniTickers(tickers) {
        // Filter only symbols that are currently displayed
        const updates = [];
        
        tickers.forEach(ticker => {
            // ticker.s is the symbol (e.g., "BTCUSDT")
            // Convert to normalized format (e.g., "BTC/USDT")
            const rawSymbol = ticker.s;
            const normalizedSymbol = this.convertBinanceSymbol(rawSymbol);
            
            // Only send updates for symbols that are displayed
            if (this.displayedSymbols.has(normalizedSymbol)) {
                updates.push({
                    symbol: normalizedSymbol,
                    price: parseFloat(ticker.c), // Close price
                    change: parseFloat(ticker.P), // Price change percent
                    volume: parseFloat(ticker.v) // Volume
                });
            }
        });

        // Send batch update to main thread
        if (updates.length > 0) {
            this.postMessage({
                type: 'price_update',
                updates: updates
            });
        }
    }

    convertBinanceSymbol(binanceSymbol) {
        // Convert BTCUSDT to BTC/USDT
        if (binanceSymbol.endsWith('USDT')) {
            const base = binanceSymbol.slice(0, -4);
            return `${base}/USDT`;
        }
        return binanceSymbol;
    }

    updateDisplayedSymbols(symbols) {
        // Update the set of symbols currently displayed in UI
        this.displayedSymbols = new Set(symbols);
    }

    stop() {
        super.stop();
        // Close WebSocket connection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.postLog('info', 'WebSocket closed');
        }
    }
}

let worker = null;

self.onmessage = async function (e) {
    const { type, config, data } = e.data;

    if (type === 'init') {
        worker = new BinanceWorker(config);
        await worker.init();
    } else if (type === 'pause') {
        if (worker) worker.pause();
    } else if (type === 'resume') {
        if (worker) worker.resume();
    } else if (type === 'stop') {
        if (worker) worker.stop();
    } else if (type === 'set_processed') {
        if (worker) worker.setProcessedSymbols(data);
    } else if (type === 'update_displayed_symbols') {
        if (worker) worker.updateDisplayedSymbols(data.symbols);
    }
};
