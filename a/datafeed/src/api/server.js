import express from 'express';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DEFAULT_PORT, DEFAULT_LIMIT, TIMEFRAME_1M } from '../core/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class APIServer {
    constructor(db, aggregator, collector, logger) {
        this.db = db;
        this.aggregator = aggregator;
        this.collector = collector;
        this.logger = logger;
        this.app = express();
        this.wss = null;
        this.server = null;
        this.restartCallback = null;
        this.collectors = [];

        this.setupMiddleware();
        this.setupRoutes();
    }

    setRestartCallback(callback) {
        this.restartCallback = callback;
    }

    setDeleteDatabaseCallback(callback) {
        this.deleteDatabaseCallback = callback;
    }

    setCollectors(collectors) {
        this.collectors = collectors;
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static(join(__dirname, '../web')));
    }

    setupRoutes() {
        this.app.get('/', (_req, res) => {
            res.sendFile(join(__dirname, '../web/index.html'));
        });

        this.app.get('/ohlcv', (req, res) => {
            const { exchange, symbol, timeframe = TIMEFRAME_1M, limit = DEFAULT_LIMIT } = req.query;

            if (!symbol) {
                return res.status(400).json({ error: 'symbol is required' });
            }

            const exchangeName = exchange || this.collector.exchange;
            const requestLimit = parseInt(limit);
            const candles1m = this.db.getOHLCV(exchangeName, symbol.toUpperCase(), TIMEFRAME_1M, requestLimit * 100);

            if (timeframe === TIMEFRAME_1M) {
                return res.json(candles1m.slice(-requestLimit));
            }

            const resampled = this.aggregator.resample(candles1m, timeframe);
            res.json(resampled.slice(-requestLimit));
        });

        this.app.post('/config', async (req, res) => {
            const { symbols, intervals, batch_interval } = req.body;

            if (!symbols || !Array.isArray(symbols)) {
                return res.status(400).json({ error: 'symbols must be an array' });
            }

            try {
                await this.collector.updateConfig({ symbols, intervals, batch_interval });
                res.json({ success: true, message: 'Configuration updated' });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        this.app.get('/status', (_req, res) => {
            res.json({
                status: 'running',
                symbols: this.collector.config.allSymbols,
                intervals: this.collector.config.intervals
            });
        });

        this.app.get('/exchanges', (_req, res) => {
            const exchanges = {};
            for (const [name, config] of Object.entries(this.collector.config.exchanges)) {
                exchanges[name] = {
                    enabled: config.enabled !== false,
                    symbols: config.symbols || []
                };
            }
            res.json(exchanges);
        });

        this.app.get('/exchange-symbols/:exchange', async (req, res) => {
            const { exchange } = req.params;

            try {
                let symbols = [];

                if (exchange === 'binance_futures') {
                    symbols = await this.fetchBinanceSymbols();
                } else if (exchange === 'bybit_futures') {
                    symbols = await this.fetchBybitSymbols();
                } else if (exchange === 'okx_futures') {
                    symbols = await this.fetchOKXSymbols();
                } else {
                    return res.status(404).json({ error: 'Exchange not supported' });
                }

                res.json({ symbols });
            } catch (err) {
                if (this.logger) {
                    this.logger.error(`Failed to fetch symbols: ${err.message}`);
                }
                res.status(500).json({ error: err.message });
            }
        });

        this.app.post('/exchange-symbols', async (req, res) => {
            const { exchange, symbols } = req.body;

            if (!exchange || !Array.isArray(symbols)) {
                return res.status(400).json({ error: 'exchange and symbols array required' });
            }

            try {
                const currentConfig = this.collector.config.exchanges;
                if (!currentConfig[exchange]) {
                    return res.status(404).json({ error: 'Exchange not found' });
                }

                currentConfig[exchange].symbols = symbols;

                // Save to config file
                this.collector.config.update({ exchanges: currentConfig });

                // Broadcast restart notification
                this.broadcast({
                    type: 'log',
                    data: {
                        message: 'Configuration saved. Restarting application...',
                        type: 'validated',
                        timestamp: new Date().toISOString()
                    }
                });

                res.json({ success: true, message: 'Configuration saved. Restarting...' });

                // Trigger restart after response is sent
                setTimeout(() => {
                    if (this.restartCallback) {
                        this.restartCallback();
                    }
                }, 1000);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        this.app.post('/restart', async (_req, res) => {
            try {
                this.broadcast({
                    type: 'log',
                    data: {
                        message: 'Manual restart triggered...',
                        type: 'validated',
                        timestamp: new Date().toISOString()
                    }
                });

                res.json({ success: true, message: 'Restarting application...' });

                setTimeout(() => {
                    if (this.restartCallback) {
                        this.restartCallback();
                    }
                }, 1000);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        this.app.post('/delete-database', async (_req, res) => {
            try {
                this.broadcast({
                    type: 'log',
                    data: {
                        message: 'Database deletion requested...',
                        type: 'error',
                        timestamp: new Date().toISOString()
                    }
                });

                res.json({ success: true, message: 'Deleting database and restarting...' });

                setTimeout(() => {
                    if (this.deleteDatabaseCallback) {
                        this.deleteDatabaseCallback();
                    }
                }, 1000);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        this.app.get('/config', (_req, res) => {
            try {
                const config = this.collector.config.getAll();
                res.json(config);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        this.app.post('/config', async (req, res) => {
            const { batch_interval, max_records, bootstrap_load, port } = req.body;

            try {
                const updates = {};
                if (batch_interval !== undefined) updates.batch_interval = parseInt(batch_interval);
                if (max_records !== undefined) updates.max_records = parseInt(max_records);
                if (bootstrap_load !== undefined) updates.bootstrap_load = parseInt(bootstrap_load);
                if (port !== undefined) updates.port = parseInt(port);

                this.collector.config.update(updates);

                this.broadcast({
                    type: 'log',
                    data: {
                        message: 'Configuration updated. Restarting...',
                        type: 'validated',
                        timestamp: new Date().toISOString()
                    }
                });

                res.json({ success: true, message: 'Configuration updated. Restarting...' });

                setTimeout(() => {
                    if (this.restartCallback) {
                        this.restartCallback();
                    }
                }, 1000);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }

    start(port = DEFAULT_PORT) {
        this.server = this.app.listen(port, () => {
            if (this.logger) {
                this.logger.success(`Server running on http://localhost:${port}`);
            }
        });

        this.wss = new WebSocketServer({ server: this.server });

        this.wss.on('connection', (ws) => {
            if (this.logger) {
                this.logger.info('WebSocket client connected');
            }

            // Send status for each active exchange
            const exchanges = this.collector.config.exchanges || {};
            for (const [exchangeName, config] of Object.entries(exchanges)) {
                if (config.enabled !== false && config.symbols && config.symbols.length > 0) {
                    this.broadcast({
                        type: 'status',
                        data: {
                            exchange: exchangeName,
                            symbols: config.symbols
                        }
                    });
                }
            }

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'command') {
                        this.handleCommand(message.data, ws);
                    }
                } catch (err) {
                    if (this.logger) {
                        this.logger.error(`Message parse error: ${err.message}`);
                    }
                }
            });

            ws.on('close', () => {
                if (this.logger) {
                    this.logger.info('WebSocket client disconnected');
                }
            });
        });

        if (this.logger) {
            this.logger.addBroadcaster((logData) => {
                this.broadcast({ type: 'log', data: logData });
            });
        }
    }

    handleCommand(command, ws) {
        const cmd = command.toLowerCase().trim();

        switch (cmd) {
            case 'reload':
                try {
                    this.collector.config.reload();
                    ws.send(JSON.stringify({
                        type: 'command_response',
                        data: { message: 'Configuration reloaded successfully' }
                    }));
                    
                    if (this.logger) {
                        this.logger.info('Configuration reloaded via command');
                    }
                } catch (err) {
                    ws.send(JSON.stringify({
                        type: 'command_response',
                        data: { error: `Reload failed: ${err.message}` }
                    }));
                }
                break;

            case 'status':
                try {
                    const config = this.collector.config;
                    const exchanges = config.exchanges || {};
                    const activeExchanges = Object.entries(exchanges)
                        .filter(([, cfg]) => cfg.enabled !== false)
                        .map(([name]) => name);
                    
                    ws.send(JSON.stringify({
                        type: 'command_response',
                        data: {
                            message: JSON.stringify({
                                exchanges: activeExchanges,
                                total_symbols: config.allSymbols.length,
                                intervals: config.intervals,
                                database: config.databasePath,
                                batch_interval: config.batchInterval,
                                max_records: config.maxRecords,
                                bootstrap_load: config.bootstrapLoad,
                                port: config.port
                            }, null, 2)
                        }
                    }));
                } catch (err) {
                    ws.send(JSON.stringify({
                        type: 'command_response',
                        data: { error: `Status failed: ${err.message}` }
                    }));
                }
                break;

            case 'list':
                try {
                    const config = this.collector.config;
                    const exchanges = config.exchanges || {};
                    let message = 'Active Symbols:\n\n';
                    
                    for (const [exchange, cfg] of Object.entries(exchanges)) {
                        if (cfg.enabled !== false && cfg.symbols && cfg.symbols.length > 0) {
                            message += `${exchange}:\n`;
                            message += `  ${cfg.symbols.join(', ')}\n\n`;
                        }
                    }
                    
                    ws.send(JSON.stringify({
                        type: 'command_response',
                        data: { message }
                    }));
                } catch (err) {
                    ws.send(JSON.stringify({
                        type: 'command_response',
                        data: { error: `List failed: ${err.message}` }
                    }));
                }
                break;

            case 'clear':
                ws.send(JSON.stringify({
                    type: 'command_response',
                    data: { message: 'Terminal cleared' }
                }));
                break;

            case 'help':
                ws.send(JSON.stringify({
                    type: 'command_response',
                    data: {
                        message: 'Available commands:\n' +
                                 '  reload - Reload configuration from file\n' +
                                 '  status - Show system status\n' +
                                 '  list   - List all active symbols\n' +
                                 '  clear  - Clear terminal\n' +
                                 '  help   - Show this help message'
                    }
                }));
                break;

            default:
                ws.send(JSON.stringify({
                    type: 'command_response',
                    data: { error: `Unknown command: ${cmd}. Type 'help' for available commands.` }
                }));
        }
    }

    broadcast(data) {
        if (!this.wss || this.wss.clients.size === 0) {
            return;
        }

        this.wss.clients.forEach(client => {
            if (client.readyState === 1) {
                try {
                    client.send(JSON.stringify(data));
                } catch (err) {
                    if (this.logger) {
                        this.logger.error(`Broadcast error: ${err.message}`);
                    }
                }
            }
        });
    }

    async fetchBinanceSymbols() {
        const infoResponse = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
        const infoData = await infoResponse.json();
        const validSymbols = infoData.symbols
            .filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT')
            .map(s => s.symbol);

        const tickerResponse = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
        const tickerData = await tickerResponse.json();

        const volumeMap = new Map();
        tickerData.forEach(ticker => {
            if (validSymbols.includes(ticker.symbol)) {
                volumeMap.set(ticker.symbol, parseFloat(ticker.quoteVolume) || 0);
            }
        });

        return Array.from(volumeMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([symbol, volume]) => ({
                symbol,
                volume: volume.toFixed(0),
                volumeFormatted: this.formatVolume(volume)
            }));
    }

    async fetchBybitSymbols() {
        const tickerResponse = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
        const data = await tickerResponse.json();

        if (data.retCode !== 0) {
            throw new Error(data.retMsg || 'Bybit API error');
        }

        return data.result.list
            .filter(t => t.symbol.endsWith('USDT'))
            .map(t => ({
                symbol: t.symbol,
                volume: parseFloat(t.turnover24h) || 0,
                volumeFormatted: this.formatVolume(parseFloat(t.turnover24h) || 0)
            }))
            .sort((a, b) => b.volume - a.volume)
            .map(item => ({
                symbol: item.symbol,
                volume: item.volume.toFixed(0),
                volumeFormatted: item.volumeFormatted
            }));
    }

    async fetchOKXSymbols() {
        const tickerResponse = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP');
        const data = await tickerResponse.json();

        if (data.code !== '0') {
            throw new Error(data.msg || 'OKX API error');
        }

        return data.data
            .filter(t => t.instId.endsWith('-USDT-SWAP'))
            .map(t => {
                // Convert BTC-USDT-SWAP to BTCUSDT for consistency
                const normalizedSymbol = t.instId.replace('-USDT-SWAP', 'USDT');
                return {
                    symbol: normalizedSymbol,
                    okxSymbol: t.instId, // Keep original for reference
                    volume: parseFloat(t.volCcy24h) || 0,
                    volumeFormatted: this.formatVolume(parseFloat(t.volCcy24h) || 0)
                };
            })
            .sort((a, b) => b.volume - a.volume)
            .map(item => ({
                symbol: item.symbol,
                volume: item.volume.toFixed(0),
                volumeFormatted: item.volumeFormatted
            }));
    }

    formatVolume(volume) {
        if (volume >= 1e9) {
            return (volume / 1e9).toFixed(2) + 'B';
        } else if (volume >= 1e6) {
            return (volume / 1e6).toFixed(2) + 'M';
        } else if (volume >= 1e3) {
            return (volume / 1e3).toFixed(2) + 'K';
        }
        return volume.toFixed(2);
    }

    close() {
        return new Promise((resolve) => {
            if (this.wss) {
                this.wss.close(() => {
                    if (this.logger) {
                        this.logger.info('WebSocket server closed');
                    }
                });
            }
            
            if (this.server) {
                this.server.close(() => {
                    if (this.logger) {
                        this.logger.info('HTTP server closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}
