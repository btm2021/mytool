# Search Filter Guide

Hướng dẫn sử dụng tính năng lọc trong search box của TradingView.

## Tổng quan

Search box hiện hỗ trợ lọc theo:
- **Exchange**: Binance Spot, Binance Futures
- **Type**: All, Spot, Futures

## Cấu hình hiện tại

### Exchanges

1. **BINANCE_SPOT** - Binance Spot
   - Type: `spot`
   - Symbols: BTCUSDT, ETHUSDT, etc.
   - Description: "BTC/USDT Spot"

2. **BINANCE_FUTURES** - Binance Futures
   - Type: `future`
   - Symbols: BTCUSDT, ETHUSDT, etc.
   - Description: "BTC/USDT Futures"

### Symbol Types

- **All** (value: `''`) - Hiển thị tất cả symbols từ mọi exchanges
- **Spot** (value: `'spot'`) - Chỉ hiển thị symbols từ Binance Spot
- **Futures** (value: `'future'`) - Chỉ hiển thị symbols từ Binance Futures

## Cách sử dụng

### 1. Lọc theo Exchange

Trong search box, chọn exchange từ dropdown:
- **Binance Spot** - Chỉ hiển thị spot symbols
- **Binance Futures** - Chỉ hiển thị futures symbols
- **All Exchanges** - Hiển thị tất cả

### 2. Lọc theo Type

Chọn type từ dropdown:
- **All** - Hiển thị tất cả loại
- **Spot** - Chỉ hiển thị spot trading
- **Futures** - Chỉ hiển thị futures trading

### 3. Kết hợp cả hai

Bạn có thể kết hợp cả exchange filter và type filter:
- Exchange: "Binance Spot" + Type: "Spot" → Chỉ Binance Spot
- Exchange: "All" + Type: "Futures" → Tất cả futures từ mọi exchanges
- Exchange: "All" + Type: "All" → Tất cả symbols

## Symbol Format

Symbols có format: `EXCHANGE:SYMBOL`

### Ví dụ:

**Binance Futures:**
- `BINANCE_FUTURES:BTCUSDT`
- `BINANCE_FUTURES:ETHUSDT`
- `BINANCE_FUTURES:BNBUSDT`

**Binance Spot:**
- `BINANCE_SPOT:BTCUSDT`
- `BINANCE_SPOT:ETHUSDT`
- `BINANCE_SPOT:BNBUSDT`

## Kết quả tìm kiếm

Mỗi kết quả hiển thị:
- **Symbol**: Tên symbol (VD: BTCUSDT)
- **Description**: Mô tả (VD: "BTC/USDT Futures")
- **Exchange**: Tên exchange (VD: "Binance Futures")
- **Type**: Loại (spot/future)
- **Logo**: Logo của coin và exchange

## Implementation Details

### Code Flow

1. User nhập text và chọn filters trong search box
2. TradingView gọi `searchSymbols(userInput, exchange, symbolType, callback)`
3. `MultiExchangeDatafeed` delegate đến `MultiExchange.searchSymbols()`
4. `MultiExchange` filter exchanges dựa trên:
   - `exchangeFilter`: Nếu có, chỉ search trên exchange đó
   - `symbolType`: Nếu có, chỉ search exchanges có matching type
5. Mỗi exchange thực hiện search và return results
6. Results được aggregate và return về TradingView

### Filter Logic

```javascript
// Trong MultiExchange.searchSymbols()
if (symbolType) {
    const marketType = exchange.getMarketType();
    if (marketType !== symbolType) {
        return; // Skip exchange này
    }
}
```

### Exchange Info

```javascript
// BinanceFuturesExchange
getExchangeInfo() {
    return {
        value: 'BINANCE_FUTURES',
        name: 'Binance Futures',
        desc: 'Binance Futures'
    };
}

getMarketType() {
    return 'future';
}
```

## Thêm Exchange mới

Để thêm exchange mới với filter support:

### 1. Tạo Exchange Class

