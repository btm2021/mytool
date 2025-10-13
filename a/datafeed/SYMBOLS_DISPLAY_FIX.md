# 🔧 Symbols Display Fix

## 🐛 Problem

### Before Fix
- ❌ Symbols table chỉ hiển thị cho 1 exchange (Binance)
- ❌ Symbols bị lặp lại nhiều lần
- ❌ Không hiển thị symbols từ Bybit và OKX
- ❌ Exchange name chỉ hiển thị 1 exchange

### Root Cause
1. Server chỉ broadcast status 1 lần với tất cả symbols gộp chung
2. Frontend không track symbols theo từng exchange
3. Mỗi lần nhận status mới, table bị overwrite hoàn toàn

## ✅ Solution

### 1. **Multi-Exchange Status Broadcasting**

**Server Side:**
```javascript
// Broadcast status for EACH exchange separately
for (const [exchangeName, config] of Object.entries(exchanges)) {
    if (config.enabled && config.symbols.length > 0) {
        this.broadcast({
            type: 'status',
            data: {
                exchange: exchangeName,
                symbols: config.symbols
            }
        });
    }
}
```

### 2. **Frontend State Management**

**Track All Exchanges:**
```javascript
let allExchangeSymbols = new Map(); // Map<exchange, symbols[]>

function updateStatusBar(data) {
    if (data.exchange && data.symbols) {
        // Store symbols for this exchange
        allExchangeSymbols.set(data.exchange, data.symbols);
        
        // Update display
        updateSymbolsTableFromAll();
        updateExchangeStatus();
    }
}
```

### 3. **Unique Symbol Display**

**Merge and Deduplicate:**
```javascript
function updateSymbolsTableFromAll() {
    // Create unique symbol entries with their exchanges
    const symbolMap = new Map(); // Map<symbol, Set<exchange>>
    
    for (const [exchange, symbols] of allExchangeSymbols) {
        symbols.forEach(symbol => {
            if (!symbolMap.has(symbol)) {
                symbolMap.set(symbol, new Set());
            }
            symbolMap.get(symbol).add(exchange);
        });
    }
    
    // Display each symbol once with all its exchanges
    sortedSymbols.forEach(symbol => {
        const exchanges = Array.from(symbolMap.get(symbol));
        // Show: BTCUSDT | binance_futures, bybit_futures
    });
}
```

## 📊 Display Logic

### Before (Broken)
```
Status received: { exchange: 'binance_futures', symbols: ['BTC', 'ETH'] }
    ↓
Clear table
    ↓
Add BTC (binance_futures)
Add ETH (binance_futures)
    ↓
Status received: { exchange: 'bybit_futures', symbols: ['BTC', 'SOL'] }
    ↓
Clear table (loses Binance data!)
    ↓
Add BTC (bybit_futures)
Add SOL (bybit_futures)
```

### After (Fixed)
```
Status received: { exchange: 'binance_futures', symbols: ['BTC', 'ETH'] }
    ↓
Store: Map { 'binance_futures' => ['BTC', 'ETH'] }
    ↓
Rebuild table from all stored data
    ↓
Status received: { exchange: 'bybit_futures', symbols: ['BTC', 'SOL'] }
    ↓
Store: Map { 
    'binance_futures' => ['BTC', 'ETH'],
    'bybit_futures' => ['BTC', 'SOL']
}
    ↓
Rebuild table:
    BTC  | binance_futures, bybit_futures
    ETH  | binance_futures
    SOL  | bybit_futures
```

## 🎨 UI Display

### Symbols Table
```
┌──────────┬────────────────────────────────┬────────┬────────────┐
│ SYMBOL   │ EXCHANGE                       │ STATUS │ TIMEFRAMES │
├──────────┼────────────────────────────────┼────────┼────────────┤
│ BTCUSDT  │ binance_futures, bybit_futures │ ● Act  │ [1m][5m].. │
│ ETHUSDT  │ binance_futures, okx_futures   │ ● Act  │ [1m][5m].. │
│ SOLUSDT  │ bybit_futures                  │ ● Act  │ [1m][5m].. │
└──────────┴────────────────────────────────┴────────┴────────────┘
```

### Status Bar
```
WS: ON | EX: binance_futures, bybit_futures, okx_futures | SYM: 150
```

## 🔄 Data Flow

### Initial Connection
```
Client connects
    ↓
Server sends status for each exchange:
    - binance_futures: [BTC, ETH, ...]
    - bybit_futures: [BTC, SOL, ...]
    - okx_futures: [BTC, ...]
    ↓
Frontend stores all in Map
    ↓
Display unique symbols with their exchanges
```

### After Restart
```
System restarts
    ↓
Config reloaded
    ↓
Server broadcasts new status for each exchange
    ↓
Frontend updates Map
    ↓
Table refreshes with new data
```

## 🎯 Key Features

### 1. **Unique Symbols**
- Each symbol appears only once
- Shows all exchanges trading that symbol
- Sorted alphabetically

