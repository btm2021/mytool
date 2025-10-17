# Worker Debug Guide

## Kiến trúc Worker

### 1. Exchange Workers (binance-worker.js, bybit-worker.js, okx-worker.js)
**Nhiệm vụ:**
- Load danh sách symbols từ exchange
- Chia thành batches
- Fetch OHLCV data cho từng symbol
- Gửi data sang Calculator Worker

**Flow:**
```
Init → Load Markets → Filter Symbols → Process Batches → Fetch OHLCV → Send to Calculator
```

### 2. Calculator Worker (calculator-worker.js)
**Nhiệm vụ:**
- Nhận OHLCV data
- Tính toán indicators (RSI, EMA50, EMA200)
- Generate signal (BUY/SELL/HOLD)
- Gửi kết quả về Main Thread

**Flow:**
```
Receive OHLCV → Calculate RSI → Calculate EMAs → Generate Signal → Send Result
```

### 3. Main Thread (app.js)
**Nhiệm vụ:**
- Quản lý workers
- Nhận kết quả từ Calculator
- Update UI (table)
- Hiển thị logs

## Debug Steps

### 1. Kiểm tra Exchange Worker đang chạy
Mở Console và xem logs:
```
✓ binance: Initializing binance...
✓ binance: Loaded 500 symbols
✓ binance: Processing 1-20/500
✓ binance: Batch: BTC/USDT, ETH/USDT, BNB/USDT...
✓ binance: Batch done: 18 success, 2 failed
```

### 2. Kiểm tra OHLCV Data
Trong base-worker.js, data được gửi qua:
```javascript
this.postOHLCV({
    symbol: symbol,
    ohlcv: ohlcv  // Array of [timestamp, open, high, low, close, volume]
});
```

### 3. Kiểm tra Calculator
Console sẽ log nếu có lỗi:
```
Calculator error for SYMBOL: Insufficient data: 30 candles
```

### 4. Kiểm tra UI Update
Trong app.js, method `updateSymbol()` sẽ:
- Tìm symbol trong array
- Update hoặc thêm mới
- Limit theo maxSymbolsPerExchange

## Common Issues

### Issue 1: Không có symbols hiển thị
**Nguyên nhân:**
- Exchange worker chưa init xong
- Filter symbols quá strict
- Không đủ data (< 50 candles)

**Fix:**
- Check logs: "Loaded X symbols"
- Giảm klineLimit trong config
- Check filter logic trong worker

### Issue 2: Symbols bị duplicate
**Nguyên nhân:**
- Symbol ID không unique

**Fix:**
- Thêm exchangeId vào symbol ID:
```javascript
const symbolData = {
    id: `${exchangeId}-${symbol}`,
    symbol: symbol,
    ...
};
```

### Issue 3: Weight limit reached
**Nguyên nhân:**
- Fetch quá nhanh
- Weight không reset

**Fix:**
- Tăng symbolDelay
- Giảm batchSize
- Check weightResetInterval

### Issue 4: Calculator không trả kết quả
**Nguyên nhân:**
- OHLCV data không đủ
- Lỗi trong indicators.js

**Fix:**
- Check console errors
- Verify ohlcv.length >= 50
- Test indicators.calculateAll() manually

## Testing

### Test 1: Manual Worker Test
```javascript
// In browser console
const worker = new Worker('workers/binance-worker.js');
worker.onmessage = (e) => console.log(e.data);
worker.postMessage({
    type: 'init',
    config: CONFIG.exchanges[0]
});
```

### Test 2: Manual Calculator Test
```javascript
// In browser console
const calc = new Worker('calculator-worker.js');
calc.onmessage = (e) => console.log(e.data);
calc.postMessage({
    type: 'calculate',
    exchangeId: 'binance',
    symbol: 'BTC/USDT',
    ohlcv: [[1,100,110,90,105,1000], ...], // Sample data
    config: { rsiPeriod: 14, emaShort: 50, emaLong: 200 }
});
```

### Test 3: Check Indicators
```javascript
// In browser console
const closes = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113];
const rsi = Indicators.calculateRSI(closes, 14);
console.log('RSI:', rsi);
```

## Performance Tuning

### Optimal Settings
```javascript
{
    batchSize: 20,           // 20 symbols per batch
    klineLimit: 200,         // 200 candles (enough for EMA200)
    timeframe: '15m',        // 15 minute candles
    batchDelay: 1000,        // 1 second between batches
    symbolDelay: 200,        // 200ms between symbols
    weightThreshold: 0.9     // Stop at 90% weight
}
```

### For Faster Processing
```javascript
{
    batchSize: 30,
    symbolDelay: 100,
    batchDelay: 500
}
```

### For Rate Limit Safety
```javascript
{
    batchSize: 10,
    symbolDelay: 500,
    batchDelay: 2000,
    weightThreshold: 0.8
}
```

## Logs Explained

### Exchange Worker Logs
- `Initializing...` - Worker starting
- `Loading markets...` - Fetching exchange info
- `Loaded X symbols` - Symbols filtered and ready
- `Processing X-Y/Z` - Current batch progress
- `Batch: SYMBOL1, SYMBOL2...` - Symbols in current batch
- `Batch done: X success, Y failed` - Batch results
- `Cycle complete` - All symbols processed, restarting
- `Weight reset` - Weight counter reset to 0
- `Waiting Xs...` - Waiting for weight reset

### Calculator Logs
- `Calculator error for SYMBOL: ...` - Calculation failed
- (Success is silent, check UI for results)

### Main Thread Logs
- `Worker started: exchange` - Worker initialized
- `exchange: message` - Log from worker
- `Settings saved` - Config updated

## Expected Behavior

1. **Start:**
   - Click Start button
   - Workers initialize (2-5 seconds)
   - Logs show "Loaded X symbols"

2. **Processing:**
   - Batches process every ~1 second
   - Symbols appear in table
   - Weight increases, then resets

3. **Cycle:**
   - After all symbols: "Cycle complete"
   - Wait 5 seconds
   - Restart from beginning

4. **UI:**
   - Symbols appear in table
   - RSI, EMA values update
   - Signal shows BUY/SELL/HOLD
   - Time updates on each refresh
