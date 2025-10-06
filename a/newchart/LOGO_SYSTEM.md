# Logo System Documentation

## Overview

Hệ thống logo tự động scan và map tất cả logos từ thư mục `images/`.

## Files

```
├── images/
│   ├── crypto/          # 726 crypto logos (SVG/PNG)
│   └── provider/        # 64 exchange logos
├── logo-maps.js         # Auto-generated map
├── logo-summary.json    # Statistics
├── generate-logo-map.js # Generator script
└── rebuild-logos.bat    # Quick rebuild
```

## Quick Start

### 1. Generate Logo Map
```bash
node generate-logo-map.js
```

Output:
```
✅ Generated logo-maps.js
📊 Crypto logos: 726
📊 Provider logos: 64
✅ Generated logo-summary.json
```

### 2. Include in HTML
```html
<script src="logo-maps.js"></script>
<script src="app.js"></script>
```

### 3. Use in Code
```javascript
// Get logo for BTC
const btcFile = LOGO_MAPS.crypto['BTC'];  // "BTC.svg"
const logoUrl = `images/crypto/${btcFile}`;

// Get logo for Binance
const binanceFile = LOGO_MAPS.provider['BINANCE'];  // "binance.svg"
const exchangeUrl = `images/provider/${binanceFile}`;
```

## Logo Map Structure

### Crypto Map
```javascript
LOGO_MAPS.crypto = {
    "BTC": "BTC.svg",
    "ETH": "ETH.svg",
    "DOGE": "DOGE.png",
    "SHIB": "SHIB.svg",
    // ... 726 total
}
```

### Provider Map
```javascript
LOGO_MAPS.provider = {
    "BINANCE": "binance.svg",
    "OKX": "okx.svg",
    "BYBIT": "bybit.svg",
    // ... 64 total
}
```

## Features

### ✅ Auto-detect File Extension
Script tự động detect SVG hoặc PNG:
```javascript
// Ưu tiên SVG nếu cả 2 tồn tại
BTC.svg  ✅ Used
BTC.png  ❌ Ignored

// Dùng PNG nếu chỉ có PNG
DOGE.png ✅ Used
```

### ✅ Uppercase Keys
Tất cả keys đều uppercase:
```javascript
LOGO_MAPS.crypto['BTC']   ✅ Correct
LOGO_MAPS.crypto['btc']   ❌ Wrong
```

### ✅ Fallback Support
Nếu logo không trong map:
```javascript
const file = LOGO_MAPS.crypto[symbol] || `${symbol}.svg`;
```

## Adding New Logos

### Step 1: Add File
```bash
# Copy logo to images/crypto/
cp NEWCOIN.svg images/crypto/

# Or images/provider/
cp newexchange.svg images/provider/
```

### Step 2: Rebuild Map
```bash
# Windows
rebuild-logos.bat

# Or manually
node generate-logo-map.js
```

### Step 3: Verify
```javascript
// Check in browser console
console.log(LOGO_MAPS.crypto['NEWCOIN']);
// => "NEWCOIN.svg"
```

## Statistics

View `logo-summary.json`:
```json
{
  "generated_at": "2025-10-06T07:02:31.180Z",
  "crypto_count": 726,
  "provider_count": 64,
  "crypto_logos": ["1000SATS", "1INCH", "AAVE", ...],
  "provider_logos": ["BINANCE", "OKX", "BYBIT", ...]
}
```

## Integration with TradingView

### In Datafeed
```javascript
getLocalLogoUrls(baseAsset, exchange) {
    const logos = [];
    
    // Get crypto logo from map
    const cryptoKey = baseAsset.toUpperCase();
    if (LOGO_MAPS.crypto[cryptoKey]) {
        const file = LOGO_MAPS.crypto[cryptoKey];
        logos.push(`images/crypto/${file}`);
    }
    
    // Get exchange logo from map
    if (LOGO_MAPS.provider[exchange]) {
        const file = LOGO_MAPS.provider[exchange];
        logos.push(`images/provider/${file}`);
    }
    
    return logos;
}
```

### In Symbol Info
```javascript
const symbolInfo = {
    name: symbol,
    exchange: exchange,
    logo_urls: this.getLocalLogoUrls(baseAsset, exchange)
};
```

## Performance

### File Sizes
- SVG: ~2-10 KB each
- PNG: ~5-50 KB each
- Total: ~50 MB for all logos

### Loading
- First load: Download all used logos
- Subsequent: Browser cache (instant)
- No external requests (no 403 errors)

### Memory
- logo-maps.js: ~50 KB
- Loaded once at startup
- Minimal memory footprint

## Troubleshooting

### Logo not showing
```javascript
// Check if logo exists in map
console.log(LOGO_MAPS.crypto['SYMBOL']);

// Check file exists
fetch('images/crypto/SYMBOL.svg')
    .then(r => console.log('Exists:', r.ok));
```

### Map not loaded
```javascript
// Check if LOGO_MAPS is defined
if (typeof LOGO_MAPS === 'undefined') {
    console.error('logo-maps.js not loaded!');
}
```

### Wrong file extension
```bash
# Rebuild map to detect correct extension
node generate-logo-map.js
```

## Best Practices

### ✅ DO
- Rebuild map after adding new logos
- Use uppercase keys for lookup
- Check if logo exists before using
- Prefer SVG over PNG

### ❌ DON'T
- Edit logo-maps.js manually
- Use lowercase keys
- Assume all logos are SVG
- Hardcode file extensions

## Maintenance

### Regular Updates
```bash
# When adding multiple logos
1. Copy all new logos to images/
2. Run: node generate-logo-map.js
3. Commit logo-maps.js
4. Test in browser
```

### Cleanup
```bash
# Remove unused logos
1. Delete files from images/
2. Rebuild map
3. Verify app still works
```

## Examples

### Example 1: Get BTC Logo
```javascript
const btcFile = LOGO_MAPS.crypto['BTC'];
// => "BTC.svg"

const url = `images/crypto/${btcFile}`;
// => "images/crypto/BTC.svg"
```

### Example 2: Get Exchange Logo
```javascript
const binanceFile = LOGO_MAPS.provider['BINANCE'];
// => "binance.svg"

const url = `images/provider/${binanceFile}`;
// => "images/provider/binance.svg"
```

### Example 3: Multiple Logos
```javascript
function getSymbolLogos(symbol, exchange) {
    const logos = [];
    
    // Crypto logo
    const cryptoKey = symbol.replace('USDT', '').toUpperCase();
    if (LOGO_MAPS.crypto[cryptoKey]) {
        logos.push(`images/crypto/${LOGO_MAPS.crypto[cryptoKey]}`);
    }
    
    // Exchange logo
    if (LOGO_MAPS.provider[exchange]) {
        logos.push(`images/provider/${LOGO_MAPS.provider[exchange]}`);
    }
    
    return logos;
}

// Usage
const logos = getSymbolLogos('BTCUSDT', 'BINANCE');
// => ["images/crypto/BTC.svg", "images/provider/binance.svg"]
```

## Summary

✅ **726 crypto logos** available  
✅ **64 provider logos** available  
✅ **Auto-detect** SVG/PNG  
✅ **Fast loading** from local  
✅ **No 403 errors**  
✅ **Easy maintenance**  

🚀 **Ready to use!**
