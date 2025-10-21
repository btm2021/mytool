# Shared Resources

## Overview

Để tránh duplicate code và dễ maintain, các modules và libraries được share giữa main app và chart viewer.

## Shared Libraries

Cả `index.html` và `chart/index.html` đều sử dụng:

### Local Files (from root directory)
```html
<!-- Vue.js & Bootstrap Vue -->
<script src="vue.min.js"></script>
<script src="bootstrap-vue.min.js"></script>

<!-- CCXT -->
<script src="ccxt.browser.js"></script>
```

### CDN (Bootstrap CSS & Lightweight Charts)
```html
<!-- Bootstrap CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- Lightweight Charts (chart only) -->
<script src="https://unpkg.com/lightweight-charts@4.2.1/dist/lightweight-charts.standalone.production.js"></script>
```

**Note**: Chart uses `../vue.min.js`, `../ccxt.browser.js` etc. to reference parent directory files.

## Shared Modules

### config.js
**Used by**: Main app, Chart viewer

**Exports**:
- `CONFIG` object với:
  - `exchanges[]` - Exchange configurations
  - `batchSize`, `klineLimit`, `timeframe` - Processing settings
  - `rsi`, `ema` - Indicator settings
  - `proxyURL` - Proxy configuration

**Usage**:
```javascript
// Access exchange config
const binanceConfig = CONFIG.exchanges.find(e => e.id === 'binance');

// Access settings
const timeframe = CONFIG.timeframe; // '15m'
```

### indicators.js
**Used by**: Main app (calculator.js), Chart viewer

**Exports**:
- `Indicators` object với methods:
  - `calculateRSI(closes, period)`
  - `calculateEMA(closes, period)`
  - `calculateSMA(closes, period)`
  - `calculateATR(ohlcv, period)`
  - `calculateATRBot(ohlcv, params)`
  - `calculateVSR(ohlcv, params)`
  - `calculateVWAP(ohlcv, params)`
  - `calculateWMASeries(ohlcv, params)`
  - `calculateHMASeries(ohlcv, params)`
  - `calculateAll(ohlcv, config)`
  - `generateSignal(indicators)`

**Usage**:
```javascript
// Calculate RSI
const rsi = Indicators.calculateRSI(closes, 14);

// Calculate all indicators
const result = Indicators.calculateAll(ohlcv, {
    rsiPeriod: 14,
    emaShort: 50,
    emaLong: 200
});
```

### utils.js
**Used by**: Main app, Chart viewer

**Exports**:
- `Utils` object với:
  - `storage` - LocalStorage wrapper
    - `get(key, defaultValue)`
    - `set(key, value)`
    - `remove(key)`
  - `formatNumber(num, decimals)`
  - `formatTime()`
  - `merge(target, source)`
  - `crypto` - Crypto utilities
    - `getIconUrl(symbol)`
    - `extractSymbol(pair)`
    - `extractQuote(pair)`

**Usage**:
```javascript
// Storage
Utils.storage.set('settings', { theme: 'dark' });
const settings = Utils.storage.get('settings');

// Formatting
const price = Utils.formatNumber(12345.6789, 2); // "12,345.68"
const time = Utils.formatTime(); // "14:30:45"

// Crypto
const icon = Utils.crypto.getIconUrl('BTC');
```

## Benefits

1. **No Duplication**: Libraries loaded once, used everywhere
2. **Consistent Behavior**: Same indicator calculations across app
3. **Easy Updates**: Update library version in one place
4. **Smaller Bundle**: No duplicate code
5. **Shared Configuration**: Single source of truth for settings

## File Structure

```
📁 Project Root
├── config.js           ← Shared
├── indicators.js       ← Shared
├── utils.js            ← Shared
├── index.html          ← Loads libraries
├── app.js              ← Uses shared modules
├── calculator.js       ← Uses indicators.js
└── 📁 chart/
    ├── index.html      ← Loads same libraries + references shared modules
    └── 📁 js/
        ├── config.js   ← Chart-specific state
        ├── utils.js    ← Chart-specific utilities
        ├── chart.js    ← Uses shared modules
        └── ...
```

## Important Notes

- Chart modules (js/config.js, js/utils.js) are **different** from parent modules
- Chart uses `../config.js` for CONFIG, but has its own `js/config.js` for ChartState
- Always use relative paths: `../config.js` from chart directory
- Libraries are loaded from CDN for both main app and chart
