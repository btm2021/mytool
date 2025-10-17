# Updates - OHLCV Screener

## ✅ Đã sửa

### 1. **Thêm Config Chart Candles vào Settings Tab**
- Thêm input "Chart Candles Limit" trong Settings tab
- Giá trị mặc định: 5000 nến
- Range: 500 - 10000 nến
- Lưu vào localStorage

### 2. **Chart.html Đọc Config từ localStorage**
```javascript
// Load settings from localStorage
function getSettings() {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
        return JSON.parse(saved);
    }
    return null;
}

const settings = getSettings();
const TARGET_CANDLES = settings && settings.chartCandlesLimit ? settings.chartCandlesLimit : 5000;
```

### 3. **Xóa CCXT Pro**
- Xóa `ccxt.browser.pro.js` khỏi chart.html
- Sử dụng polling thay vì WebSocket
- Update mỗi 3 giây
- Đơn giản và ổn định hơn

### 4. **Sửa Lỗi Bybit/OKX Timeout**

**Bybit Worker:**
```javascript
createExchange() {
    return new ccxt.bybit({
        enableRateLimit: true,
        timeout: 30000,  // 30 seconds
        options: {
            defaultType: 'linear',
            recvWindow: 10000  // Bybit specific
        }
    });
}
```

**OKX Worker:**
```javascript
createExchange() {
    return new ccxt.okx({
        enableRateLimit: true,
        timeout: 30000,  // 30 seconds
        options: {
            defaultType: 'swap'
        }
    });
}
```

**Chart.js:**
```javascript
exchange = new exchangeClass({
    enableRateLimit: true,
    timeout: 30000  // 30 seconds
});
```

## Cách sử dụng

### Cấu hình Chart Candles:
1. Mở app chính (index.html)
2. Click tab **SETTINGS** ở right panel
3. Scroll xuống section **Chart**
4. Thay đổi "Chart Candles Limit" (500-10000)
5. Settings tự động lưu vào localStorage

### Xem Chart:
1. Click vào symbol trong bảng
2. Chart sẽ load số nến theo config
3. Cập nhật real-time mỗi 3 giây

## Technical Details

### Timeout Settings
- **Default**: 10 seconds (CCXT default)
- **New**: 30 seconds
- Giải quyết vấn đề timeout với Bybit/OKX

### Bybit recvWindow
- Thêm `recvWindow: 10000` cho Bybit
- Tăng thời gian chấp nhận request
- Giảm lỗi timestamp

### Polling vs WebSocket
- **Trước**: CCXT Pro WebSocket (phức tạp)
- **Sau**: Polling mỗi 3 giây (đơn giản, ổn định)
- Đủ nhanh cho chart viewing

### localStorage Structure
```json
{
  "exchanges": {
    "binance": true,
    "bybit": true,
    "okx": true
  },
  "batchSize": 20,
  "klineLimit": 1000,
  "timeframe": "15m",
  "chartCandlesLimit": 5000,
  "rsi": {
    "period": 14,
    "oversold": 30,
    "overbought": 70
  },
  "ema": {
    "short": 50,
    "long": 200
  }
}
```

## Testing

### Test Chart Config:
1. Thay đổi "Chart Candles Limit" thành 1000
2. Click vào symbol
3. Console sẽ log: "Loading 1000 candles from settings"
4. Chart load đúng 1000 nến

### Test Bybit/OKX:
1. Enable Bybit và OKX trong Settings
2. Click Start
3. Không còn lỗi timeout
4. Workers load symbols bình thường

## Notes

- Chart polling mỗi 3 giây là đủ nhanh
- Timeout 30s giải quyết vấn đề mạng chậm
- localStorage sync giữa index.html và chart.html
- Bybit cần recvWindow để tránh lỗi timestamp