### 2. **Multi-Exchange Support**
- Tracks symbols from all exchanges
- Updates independently
- No data loss when new status arrives

### 3. **Dynamic Updates**
- Real-time updates as exchanges connect
- Handles exchange enable/disable
- Reflects config changes immediately

### 4. **Accurate Counts**
- Exchange count: Number of active exchanges
- Symbol count: Total unique symbols across all exchanges

## 📝 Code Changes

### Frontend (app.js)

**Added:**
```javascript
let allExchangeSymbols = new Map();

function updateSymbolsTableFromAll() {
    // Build unique symbol list with exchanges
}

function updateExchangeStatus() {
    // Update status bar with all exchanges
}
```

**Modified:**
```javascript
function updateStatusBar(data) {
    // Store per-exchange instead of overwriting
    allExchangeSymbols.set(data.exchange, data.symbols);
    updateSymbolsTableFromAll();
}
```

### Backend (server.js)

**Modified:**
```javascript
// Broadcast status for EACH exchange
for (const [exchangeName, config] of Object.entries(exchanges)) {
    this.broadcast({
        type: 'status',
        data: {
            exchange: exchangeName,
            symbols: config.symbols
        }
    });
}
```

### Core (index.js)

**Modified:**
```javascript
// After restart, broadcast all exchanges
for (const [exchangeName, exchangeConfig] of Object.entries(exchanges)) {
    apiServer.broadcast({
        type: 'status',
        data: {
            exchange: exchangeName,
            symbols: exchangeConfig.symbols
        }
    });
}
```

## 🧪 Test Cases

### Test 1: Single Exchange
```javascript
Config: { binance_futures: { symbols: ['BTC', 'ETH'] } }
Expected: 
    BTC | binance_futures
    ETH | binance_futures
```

### Test 2: Multiple Exchanges, No Overlap
```javascript
Config: {
    binance_futures: { symbols: ['BTC'] },
    bybit_futures: { symbols: ['SOL'] }
}
Expected:
    BTC | binance_futures
    SOL | bybit_futures
```

### Test 3: Multiple Exchanges, With Overlap
```javascript
Config: {
    binance_futures: { symbols: ['BTC', 'ETH'] },
    bybit_futures: { symbols: ['BTC', 'SOL'] },
    okx_futures: { symbols: ['BTC'] }
}
Expected:
    BTC | binance_futures, bybit_futures, okx_futures
    ETH | binance_futures
    SOL | bybit_futures
```

### Test 4: After Restart
```javascript
Before: BTC, ETH on Binance
Restart with: BTC, SOL on Bybit
Expected: Table updates to show new config
```

## 🐛 Edge Cases Handled

### 1. **Empty Symbols**
```javascript
if (allExchangeSymbols.size === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No symbols configured</td></tr>';
}
```

### 2. **Exchange Disabled**
```javascript
// Only broadcast if enabled and has symbols
if (config.enabled !== false && config.symbols.length > 0) {
    // broadcast...
}
```

### 3. **Duplicate Status Messages**
```javascript
// Map.set() overwrites, so duplicates are handled automatically
allExchangeSymbols.set(exchange, symbols);
```

### 4. **Symbol Format Differences**
```javascript
// OKX symbols normalized to BTCUSDT format
// All symbols use same format in display
```

## ✨ Benefits

1. **Accurate Display** - Shows all symbols from all exchanges
2. **No Duplicates** - Each symbol appears once
3. **Clear Attribution** - Shows which exchanges trade each symbol
4. **Real-time Updates** - Reflects config changes immediately
5. **Scalable** - Works with any number of exchanges
6. **Maintainable** - Clean separation of concerns

## 🔍 Debugging

### Check Symbol Map
```javascript
console.log('All Exchange Symbols:', allExchangeSymbols);
// Map {
//   'binance_futures' => ['BTCUSDT', 'ETHUSDT'],
//   'bybit_futures' => ['BTCUSDT', 'SOLUSDT']
// }
```

### Check Unique Symbols
```javascript
const symbolMap = new Map();
for (const [exchange, symbols] of allExchangeSymbols) {
    symbols.forEach(symbol => {
        if (!symbolMap.has(symbol)) {
            symbolMap.set(symbol, new Set());
        }
        symbolMap.get(symbol).add(exchange);
    });
}
console.log('Unique Symbols:', symbolMap);
// Map {
//   'BTCUSDT' => Set { 'binance_futures', 'bybit_futures' },
//   'ETHUSDT' => Set { 'binance_futures' },
//   'SOLUSDT' => Set { 'bybit_futures' }
// }
```

## 📚 Related Files

- `src/web/app.js` - Frontend logic
- `src/api/server.js` - Status broadcasting
- `src/index.js` - System initialization
- `src/web/index.html` - Symbols table HTML

## 🎯 Future Enhancements

- [ ] Filter symbols by exchange
- [ ] Show symbol count per exchange
- [ ] Color-code by exchange
- [ ] Click to filter by exchange
- [ ] Export symbol list
- [ ] Symbol search/filter
