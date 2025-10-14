import { parentPort, workerData } from 'worker_threads';

const { workerId } = workerData;

let heartbeatTimer = null;
let lastCpuUsage = process.cpuUsage();

function log(message, type = 'info') {
    parentPort.postMessage({
        type: 'log',
        level: type,
        message: `[Main Worker] ${message}`
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
                worker: 'main',
                cpuUser: (currentCpuUsage.user / 1000).toFixed(2),
                cpuSystem: (currentCpuUsage.system / 1000).toFixed(2),
                rss: memUsage.rss,
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                timestamp: Date.now()
            }
        });
        
        lastCpuUsage = process.cpuUsage();
    }, 3000);
}

// Lắng nghe commands từ parent
parentPort.on('message', async (message) => {
    switch (message.type) {
        case 'restart':
            log('Processing restart command...', 'warn');
            parentPort.postMessage({ type: 'execute_restart' });
            break;
            
        case 'reload_symbols':
            log(`Processing reload symbols for ${message.exchange}...`, 'warn');
            parentPort.postMessage({ 
                type: 'execute_reload_symbols',
                exchange: message.exchange,
                symbols: message.symbols
            });
            break;
            
        case 'delete_database':
            log('Processing delete database command...', 'warn');
            parentPort.postMessage({ type: 'execute_delete_database' });
            break;
            
        case 'get_status':
            log('Processing get status command...', 'info');
            parentPort.postMessage({ type: 'execute_get_status' });
            break;
            
        case 'stop':
            log('Stopping main worker...', 'warn');
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            process.exit(0);
            break;
            
        default:
            log(`Unknown command: ${message.type}`, 'warn');
    }
});

log('Main worker initialized', 'success');
startHeartbeat();
