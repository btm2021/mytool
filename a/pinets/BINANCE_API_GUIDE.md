# 📈 Binance Futures API Integration Guide

## 🎯 Tính năng mới

Ứng dụng hiện đã tích hợp **Binance Futures API** để lấy dữ liệu thị trường thực với **500 candles**!

## 🚀 Cách sử dụng

### 1. Chọn Symbol và Interval

Trên thanh Market Data Settings:
- **Symbol:** Nhập mã coin (VD: BTCUSDT, ETHUSDT, BNBUSDT)
- **Interval:** Chọn khung thời gian
  - 1m - 1 Minute
  - 5m - 5 Minutes
  - 15m - 15 Minutes
  - 30m - 30 Minutes
  - 1h - 1 Hour (mặc định)
  - 4h - 4 Hours
  - 1d - 1 Day

### 2. Load Data

Click nút **"🔄 Load Data"** để tải dữ liệu từ Binance.

**Status messages:**
- `Loading BTCUSDT 1h data from Binance...` - Đang tải
- `✅ Loaded 500 bars for BTCUSDT 1h` - Thành công
- `⚠️ Failed to load: ... Using mock data` - Lỗi, dùng data giả

### 3. Xem thông tin Data

Sau khi load thành công, bạn sẽ thấy:
```
📊 500 bars | Last: 43250.50 | 2025-10-01 13:00:00
```

## 📊 API Details

### Endpoint
```
https://fapi.binance.com/fapi/v1/klines
```

### Parameters
- `symbol` - Trading pair (VD: BTCUSDT)
- `interval` - Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d)
- `limit` - Number of candles (500)

### Response Format
Mỗi candle bao gồm:
```javascript
[
  openTime,           // Timestamp mở
  open,               // Giá mở
  high,               // Giá cao nhất
  low,                // Giá thấp nhất
  close,              // Giá đóng
  volume,             // Khối lượng
  closeTime,          // Timestamp đóng
  quoteVolume,        // Quote asset volume
  trades,             // Số lượng trades
  takerBuyBaseVolume, // Taker buy base volume
  takerBuyQuoteVolume,// Taker buy quote volume
  ignore              // Ignore
]
```

## 💡 Ví dụ sử dụng

### Example 1: BTC 1 Hour
```
Symbol: BTCUSDT
Interval: 1h
→ 500 candles giờ của Bitcoin
```

### Example 2: ETH 15 Minutes
```
Symbol: ETHUSDT
Interval: 15m
→ 500 candles 15 phút của Ethereum
```

### Example 3: BNB Daily
```
Symbol: BNBUSDT
Interval: 1d
→ 500 candles ngày của Binance Coin
```

## 🔄 Workflow hoàn chỉnh

```
1. Chọn Symbol (BTCUSDT) và Interval (1h)
   ↓
2. Click "Load Data"
   ↓
3. Binance API trả về 500 candles
   ↓
4. Data được lưu trong PinetsEngine
   ↓
5. Paste PineScript code
   ↓
6. Click "Convert to Pinets"
   ↓
7. Click "Run & Calculate"
   ↓
8. Indicator tính toán trên data thật
   ↓
9. Kết quả hiển thị trong bảng
```

## 🛡️ Error Handling

### Fallback to Mock Data

Nếu Binance API fail (CORS, network, rate limit), app tự động:
1. Log error ra console
2. Hiển thị warning message
3. Generate mock data để demo
4. Cho phép tiếp tục sử dụng

### Common Errors

**CORS Error:**
```
Access to fetch at 'https://fapi.binance.com/...' has been blocked by CORS policy
```
**Solution:** Sử dụng CORS proxy hoặc chạy local server

**Network Error:**
```
Failed to fetch
```
**Solution:** Kiểm tra internet connection

**Invalid Symbol:**
```
Binance API error: 400 Bad Request
```
**Solution:** Kiểm tra symbol có đúng không (VD: BTCUSDT, không phải BTC)

## 🔧 Technical Details

### Data Structure

```javascript
{
  index: 0,
  time: "2025-10-01 13:00:00",
  timestamp: 1727766000000,
  open: 43200.50,
  high: 43350.00,
  low: 43150.25,
  close: 43250.50,
  volume: 1234.56
}
```

### Data Flow

