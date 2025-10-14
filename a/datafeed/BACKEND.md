# Backend Documentation

## 🏗️ Overview

Multi-threaded Node.js backend using Worker Threads for parallel data collection from multiple cryptocurrency exchanges. SQLite database for storage, Express for HTTP API, and WebSocket for real-time updates.

## 📁 Structure

```
src/
├── config/
│   └── config.js              # Configuration management
├── core/
│   ├── constants.js           # Constants and enums
│   ├── db.js                  # SQLite database wrapper
│   └── system_monitor.js     # System metrics collector
├── datasources/
│   ├── datasource_base.js    # Base datasource class
│   ├── binance_future.js     # Binance implementation
│   ├── bybit_future.js       # Bybit implementation
│   └── okx_future.js         # OKX implementation
├── server/
│   ├── routes/
│   │   ├── config.routes.js  # Config endpoints
│   │   ├── database.routes.js # Database endpoints
│   │   ├── exchange.routes.js # Exchange endpoints
│   │   ├── ohlcv.routes.js   # OHLCV data endpoints
│   │   └── system.routes.js  # System endpoints
│   ├── services/
│   │   └── exchange.service.js # Exchange API calls
│   └── websocket/
│       └── handler.js        # WebSocket message handling
├── workers/
│   ├── main_worker.js        # Command handler worker
│   ├── server_worker.js      # HTTP/WebSocket worker
│   └── datasource_worker.js  # Exchange data worker
└── index_threaded.js         # Main entry point
```

## 🔧 Architecture

### Main Thread

**File**: `src/index_threaded.js`

**Responsibilities**:
- Start/stop workers
- Coordinate between workers
- Handle configuration updates
- Manage worker lifecycle
- Broadcast messages

**Workers**:
1. **Main Worker**: Command processing
2. **Server Worker**: HTTP + WebSocket server
3. **Datasource Workers**: One per exchange

### Worker Communication

```
Main Thread
    ↕ parentPort.postMessage()
Main Worker
    ↕ parentPort.postMessage()
Server Worker
    ↕ parentPort.postMessage()
Datasource Workers
```

## 🔄 Data Flow

### Startup Sequence

```
1. Load config.json
2. Start Main Worker
3. Start Server Worker
4. Start enabled Datasource Workers
5. Each worker:
   - Initialize exchange connection
   - Bootstrap historical data
   - Subscribe to real-time updates
6. Start System Monitor
```

### Real-time Data Flow

```
Exchange WebSocket
    ↓
Datasource Worker (normalize)
    ↓
In-memory Queue
    ↓
Batch Write (every 60s)
    ↓
SQLite Database
    ↓
Broadcast to Main Thread
    ↓
Server Worker
    ↓
WebSocket to Clients
```

## 📦 Core Modules

### 1. Configuration (config.js)

**Features**:
- Load from config.json
- Reload on demand
- Update and save
- Validate structure

**Methods**:
```javascript
config.reload()                          // Reload from file
config.getAll()                          // Get full config
config.updateExchangeSymbols(ex, syms)  // Update symbols
config.updateExchangeEnabled(ex, bool)  // Enable/disable
config.save()                            // Save to file
```

### 2. Database (db.js)

**Features**:
- SQLite wrapper
- Batch inserts
- Auto-cleanup old data
- Query optimization

**Schema**:
```sql
CREATE TABLE ohlcv (
  exchange TEXT,
  symbol TEXT,
  interval TEXT,
  timestamp INTEGER,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume REAL,
  closed INTEGER,
  PRIMARY KEY (exchange, symbol, interval, timestamp)
);

CREATE INDEX idx_lookup ON ohlcv(exchange, symbol, interval, timestamp);
```

**Methods**:
```javascript
db.insert(data)                          // Insert single candle
db.insertBatch(dataArray)                // Batch insert
db.getCandles(ex, sym, tf, from, to)    // Query candles
db.getLastTimestamp(ex, sym, tf)        // Get last timestamp
db.getCount(ex, sym, tf)                 // Count candles
db.cleanup(ex, sym, tf, maxRecords)     // Remove old data
```

### 3. System Monitor (system_monitor.js)

**Features**:
- CPU usage
- Memory usage
- Disk space
- Database size
- Uptime

