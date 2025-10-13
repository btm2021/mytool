import WebSocket from 'ws';
import { DataSourceBase } from './datasource_base.js';
import {
    BINANCE_FUTURES_WS,
    BINANCE_FUTURES_API,
    WS_RECONNECT_DELAY,
    WS_HEARTBEAT_INTERVAL,
    WS_HEARTBEAT_TIMEOUT,
    WS_CONNECT_DELAY,
    DEFAULT_EXCHANGE,
    TIMEFRAME_1M
} from '../core/constants.js';

export class BinanceFutureDataSource extends DataSourceBase {
    constructor() {
        super();
        this.ws = null;
        this.messageCallback = null;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.lastPong = Date.now();
        this.isConnecting = false;
    }

    connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        this.log('Connecting to WebSocket...');
        this.ws = new WebSocket(BINANCE_FUTURES_WS);

        this.ws.on('open', () => {
            this.log('WebSocket connected', 'success');
            this.isConnecting = false;
            this.lastPong = Date.now();
            this.startHeartbeat();
        });

        this.ws.on('message', (data) => {
            this.lastPong = Date.now();
            try {
                const parsed = JSON.parse(data.toString());
                if (parsed.e === 'kline') {
                    const normalized = this.normalize(parsed);
                    
                    if (this.messageCallback) {
                        this.messageCallback(normalized);
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

        const streams = symbols.map(s => `${s.toLowerCase()}@kline_${interval}`);
        const subscribeMsg = {
            method: 'SUBSCRIBE',
            params: streams,
            id: Date.now()
        };

        this.log(`Subscribing to ${streams.length} streams`);
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
                this.ws.ping();
            }
        }, WS_HEARTBEAT_INTERVAL);
    }

    log(message, type = 'info') {
        const prefix = '[Binance]';
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

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    async backfill(symbol, fromTs, _toTs, limit = 1500) {
        const url = `${BINANCE_FUTURES_API}/klines?symbol=${symbol}&interval=${TIMEFRAME_1M}&limit=${limit}&startTime=${fromTs}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.map(k => ({
                symbol,
                exchange: DEFAULT_EXCHANGE,
                interval: TIMEFRAME_1M,
                ts: k[0],
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
                closed: true
            }));
        } catch (err) {
            this.log(`Backfill error for ${symbol}: ${err.message}`, 'error');
            return [];
        }
    }

    normalize(raw) {
        const k = raw.k;
        return {
            symbol: k.s,
            exchange: DEFAULT_EXCHANGE,
            interval: k.i,
            ts: k.t,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
            closed: k.x
        };
    }

    close() {
        this.stopHeartbeat();
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.ws) {
            this.ws.close();
        }
    }
}
