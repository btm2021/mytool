# CCXT Integration Guide

Ứng dụng đã được tích hợp với thư viện [CCXT](https://github.com/ccxt/ccxt) để hỗ trợ nhiều sàn giao dịch cryptocurrency.

## Tổng Quan

CCXT (CryptoCurrency eXchange Trading) là một thư viện JavaScript/Python/PHP cho phép kết nối với hơn 100 sàn giao dịch cryptocurrency thông qua một API thống nhất.

### Lợi Ích

- **Đa sàn giao dịch**: Hỗ trợ nhiều exchange mà không cần viết code riêng cho từng sàn
- **API thống nhất**: Cùng một interface cho tất cả các exchange
- **Cập nhật thường xuyên**: CCXT được maintain tích cực bởi cộng đồng
- **Rate limiting**: Tự động xử lý rate limits của từng exchange

## Cài Đặt

Thư viện CCXT đã được include trong file `index.html`:

```html
<script src="https://unpkg.com/ccxt@4.2.25/dist/ccxt.browser.js"></script>
```

## Sử Dụng

### 1. Khởi Tạo Exchange

```javascript
// Khởi tạo với exchange mặc định (Binance)
const exchangeAPI = new ExchangeAPI('binance');

// Hoặc khởi tạo với exchange khác
const exchangeAPI = new ExchangeAPI('bybit');
```

### 2. Chuyển Đổi Exchange

```javascript
// Chuyển sang exchange khác
await exchangeAPI.switchExchange('okx');

// Lấy tên exchange hiện tại
const currentExchange = exchangeAPI.getExchangeName();
console.log(currentExchange); // 'okx'
```

### 3. Fetch Dữ Liệu OHLCV

```javascript
// Fetch historical data
const data = await exchangeAPI.fetchHistoricalData(
    'BTCUSDT',      // symbol
    '1h',           // timeframe
    1000,           // số lượng candles
    (current, total, message) => {
        console.log(`Progress: ${current}/${total} - ${message}`);
    }
);
```

### 4. Lấy Danh Sách Symbols

```javascript
// Lấy tất cả symbols
const symbols = await exchangeAPI.getSymbolList();
console.log(symbols); // ['BTCUSDT', 'ETHUSDT', ...]

// Lấy ticker 24h
const tickers = await exchangeAPI.fetch24hrTicker();
```

## Các Exchange Được Hỗ Trợ

### Exchange Chính

| Exchange | ID | Futures | Spot |
|----------|-----|---------|------|
| Binance | `binance` | ✅ | ✅ |
| Binance USD-M | `binanceusdm` | ✅ | ❌ |
| Bybit | `bybit` | ✅ | ✅ |
| OKX | `okx` | ✅ | ✅ |
| Bitget | `bitget` | ✅ | ✅ |
| Gate.io | `gate` | ✅ | ✅ |
| KuCoin | `kucoin` | ✅ | ✅ |
| Huobi | `huobi` | ✅ | ✅ |
| MEXC | `mexc` | ✅ | ✅ |

### Lấy Danh Sách Exchange Hỗ Trợ

```javascript
const exchanges = ExchangeAPI.getSupportedExchanges();
console.log(exchanges);
// ['binance', 'binanceusdm', 'bybit', 'okx', 'bitget', 'gate', 'kucoin', 'huobi', 'mexc']
```

## Cấu Hình Exchange

### Rate Limiting

CCXT tự động xử lý rate limiting cho mỗi exchange:

```javascript
const exchangeAPI = new ExchangeAPI('binance');
// Rate limiting được enable mặc định
```

### Market Type

Mặc định, ứng dụng sử dụng futures market:

```javascript
// Trong exchange-api.js
this.exchange = new ExchangeClass({
    enableRateLimit: true,
    options: {
        defaultType: 'future', // Sử dụng futures market
    }
});
```

Để thay đổi sang spot market, bạn có thể modify code trong `exchange-api.js`:

```javascript
options: {
    defaultType: 'spot', // Thay đổi thành spot
}
```

## Symbol Format

CCXT sử dụng format `BASE/QUOTE` (ví dụ: `BTC/USDT`), nhưng ứng dụng tự động normalize:

```javascript
// Tất cả các format này đều được chấp nhận:
'BTCUSDT'     // Tự động convert thành 'BTC/USDT'
'BTC/USDT'    // Giữ nguyên
'BTC-USDT'    // Convert thành 'BTC/USDT'
'BTC_USDT'    // Convert thành 'BTC/USDT'
```

## Xử Lý Lỗi

### Exchange Không Hỗ Trợ

```javascript
try {
    const exchangeAPI = new ExchangeAPI('invalid_exchange');
} catch (error) {
    console.error('Exchange not supported:', error);
}
```

### API Error

```javascript
try {
    const data = await exchangeAPI.fetchHistoricalData('BTCUSDT', '1h', 1000);
} catch (error) {
    console.error('API Error:', error);
    // Xử lý lỗi: rate limit, network, invalid symbol, etc.
}
```

## Timeframes Hỗ Trợ

Các timeframe được hỗ trợ phụ thuộc vào từng exchange:

| Timeframe | Binance | Bybit | OKX | Bitget |
|-----------|---------|-------|-----|--------|
| 1m | ✅ | ✅ | ✅ | ✅ |
| 5m | ✅ | ✅ | ✅ | ✅ |
| 15m | ✅ | ✅ | ✅ | ✅ |
| 1h | ✅ | ✅ | ✅ | ✅ |
| 4h | ✅ | ✅ | ✅ | ✅ |
| 1d | ✅ | ✅ | ✅ | ✅ |

## Performance

### Batching

Ứng dụng tự động chia nhỏ requests thành batches để tránh vượt quá giới hạn của exchange:

```javascript
// Binance: max 1500 candles/request
// Bybit: max 1000 candles/request
// OKX: max 300 candles/request

// Ứng dụng tự động xử lý batching
const data = await exchangeAPI.fetchHistoricalData('BTCUSDT', '1h', 5000);
// Sẽ tự động chia thành nhiều requests
```

### Caching

Dữ liệu được cache trong IndexedDB để giảm số lượng API calls:

```javascript
// Sử dụng cache (mặc định)
?symbol=BTCUSDT&usecache=yes

// Bỏ qua cache và fetch mới
?symbol=BTCUSDT&usecache=no
```

## Backward Compatibility

Class `BinanceAPI` vẫn được giữ lại để tương thích ngược:

```javascript
// Cách cũ vẫn hoạt động
const binanceAPI = new BinanceAPI();

// Thực chất là alias của ExchangeAPI('binance')
```

## Troubleshooting

### CCXT Not Loaded

```
Error: CCXT library not loaded
```

**Giải pháp**: Đảm bảo script CCXT được load trong HTML:
```html
<script src="https://unpkg.com/ccxt@4.2.25/dist/ccxt.browser.js"></script>
```

### Exchange Not Initialized

```
Error: Exchange not initialized
```

**Giải pháp**: Đợi exchange khởi tạo xong:
```javascript
await exchangeAPI.ensureInitialized();
```

### Rate Limit Exceeded

```
Error: Rate limit exceeded
```

**Giải pháp**: CCXT tự động xử lý rate limiting, nhưng nếu vẫn gặp lỗi, tăng delay giữa các requests trong `exchange-api.js`:

```javascript
// Tăng delay từ 200ms lên 500ms
await new Promise(resolve => setTimeout(resolve, 500));
```

### Invalid Symbol

```
Error: Symbol not found
```

**Giải pháp**: Kiểm tra symbol có tồn tại trên exchange:
```javascript
await exchangeAPI.ensureInitialized();
const markets = exchangeAPI.exchange.markets;
console.log(Object.keys(markets)); // Xem tất cả symbols
```

## Tài Liệu Tham Khảo

- [CCXT Documentation](https://docs.ccxt.com/)
- [CCXT GitHub](https://github.com/ccxt/ccxt)
- [CCXT Manual](https://docs.ccxt.com/en/latest/manual.html)
- [Exchange-specific notes](https://docs.ccxt.com/en/latest/exchange-markets.html)

## Ví Dụ Nâng Cao

### Fetch Từ Nhiều Exchange

```javascript
const exchanges = ['binance', 'bybit', 'okx'];
const results = {};

for (const exchangeName of exchanges) {
    const api = new ExchangeAPI(exchangeName);
    const data = await api.fetchHistoricalData('BTCUSDT', '1h', 100);
    results[exchangeName] = data;
}

console.log(results);
```

### So Sánh Giá Giữa Các Exchange

```javascript
const binance = new ExchangeAPI('binance');
const bybit = new ExchangeAPI('bybit');

const [binanceData, bybitData] = await Promise.all([
    binance.fetchHistoricalData('BTCUSDT', '1h', 1),
    bybit.fetchHistoricalData('BTCUSDT', '1h', 1)
]);

console.log('Binance price:', binanceData[0].close);
console.log('Bybit price:', bybitData[0].close);
```

## Đóng Góp

Nếu bạn muốn thêm hỗ trợ cho exchange mới, chỉ cần thêm vào danh sách trong method `getSupportedExchanges()`:

```javascript
static getSupportedExchanges() {
    return [
        'binance',
        'bybit',
        'okx',
        'your_new_exchange', // Thêm exchange mới ở đây
        // ...
    ];
}
```

Miễn là exchange được CCXT hỗ trợ, nó sẽ hoạt động ngay!
