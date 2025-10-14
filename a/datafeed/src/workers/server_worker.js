import { parentPort, workerData } from 'worker_threads';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { OHLCVDatabase } from '../core/db.js';
import { setupDatabaseRoutes } from '../server/routes/database.routes.js';
import { setupExchangeRoutes } from '../server/routes/exchange.routes.js';
import { setupOHLCVRoutes } from '../server/routes/ohlcv.routes.js';
import { setupSystemRoutes } from '../server/routes/system.routes.js';
import { setupConfigRoutes } from '../server/routes/config.routes.js';
import { setupWebSocket, handleParentMessages } from '../server/websocket/handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { port, dbPath } = workerData;

const app = express();
let server = null;
let wss = null;
let db = null;
const workerStatus = {};
let heartbeatTimer = null;
let lastCpuUsage = process.cpuUsage();

function log(message, type = 'info') {
    parentPort.postMessage({
        type: 'log',
        level: type,
        message: `[Server] ${message}`
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
                worker: 'server',
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

// Middleware
app.use(cors());
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 9,
    threshold: 0
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, '../web')));

// Initialize database
db = new OHLCVDatabase(dbPath);

// Setup routes
setupDatabaseRoutes(app, db, log);
setupExchangeRoutes(app, parentPort, log);
setupOHLCVRoutes(app, db);
setupSystemRoutes(app, parentPort, workerStatus);
setupConfigRoutes(app, parentPort);

// Start HTTP server
server = app.listen(port, () => {
    log(`HTTP server started on port ${port}`, 'success');
    startHeartbeat();
});

// Setup WebSocket with compression
wss = new WebSocketServer({ 
    server,
    perMessageDeflate: {
        zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 9,
            level: 9
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 15,
        concurrencyLimit: 10,
        threshold: 0
    }
});
setupWebSocket(wss, parentPort, workerStatus, log);

// Handle messages from parent
parentPort.on('message', handleParentMessages(wss, workerStatus));

// Handle stop message
parentPort.on('message', (message) => {
    if (message.type === 'stop') {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (server) server.close();
        if (db) db.close();
        process.exit(0);
    }
});

log('Server worker initialized', 'success');
