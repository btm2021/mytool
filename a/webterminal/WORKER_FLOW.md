# Worker Flow - OHLCV Screener

## Tổng quan

Worker system gồm 3 loại:
1. **Exchange Workers** - Fetch OHLCV data
2. **Calculator Worker** - Tính indicators
3. **Main Thread** - UI và coordination

## Flow chi tiết

### 1. Khởi động (Start Button)

```
User clicks Start
  ↓
app.js: startAllWorkers()
  ↓
For each enabled exchange:
  ↓
  Create Worker (binance-worker.js)
  ↓
  Send: { type: 'init', config: {...} }
```

### 2. Exchange Worker Init

```
Worker receives 'init'
  ↓
Create exchange instance (ccxt)
  ↓
Load markets (exchange.loadMarkets())
  ↓
Filter symbols (USDT pairs, active)
  ↓
Start processing loop
```

### 3. Processing Loop

```
While running:
  ↓
  Check weight limit
  ↓
  Process batch (20 symbols)
    ↓
    For each symbol:
      ↓
      Fetch OHLCV (1000 candles)
      ↓
      Send to Calculator Worker
      ↓
      Wait symbolDelay (200ms)
  ↓
  Wait batchDelay (1000ms)
  ↓
  Next batch
```

### 4. Calculator Worker

```
Receive OHLCV data
  ↓
Extract closes array
  ↓
Calculate RSI(14)
  ↓
Calculate EMA(50)
  ↓
Calculate EMA(200)
  ↓
Generate signal
  ↓
Send result to Main Thread
```

### 5. Main Thread Update

```
Receive result
  ↓
Find symbol in array
  ↓
Update or add new
  ↓
Limit to maxSymbolsPerExchange
  ↓
Vue reactivity updates UI
```

## Test với test-worker.html

Mở `test-worker.html` để debug từng bước!
