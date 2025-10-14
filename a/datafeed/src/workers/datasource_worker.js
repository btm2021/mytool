import { parentPort, workerData } from 'worker_threads';
import { OHLCVDatabase } from '../core/db.js';
import { BinanceFutureDataSource } from '../datasources/binance_future.js';
import { BybitFutureDataSource } from '../datasources/bybit_future.js';
import { OKXFutureDataSource } from '../datasources/okx_future.js';
import { MINUTE_MS, TIMEFRAME_1M } from '../core/constants.js';

const { exchangeName, config } = workerData;

let dataSource = null;
let db = null;
let queue = [];
let batchTimer = null;
let currentSymbols = config.symbols || [];
let heartbeatTimer = null;
let lastCpuUsage = process.cpuUsage();

function log(message, type = 'info') {
    parentPort.postMessage({
        type: 'log',
        level: type,
        message: `[${exchangeName}] ${message}`
    });
}

function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    heartbeatTimer = setInterval(() => {
        const currentCpuUsage = process.cpuUsage(lastCpuUsage);
        const memUsage = process.memoryUsage();

        parentPort.postMessage({
            type: 'heartbeat',
            data: {
                worker: exchangeName,
                cpuUser: (currentCpuUsage.user / 1000).toFixed(2), // Convert to ms
                cpuSystem: (currentCpuUsage.system / 1000).toFixed(2), // Convert to ms
                rss: memUsage.rss,
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                timestamp: Date.now()
            }
        });

        lastCpuUsage = process.cpuUsage();
    }, 3000); // Send heartbeat every 3 seconds
}

async function initialize() {
    try {
        db = new OHLCVDatabase(config.databasePath);

        switch (exchangeName) {
            case 'binance_futures':
                dataSource = new BinanceFutureDataSource();
                break;
            case 'bybit_futures':
                dataSource = new BybitFutureDataSource();
                break;
            case 'okx_futures':
                dataSource = new OKXFutureDataSource();
                break;
            default:
                throw new Error(`Unknown exchange: ${exchangeName}`);
        }

        dataSource.setLogger({ success: (m) => log(m, 'success'), warn: (m) => log(m, 'warn'), error: (m) => log(m, 'error'), info: (m) => log(m, 'info') });

        await dataSource.initialize();
        log('Worker initialized', 'success');

        // Start heartbeat monitoring
        startHeartbeat();

        await bootstrap();
        await startRealtime();
    } catch (error) {
        log(`Initialization failed: ${error.message}`, 'error');
    }
}

async function bootstrap() {
    log('Starting bootstrap...', 'info');
    sendProgress('bootstrap', 'Starting bootstrap...', 0);

    for (let i = 0; i < currentSymbols.length; i++) {
        const symbol = currentSymbols[i];
        const progress = Math.round(((i + 1) / currentSymbols.length) * 100);
        sendProgress('bootstrap', `Loading ${symbol}... (${i + 1}/${currentSymbols.length})`, progress);
        await loadHistoricalData(symbol, config.bootstrapLoad);
    }

    sendProgress('completed', 'Bootstrap completed', 100);
    log('Bootstrap completed', 'success');
}

async function loadHistoricalData(symbol, totalCandles) {
    const lastTs = db.getLastTimestamp(exchangeName, symbol, TIMEFRAME_1M);
    const now = Date.now();

    if (lastTs) {
        const existingCount = db.getCount(exchangeName, symbol, TIMEFRAME_1M);
        const gap = now - lastTs;
        const gapMinutes = Math.floor(gap / MINUTE_MS);

        if (gapMinutes <= 1) {
            log(`${symbol}: Up to date (${existingCount} candles)`, 'info');
            return;
        }

        log(`${symbol}: Fetching ${gapMinutes} missing candles...`, 'info');

        const candles = await fetchMissingCandles(symbol, lastTs + MINUTE_MS, now);
        if (candles.length > 0) {
            db.insertBatch(candles);
            log(`${symbol}: Added ${candles.length} candles`, 'success');
        }
        return;
    }

    log(`${symbol}: Loading ${totalCandles} candles...`, 'info');

    const batchSize = 1500;
    const batches = Math.ceil(totalCandles / batchSize);
    let endTime = now;
    let loaded = 0;

    for (let i = 0; i < batches; i++) {
        const startTime = endTime - (batchSize * MINUTE_MS);
        const candles = await dataSource.backfill(symbol, startTime, endTime, batchSize);

        if (candles.length > 0) {
            db.insertBatch(candles);
            loaded += candles.length;
            endTime = candles[0].ts - MINUTE_MS;
            
            const progress = Math.round((loaded / totalCandles) * 100);
            sendProgress('loading', `${symbol}: ${loaded}/${totalCandles} loaded`, progress);
            log(`${symbol}: ${loaded}/${totalCandles} loaded`, 'info');
        }
    }
}

