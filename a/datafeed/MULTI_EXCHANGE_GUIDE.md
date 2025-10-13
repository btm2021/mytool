# 🌐 Multi-Exchange Support Guide

## 📊 Supported Exchanges

### 1. **Binance Futures** ✅
- **Type**: USDT Perpetual Futures
- **WebSocket**: `wss://fstream.binance.com/ws`
- **REST API**: `https://fapi.binance.com/fapi/v1`
- **Symbols**: 500+ USDT pairs
- **Volume Metric**: Quote Volume (USDT)

### 2. **Bybit Futures** ✅
- **Type**: USDT Perpetual Futures (Linear)
- **WebSocket**: `wss://stream.bybit.com/v5/public/linear`
- **REST API**: `https://api.bybit.com/v5`
- **Symbols**: 300+ USDT pairs
- **Volume Metric**: Turnover 24h (USDT)

### 3. **OKX Futures** ✅
- **Type**: USDT Perpetual Swaps
- **WebSocket**: `wss://ws.okx.com:8443/ws/v5/public`
- **REST API**: `https://www.okx.com/api/v5`
- **Symbols**: 200+ USDT-SWAP pairs
- **Volume Metric**: Volume in Currency 24h

## 🚀 Quick Start

### Enable an Exchange

1. **Via Config File** (`config.json`):
```json
{
  "exchanges": {
    "binance_futures": {
      "symbols": ["BTCUSDT", "ETHUSDT"],
      "enabled": true
    },
    "bybit_futures": {
      "symbols": ["BTCUSDT", "ETHUSDT"],
      "enabled": true
    },
    "okx_futures": {
      "symbols": ["BTC-USDT-SWAP", "ETH-USDT-SWAP"],
      "enabled": true
    }
  }
}
```

2. **Via Symbols Manager UI**:
   - Click **SYMBOLS** button
   - Select exchange tab (BINANCE / BYBIT / OKX)
   - Add symbols to whitelist
   - Click **SAVE**

### Symbol Format

| Exchange | API Format | Storage Format | Example |
|----------|------------|----------------|---------|
| Binance | `{BASE}USDT` | `{BASE}USDT` | `BTCUSDT` |
| Bybit | `{BASE}USDT` | `{BASE}USDT` | `BTCUSDT` |
| OKX | `{BASE}-USDT-SWAP` | `{BASE}USDT` | `BTC-USDT-SWAP` → `BTCUSDT` |

**Note**: OKX symbols are automatically converted:
- **UI/Config**: `BTCUSDT` (normalized)
- **API Calls**: `BTC-USDT-SWAP` (OKX format)
- **Database**: `BTCUSDT` (normalized)

## 🏗️ Architecture

### DataSource Classes

```
DataSourceBase (Abstract)
├── BinanceFutureDataSource
├── BybitFutureDataSource
└── OKXFutureDataSource
```

Each datasource implements:
- `connect()` - WebSocket connection
- `subscribe(symbols, interval)` - Subscribe to streams
- `backfill(symbol, fromTs, toTs, limit)` - Historical data
- `normalize(raw)` - Convert to standard format
- `onMessage(callback)` - Handle incoming data

### Standard Candle Format

All exchanges normalize to:
```javascript
{
  symbol: "BTCUSDT",
  exchange: "binance_futures",
  interval: "1m",
  ts: 1234567890000,
  open: 50000.0,
  high: 50100.0,
  low: 49900.0,
  close: 50050.0,
  volume: 123.45,
  closed: true
}
```

## 📡 WebSocket Protocols

### Binance
```javascript
// Subscribe
{
  "method": "SUBSCRIBE",
  "params": ["btcusdt@kline_1m"],
  "id": 1
}

// Message
{
  "e": "kline",
  "k": {
    "s": "BTCUSDT",
    "i": "1m",
    "t": 1234567890000,
    "o": "50000",
    "h": "50100",
    "l": "49900",
    "c": "50050",
    "v": "123.45",
    "x": true
  }
}
```

### Bybit
```javascript
// Subscribe
{
  "op": "subscribe",
  "args": ["kline.1.BTCUSDT"]
}

// Message
{
  "topic": "kline.1.BTCUSDT",
  "data": [{
    "start": 1234567890000,
    "open": "50000",
    "high": "50100",
    "low": "49900",
    "close": "50050",
    "volume": "123.45",
    "confirm": true
  }]
}
```

