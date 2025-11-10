# Migration Guide - Tái cấu trúc Datasource

## Tổng quan

Dự án đã được tái cấu trúc để tách class `MultiExchangeDatafeed` ra khỏi `app.js` thành một module độc lập với kiến trúc mở rộng.

## Thay đổi chính

### Trước đây (app.js)

```javascript
// Tất cả code nằm trong app.js
class MultiExchangeDatafeed {
    constructor() {
        // Hardcoded cho Binance Futures only
        this.subscribers = {};
        this.quoteSubscribers = {};
        this.exchanges = ['BINANCE'];
    }
    // ... 600+ dòng code
}

// Sử dụng
const widgetOptions = {
    datafeed: new MultiExchangeDatafeed(),
    // ...
};
```

### Bây giờ (Module architecture)

```javascript
// Code được chia thành nhiều files
datasource/
├── base/BaseExchange.js              # Base class với CCXT
├── exchanges/
│   ├── BinanceFuturesExchange.js     # Binance Futures specific
│   └── BinanceSpotExchange.js        # Binance Spot specific
├── MultiExchange.js                  # Exchange manager
├── MultiExchangeDatafeed.js          # TradingView adapter
└── index.js                          # Factory functions

// Sử dụng
const datafeed = createDatafeed({
    enableBinanceFutures: true,
    enableBinanceSpot: false
});

const widgetOptions = {
    datafeed: datafeed,
    // ...
};
```

## Chi tiết thay đổi

### 1. BaseExchange (Mới)

**Mục đích:** Base class chứa logic chung cho tất cả exchanges, sử dụng CCXT.

**Tính năng:**
- Khởi tạo CCXT exchange
- Fetch OHLCV data
- Fetch ticker data
- Calculate precision
- WebSocket subscription (template method)

**Lợi ích:**
- Dễ dàng thêm exchange mới
- Code reuse
- Consistent interface

### 2. BinanceFuturesExchange (Tách từ MultiExchangeDatafeed)

**Code cũ trong app.js:**
```javascript
class MultiExchangeDatafeed {
    async initializeGlobalData() {
        await this.fetchAllSymbolPrices();
        this.connectMarkPriceWebSocket();
        await this.fetch24hrData();
        // ...
    }
}
```

**Code mới:**
```javascript
class BinanceFuturesExchange extends BaseExchange {
    constructor(options = {}) {
        super('BINANCE', options);
        this.initializeGlobalData();
    }
    
    async initializeGlobalData() {
        await this.fetchAllSymbolPrices();
        this.connectMarkPriceWebSocket();
        await this.fetch24hrData();
        // ...
    }
}
```

**Thay đổi:**
- Tách logic Binance Futures ra class riêng
- Kế thừa từ BaseExchange
- Giữ nguyên logic mark price WebSocket và 24hr data

### 3. MultiExchange (Mới)

**Mục đích:** Manager để quản lý nhiều exchanges.

**Tính năng:**
- Add/remove exchanges
- Route requests đến đúng exchange
- Parse symbol format (EXCHANGE:SYMBOL)
- Aggregate search results từ nhiều exchanges

**Ví dụ:**
```javascript
const multiExchange = new MultiExchange();
multiExchange.addExchange('BINANCE', new BinanceFuturesExchange());
multiExchange.addExchange('BINANCE_SPOT', new BinanceSpotExchange());

// Tự động route đến đúng exchange
const bars = await multiExchange.fetchOHLCV('BINANCE:BTCUSDT', '15m', since);
```

### 4. MultiExchangeDatafeed (Refactored)

**Code cũ:**
```javascript
class MultiExchangeDatafeed {
    // Chứa tất cả logic: fetch data, WebSocket, quotes, etc.
    // 600+ dòng code
    
    getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        // Direct fetch từ Binance API
        const url = `https://fapi.binance.com/fapi/v1/klines?...`;
        fetch(url).then(...)
    }
}
```

**Code mới:**
```javascript
class MultiExchangeDatafeed {
    constructor(multiExchange) {
        this.multiExchange = multiExchange;
    }
    
    getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        // Delegate đến MultiExchange
        this.multiExchange.fetchOHLCV(symbolString, resolution, from * 1000, 1000)
            .then(bars => {
                onHistoryCallback(bars, { noData: false });
            });
    }
}
```

**Thay đổi:**
- Chỉ là adapter layer giữa TradingView và MultiExchange
- Không chứa business logic
- Delegate tất cả requests đến MultiExchange

## Migration Steps

### Bước 1: Backup code cũ

```bash
# Backup app.js
cp app.js app.js.backup
```

### Bước 2: Load CCXT library

Thêm vào `index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/ccxt@4.2.25/dist/ccxt.browser.js"></script>
```

### Bước 3: Load datasource modules

Thêm vào `index.html`:
```html
<script src="datasource/base/BaseExchange.js"></script>
<script src="datasource/exchanges/BinanceFuturesExchange.js"></script>
<script src="datasource/exchanges/BinanceSpotExchange.js"></script>
<script src="datasource/MultiExchange.js"></script>
<script src="datasource/MultiExchangeDatafeed.js"></script>
<script src="datasource/index.js"></script>
```

### Bước 4: Update app.js

**Xóa:**
```javascript
class MultiExchangeDatafeed {
    // Xóa toàn bộ class này (600+ dòng)
}
```

**Thay bằng:**
```javascript
// NOTE: MultiExchangeDatafeed đã được tách ra thành module riêng
// Xem: datasource/MultiExchangeDatafeed.js, datasource/MultiExchange.js
```

**Update initTradingView():**
```javascript
function initTradingView() {
    // ... existing code ...
    
    // Thay đổi từ:
    // datafeed: new MultiExchangeDatafeed(),
    
    // Thành:
    const datafeed = createDatafeed({
        enableBinanceFutures: true,
        enableBinanceSpot: false
    });
    
    const widgetOptions = {
        datafeed: datafeed,
        // ...
    };
}
```

### Bước 5: Test

1. Mở browser console
2. Load trang
3. Kiểm tra:
   - Chart load được không
   - WebSocket hoạt động không
   - Search symbols hoạt động không
   - Watchlist hoạt động không

## Lợi ích của kiến trúc mới

### 1. Separation of Concerns

- **BaseExchange**: Logic chung cho tất cả exchanges
- **BinanceFuturesExchange**: Logic đặc thù cho Binance Futures
- **MultiExchange**: Quản lý nhiều exchanges
- **MultiExchangeDatafeed**: Adapter cho TradingView

### 2. Extensibility

Thêm exchange mới dễ dàng:

```javascript
class BybitFuturesExchange extends BaseExchange {
    constructor(options = {}) {
        super('BYBIT', options);
    }
    
    // Override methods nếu cần
    async fetchOHLCV(symbol, timeframe, since, limit) {
        // Custom implementation cho Bybit
    }
}

// Sử dụng
const multiExchange = new MultiExchange();
multiExchange.addExchange('BYBIT', new BybitFuturesExchange());
```

### 3. Maintainability

- Code ngắn gọn hơn trong mỗi file
- Dễ debug
- Dễ test
- Dễ đọc và hiểu

### 4. Reusability

- BaseExchange có thể reuse cho nhiều exchanges
- MultiExchange có thể reuse cho nhiều projects
- CCXT integration một lần, dùng cho tất cả exchanges

### 5. Flexibility

```javascript
// Có thể dùng nhiều exchanges cùng lúc
const datafeed = createDatafeed({
    enableBinanceFutures: true,
    enableBinanceSpot: true,
    enableBybit: true
});

// Hoặc custom
const multiExchange = new MultiExchange();
multiExchange.addExchange('BINANCE', new BinanceFuturesExchange());
multiExchange.addExchange('BYBIT', new BybitFuturesExchange());
const datafeed = new MultiExchangeDatafeed(multiExchange);
```

## Troubleshooting

### Lỗi: CCXT is not defined

**Nguyên nhân:** CCXT library chưa được load.

**Giải pháp:** Thêm vào `index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/ccxt@4.2.25/dist/ccxt.browser.js"></script>
```

### Lỗi: BaseExchange is not defined

**Nguyên nhân:** Scripts load không đúng thứ tự.

**Giải pháp:** Đảm bảo load theo thứ tự:
1. CCXT
2. BaseExchange
3. Exchange implementations
4. MultiExchange
5. MultiExchangeDatafeed
6. index.js
7. app.js

### Lỗi: Chart không load

**Nguyên nhân:** Datafeed không được khởi tạo đúng.

**Giải pháp:** Kiểm tra console log và đảm bảo:
```javascript
const datafeed = createDatafeed({
    enableBinanceFutures: true
});
```

## Rollback

Nếu cần rollback về code cũ:

```bash
# Restore backup
cp app.js.backup app.js

# Remove datasource scripts từ index.html
# Remove CCXT script từ index.html
```

## Next Steps

1. Test kỹ tất cả tính năng
2. Thêm exchanges mới nếu cần (Bybit, OKX, etc.)
3. Optimize performance (caching, batching)
4. Add error handling
5. Add logging
6. Add unit tests

## Support

Nếu có vấn đề, kiểm tra:
1. Browser console logs
2. Network tab (API calls)
3. WebSocket connections
4. datasource/README.md