**Metrics**:
```javascript
{
  cpu: { usage: 5.2, cores: 8 },
  memory: { usagePercent: 45.3, total: 16GB },
  disk: { free: 500GB, total: 1TB },
  database: { total: 150MB },
  process: { heapUsed: 200MB },
  uptime: 3600,
  platform: 'win32',
  arch: 'x64'
}
```

## 🔌 Datasources

### Base Class (datasource_base.js)

**Interface**:
```javascript
class DataSourceBase {
  async initialize()              // Setup exchange
  async connect()                 // Connect WebSocket
  async subscribe(symbols, tf)    // Subscribe to symbols
  async backfill(sym, from, to)   // Load historical data
  onMessage(callback)             // Set message handler
  async close()                   // Cleanup
}
```

### Exchange Implementations

#### Binance Futures (binance_future.js)

**Features**:
- CCXT Pro integration
- WebSocket OHLCV streaming
- Historical data backfill
- Rate limiting

**Symbol Format**: `BTCUSDT`

#### Bybit Futures (bybit_future.js)

**Features**:
- CCXT Pro integration
- WebSocket OHLCV streaming
- Historical data backfill

**Symbol Format**: `BTCUSDT`

#### OKX Futures (okx_future.js)

**Features**:
- CCXT Pro integration
- WebSocket OHLCV streaming
- Historical data backfill

**Symbol Format**: `BTCUSDT`

## 🌐 HTTP API

### Config Routes

```javascript
GET  /config                    // Get configuration
POST /config                    // Update configuration
```

### Exchange Routes

```javascript
GET  /exchanges                 // Get exchanges config
GET  /exchangeSymbols/:exchange // Get available symbols
POST /exchangeSymbols           // Update exchange symbols
POST /toggleExchange            // Enable/disable exchange
```

### OHLCV Routes

```javascript
GET /ohlcv/:exchange/:symbol/:interval
  ?from=timestamp&to=timestamp&limit=1000
```

### System Routes

```javascript
POST /restart                   // Restart application
POST /deleteDatabase            // Delete database
GET  /databaseSymbols           // Get symbols in DB
```

## 🔌 WebSocket API

### Client → Server

```javascript
{
  type: 'command',
  data: 'status | list | reload | clear | help'
}
```

### Server → Client

```javascript
// Candle update
{
  type: 'candle',
  data: {
    exchange: 'binance_futures',
    symbol: 'BTCUSDT',
    interval: '1m',
    o: 50000,
    h: 50100,
    l: 49900,
    c: 50050,
    v: 100.5,
    closed: true
  }
}

// Worker metrics
{
  type: 'worker_metrics',
  data: {
    binance_futures: {
      cpuUser: '15.20',
      heapUsed: 52428800,
      timestamp: 1234567890
    }
  }
}

// System info
{
  type: 'system_info',
  data: { /* system metrics */ }
}

// Reload progress
{
  type: 'reload_progress',
  data: {
    exchange: 'binance_futures',
    status: 'backfilling',
    message: 'Checking BTCUSDT... (1/10)',
    progress: 30
  }
}

// Log message
{
  type: 'log',
  data: {
    message: 'Worker started',
    type: 'success',
    timestamp: '2025-01-01T00:00:00.000Z'
  }
}
```

## 🔄 Worker Lifecycle

### Datasource Worker

**File**: `src/workers/datasource_worker.js`

**Lifecycle**:
```
1. Initialize
   - Create datasource instance
   - Load markets
   - Connect to exchange

2. Bootstrap
   - Load historical data
   - Fill gaps
   - Verify data integrity

3. Subscribe
   - Subscribe to WebSocket
   - Receive real-time updates
   - Queue candles

4. Batch Write
   - Every 60 seconds
   - Write queued candles
   - Cleanup old data

5. Heartbeat
   - Every 3 seconds
   - Send metrics to main thread
   - CPU, memory usage

6. Shutdown
   - Close WebSocket
   - Flush queue
   - Close database
```

**Messages**:
```javascript
// Incoming
{ type: 'stop' }                // Shutdown
{ type: 'reload_symbols', symbols: [...] }

// Outgoing
{ type: 'log', level: 'info', message: '...' }
{ type: 'candle', data: { ... } }
{ type: 'heartbeat', data: { ... } }
{ type: 'reload_progress', data: { ... } }
```

