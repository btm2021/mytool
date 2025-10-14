import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config/config.js';
import { SystemMonitor } from './core/system_monitor.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// GLOBAL STATE - Quản lý trạng thái toàn cục của hệ thống
// ============================================================================
let mainWorker = null;              // Worker xử lý commands
let serverWorker = null;            // Worker HTTP server & WebSocket
let datasourceWorkers = new Map();  // Map<exchangeName, Worker> - Workers thu thập dữ liệu
let workerStatus = new Map();       // Map<workerName, status> - Trạng thái các workers
let systemMonitor = null;           // System monitor instance
let workerMetrics = new Map();      // Map<workerName, metrics> - Metrics của workers

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
        success: '\x1b[32m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
        info: '\x1b[36m'
    };
    const reset = '\x1b[0m';
    const color = colors[type] || colors.info;
    console.log(`${color}[${timestamp}] ${message}${reset}`);
}

function logMessage(message) {
    const { level, message: text } = message;
    log(text, level);
}

function broadcastToClients(data) {
    if (serverWorker) {
        serverWorker.postMessage({
            type: 'broadcast',
            data
        });
    }
}

function updateServerWorkerStatus() {
    if (serverWorker) {
        const status = {};
        for (const [name, info] of workerStatus) {
            status[name] = info;
        }
        serverWorker.postMessage({
            type: 'update_status',
            status
        });
    }
}

function broadcastWorkerMetrics() {
    if (serverWorker) {
        const metrics = {};
        for (const [name, data] of workerMetrics) {
            metrics[name] = data;
        }
        serverWorker.postMessage({
            type: 'worker_metrics',
            data: metrics
        });
    }
}

// ============================================================================
// SYSTEM LIFECYCLE - Khởi động và dừng hệ thống
// ============================================================================
async function startSystem() {
    log('=== Starting Multi-Threaded System ===', 'success');
    
    // 1. Load configuration
    config.reload();
    log('Configuration loaded', 'info');

    // 2. Start Main Worker (Command Handler)
    await startMainWorker();

    // 3. Start HTTP Server Worker
    await startServerWorker();

    // 4. Start Datasource Workers (theo config)
    await startAllEnabledExchanges();

    // 5. Start System Monitor
    await startSystemMonitor();
    
    log('=== System Started Successfully ===', 'success');
}

async function startMainWorker() {
    log('Starting main worker...', 'info');
    
    mainWorker = new Worker(join(__dirname, 'workers', 'main_worker.js'), {
        workerData: { workerId: 'main' }
    });

    mainWorker.on('message', handleMainWorkerMessage);
    mainWorker.on('error', (err) => {
        log(`Main worker error: ${err.message}`, 'error');
        setTimeout(() => {
            log('Auto-restarting main worker after error...', 'warn');
            startMainWorker();
        }, 5000);
    });
    mainWorker.on('exit', (code) => {
        if (code !== 0) {
            log(`Main worker stopped with exit code ${code}`, 'error');
            setTimeout(() => {
                log('Auto-restarting main worker after crash...', 'warn');
                startMainWorker();
            }, 5000);
        }
    });

    workerStatus.set('main', { status: 'running', type: 'main' });
    log('Main worker started', 'success');
}

async function startServerWorker() {
    log('Starting server worker...', 'info');
    
    serverWorker = new Worker(join(__dirname, 'workers', 'server_worker.js'), {
        workerData: {
            port: config.port,
            dbPath: config.databasePath
        }
    });

    serverWorker.on('message', handleServerMessage);
    serverWorker.on('error', (err) => {
        log(`Server worker error: ${err.message}`, 'error');
        setTimeout(() => {
            log('Auto-restarting server worker after error...', 'warn');
            startServerWorker();
        }, 5000);
    });
    serverWorker.on('exit', (code) => {
        if (code !== 0) {
            log(`Server worker stopped with exit code ${code}`, 'error');
            setTimeout(() => {
                log('Auto-restarting server worker after crash...', 'warn');
                startServerWorker();
            }, 5000);
        }
    });

    workerStatus.set('server', { status: 'running', type: 'server', port: config.port });
    log(`Server worker started on port ${config.port}`, 'success');
}

