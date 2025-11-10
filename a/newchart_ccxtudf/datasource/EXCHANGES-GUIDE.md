# Exchanges Guide

Hướng dẫn về các exchanges được hỗ trợ trong dự án.

## Tổng quan

Dự án hiện hỗ trợ 6 exchanges:

### Binance
- **BINANCE_FUTURES** - Binance USDT Perpetual Futures
- **BINANCE_SPOT** - Binance Spot Trading

### OKX
- **OKX_FUTURES** - OKX USDT Perpetual Swap
- **OKX_SPOT** - OKX Spot Trading

### Bybit
- **BYBIT_FUTURES** - Bybit USDT Perpetual
- **BYBIT_SPOT** - Bybit Spot Trading

## Chi tiết từng Exchange

### 1. Binance Futures (BINANCE_FUTURES)

**API Endpoint:** `https://fapi.binance.com`  
**WebSocket:** `wss://fstream.binance.com/ws`

**Tính năng:**
- Mark price realtime WebSocket
- Funding rate information
- 24hr ticker data caching
- High liquidity

**Symbol Format:** `BTCUSDT`, `ETHUSDT`

**Ví dụ:**
```javascript
const binanceFutures = new BinanceFuturesExchange();
const symbols = await binanceFutures.searchSymbols('BTC');
// Result: BINANCE_FUTURES:BTCUSDT
```

---

### 2. Binance Spot (BINANCE_SPOT)

**API Endpoint:** `https://api.binance.com`  
**WebSocket:** `wss://stream.binance.com:9443/ws`

**Tính năng:**
- Spot trading
- Large selection of trading pairs
- High liquidity

**Symbol Format:** `BTCUSDT`, `ETHUSDT`

**Ví dụ:**
```javascript
const binanceSpot = new BinanceSpotExchange();
const symbols = await binanceSpot.searchSymbols('ETH');
// Result: BINANCE_SPOT:ETHUSDT
```

---

### 3. OKX Futures (OKX_FUTURES)

**API Endpoint:** `https://www.okx.com`  
**WebSocket:** `wss://ws.okx.com:8443/ws/v5/public`

**Tính năng:**
- USDT Perpetual Swap
- 24hr ticker data caching
- Good liquidity

**Symbol Format:** `BTCUSDT`, `ETHUSDT`  
**Internal Format:** `BTC-USDT-SWAP`

**Ví dụ:**
```javascript
const okxFutures = new OKXFuturesExchange();
const symbols = await okxFutures.searchSymbols('BTC');
// Result: OKX_FUTURES:BTCUSDT
```

**Notes:**
- OKX sử dụng format `BTC-USDT-SWAP` trong API
- Class tự động convert sang format `BTCUSDT` cho TradingView

---

### 4. OKX Spot (OKX_SPOT)

**API Endpoint:** `https://www.okx.com`  
**WebSocket:** `wss://ws.okx.com:8443/ws/v5/public`

**Tính năng:**
- Spot trading
- Wide range of trading pairs

**Symbol Format:** `BTCUSDT`, `ETHUSDT`  
**Internal Format:** `BTC-USDT`

**Ví dụ:**
```javascript
const okxSpot = new OKXSpotExchange();
const symbols = await okxSpot.searchSymbols('ETH');
// Result: OKX_SPOT:ETHUSDT
```

---

### 5. Bybit Futures (BYBIT_FUTURES)

**API Endpoint:** `https://api.bybit.com`  
**WebSocket:** `wss://stream.bybit.com/v5/public/linear`

**Tính năng:**
- USDT Perpetual contracts
- 24hr ticker data caching
- Competitive fees

**Symbol Format:** `BTCUSDT`, `ETHUSDT`

**Ví dụ:**
```javascript
const bybitFutures = new BybitFuturesExchange();
const symbols = await bybitFutures.searchSymbols('BTC');
// Result: BYBIT_FUTURES:BTCUSDT
```

---

### 6. Bybit Spot (BYBIT_SPOT)

**API Endpoint:** `https://api.bybit.com`  
**WebSocket:** `wss://stream.bybit.com/v5/public/spot`

**Tính năng:**
- Spot trading
- Growing selection of pairs

**Symbol Format:** `BTCUSDT`, `ETHUSDT`

**Ví dụ:**
```javascript
const bybitSpot = new BybitSpotExchange();
const symbols = await bybitSpot.searchSymbols('ETH');
// Result: BYBIT_SPOT:ETHUSDT
```

---

## Cấu hình

### Enable/Disable Exchanges

Trong `app.js`:

```javascript
const datafeed = createDatafeed({
    // Binance
    enableBinanceFutures: true,
    enableBinanceSpot: true,
    
    // OKX
    enableOKXFutures: true,
    enableOKXSpot: true,
    
    // Bybit
    enableBybitFutures: true,
    enableBybitSpot: true
});
```

### Custom Options

```javascript
const datafeed = createDatafeed({
    enableBinanceFutures: true,
    binanceFuturesOptions: {
        apiKey: 'your-api-key',
        secret: 'your-secret'
    },
    
    enableOKXFutures: true,
    okxFuturesOptions: {
        apiKey: 'your-api-key',
        secret: 'your-secret',
        password: 'your-passphrase'
    }
});
```

## So sánh Exchanges

| Exchange | Spot | Futures | WebSocket | 24hr Cache | Special Features |
|----------|------|---------|-----------|------------|------------------|
| Binance | ✅ | ✅ | ✅ | ✅ | Mark Price, Funding Rate |
| OKX | ✅ | ✅ | ✅ | ✅ | - |
| Bybit | ✅ | ✅ | ✅ | ✅ | - |

## Timeframes Support

Tất cả exchanges hỗ trợ các timeframes:
- `1` - 1 minute
- `5` - 5 minutes
- `15` - 15 minutes
- `30` - 30 minutes
- `60` - 1 hour
- `240` - 4 hours
- `1D` - 1 day
- `1W` - 1 week
- `1M` - 1 month

## Symbol Format Conversion

### Binance
- TradingView: `BTCUSDT`
- API: `BTCUSDT`
- No conversion needed

### OKX
- TradingView: `BTCUSDT`
- API Spot: `BTC-USDT`
- API Futures: `BTC-USDT-SWAP`
- Auto conversion in class

### Bybit
- TradingView: `BTCUSDT`
- API: `BTCUSDT`
- No conversion needed

## WebSocket Subscriptions

### Binance
```javascript
// Kline stream
wss://fstream.binance.com/ws/btcusdt@kline_15m
```

### OKX
```javascript
// Subscribe message
{
    "op": "subscribe",
    "args": [{
        "channel": "candle15m",
        "instId": "BTC-USDT-SWAP"
    }]
}
```

### Bybit
```javascript
// Subscribe message
{
    "op": "subscribe",
    "args": ["kline.15.BTCUSDT"]
}
```

## API Rate Limits

### Binance
- REST: 2400 requests/minute
- WebSocket: 300 connections

### OKX
- REST: 20 requests/2 seconds per IP
- WebSocket: 480 subscriptions per connection

### Bybit
- REST: 120 requests/minute
- WebSocket: 500 subscriptions per connection

## Error Handling

Tất cả exchanges implement error handling:

```javascript
try {
    const symbols = await exchange.searchSymbols('BTC');
} catch (error) {
    console.error('Error searching symbols:', error);
    return [];
}
```

## Testing

### Test Single Exchange

```javascript
// Test Binance Futures
const binanceFutures = new BinanceFuturesExchange();
await binanceFutures.waitForDataReady();
const symbols = await binanceFutures.searchSymbols('BTC');
console.log(symbols);
```

### Test All Exchanges

```javascript
const multiExchange = createMultiExchange({
    enableBinanceFutures: true,
    enableOKXFutures: true,
    enableBybitFutures: true
});

const allSymbols = await multiExchange.searchSymbols('BTC');
console.log(allSymbols);
```

## Troubleshooting

### Exchange không load

**Kiểm tra:**
1. Script đã được load trong `index.html`
2. Exchange được enable trong config
3. API endpoint accessible (không bị firewall/VPN block)

### Symbols không hiển thị

**Kiểm tra:**
1. `initializeGlobalData()` đã chạy xong
2. API response có data
3. Symbol format đúng

### WebSocket không hoạt động

**Kiểm tra:**
1. WebSocket URL đúng
2. Subscribe message format đúng
3. Browser console có lỗi không

## Best Practices

1. **Enable chỉ exchanges cần dùng** - Giảm API calls và memory
2. **Sử dụng 24hr data cache** - Tránh spam API
3. **Handle errors gracefully** - Không crash khi 1 exchange fail
4. **Monitor rate limits** - Tránh bị ban
5. **Use WebSocket cho realtime** - Hiệu quả hơn polling

## Future Enhancements

- [ ] Add more exchanges (Gate.io, Kraken, etc.)
- [ ] Support for options trading
- [ ] Support for margin trading
- [ ] Advanced order types
- [ ] Portfolio tracking across exchanges