### OKX
```javascript
// Subscribe
{
  "op": "subscribe",
  "args": [{
    "channel": "candle1m",
    "instId": "BTC-USDT-SWAP"
  }]
}

// Message
{
  "arg": {
    "channel": "candle1m",
    "instId": "BTC-USDT-SWAP"
  },
  "data": [[
    "1234567890000",  // ts
    "50000",          // open
    "50100",          // high
    "49900",          // low
    "50050",          // close
    "123.45",         // volume
    "...",
    "...",
    "1"               // confirm (1=closed)
  ]]
}
```

## 🔄 Symbol Normalization

### Why Normalize?
Different exchanges use different symbol formats. We normalize to a common format for:
- **Consistency** - Same symbol name across exchanges
- **Simplicity** - Users don't need to remember different formats
- **Comparison** - Easy to compare same asset across exchanges

### OKX Symbol Conversion

**Automatic Conversion:**
```javascript
// User inputs: BTCUSDT
// ↓
// OKX DataSource converts to: BTC-USDT-SWAP
// ↓
// API calls use: BTC-USDT-SWAP
// ↓
// Data stored as: BTCUSDT
```

**Implementation:**
```javascript
// In okx_future.js
normalizeSymbol(symbol) {
    if (symbol.endsWith('USDT')) {
        const base = symbol.replace('USDT', '');
        return `${base}-USDT-SWAP`;
    }
    return symbol;
}

denormalizeSymbol(symbol) {
    if (symbol.includes('-USDT-SWAP')) {
        return symbol.replace('-USDT-SWAP', 'USDT');
    }
    return symbol;
}
```

### Benefits
- ✅ Users work with simple format: `BTCUSDT`
- ✅ System handles exchange-specific formats
- ✅ Database uses consistent format
- ✅ Easy to switch between exchanges

## 🔧 API Endpoints

### Fetch Symbols with Volume

**Binance:**
```bash
GET https://fapi.binance.com/fapi/v1/ticker/24hr
```

**Bybit:**
```bash
GET https://api.bybit.com/v5/market/tickers?category=linear
```

**OKX:**
```bash
GET https://www.okx.com/api/v5/market/tickers?instType=SWAP
```

### Historical Data (Backfill)

**Binance:**
```bash
GET https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT&interval=1m&limit=1000
```

**Bybit:**
```bash
GET https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=1&limit=1000
```

**OKX:**
```bash
GET https://www.okx.com/api/v5/market/candles?instId=BTC-USDT-SWAP&bar=1m&limit=100
```

## 💾 Database Storage

All exchanges share the same database schema:

```sql
CREATE TABLE ohlcv (
  exchange TEXT,      -- 'binance_futures', 'bybit_futures', 'okx_futures'
  symbol TEXT,        -- Exchange-specific format
  timeframe TEXT,     -- '1m', '5m', '15m', etc.
  ts INTEGER,         -- Unix timestamp (ms)
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume REAL,
  PRIMARY KEY(exchange, symbol, timeframe, ts)
);
```

## 🎯 Use Cases

### 1. Compare Prices Across Exchanges
```javascript
// Get BTC price from all exchanges
const binanceBTC = db.getOHLCV('binance_futures', 'BTCUSDT', '1m', 1);
const bybitBTC = db.getOHLCV('bybit_futures', 'BTCUSDT', '1m', 1);
const okxBTC = db.getOHLCV('okx_futures', 'BTC-USDT-SWAP', '1m', 1);
```

### 2. Arbitrage Opportunities
Monitor price differences between exchanges in real-time.

### 3. Volume Analysis
Compare trading volume across exchanges to find best liquidity.

### 4. Redundancy
If one exchange has issues, data from others continues flowing.

## ⚙️ Configuration

### Enable Multiple Exchanges

```json
{
  "exchanges": {
    "binance_futures": {
      "symbols": ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
      "enabled": true
    },
    "bybit_futures": {
      "symbols": ["BTCUSDT", "ETHUSDT"],
      "enabled": true
    },
    "okx_futures": {
      "symbols": ["BTC-USDT-SWAP"],
      "enabled": false
    }
  }
}
```

### Per-Exchange Settings

Each exchange can have:
- Different symbol lists
- Independent enable/disable
- Same intervals (shared globally)

## 🔄 Data Flow

