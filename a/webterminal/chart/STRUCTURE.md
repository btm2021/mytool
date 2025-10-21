# Chart Module Structure (Vue.js)

## Files Organization

```
📁 chart/
├── 📁 js/
│   └── chart-vue.js    - Vue.js app (all-in-one)
├── 📁 styles/
│   ├── chart.css       - Chart layout & controls
│   ├── pnl.css         - PNL panel styles
│   └── modal.css       - Modal & config styles
├── index.html          - Vue.js template
└── index-old.html      - Old vanilla JS version (backup)

```

**Note**: Refactored from vanilla JS to Vue.js for easier maintenance.

## Module Responsibilities

### Shared Modules (from parent)
- **../config.js** - Global CONFIG object (exchanges, settings)
- **../indicators.js** - Technical indicator calculations (RSI, EMA, SMA, ATR, etc.)
- **../utils.js** - Global Utils object (storage, formatting, crypto icons)
- **../vue.min.js** - Vue.js 2.7.14
- **../bootstrap-vue.min.js** - Bootstrap Vue 2.23.1
- **../ccxt.browser.js** - CCXT 4.2.25

### Chart Vue App (js/chart-vue.js)

Single Vue.js application containing all logic:

#### Data
- URL parameters (exchangeId, symbol)
- Chart state (timeframe, loading, status)
- Market data (price, change, high, low, volume)
- PNL state (mode, points, markers, history)
- Indicator configuration
- Chart instances (chart, series)

#### Methods
- **init()** - Initialize exchange and load data
- **loadMarketData()** - Fetch 24h ticker data
- **loadChartData()** - Fetch OHLCV data in batches
- **createChart()** - Create Lightweight Charts instance
- **updateAllIndicators()** - Update all indicator series
- **changeTimeframe()** - Switch timeframe and reload
- **togglePNL()** - Enable/disable PNL calculator mode
- **handlePNLClick()** - Handle chart clicks for PNL
- **calculatePNL()** - Calculate PNL from entry/exit
- **saveConfig()** - Save indicator config to localStorage
- Utility methods (formatPrice, formatVolume, etc.)

## Load Order

1. External libraries:
   - Bootstrap CSS 4.6.2 (CDN)
   - Bootstrap Vue CSS 2.23.1 (CDN)
   - Vue.js 2.7.14 (local: ../vue.min.js)
   - Bootstrap Vue 2.23.1 (local: ../bootstrap-vue.min.js)
   - CCXT 4.2.25 (local: ../ccxt.browser.js)
   - Lightweight Charts 4.2.1 (CDN)

2. Shared modules (from parent directory):
   - ../config.js (CONFIG object)
   - ../indicators.js (Indicators calculations)
   - ../utils.js (Utils object)

3. Chart styles:
   - styles/chart.css
   - styles/pnl.css
   - styles/modal.css

4. Chart Vue app:
   - js/chart-vue.js (single file, all logic)

## State Management

All state is managed by Vue.js reactive data in `chart-vue.js`:
- Chart state (timeframe, loading, status)
- Market data (price, change, volume)
- PNL state (mode, points, markers, history)
- Indicator configuration
- Chart instances (chart, candlestickSeries, indicator series)

## Styling

Modular CSS files:
- `chart.css` - Main layout, header, controls
- `pnl.css` - PNL panel & history table
- `modal.css` - Configuration modal (now using Bootstrap Vue modal)

## Benefits of Vue.js Refactor

1. **Reactive Data**: Automatic UI updates when data changes
2. **Cleaner Code**: No manual DOM manipulation
3. **Component-Based**: Bootstrap Vue components (b-modal, b-form-checkbox)
4. **Easier Maintenance**: Single source of truth for state
5. **Better UX**: Smooth transitions and updates
6. **Less Code**: Vue handles rendering logic
