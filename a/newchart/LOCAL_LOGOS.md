# Local Logo System

## Vấn đề đã giải quyết

Trước đây app load logos từ TradingView CDN:
```
https://s3-symbol-logo.tradingview.com/crypto/btc.svg
```

Gặp lỗi **403 Forbidden** vì:
- TradingView block requests từ external domains
- CORS policy không cho phép

## Giải pháp

Sử dụng **local SVG files** từ thư mục `images/`:

```
images/
├── crypto/          # Logo crypto (BTC, ETH, etc.)
├── provider/        # Logo exchanges (Binance, OKX, Bybit)
├── country/         # Flags
├── indices/         # Stock indices
├── metal/           # Commodities
└── sector/          # Sectors
```

## Cách hoạt động

### 1. Crypto Logos
```javascript
// Symbol: BTCUSDT
// Base asset: BTC
// Logo path: images/crypto/BTC.svg
```

### 2. Exchange Logos
```javascript
// Exchange: BINANCE
// Logo path: images/provider/binance.svg
```

### 3. Multiple Logos
TradingView hỗ trợ hiển thị nhiều logos:
```javascript
logo_urls: [
    'images/crypto/BTC.svg',      // Crypto logo
    'images/provider/binance.svg'  // Exchange logo
]
```

## Danh sách Crypto có sẵn

Thư mục `images/crypto/` chứa hơn **1000+ crypto logos**:

### Popular Cryptos
- BTC, ETH, BNB, SOL, ADA, XRP, DOT, DOGE
- MATIC, AVAX, LINK, UNI, ATOM, LTC, BCH
- SHIB, PEPE, ARB, OP, APT, SUI, SEI
- Và nhiều hơn nữa...

### Formats
- SVG (vector, scale tốt)
- PNG (fallback cho một số coins)

## Danh sách Exchanges

Thư mục `images/provider/` chứa logos của:

### Crypto Exchanges
- ✅ Binance
- ✅ OKX  
- ✅ Bybit
- Coinbase, Kraken, Bitget, HTX, Phemex, etc.

### Traditional Brokers
- IBKR, Oanda, Pepperstone, IC Markets, etc.

## Fallback Strategy

Nếu logo không tồn tại:
1. Browser sẽ hiển thị broken image icon
2. TradingView vẫn hoạt động bình thường
3. Chỉ ảnh hưởng visual, không ảnh hưởng functionality

## Thêm Logo mới

### 1. Thêm Crypto Logo
```bash
# Download SVG file
# Đặt tên: SYMBOL.svg (uppercase)
# Copy vào: images/crypto/

# Ví dụ:
images/crypto/NEWCOIN.svg
```

### 2. Thêm Exchange Logo
```bash
# Download SVG file
# Đặt tên: exchange-name.svg (lowercase)
# Copy vào: images/provider/

# Ví dụ:
images/provider/newexchange.svg
```

### 3. Update code (nếu cần)
```javascript
// Trong app.js, thêm vào exchangeLogos:
const exchangeLogos = {
    'BINANCE': 'images/provider/binance.svg',
    'OKX': 'images/provider/okx.svg',
    'BYBIT': 'images/provider/bybit.svg',
    'NEWEXCHANGE': 'images/provider/newexchange.svg'  // Thêm dòng này
};
```

## Testing

### Test crypto logo
```javascript
// Trong browser console
changeSymbol('BTCUSDT', 'BINANCE');
// Kiểm tra logo BTC hiển thị
```

### Test exchange logo
```javascript
changeSymbol('ETHUSDT', 'OKX');
// Kiểm tra logo ETH và OKX hiển thị
```

### Test logo không tồn tại
```javascript
changeSymbol('UNKNOWNUSDT', 'BINANCE');
// App vẫn hoạt động, chỉ không có logo
```

## Performance

### Ưu điểm
✅ **Nhanh hơn**: Load từ local, không cần request external  
✅ **Không bị block**: Không có CORS issues  
✅ **Offline**: Hoạt động khi không có internet  
✅ **Cacheable**: Browser cache SVG files  

### Nhược điểm
⚠️ **File size**: Thư mục images ~50MB  
⚠️ **Maintenance**: Cần update manual khi có coin mới  

## Browser Cache

SVG files được cache bởi browser:
```
Cache-Control: public, max-age=31536000
```

Lần đầu load: Download tất cả logos  
Lần sau: Load từ cache (instant)

## Troubleshooting

### Logo không hiển thị
1. **Kiểm tra file tồn tại**
   ```bash
   # Check file
   ls images/crypto/BTC.svg
   ```

2. **Kiểm tra path đúng**
   ```javascript
   // Trong console
   console.log(symbolInfo.logo_urls);
   ```

3. **Kiểm tra Network tab**
   - Mở DevTools (F12)
   - Tab Network
   - Filter: SVG
   - Xem request có 404 không

### Logo bị lỗi format
- Đảm bảo file là SVG hợp lệ
- Test mở file trực tiếp trong browser
- Có thể cần optimize SVG

### Exchange logo không hiển thị
- Kiểm tra tên exchange trong `exchangeLogos`
- Kiểm tra file path đúng
- Case-sensitive: 'BINANCE' vs 'binance'

## Resources

### Download thêm logos
- [CoinGecko](https://www.coingecko.com/) - Crypto logos
- [CryptoCompare](https://www.cryptocompare.com/) - Crypto logos
- [Exchange websites](https://www.binance.com/) - Official logos

### SVG Optimization
```bash
# Optimize SVG files
npm install -g svgo
svgo images/crypto/*.svg
```

## Logo Map System

### Auto-generated Map
File `logo-maps.js` chứa map của tất cả logos:
```javascript
LOGO_MAPS = {
    crypto: {
        "BTC": "BTC.svg",
        "ETH": "ETH.svg",
        "DOGE": "DOGE.png",  // Some are PNG
        ...
    },
    provider: {
        "BINANCE": "binance.svg",
        "OKX": "okx.svg",
        ...
    }
}
```

### Rebuild Logo Map
Khi thêm logos mới:
```bash
# Windows
rebuild-logos.bat

# Or manually
node generate-logo-map.js
```

### How It Works
1. Script scan thư mục `images/crypto/` và `images/provider/`
2. Tạo map với key = tên file (uppercase)
3. Ưu tiên SVG hơn PNG nếu cả 2 tồn tại
4. Generate file `logo-maps.js`

### Statistics
- **726 crypto logos** (SVG + PNG)
- **64 provider logos**
- Auto-detect file extension
- Fallback nếu logo không tồn tại

## Migration từ TradingView CDN

### Before
```javascript
const logoUrl = `https://s3-symbol-logo.tradingview.com/crypto/${baseAsset.toLowerCase()}.svg`;
```

### After
```javascript
// With logo map
const cryptoKey = baseAsset.toUpperCase();
const file = LOGO_MAPS.crypto[cryptoKey];
const logoUrl = `images/crypto/${file}`;
```

### Benefits
- ✅ Không còn 403 errors
- ✅ Faster loading
- ✅ More reliable
- ✅ Offline support
- ✅ Auto-detect SVG/PNG
- ✅ 726 logos available
