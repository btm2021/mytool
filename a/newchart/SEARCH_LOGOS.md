# Search with Logos

## Tính năng

Khi search symbols trong TradingView, mỗi kết quả sẽ hiển thị:
- ✅ Symbol name (e.g. BTCUSDT)
- ✅ Description (e.g. BTC/USDT)
- ✅ Exchange (e.g. BINANCE)
- ✅ **Crypto logo** (e.g. BTC.svg)
- ✅ **Exchange logo** (e.g. binance.svg)

## Cách hoạt động

### 1. User search
```
User gõ: "BTC"
```

### 2. API trả về symbols
```javascript
[
    { symbol: "BTCUSDT", baseAsset: "BTC", quoteAsset: "USDT" },
    { symbol: "BTCBUSD", baseAsset: "BTC", quoteAsset: "BUSD" },
    ...
]
```

### 3. Thêm logos vào kết quả
```javascript
symbols.map(s => {
    const baseAsset = s.baseAsset;  // "BTC"
    const logoUrls = this.getLocalLogoUrls(baseAsset, exchange);
    
    return {
        symbol: s.symbol,
        description: s.baseAsset + '/' + s.quoteAsset,
        logo_urls: logoUrls  // ["images/crypto/BTC.svg", "images/provider/binance.svg"]
    };
});
```

### 4. TradingView hiển thị
```
🪙 BTC/USDT
   BTCUSDT - BINANCE
   [Logo BTC] [Logo Binance]
```

## Implementation

### In searchSymbols()
```javascript
searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
    // ... fetch symbols ...
    
    symbols = symbols.map(s => {
        const baseAsset = s.baseAsset || s.symbol.replace('USDT', '');
        const logoUrls = this.getLocalLogoUrls(baseAsset, exchange);
        
        return {
            symbol: s.symbol,
            full_name: `${exchange}:${s.symbol}`,
            description: s.baseAsset + '/' + s.quoteAsset,
            exchange: exchange,
            type: 'crypto',
            logo_urls: logoUrls  // ← Thêm logos
        };
    });
    
    onResultReadyCallback(symbols);
}
```

### Logo URLs Structure
```javascript
logo_urls: [
    "images/crypto/BTC.svg",      // Crypto logo
    "images/provider/binance.svg"  // Exchange logo (optional)
]
```

## Examples

### Example 1: Search "BTC"
```
Results:
┌─────────────────────────────────┐
│ 🪙 BTC/USDT                     │
│    BTCUSDT - BINANCE            │
│    [BTC logo] [Binance logo]    │
├─────────────────────────────────┤
│ 🪙 BTC/BUSD                     │
│    BTCBUSD - BINANCE            │
│    [BTC logo] [Binance logo]    │
└─────────────────────────────────┘
```

### Example 2: Search "ETH"
```
Results:
┌─────────────────────────────────┐
│ 🪙 ETH/USDT                     │
│    ETHUSDT - BINANCE            │
│    [ETH logo] [Binance logo]    │
├─────────────────────────────────┤
│ 🪙 ETH/BTC                      │
│    ETHBTC - BINANCE             │
│    [ETH logo] [Binance logo]    │
└─────────────────────────────────┘
```

### Example 3: Empty search
```
Results: (50 first symbols)
┌─────────────────────────────────┐
│ 🪙 BTC/USDT                     │
│ 🪙 ETH/USDT                     │
│ 🪙 BNB/USDT                     │
│ ... (47 more)                   │
└─────────────────────────────────┘
```

## Benefits

### ✅ Visual Recognition
- Dễ nhận diện symbol qua logo
- Không cần đọc text
- Professional look

### ✅ Fast Selection
- Nhận diện nhanh crypto muốn trade
- Phân biệt exchanges
- Giảm sai sót

### ✅ Consistent UI
- Logos giống nhau ở search và chart
- Unified experience
- Brand recognition

## Performance

### Loading
- Logos load lazy (khi scroll)
- Browser cache sau lần đầu
- Minimal impact on search speed

### Memory
- Logos reuse từ cache
- Không duplicate downloads
- Efficient rendering

## Troubleshooting

### Logo không hiển thị trong search
```javascript
// Check if logo_urls được thêm
console.log(symbols[0].logo_urls);
// => ["images/crypto/BTC.svg", "images/provider/binance.svg"]
```

### Logo bị lỗi
```javascript
// Check if file exists
const file = LOGO_MAPS.crypto['BTC'];
console.log(file);  // => "BTC.svg"
```

### Search chậm
```javascript
// Giảm số kết quả
symbols = symbols.slice(0, 30);  // Từ 50 xuống 30
```

## Customization

### Chỉ hiển thị crypto logo
```javascript
const logoUrls = this.getLocalLogoUrls(baseAsset, exchange);
// Chỉ lấy logo đầu tiên (crypto)
logo_urls: [logoUrls[0]]
```

### Thêm fallback logo
```javascript
const logoUrls = this.getLocalLogoUrls(baseAsset, exchange);
if (logoUrls.length === 0) {
    logoUrls.push('images/crypto/default.svg');
}
```

### Custom logo size
TradingView tự động scale logos, không cần config.

## Testing

### Test search với logos
1. Mở app
2. Click vào symbol name trên chart
3. Gõ "BTC" vào search box
4. Verify:
   - ✅ Kết quả hiển thị
   - ✅ Logos hiển thị
   - ✅ Không có broken images

### Test với symbol không có logo
1. Search symbol hiếm (e.g. "RARE")
2. Verify:
   - ✅ Symbol vẫn hiển thị
   - ✅ Fallback logo hoặc no logo
   - ✅ Không crash

### Test performance
1. Search empty (hiển thị 50 symbols)
2. Scroll nhanh
3. Verify:
   - ✅ Smooth scrolling
   - ✅ Logos load progressively
   - ✅ No lag

## Best Practices

### ✅ DO
- Giới hạn số kết quả (50 max)
- Sử dụng logo map
- Handle missing logos gracefully
- Cache logos

### ❌ DON'T
- Load quá nhiều kết quả
- Hardcode logo paths
- Block UI khi load logos
- Ignore errors

## Summary

✅ **Logos in search results**  
✅ **726 crypto logos available**  
✅ **64 exchange logos**  
✅ **Fast & efficient**  
✅ **Professional UI**  

🎨 **Better UX!**