```javascript
// 1. Fetch from Binance
const response = await fetch(url);
const klines = await response.json();

// 2. Transform to internal format
this.data = klines.map((kline, index) => ({
  index: index,
  time: new Date(kline[0]).toISOString(),
  timestamp: kline[0],
  open: parseFloat(kline[1]),
  high: parseFloat(kline[2]),
  low: parseFloat(kline[3]),
  close: parseFloat(kline[4]),
  volume: parseFloat(kline[5])
}));

// 3. Use in calculations
const close = this.data.map(d => d.close);
const ema = ta.ema(close, 9);
```

## 📈 Performance

- **API Call:** ~200-500ms
- **Data Processing:** ~10-20ms
- **Total Load Time:** < 1 second

**500 bars** provides good balance between:
- ✅ Enough data for indicators
- ✅ Fast loading
- ✅ Reasonable memory usage

## 🎓 Advanced Usage

### Multiple Symbols

Load different symbols để so sánh:
```javascript
// Load BTC
await pinetsEngine.initializeMarketData('BTCUSDT', '1h');
// Run indicator on BTC

// Load ETH
await pinetsEngine.initializeMarketData('ETHUSDT', '1h');
// Run same indicator on ETH
```

### Different Timeframes

Test indicator trên nhiều timeframes:
```javascript
// 1 Hour
await pinetsEngine.initializeMarketData('BTCUSDT', '1h');

// 4 Hours
await pinetsEngine.initializeMarketData('BTCUSDT', '4h');

// Daily
await pinetsEngine.initializeMarketData('BTCUSDT', '1d');
```

## 🔍 Console Logging

Mở Console (F12) để xem:

```javascript
Fetching data from Binance: BTCUSDT 1h
✅ Loaded 500 bars for BTCUSDT 1h
📊 Price range: 42150.00 - 44250.50
```

## 📝 Supported Symbols

Binance Futures hỗ trợ nhiều trading pairs:

**Major Coins:**
- BTCUSDT - Bitcoin
- ETHUSDT - Ethereum
- BNBUSDT - Binance Coin
- SOLUSDT - Solana
- ADAUSDT - Cardano

**Altcoins:**
- DOGEUSDT - Dogecoin
- MATICUSDT - Polygon
- DOTUSDT - Polkadot
- AVAXUSDT - Avalanche
- LINKUSDT - Chainlink

**...và nhiều pairs khác!**

Xem full list tại: https://fapi.binance.com/fapi/v1/exchangeInfo

## 🚨 Rate Limits

Binance API có rate limits:
- **Weight:** 1 per request
- **Limit:** 2400 per minute

**Best practices:**
- Không spam Load Data button
- Cache data khi có thể
- Sử dụng reasonable intervals

## 💡 Tips

### Tip 1: Verify Symbol
Luôn viết hoa symbol: `BTCUSDT` (không phải `btcusdt`)

### Tip 2: Choose Right Interval
- **1m, 5m** - Scalping, short-term
- **15m, 30m** - Intraday trading
- **1h, 4h** - Swing trading
- **1d** - Long-term analysis

### Tip 3: Check Data Info
Luôn kiểm tra data info sau khi load để verify:
- Số lượng bars
- Giá cuối cùng
- Timestamp

### Tip 4: Reload for Fresh Data
Click "Load Data" lại để lấy data mới nhất

## 🎯 Use Cases

### Use Case 1: Backtest Indicator
```
1. Load historical data (500 bars)
2. Run indicator
3. Analyze results
4. Optimize parameters
```

### Use Case 2: Compare Timeframes
```
1. Load 1h data → Run indicator
2. Load 4h data → Run indicator
3. Compare results
```

### Use Case 3: Multi-Symbol Analysis
```
1. Load BTCUSDT → Run indicator
2. Load ETHUSDT → Run indicator
3. Compare performance
```

## ✅ Checklist

Trước khi Run & Calculate:
- [ ] Symbol đã load đúng chưa?
- [ ] Interval phù hợp chưa?
- [ ] Data info hiển thị chưa?
- [ ] Số bars = 500?
- [ ] Giá cuối có hợp lý không?

## 🐛 Troubleshooting

**Problem:** Data không load
**Solution:** 
1. Check console (F12)
2. Verify internet connection
3. Try different symbol
4. Check Binance status

**Problem:** Old data
**Solution:** Click "Load Data" lại

**Problem:** Wrong symbol
**Solution:** Check spelling, use uppercase

---

**Enjoy trading with real market data! 📈**