async function startAllEnabledExchanges() {
    log('Starting exchange workers...', 'info');
    
    const exchanges = Object.entries(config.exchanges);
    let enabledCount = 0;
    
    for (const [exchangeName, exchangeConfig] of exchanges) {
        if (exchangeConfig.enabled) {
            await startExchangeWorker(exchangeName);
            enabledCount++;
        } else {
            log(`Skipping ${exchangeName} (disabled in config)`, 'info');
        }
    }

    if (enabledCount === 0) {
        log('⚠️  No exchanges enabled in config', 'warn');
    } else {
        log(`Started ${enabledCount} exchange worker(s)`, 'success');
    }
    
    updateServerWorkerStatus();
}

async function startSystemMonitor() {
    log('Starting system monitor...', 'info');
    
    systemMonitor = new SystemMonitor(config);
    systemMonitor.start((message) => {
        if (serverWorker) {
            serverWorker.postMessage({
                type: 'system_info',
                data: message.data
            });
        }
    }, 5000);
    
    log('System monitor started', 'success');
}

async function stopSystem() {
    log('=== Stopping System ===', 'warn');

    // 1. Stop system monitor
    if (systemMonitor) {
        systemMonitor.stop();
        systemMonitor = null;
        log('System monitor stopped', 'info');
    }

    // 2. Stop all exchange workers
    const exchanges = Array.from(datasourceWorkers.keys());
    for (const exchangeName of exchanges) {
        await stopExchangeWorker(exchangeName);
    }

    log('=== System Stopped ===', 'success');
}

async function restartSystem() {
    log('=== RESTARTING SYSTEM ===', 'warn');

    try {
        await stopSystem();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Reload config before restart
        config.reload();
        
        await startAllEnabledExchanges();
        await startSystemMonitor();
        
        log('=== SYSTEM RESTARTED SUCCESSFULLY ===', 'success');
        
        broadcastToClients({
            type: 'log',
            data: {
                message: 'System restarted successfully',
                type: 'connected',
                timestamp: new Date().toISOString()
            }
        });
    } catch (err) {
        log(`Restart failed: ${err.message}`, 'error');
    }
}

// ============================================================================
// MESSAGE HANDLERS - Xử lý messages từ các workers
// ============================================================================
function handleMainWorkerMessage(message) {
    switch (message.type) {
        case 'log':
            logMessage(message);
            break;
        case 'execute_restart':
            restartSystem();
            break;
        case 'execute_reload_symbols':
            reloadSymbols(message.exchange, message.symbols);
            break;
        case 'execute_delete_database':
            deleteDatabaseAndRestart();
            break;
        case 'execute_get_status':
            updateServerWorkerStatus();
            break;
        case 'heartbeat':
            workerMetrics.set(message.data.worker, message.data);
            broadcastWorkerMetrics();
            break;
    }
}

function handleServerMessage(message) {
    switch (message.type) {
        case 'log':
            logMessage(message);
            break;
        case 'restart':
            if (mainWorker) mainWorker.postMessage({ type: 'restart' });
            break;
        case 'reload_symbols':
            if (mainWorker) {
                mainWorker.postMessage({ 
                    type: 'reload_symbols',
                    exchange: message.exchange,
                    symbols: message.symbols
                });
            }
            break;
        case 'update_exchange_symbols':
            // Update symbols for an exchange
            reloadSymbols(message.exchange, message.symbols);
            break;
        case 'toggle_exchange':
            toggleExchange(message.exchange, message.enabled);
            break;
        case 'update_config':
            updateConfig(message.data);
            break;
        case 'delete-database':
            if (mainWorker) mainWorker.postMessage({ type: 'delete_database' });
            break;
        case 'get_status':
            updateServerWorkerStatus();
            break;
        case 'command':
            handleCommand(message.data);
            break;
        case 'heartbeat':
            workerMetrics.set(message.data.worker, message.data);
            broadcastWorkerMetrics();
            break;
    }
}

