# Chart Feature - OHLCV Screener

## Tính năng mới

### 1. System Tabs (thay thế Modal)
- **LOGS Tab**: Hiển thị system logs như cũ
- **SETTINGS Tab**: Cấu hình settings trực tiếp trong panel, không cần modal

### 2. Symbol Links
- Mỗi symbol trong bảng giờ là link clickable
- Click vào symbol sẽ mở chart.html trong tab mới
- URL format: `chart.html?exchange=binance&symbol=BTC/USDT`

### 3. Chart Page (chart.html)
- Sử dụng **Lightweight Charts** library (professional trading charts)
- Giao diện dark theme giống Binance
- Hiển thị thông tin: Price, 24h Change, High, Low, Volume
- Màu xanh/đỏ chuẩn Binance cho nến

### 4. Timeframe Buttons
- 1m, 5m, 15m, 1h, 4h, 1D
- Click để thay đổi timeframe
- Chart tự động reload với timeframe mới

### 5. Load 5000 Candles
- Tự động fetch nhiều lần để load đủ 5000 nến
- Hiển thị progress: "Loading candles... 1000/5000"
- Loại bỏ duplicates và sort theo thời gian
- Config trong `config.js`: `chartCandlesLimit: 5000`

### 6. Real-time Updates với CCXT Pro
- Sử dụng `exchange.watchOHLCV()` từ CCXT Pro
- Cập nhật giá real-time trên chart
- Fallback sang polling nếu exchange không hỗ trợ watchOHLCV
- Status indicator: "Live" / "Polling" / "Disconnected"

### 7. UTC+7 Timezone (Ho Chi Minh)
- Tất cả timestamp được convert sang UTC+7
- Hiển thị thời gian đúng múi giờ Việt Nam

### 8. Smart Price Scale
- Tự động tính precision dựa trên giá:
  - < 0.01: 8 decimals (altcoins nhỏ)
  - < 1: 6 decimals
  - < 100: 4 decimals
  - >= 100: 2 decimals

## Cách sử dụng

1. **Mở app chính** (index.html)
2. **Click tab SETTINGS** ở right panel để cấu hình
3. **Click vào symbol** trong bảng để xem chart
4. **Chọn timeframe** trên chart page
5. Chart sẽ tự động cập nhật real-time

## Technical Details

### CCXT Pro
- Sử dụng WebSocket thông qua CCXT Pro
- Hỗ trợ: Binance, Bybit, OKX
- Auto reconnect khi mất kết nối

### Multiple Fetches
```javascript
// Load 5000 candles in batches of 1000
for (let i = 0; i < 5; i++) {
    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, 1000);
    allOHLCV = allOHLCV.concat(ohlcv);
    since = ohlcv[ohlcv.length - 1][0] + tfDuration;
}
```

### UTC+7 Conversion
```javascript
const UTC7_OFFSET = 7 * 60 * 60 * 1000;
function convertToUTC7(timestamp) {
    return Math.floor((timestamp + UTC7_OFFSET) / 1000);
}
```

## Config

Trong `config.js`:
```javascript
chartCandlesLimit: 5000  // Số nến load cho chart
```

## Dependencies

- **Lightweight Charts**: 4.1.1
- **CCXT**: 4.2.25
- **CCXT Pro**: 4.2.25 (cho WebSocket)

## Browser Support

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Mobile: ✅ (responsive)