```
Exchange WebSocket
    ↓
DataSource.normalize()
    ↓
Standard Format
    ↓
Collector.onMessage()
    ↓
Database (with exchange tag)
    ↓
API Server
    ↓
WebSocket Broadcast
    ↓
Frontend Display
```

## 📊 UI Features

### Tabs
- Each exchange has its own tab
- Switch between exchanges instantly
- Independent symbol management

### Symbol Display
```
┌─────────────────────────────────────┐
│ [BINANCE] [BYBIT] [OKX]             │
├─────────────────────────────────────┤
│ WHITELIST (3)    │ AVAILABLE (500)  │
│ BTCUSDT          │ SOLUSDT           │
│ ETHUSDT          │ Vol: 2.5B  [ADD]  │
│ BNBUSDT          │ ADAUSDT           │
│                  │ Vol: 850M  [ADD]  │
└─────────────────────────────────────┘
```

### Status Bar
Shows active exchanges and total symbols:
```
WS: ON | EX: binance_futures,bybit_futures | SYM: 5
```

## 🛡️ Error Handling

### Exchange-Specific Errors
- Connection failures → Auto-reconnect
- API rate limits → Exponential backoff
- Invalid symbols → Skip and log error
- Data format changes → Normalize safely

### Graceful Degradation
If one exchange fails:
- Other exchanges continue working
- UI shows exchange status
- Logs indicate which exchange has issues

## 🚀 Performance

### Resource Usage per Exchange
- **Memory**: ~50MB per exchange
- **CPU**: ~5% per exchange (idle)
- **Network**: ~1-5 KB/s per symbol
- **Database**: Shared, no extra overhead

### Optimization Tips
1. Enable only exchanges you need
2. Limit symbols per exchange
3. Use same symbols across exchanges for comparison
4. Monitor system resources

## 🔮 Future Enhancements

- [ ] Binance Spot
- [ ] Coinbase
- [ ] Kraken
- [ ] Bitget
- [ ] Gate.io
- [ ] Cross-exchange arbitrage alerts
- [ ] Price difference charts
- [ ] Volume comparison charts
- [ ] Exchange health monitoring
- [ ] Auto-failover to backup exchange

## 📝 Adding New Exchange

### 1. Create DataSource
```javascript
// src/datasources/new_exchange.js
export class NewExchangeDataSource extends DataSourceBase {
  constructor() {
    super();
    this.exchangeName = 'new_exchange';
  }
  
  connect() { /* WebSocket connection */ }
  subscribe(symbols, interval) { /* Subscribe */ }
  backfill(symbol, fromTs, toTs, limit) { /* Historical */ }
  normalize(raw) { /* Convert to standard format */ }
}
```

### 2. Update Server
```javascript
// src/api/server.js
async fetchNewExchangeSymbols() {
  // Fetch symbols with volume
  // Sort by volume
  // Return formatted list
}
```

### 3. Update Config
```json
{
  "exchanges": {
    "new_exchange": {
      "symbols": [],
      "enabled": false
    }
  }
}
```

### 4. Update UI
```html
<button class="tab-btn" data-exchange="new_exchange">NEW EXCHANGE</button>
```

### 5. Update Index
```javascript
case 'new_exchange':
  dataSource = new NewExchangeDataSource();
  break;
```

## 🐛 Troubleshooting

### Exchange Not Connecting
- Check WebSocket URL
- Verify API endpoints
- Check firewall/proxy settings
- Review exchange status page

### Symbols Not Loading
- Verify exchange API is accessible
- Check symbol format (BTCUSDT vs BTC-USDT-SWAP)
- Review API response in logs
- Check rate limits

### Data Not Saving
- Verify exchange name in config
- Check database permissions
- Review collector logs
- Ensure symbols are valid

## 💡 Best Practices

1. **Start with one exchange** - Test thoroughly before adding more
2. **Use common symbols** - BTC, ETH work on all exchanges
3. **Monitor resources** - Each exchange adds overhead
4. **Check symbol formats** - Different exchanges use different formats
5. **Enable gradually** - Add exchanges one at a time
6. **Backup config** - Before making changes
7. **Test in dev** - Before production deployment

## 📚 Resources

- [Binance Futures API](https://binance-docs.github.io/apidocs/futures/en/)
- [Bybit API](https://bybit-exchange.github.io/docs/v5/intro)
- [OKX API](https://www.okx.com/docs-v5/en/)