function handleDatasourceMessage(exchangeName, message) {
    switch (message.type) {
        case 'log':
            logMessage(message);
            break;
        case 'candle':
            broadcastToClients({
                type: 'candle',
                data: {
                    exchange: exchangeName,
                    symbol: message.data.symbol,
                    interval: message.data.interval,
                    o: message.data.open,
                    h: message.data.high,
                    l: message.data.low,
                    c: message.data.close,
                    v: message.data.volume,
                    closed: message.data.closed
                }
            });
            break;
        case 'reload_progress':
            // Broadcast reload progress to clients via WebSocket
            broadcastToClients({
                type: 'reload_progress',
                data: message.data
            });
            break;
        case 'heartbeat':
            workerMetrics.set(message.data.worker, message.data);
            broadcastWorkerMetrics();
            break;
    }
}

// ============================================================================
// COMMAND HANDLER - Xử lý commands từ terminal
// ============================================================================
function handleCommand(command) {
    log(`Executing command: ${command}`, 'info');
    
    const parts = command.trim().toLowerCase().split(' ');
    const cmd = parts[0];
    
    switch (cmd) {
        case 'status':
            const status = {
                workers: Object.fromEntries(workerStatus),
                datasources: Array.from(datasourceWorkers.keys()),
                timestamp: Date.now()
            };
            broadcastToClients({
                type: 'command_response',
                data: { message: JSON.stringify(status, null, 2) }
            });
            break;
            
        case 'list':
            const exchanges = Array.from(datasourceWorkers.keys());
            broadcastToClients({
                type: 'command_response',
                data: { message: `Active exchanges: ${exchanges.join(', ')}` }
            });
            break;
            
        case 'reload':
            if (parts[1]) {
                const exchange = parts[1];
                if (datasourceWorkers.has(exchange)) {
                    const symbols = config.exchanges[exchange]?.symbols || [];
                    reloadSymbols(exchange, symbols);
                    broadcastToClients({
                        type: 'command_response',
                        data: { message: `Reloading ${exchange}...` }
                    });
                } else {
                    broadcastToClients({
                        type: 'command_response',
                        data: { error: `Exchange ${exchange} not found` }
                    });
                }
            } else {
                broadcastToClients({
                    type: 'command_response',
                    data: { error: 'Usage: reload <exchange>' }
                });
            }
            break;
            
        case 'clear':
            broadcastToClients({
                type: 'command_response',
                data: { message: 'Terminal cleared' }
            });
            break;
            
        case 'help':
            const helpText = `Available commands:
- status: Show system status
- list: List active exchanges
- reload <exchange>: Reload exchange symbols
- clear: Clear terminal
- help: Show this help`;
            broadcastToClients({
                type: 'command_response',
                data: { message: helpText }
            });
            break;
            
        default:
            broadcastToClients({
                type: 'command_response',
                data: { error: `Unknown command: ${cmd}. Type 'help' for available commands.` }
            });
    }
}

// ============================================================================
// EXCHANGE WORKER MANAGEMENT - Quản lý workers của từng exchange
// ============================================================================

/**
 * Toggle exchange enabled/disabled
 * @param {string} exchangeName - Tên exchange (binance_futures, bybit_futures, okx_futures)
 * @param {boolean} enabled - true = enable, false = disable
 */
