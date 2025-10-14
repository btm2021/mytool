import ccxt from 'ccxt';
import { DataSourceBase } from './datasource_base.js';
import { TIMEFRAME_1M } from '../core/constants.js';

const ccxtpro = ccxt.pro;

export class OKXFutureDataSource extends DataSourceBase {
    constructor() {
        super();
        this.exchange = null;
        this.messageCallback = null;
        this.wsConnected = false;
        this.subscribedSymbols = new Map();
        this.exchangeName = 'okx_futures';
    }

    async initialize() {
        this.exchange = new ccxtpro.okx({
            enableRateLimit: true,
            newUpdates: false,
            options: {
                defaultType: 'swap'
            }
        });
        await this.exchange.loadMarkets();
        this.log('Initialized', 'success');
    }

    async connect() {
        if (!this.exchange) {
            await this.initialize();
        }
        this.wsConnected = true;
        this.log('Connected', 'success');
    }

    async subscribe(symbols, interval = '1m') {
        this.log(`Subscribing to ${symbols.length} symbols`);

        for (const symbol of symbols) {
            const ccxtSymbol = this.toCCXTSymbol(symbol);
            this.subscribedSymbols.set(symbol, ccxtSymbol);
            this.watchSymbol(symbol, ccxtSymbol, interval);
        }
    }

    async watchSymbol(originalSymbol, ccxtSymbol, interval) {
        while (this.wsConnected && this.subscribedSymbols.has(originalSymbol)) {
            try {
                // OKX hỗ trợ watchOHLCV
                const ohlcv = await this.exchange.watchOHLCV(ccxtSymbol, interval);
                if (ohlcv && ohlcv.length > 0) {
                    const latest = ohlcv[ohlcv.length - 1];
                    const normalized = this.normalize(originalSymbol, latest, interval);

                    if (this.messageCallback) {
                        this.messageCallback(normalized);
                    }
                }
            } catch (error) {
                this.log(`Watch error for ${originalSymbol}: ${error.message}`, 'error');
                await this.sleep(2000);
            }
        }
    }

    toCCXTSymbol(symbol) {
        if (symbol.includes('/')) return symbol;

        if (symbol.endsWith('USDT')) {
            const base = symbol.replace('USDT', '');
            return `${base}/USDT:USDT`;
        }
        return symbol;
    }

    onMessage(callback) {
        this.messageCallback = callback;
    }

    setLogger(logger) {
        this.logger = logger;
    }

    async reconnect() {
        this.log('Reconnecting...', 'warn');
        await this.close();
        await this.sleep(1000);
        await this.connect();
    }

    async backfill(symbol, fromTs, _toTs, limit = 1500) {
        try {
            if (!this.exchange) {
                await this.initialize();
            }

            const ccxtSymbol = this.toCCXTSymbol(symbol);
            const ohlcv = await this.exchange.fetchOHLCV(ccxtSymbol, TIMEFRAME_1M, fromTs, limit);

            return ohlcv.map(candle => ({
                symbol,
                exchange: this.exchangeName,
                interval: TIMEFRAME_1M,
                ts: candle[0],
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4],
                volume: candle[5],
                closed: true
            }));
        } catch (err) {
            this.log(`Backfill error for ${symbol}: ${err.message}`, 'error');
            return [];
        }
    }

    normalize(symbol, ohlcv, interval) {
        const now = Date.now();
        const candleTime = ohlcv[0];
        const intervalMs = this.getIntervalMs(interval);
        const closed = (now - candleTime) >= intervalMs;

        return {
            symbol,
            exchange: this.exchangeName,
            interval,
            ts: ohlcv[0],
            open: ohlcv[1],
            high: ohlcv[2],
            low: ohlcv[3],
            close: ohlcv[4],
            volume: ohlcv[5],
            closed
        };
    }

    getIntervalMs(interval) {
        const map = {
            '1m': 60000,
            '5m': 300000,
            '15m': 900000,
            '1h': 3600000,
            '4h': 14400000,
            '1d': 86400000
        };
        return map[interval] || 60000;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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

    async close() {
        this.wsConnected = false;
        this.subscribedSymbols.clear();

        if (this.exchange && this.exchange.close) {
            await this.exchange.close();
        }
    }
}
