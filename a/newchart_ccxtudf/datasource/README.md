# Datasource Module

Module quản lý dữ liệu từ nhiều sàn giao dịch (exchanges) sử dụng thư viện CCXT.

## Kiến trúc

```
datasource/
├── base/
│   └── BaseExchange.js          # Base class cho tất cả exchanges
├── exchanges/
│   ├── BinanceFuturesExchange.js # Binance Futures implementation
│   └── BinanceSpotExchange.js    # Binance Spot implementation
├── MultiExchange.js              # Manager quản lý nhiều exchanges
├── MultiExchangeDatafeed.js      # Adapter cho TradingView
└── index.js                      # Entry point và factory functions
```

## Cách sử dụng

### 1. Sử dụng Factory Function (Đơn giản)

```javascript
// Tạo datafeed với cấu hình mặc định
const datafeed = createDatafeed({
    enableBinanceFutures: true,  // Bật Binance Futures
    enableBinanceSpot: false     // Tắt Binance Spot
});

// Sử dụng trong TradingView widget
const widget = new TradingView.widget({
    datafeed: datafeed,
    // ... các options khác
});
```

### 2. Sử dụng Manual (Linh hoạt hơn)

```javascript
// Tạo MultiExchange instance
const multiExchange = new MultiExchange();

// Thêm Binance Futures
const binanceFutures = new BinanceFuturesExchange({
    apiKey: 'your-api-key',
    secret: 'your-secret'
});
multiExchange.addExchange('BINANCE', binanceFutures);

// Thêm Binance Spot (tùy chọn)
const binanceSpot = new BinanceSpotExchange();
multiExchange.addExchange('BINANCE_SPOT', binanceSpot);

// Tạo datafeed
const datafeed = new MultiExchangeDatafeed(multiExchange);
```

### 3. Thêm Exchange mới

Để thêm exchange mới, tạo class kế thừa từ `BaseExchange`:

```javascript
class NewExchange extends BaseExchange {
    constructor(options = {}) {
        super('EXCHANGE_ID', options);
        // Custom initialization
    }

    // Override các methods nếu cần
    async searchSymbols(userInput, symbolType) {
        // Custom implementation
    }

    async fetchOHLCV(symbol, timeframe, since, limit) {
        // Custom implementation
    }

    subscribeWebSocket(symbol, resolution, callback, subscriberUID) {
        // Custom implementation
    }
}
```

## Classes

### BaseExchange

Base class chứa các phương thức chung sử dụng CCXT.

**Methods:**
- `initializeCCXT()` - Khởi tạo CCXT exchange
- `searchSymbols(userInput, symbolType)` - Tìm kiếm symbols
- `getSymbolInfo(symbol)` - Lấy thông tin symbol
- `fetchOHLCV(symbol, timeframe, since, limit)` - Lấy dữ liệu OHLCV
- `fetchTicker(symbol)` - Lấy ticker 24h
- `calculatePrecision(price)` - Tính precision cho TradingView
- `subscribeWebSocket(symbol, callback)` - Subscribe WebSocket (cần override)
- `destroy()` - Cleanup resources

### BinanceFuturesExchange

Implementation cho Binance Futures với các tính năng đặc biệt:
- Mark price WebSocket realtime
- 24hr ticker data caching
- Funding rate information

### BinanceSpotExchange

Implementation cho Binance Spot trading.

### MultiExchange

Manager quản lý nhiều exchanges.

**Methods:**
- `addExchange(exchangeId, exchangeInstance)` - Thêm exchange
- `getExchange(exchangeId)` - Lấy exchange instance
- `searchSymbols(userInput, exchangeFilter, symbolType)` - Tìm kiếm trên nhiều exchanges
- `fetchOHLCV(symbolString, timeframe, since, limit)` - Lấy OHLCV
- `subscribeWebSocket(symbolString, resolution, callback, subscriberUID)` - Subscribe WebSocket
- `getQuoteData(symbolString)` - Lấy quote data cho watchlist

### MultiExchangeDatafeed

Adapter giữa MultiExchange và TradingView Charting Library.

Implements TradingView Datafeed API:
- `onReady(callback)`
- `searchSymbols(userInput, exchange, symbolType, onResultReadyCallback)`
- `resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback)`
- `getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback)`
- `subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID)`
- `unsubscribeBars(subscriberUID)`
- `getQuotes(symbols, onDataCallback, onErrorCallback)`
- `subscribeQuotes(symbols, fastSymbols, onRealtimeCallback, listenerGUID)`
- `unsubscribeQuotes(listenerGUID)`

## Symbol Format

Symbols có format: `EXCHANGE:SYMBOL`

Ví dụ:
- `BINANCE:BTCUSDT` - Bitcoin trên Binance Futures
- `BINANCE_SPOT:ETHUSDT` - Ethereum trên Binance Spot

Nếu không có exchange prefix, sẽ sử dụng default exchange.

## Configuration Options

```javascript
const config = {
    // Bật/tắt exchanges
    enableBinanceFutures: true,
    enableBinanceSpot: false,
    
    // Options cho Binance Futures
    binanceFuturesOptions: {
        apiKey: 'your-api-key',
        secret: 'your-secret',
        // ... CCXT options
    },
    
    // Options cho Binance Spot
    binanceSpotOptions: {
        apiKey: 'your-api-key',
        secret: 'your-secret',
        // ... CCXT options
    }
};
```

## Dependencies

- **CCXT** - Thư viện cryptocurrency trading
  - CDN: `https://cdn.jsdelivr.net/npm/ccxt@4.2.25/dist/ccxt.browser.js`
  - Docs: https://docs.ccxt.com/

## Notes

- BaseExchange sử dụng CCXT để fetch dữ liệu, giúp dễ dàng thêm exchanges mới
- BinanceFuturesExchange có WebSocket realtime cho mark price và funding rate
- Mỗi exchange có thể override các methods để implement logic riêng
- MultiExchange cho phép sử dụng nhiều exchanges đồng thời

## Roadmap

- [ ] Thêm support cho Bybit Futures
- [ ] Thêm support cho OKX
- [ ] Implement order execution qua CCXT
- [ ] Thêm caching layer cho performance
- [ ] Support cho multiple timeframes WebSocket