async function toggleExchange(exchangeName, enabled) {
    log(`${enabled ? 'Enabling' : 'Disabling'} ${exchangeName}...`, 'warn');
    
    const isRunning = datasourceWorkers.has(exchangeName);
    
    if (enabled) {
        // ENABLE WORKFLOW:
        // 1. Update config
        config.updateExchangeEnabled(exchangeName, enabled);
        log(`Config updated: ${exchangeName}.enabled = true`, 'info');
        
        // 2. Start worker if not running
        if (!isRunning) {
            await startExchangeWorker(exchangeName);
        } else {
            log(`${exchangeName} worker is already running`, 'info');
        }
    } else {
        // DISABLE WORKFLOW:
        // 1. Stop worker if running
        if (isRunning) {
            await stopExchangeWorker(exchangeName);
        } else {
            log(`${exchangeName} worker is not running (already stopped)`, 'info');
        }
        
        // 2. Update config
        config.updateExchangeEnabled(exchangeName, enabled);
        log(`Config updated: ${exchangeName}.enabled = false`, 'info');
    }
    
    // 3. Update global state
    updateServerWorkerStatus();
    
    // 4. Broadcast to clients
    broadcastToClients({
        type: 'log',
        data: {
            message: `${exchangeName} ${enabled ? 'enabled' : 'disabled'} successfully`,
            type: 'validated',
            timestamp: new Date().toISOString()
        }
    });
    
    log(`${exchangeName} ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
}

/**
 * Reload symbols cho một exchange đang chạy
 * @param {string} exchangeName - Tên exchange
 * @param {Array} symbols - Danh sách symbols mới
 */
async function reloadSymbols(exchangeName, symbols) {
    log(`Reloading symbols for ${exchangeName}...`, 'warn');
    
    // 1. Update config first
    config.updateExchangeSymbols(exchangeName, symbols);
    log(`Config updated for ${exchangeName}`, 'info');
    
    const worker = datasourceWorkers.get(exchangeName);
    
    if (!worker) {
        log(`${exchangeName} worker is not running, skipping reload`, 'warn');
        
        // Broadcast to clients that config was updated
        broadcastToClients({
            type: 'log',
            data: {
                message: `${exchangeName} symbols updated in config (worker not running)`,
                type: 'info',
                timestamp: new Date().toISOString()
            }
        });
        return;
    }
    
    // 2. Send reload message to worker
    log(`Sending reload message to ${exchangeName} worker`, 'info');
    worker.postMessage({
        type: 'reload_symbols',
        symbols
    });
    
    // 3. Update global state
    const status = workerStatus.get(exchangeName);
    if (status) {
        status.symbols = symbols;
    }
    
    updateServerWorkerStatus();
    log(`Reload initiated for ${exchangeName}`, 'success');
}

/**
 * Start một exchange worker
 * @param {string} exchangeName - Tên exchange
 */
async function startExchangeWorker(exchangeName) {
    const exchangeConfig = config.exchanges[exchangeName];
    
    // Validate config
    if (!exchangeConfig) {
        log(`Cannot start ${exchangeName}: not found in config`, 'error');
        return;
    }
    
    // Check if already running
    if (datasourceWorkers.has(exchangeName)) {
        log(`${exchangeName} worker is already running`, 'warn');
        return;
    }
    
    log(`Starting ${exchangeName} worker...`, 'info');
    
    // 1. Create worker instance
    const worker = new Worker(join(__dirname, 'workers', 'datasource_worker.js'), {
        workerData: {
            exchangeName,
            config: {
                symbols: exchangeConfig.symbols || [],
                databasePath: config.databasePath,
                bootstrapLoad: config.bootstrapLoad,
                batchInterval: config.batchInterval,
                maxRecords: config.maxRecords
            }
        }
    });
    
    // 2. Setup event handlers
    worker.on('message', (message) => handleDatasourceMessage(exchangeName, message));
    worker.on('error', (err) => {
        log(`${exchangeName} worker error: ${err.message}`, 'error');
        // Auto-restart on error
        setTimeout(() => {
            log(`Auto-restarting ${exchangeName} worker after error...`, 'warn');
            startExchangeWorker(exchangeName);
        }, 5000);
    });
    worker.on('exit', (code) => {
        if (code !== 0) {
            log(`${exchangeName} worker exited with code ${code}`, 'error');
            // Auto-restart on crash
            datasourceWorkers.delete(exchangeName);
            workerStatus.delete(exchangeName);
            updateServerWorkerStatus();
            
            setTimeout(() => {
                log(`Auto-restarting ${exchangeName} worker after crash...`, 'warn');
                startExchangeWorker(exchangeName);
            }, 5000);
        } else {
            // Normal exit, cleanup only
            datasourceWorkers.delete(exchangeName);
            workerStatus.delete(exchangeName);
            updateServerWorkerStatus();
        }
    });
    
    // 3. Update global state
    datasourceWorkers.set(exchangeName, worker);
    workerStatus.set(exchangeName, { 
        status: 'running', 
        type: 'datasource',
        symbols: exchangeConfig.symbols || []
    });
    
    // 4. Update server worker status
    updateServerWorkerStatus();
    
    // 5. Broadcast to clients
    if (exchangeConfig.symbols && exchangeConfig.symbols.length > 0) {
        broadcastToClients({
            type: 'status',
            data: {
                exchange: exchangeName,
                symbols: exchangeConfig.symbols
            }
        });
    }
    
    log(`${exchangeName} worker started (${exchangeConfig.symbols?.length || 0} symbols)`, 'success');
}

/**
 * Stop một exchange worker
 * @param {string} exchangeName - Tên exchange
 */
async function stopExchangeWorker(exchangeName) {
    const worker = datasourceWorkers.get(exchangeName);
    
    if (!worker) {
        log(`${exchangeName} worker is not running`, 'warn');
        return;
    }
    
    log(`Stopping ${exchangeName} worker...`, 'info');
    
    // 1. Send stop signal to worker
    worker.postMessage({ type: 'stop' });
    
    // 2. Wait for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Cleanup global state
    datasourceWorkers.delete(exchangeName);
    workerStatus.delete(exchangeName);
    workerMetrics.delete(exchangeName);
    
    // 4. Update server worker status
    updateServerWorkerStatus();
    
    log(`${exchangeName} worker stopped`, 'success');
}

// ============================================================================
// CONFIG MANAGEMENT - Quản lý cấu hình
// ============================================================================

/**
 * Update config và restart system
 * @param {Object} data - Config data mới
 */
function updateConfig(data) {
    log('Updating configuration...', 'warn');
    
    // Update config file
    config.update(data);
    
    // Restart system to apply changes
    restartSystem();
}

// ============================================================================
// DATABASE MANAGEMENT - Quản lý database
// ============================================================================

/**
 * Delete database và restart system
 */
async function deleteDatabaseAndRestart() {
    log('=== DELETING DATABASE ===', 'warn');

    try {
        // 1. Stop all exchange workers
        await stopSystem();

        // 2. Stop server worker
        if (serverWorker) {
            serverWorker.postMessage({ type: 'stop' });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 3. Delete database files
        const dbPath = config.databasePath;
        
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            log(`Deleted: ${dbPath}`, 'success');
        }

        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;

        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

        log('=== DATABASE DELETED ===', 'success');

        // 4. Restart system
        await new Promise(resolve => setTimeout(resolve, 2000));
        await startSystem();

        log('=== SYSTEM RESTARTED WITH FRESH DATABASE ===', 'success');
    } catch (err) {
        log(`Delete database failed: ${err.message}`, 'error');
    }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
    log('=== OHLCV DataFeed System ===', 'info');
    log('Initializing...', 'info');
    
    // Start system
    await startSystem();

    // Graceful shutdown handler
    process.on('SIGINT', async () => {
        log('\n=== Shutting Down Gracefully ===', 'warn');
        
        // Stop all exchange workers
        await stopSystem();
        
        // Stop main worker
        if (mainWorker) {
            mainWorker.postMessage({ type: 'stop' });
        }
        
        // Stop server worker
        if (serverWorker) {
            serverWorker.postMessage({ type: 'stop' });
        }
        
        log('=== Shutdown Complete ===', 'success');
        process.exit(0);
    });
}

// Start application
main().catch(err => {
    console.error('[System] Fatal error:', err);
    process.exit(1);
});
