import WebSocket from 'ws';
import { DataSourceBase } from './datasource_base.js';
import {
    WS_RECONNECT_DELAY,
    WS_HEARTBEAT_INTERVAL,
    WS_HEARTBEAT_TIMEOUT,
    WS_CONNECT_DELAY,
    TIMEFRAME_1M
} from '../core/constants.js';

export class OKXFutureDataSource extends DataSourceBase {
    constructor() {
        super();
        this.ws = null;
        this.messageCallback = null;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.lastPong = Date.now();
        this.isConnecting = false;
        this.exchangeName = 'okx_futures';
    }

    // Convert BTCUSDT to BTC-USDT-SWAP
    normalizeSymbol(symbol) {
        if (symbol.includes('-SWAP')) {
            return symbol; // Already in correct format
        }
        // Convert BTCUSDT to BTC-USDT-SWAP
        if (symbol.endsWith('USDT')) {
            const base = symbol.replace('USDT', '');
            return `${base}-USDT-SWAP`;
        }
        return symbol;
    }

    // Convert BTC-USDT-SWAP to BTCUSDT for storage
    denormalizeSymbol(symbol) {
        if (symbol.includes('-USDT-SWAP')) {
            return symbol.replace('-USDT-SWAP', 'USDT');
        }
        return symbol;
    }

    connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        this.log('Connecting to WebSocket...');
        // Use business endpoint for candle data
        this.ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/business');

        this.ws.on('open', () => {
            this.log('WebSocket connected', 'success');
            this.isConnecting = false;
            this.lastPong = Date.now();
            this.startHeartbeat();
        });

        this.ws.on('message', (data) => {
            this.lastPong = Date.now();
            
            const message = data.toString();
            
            // Handle pong response
            if (message === 'pong') {
                return;
            }
            
            try {
                const parsed = JSON.parse(message);
                
                // Handle event responses
                if (parsed.event) {
                    if (parsed.event === 'subscribe') {
                        this.log(`Subscribed successfully to ${parsed.arg?.instId || 'unknown'}`, 'success');
                    } else if (parsed.event === 'error') {
                        this.log(`Subscription error: ${parsed.msg} | Code: ${parsed.code}`, 'error');
                    }
                    return;
                }
                
                // Handle candle data
                if (parsed.data && parsed.arg) {
                    const channel = parsed.arg.channel;
                    if (channel === 'index-candle1m' || channel === 'mark-price-candle1m' || channel === 'candle1m') {
                        parsed.data.forEach(candle => {
                            const normalized = this.normalize(candle, parsed.arg.instId);
                            if (this.messageCallback) {
                                this.messageCallback(normalized);
                            }
                        });
                    }
                }
            } catch (err) {
                this.log(`Parse error: ${err.message}`, 'error');
            }
        });

        this.ws.on('error', (err) => {
            this.log(`WebSocket error: ${err.message}`, 'error');
        });

        this.ws.on('close', () => {
            this.log('WebSocket closed', 'warn');
            this.isConnecting = false;
            this.stopHeartbeat();
            this.scheduleReconnect();
        });
    }

    subscribe(symbols, interval = '1m') {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.log('Cannot subscribe: WebSocket not ready', 'error');
            return;
        }

        // For OKX, we need to use the trades channel and aggregate to candles
        // Or use the candles endpoint with proper instType
        const args = symbols.map(s => {
            const normalizedSymbol = this.normalizeSymbol(s);
            this.log(`Preparing subscription for ${s} -> ${normalizedSymbol}`);
            return {
                channel: 'candle1m',
                instId: normalizedSymbol
            };
        });

        // Send single subscription message with all symbols
        const subscribeMsg = {
            op: 'subscribe',
            args: args
        };

        this.log(`Subscribing to ${args.length} symbols: ${JSON.stringify(subscribeMsg)}`);
        this.ws.send(JSON.stringify(subscribeMsg));
    }

    onMessage(callback) {
        this.messageCallback = callback;
    }

    setLogger(logger) {
        this.logger = logger;
    }

    reconnect() {
        this.log('Manual reconnect triggered', 'warn');
        if (this.ws) {
            this.ws.close();
        }
        setTimeout(() => this.connect(), WS_CONNECT_DELAY);
    }

    scheduleReconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            this.log('Auto reconnecting...', 'warn');
            this.connect();
        }, WS_RECONNECT_DELAY);
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (Date.now() - this.lastPong > WS_HEARTBEAT_TIMEOUT) {
                this.log('Heartbeat timeout, reconnecting...', 'warn');
                this.reconnect();
            } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send('ping');
            }
        }, WS_HEARTBEAT_INTERVAL);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    async backfill(symbol, fromTs, _toTs, limit = 100) {
        const okxSymbol = this.normalizeSymbol(symbol);
        const url = `https://www.okx.com/api/v5/market/candles?instId=${okxSymbol}&bar=1m&limit=${limit}&after=${fromTs}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.code !== '0') {
                throw new Error(data.msg || 'API error');
            }

            // Use denormalized symbol for storage
            const storageSymbol = this.denormalizeSymbol(okxSymbol);

            return data.data.map(k => ({
                symbol: storageSymbol,
                exchange: this.exchangeName,
                interval: TIMEFRAME_1M,
                ts: parseInt(k[0]),
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
                closed: true
            })).reverse();
        } catch (err) {
            this.log(`Backfill error for ${symbol}: ${err.message}`, 'error');
            return [];
        }
    }

    normalize(candle, symbol) {
        // Convert OKX format to storage format
        const storageSymbol = this.denormalizeSymbol(symbol);
        
        return {
            symbol: storageSymbol,
            exchange: this.exchangeName,
            interval: TIMEFRAME_1M,
            ts: parseInt(candle[0]),
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5]),
            closed: candle[8] === '1'
        };
    }

    log(message, type = 'info') {
        const prefix = '[OKX]';
        if (this.logger) {
            switch (type) {
                case 'success':
                    this.logger.success(`${prefix} ${message}`);
                    break;
                case 'warn':
                    this.logger.warn(`${prefix} ${message}`);
                    break;
                case 'error':
                    this.logger.error(`${prefix} ${message}`);
                    break;
                default:
                    this.logger.info(`${prefix} ${message}`);
            }
        } else {
            console.log(`${prefix} ${message}`);
        }
    }

    close() {
        this.stopHeartbeat();
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.ws) {
            this.ws.close();
        }
    }
}