### Server Worker

**File**: `src/workers/server_worker.js`

**Responsibilities**:
- HTTP server (Express)
- WebSocket server (ws)
- Route handling
- Message broadcasting

**Lifecycle**:
```
1. Start HTTP server
2. Setup WebSocket server
3. Setup routes
4. Start heartbeat
5. Handle requests
6. Broadcast messages
```

### Main Worker

**File**: `src/workers/main_worker.js`

**Responsibilities**:
- Command processing
- Restart coordination
- Database deletion

## 🔧 Key Operations

### Adding Symbols

```
1. Client: POST /exchangeSymbols
2. Server Worker: Forward to Main Thread
3. Main Thread: reloadSymbols()
   - Update config.json
   - Send reload message to worker
4. Datasource Worker: reloadSymbols()
   - Stop subscriptions
   - Check for missing data
   - Backfill if needed
   - Subscribe to new symbols
5. Broadcast progress to clients
```

### Enabling Exchange

```
1. Client: POST /toggleExchange
2. Server Worker: Forward to Main Thread
3. Main Thread: toggleExchange()
   - Update config.json
   - Start worker if enabling
   - Stop worker if disabling
4. Update global state
5. Broadcast to clients
```

### Restarting System

```
1. Client: POST /restart
2. Server Worker: Forward to Main Worker
3. Main Worker: Forward to Main Thread
4. Main Thread: restartSystem()
   - Stop all datasource workers
   - Stop system monitor
   - Reload config
   - Start datasource workers
   - Start system monitor
5. Broadcast completion
```

## 📊 Performance

### Optimization Techniques

1. **Batch Writes**: Write every 60s instead of per-candle
2. **Worker Threads**: Parallel processing per exchange
3. **In-memory Queue**: Fast candle buffering
4. **Prepared Statements**: SQLite query optimization
5. **Index Optimization**: Fast lookups by timestamp

### Metrics

- **Throughput**: 1000+ candles/second
- **Latency**: <100ms exchange → database
- **Memory**: ~200MB per worker
- **CPU**: ~5% per worker
- **Database**: ~1MB per 10,000 candles

## 🛡️ Error Handling

### Retry Logic

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}
```

### Graceful Degradation

- Exchange down → Worker logs error, continues
- Database locked → Queue in memory, retry
- WebSocket disconnect → Auto-reconnect
- Worker crash → Auto-restart

## 🔍 Debugging

### Logging

```javascript
log(message, type) {
  // type: 'info' | 'success' | 'warn' | 'error'
  parentPort.postMessage({
    type: 'log',
    level: type,
    message: `[Worker] ${message}`
  });
}
```

### Monitoring

- Worker heartbeats every 3s
- System metrics every 5s
- Database size tracking
- Memory leak detection

## 📝 Configuration

### config.json

```json
{
  "exchanges": {
    "binance_futures": {
      "symbols": ["BTCUSDT", "ETHUSDT"],
      "enabled": true
    }
  },
  "intervals": ["1m"],
  "database_path": "./data/ohlcv.db",
  "batch_interval": 60000,
  "max_records": 100000,
  "bootstrap_load": 10000,
  "port": 3000
}
```

### Environment Variables

None required (all configuration in config.json)

## 🔗 Dependencies

- **ccxt**: Exchange API library (v4.5.10)
- **better-sqlite3**: SQLite database (v9.2.2)
- **express**: HTTP server (v4.18.2)
- **ws**: WebSocket server (v8.16.0)

## 🚀 Deployment

### Production Considerations

1. **Process Manager**: Use PM2 or similar
2. **Database Backup**: Regular SQLite backups
3. **Log Rotation**: Implement log rotation
4. **Monitoring**: Add external monitoring
5. **Resource Limits**: Set memory/CPU limits

### PM2 Example

```bash
pm2 start src/index_threaded.js --name ohlcv-datafeed
pm2 save
pm2 startup
```

## 📚 Resources

- [CCXT Documentation](https://docs.ccxt.com/)
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3)
- [Worker Threads](https://nodejs.org/api/worker_threads.html)
- [Express.js](https://expressjs.com/)
