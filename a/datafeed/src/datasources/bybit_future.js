import WebSocket from 'ws';
import { DataSourceBase } from './datasource_base.js';
import {
    WS_RECONNECT_DELAY,
    WS_HEARTBEAT_INTERVAL,
    WS_HEARTBEAT_TIMEOUT,
    WS_CONNECT_DELAY,
    TIMEFRAME_1M
} from '../core/constants.js';

export class BybitFutureDataSource extends DataSourceBase {
    constructor() {
        super();
        this.ws = null;
        this.messageCallback = null;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.lastPong = Date.now();
        this.isConnecting = false;
        this.exchangeName = 'bybit_futures';
    }

    connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        this.log('Connecting to WebSocket...');
        this.ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');

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
                
                if (parsed.topic && parsed.topic.startsWith('kline.1.')) {
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

        const args = symbols.map(s => `kline.1.${s}`);
        const subscribeMsg = {
            op: 'subscribe',
            args
        };

        this.log(`Subscribing to ${args.length} streams`);
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
                this.ws.send(JSON.stringify({ op: 'ping' }));
            }
        }, WS_HEARTBEAT_INTERVAL);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    async backfill(symbol, fromTs, _toTs, limit = 1000) {
        const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=1&limit=${limit}&start=${fromTs}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.retCode !== 0) {
                throw new Error(data.retMsg || 'API error');
            }

            return data.result.list.map(k => ({
                symbol,
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

    normalize(raw) {
        const data = raw.data[0];
        const symbol = raw.topic.split('.')[2];
        
        return {
            symbol,
            exchange: this.exchangeName,
            interval: TIMEFRAME_1M,
            ts: parseInt(data.start),
            open: parseFloat(data.open),
            high: parseFloat(data.high),
            low: parseFloat(data.low),
            close: parseFloat(data.close),
            volume: parseFloat(data.volume),
            closed: data.confirm
        };
    }

    log(message, type = 'info') {
        const prefix = '[Bybit]';
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