async function fetchMissingCandles(symbol, fromTs, toTs) {
    const allCandles = [];
    let currentStart = fromTs;

    while (currentStart < toTs) {
        const candles = await dataSource.backfill(symbol, currentStart, toTs, 1500);
        if (candles.length === 0) break;

        allCandles.push(...candles);
        currentStart = candles[candles.length - 1].ts + MINUTE_MS;
    }

    return allCandles;
}

async function startRealtime() {
    await dataSource.connect();

    setTimeout(() => {
        dataSource.subscribe(currentSymbols, TIMEFRAME_1M);
    }, 2000);

    dataSource.onMessage((candle) => {
        parentPort.postMessage({
            type: 'candle',
            data: candle
        });

        if (candle.closed) {
            queue.push(candle);
            log(`🟢 ${candle.symbol} closed at ${candle.close.toFixed(2)}`, 'success');
        }
    });

    startBatchWriter();
}

function startBatchWriter() {
    if (batchTimer) clearInterval(batchTimer);

    batchTimer = setInterval(() => {
        if (queue.length > 0) {
            const batch = [...queue];
            queue = [];

            db.insertBatch(batch);
            log(`Wrote ${batch.length} candles to DB`, 'info');

            for (const symbol of currentSymbols) {
                db.cleanupOldData(exchangeName, symbol, TIMEFRAME_1M, config.maxRecords);
            }
        }
    }, config.batchInterval);
}

async function reloadSymbols(newSymbols) {
    try {
        // Step 1: Stop current subscriptions
        sendProgress('stopping', 'Stopping current subscriptions...');
        await dataSource.close();
        if (batchTimer) clearInterval(batchTimer);
        log('Stopped current subscriptions', 'info');

        // Step 2: Update symbols list
        sendProgress('updating', 'Updating symbols list...');
        const oldSymbols = [...currentSymbols];
        currentSymbols = newSymbols;

        // Find new symbols that need backfill
        const newSymbolsToLoad = newSymbols.filter(s => !oldSymbols.includes(s));
        const removedSymbols = oldSymbols.filter(s => !newSymbols.includes(s));

        log(`Added: ${newSymbolsToLoad.length}, Removed: ${removedSymbols.length}`, 'info');

        // Step 3: Check and backfill missing data
        sendProgress('checking', 'Checking OHLCV data...');
        await checkAndBackfillSymbols(newSymbols);

        // Step 4: Subscribe to all symbols
        sendProgress('subscribing', 'Subscribing to realtime data...');
        await startRealtime();

        sendProgress('completed', 'Symbols reloaded successfully');
        log('Symbols reloaded successfully', 'success');
    } catch (error) {
        sendProgress('error', `Failed to reload: ${error.message}`);
        log(`Reload failed: ${error.message}`, 'error');
        throw error;
    }
}

async function checkAndBackfillSymbols(symbols) {
    for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        const progress = Math.round(((i + 1) / symbols.length) * 100);

        sendProgress('backfilling', `Checking ${symbol}... (${i + 1}/${symbols.length})`, progress);

        const count = db.getCount(exchangeName, symbol, TIMEFRAME_1M);

        if (count === 0) {
            // New symbol, need full backfill
            log(`Backfilling ${symbol} (new symbol)`, 'info');
            await loadHistoricalData(symbol, config.bootstrapLoad);
        } else if (count < config.bootstrapLoad) {
            // Incomplete data, backfill more
            const needed = config.bootstrapLoad - count;
            log(`Backfilling ${symbol} (need ${needed} more candles)`, 'info');
            await loadHistoricalData(symbol, needed);
        } else {
            // Check for gaps
            const lastTs = db.getLastTimestamp(exchangeName, symbol, TIMEFRAME_1M);
            const now = Date.now();
            const gapMinutes = Math.floor((now - lastTs) / MINUTE_MS);

            if (gapMinutes > 5) {
                log(`Filling gap for ${symbol} (${gapMinutes} minutes)`, 'info');
                await loadHistoricalData(symbol, gapMinutes);
            }
        }
    }
}

function sendProgress(status, message, progress = 0) {
    parentPort.postMessage({
        type: 'reload_progress',
        data: {
            exchange: exchangeName,
            status,
            message,
            progress,
            timestamp: Date.now()
        }
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

parentPort.on('message', async (message) => {
    log(`Received message: ${message.type}`, 'info');

    if (message.type === 'stop') {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (batchTimer) clearInterval(batchTimer);
        if (dataSource) await dataSource.close();
        if (db) db.close();
        process.exit(0);
    } else if (message.type === 'reload_symbols') {
        log(`Reloading with ${message.symbols.length} symbols`, 'info');
        await reloadSymbols(message.symbols);
    }
});

initialize();
