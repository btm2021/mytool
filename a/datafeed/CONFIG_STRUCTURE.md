# Configuration Structure

## config.json

```json
{
  "exchanges": {
    "binance_futures": {
      "symbols": [...],
      "enabled": true
    },
    "bybit_futures": {
      "symbols": [...],
      "enabled": true
    },
    "okx_futures": {
      "symbols": [...],
      "enabled": true
    }
  },
  "intervals": ["1m"],
  "database_path": "./data/ohlcv.db",
  "batch_interval": 60000,
  "max_records": 200000,
  "bootstrap_load": 50000,
  "port": 3000,
  "cleanup_hour": 3,
  "cleanup_enabled": true,
  "client": {
    "realtime_update": true,
    "debug_log": false,
    "max_log_lines": 200
  }
}
```

## Server Settings

### batch_interval
- **Type:** Number (milliseconds)
- **Default:** 60000 (1 minute)
- **Description:** Time between database batch writes
- **Requires restart:** Yes

### max_records
- **Type:** Number
- **Default:** 200000
- **Description:** Maximum candles to keep per symbol
- **Requires restart:** Yes

### bootstrap_load
- **Type:** Number
- **Default:** 50000
- **Description:** Initial candles to load on startup
- **Requires restart:** Yes

### cleanup_hour
- **Type:** Number (0-23)
- **Default:** 3
- **Description:** Hour to run daily cleanup (3 = 3:00 AM)
- **Requires restart:** Yes

### port
- **Type:** Number
- **Default:** 3000
- **Description:** HTTP server port
- **Requires restart:** Yes

## Client Settings

### client.realtime_update
- **Type:** Boolean
- **Default:** true
- **Description:** Enable/disable realtime price updates and rendering
- **Requires restart:** No (saved to config.json, applied immediately)
- **Effect:** 
  - `true`: Show realtime prices with flash animations
  - `false`: Don't render realtime data (reduces CPU/GPU usage)

### client.debug_log
- **Type:** Boolean
- **Default:** false
- **Description:** Enable/disable debug logs
- **Requires restart:** No
- **Effect:**
  - `true`: Show all logs including debug messages
  - `false`: Show only important logs (closed candles, errors, warnings)

### client.max_log_lines
- **Type:** Number
- **Default:** 200
- **Range:** 50-1000
- **Description:** Maximum number of log lines to keep in terminal
- **Requires restart:** No

## Log Types

### Debug Logs (only shown when debug_log = true)
```
[binance_futures] BTCUSDT: 1500/50000 loaded
[okx_futures] Wrote 3 candles to DB
[bybit_futures] ETHUSDT: Up to date (50000 candles)
```

### Important Logs (always shown)
```
[okx_futures] 🟢 ETHUSDT closed at 4078.17
[binance_futures] 🟢 BTCUSDT closed at 67234.50
Connected to server
System restarted successfully
⚠️ Deleting database and restarting...
```

## API Endpoints

### GET /config
Returns current configuration

### POST /config
Save configuration (requires restart for server settings)

**Request body:**
```json
{
  "batch_interval": 60000,
  "max_records": 200000,
  "bootstrap_load": 50000,
  "cleanup_hour": 3,
  "port": 3000,
  "client": {
    "realtime_update": true,
    "debug_log": false,
    "max_log_lines": 200
  }
}
```

**Response:**
```json
{
  "success": true
}
```

## Usage

### Save Client Settings
1. Open Config Modal (CFG button)
2. Click "CLIENT SETTINGS" tab
3. Change settings
4. Click "SAVE CLIENT SETTINGS"
5. Settings applied immediately (no restart needed)

### Save Server Settings
1. Open Config Modal (CFG button)
2. Click "SERVER SETTINGS" tab
3. Change settings
4. Click "SAVE & RESTART"
5. Server restarts to apply changes

## Migration from localStorage

**Before:** Client settings were stored in localStorage
**After:** Client settings are stored in config.json on server

**Benefits:**
- Persistent across browsers
- Shared across devices
- Backed up with config.json
- Can be version controlled
- Easier to manage

## Performance Tips

### Reduce CPU/GPU Usage:
```json
{
  "client": {
    "realtime_update": false,
    "debug_log": false,
    "max_log_lines": 100
  }
}
```

### Debug Mode:
```json
{
  "client": {
    "realtime_update": true,
    "debug_log": true,
    "max_log_lines": 500
  }
}
```

### Production Mode:
```json
{
  "client": {
    "realtime_update": true,
    "debug_log": false,
    "max_log_lines": 200
  }
}
```