```javascript
class NewExchange extends BaseExchange {
    constructor(options = {}) {
        super('NEW_EXCHANGE', {
            ...options,
            options: {
                defaultType: 'spot' // hoặc 'future'
            }
        });
    }

    getExchangeInfo() {
        return {
            value: 'NEW_EXCHANGE',
            name: 'New Exchange',
            desc: 'New Exchange Description'
        };
    }

    async searchSymbols(userInput, symbolType = 'spot') {
        // Implementation
        return symbols.map(s => ({
            symbol: s.symbol,
            full_name: `NEW_EXCHANGE:${s.symbol}`,
            description: `${s.base}/${s.quote} ${symbolType}`,
            exchange: 'NEW_EXCHANGE',
            type: symbolType,
            logo_urls: this.getLogoUrls(s.base)
        }));
    }
}
```

### 2. Add vào MultiExchange

```javascript
// Trong datasource/index.js
function createMultiExchange(config = {}) {
    const multiExchange = new MultiExchange();
    
    if (config.enableNewExchange === true) {
        const newExchange = new NewExchange(config.newExchangeOptions || {});
        multiExchange.addExchange('NEW_EXCHANGE', newExchange);
    }
    
    return multiExchange;
}
```

### 3. Update Symbol Types (nếu cần)

```javascript
// Trong MultiExchangeDatafeed.onReady()
symbols_types: [
    { name: 'All', value: '' },
    { name: 'Spot', value: 'spot' },
    { name: 'Futures', value: 'future' },
    { name: 'Swap', value: 'swap' } // Thêm type mới
]
```

## Testing

### Test Filter

1. Mở search box
2. Chọn "Binance Futures" từ exchange dropdown
3. Nhập "BTC"
4. Verify: Chỉ thấy BINANCE_FUTURES:BTCUSDT

5. Chọn "All Exchanges"
6. Chọn "Spot" từ type dropdown
7. Nhập "ETH"
8. Verify: Chỉ thấy BINANCE_SPOT:ETHUSDT

### Test Symbol Loading

1. Click vào symbol từ search results
2. Verify: Chart load đúng data
3. Verify: Symbol name hiển thị đúng format

## Troubleshooting

### Không thấy filter options

**Nguyên nhân:** `symbols_types` không được config đúng trong `onReady()`

**Giải pháp:** Kiểm tra `MultiExchangeDatafeed.onReady()` có return đúng config

### Filter không hoạt động

**Nguyên nhân:** `getMarketType()` không được implement hoặc return sai value

**Giải pháp:** 
- Kiểm tra exchange class có implement `getMarketType()`
- Verify return value match với symbol type ('spot', 'future', etc.)

### Duplicate symbols

**Nguyên nhân:** Cả Spot và Futures đều có cùng symbol name (VD: BTCUSDT)

**Giải pháp:** Đã được handle bằng cách:
- Sử dụng exchange prefix khác nhau (BINANCE_SPOT vs BINANCE_FUTURES)
- Description khác nhau ("BTC/USDT Spot" vs "BTC/USDT Futures")

## Best Practices

1. **Consistent Naming**: Sử dụng naming convention rõ ràng cho exchange IDs
   - `EXCHANGE_TYPE` format (VD: BINANCE_SPOT, BINANCE_FUTURES)

2. **Clear Descriptions**: Thêm type vào description để user dễ phân biệt
   - "BTC/USDT Spot" vs "BTC/USDT Futures"

3. **Type Values**: Sử dụng lowercase cho type values
   - 'spot', 'future', 'swap' (không phải 'Spot', 'Future')

4. **Market Type**: Đảm bảo `getMarketType()` return đúng type
   - Match với `defaultType` trong constructor options

## Future Enhancements

- [ ] Thêm filter theo quote currency (USDT, BUSD, etc.)
- [ ] Thêm filter theo volume
- [ ] Thêm favorite symbols
- [ ] Thêm recent symbols
- [ ] Custom symbol lists
