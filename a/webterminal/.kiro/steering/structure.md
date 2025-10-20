# Project Structure

## Root Files

- `index.html` - Main application UI with Vue.js
- `chart.html` - Detailed chart view for individual symbols
- `test-worker.html` - Worker testing/debugging interface
- `app.js` - Main Vue application logic and worker coordination
- `chart.js` - Chart initialization and real-time updates
- `config.js` - Global configuration (exchanges, settings, defaults)
- `utils.js` - Utility functions (storage, formatting, crypto icons)
- `indicators.js` - Technical indicator calculations (RSI, EMA, SMA)
- `calculator-worker.js` - Web Worker for indicator calculations

## Folders

### `/workers`
Exchange-specific Web Workers for parallel data fetching:
- `base-worker.js` - Abstract base class for all exchange workers
- `binance-worker.js` - Binance Futures implementation
- `bybit-worker.js` - Bybit implementation
- `okx-worker.js` - OKX implementation
- `kucoin-worker.js` - KuCoin Futures implementation
- `bingx-worker.js` - BingX implementation
- `mexc-worker.js` - MEXC implementation
- `kraken-futures-worker.js` - Kraken Futures implementation
- `kraken-spot-worker.js` - Kraken Spot implementation
- `bitfinex-worker.js` - Bitfinex implementation
- `bitmex-worker.js` - BitMEX implementation
- `htx-worker.js` - HTX (Huobi) implementation
- `hyperliquid-worker.js` - Hyperliquid implementation

### `/styles`
Modular CSS files:
- `variables.css` - CSS custom properties (colors, spacing)
- `base.css` - Base styles and typography
- `navbar.css` - Top navigation bar
- `layout.css` - Grid layout and panels
- `exchange-panel.css` - Left panel exchange cards
- `table.css` - Symbol data table
- `logs.css` - Log display styling
- `system-tabs.css` - Settings/Logs tabs
- `modal.css` - Whitelist management modal

## Architecture Patterns

### Worker System
Three-tier worker architecture:
1. **Exchange Workers** - Fetch OHLCV data from exchanges
2. **Calculator Worker** - Process indicators in parallel
3. **Main Thread** - UI updates and coordination

### Data Flow
```
Exchange Worker → Fetch OHLCV → Calculator Worker → Calculate Indicators → Main Thread → Update UI
```

### State Management
- Vue.js reactive data for UI state
- LocalStorage for persistent settings
- In-memory tracking for processed symbols

### Worker Communication
- `postMessage` for worker-to-main communication
- Message types: `init`, `status`, `weight`, `progress`, `ohlcv`, `log`, `error`, `countdown`
- Bidirectional communication for processed symbol tracking

## Key Design Decisions

- **No Framework Build**: CDN-based for simplicity
- **Web Workers**: Parallel processing without blocking UI
- **Modular CSS**: Separate files for maintainability
- **Base Worker Class**: Inheritance pattern for exchange workers
- **Symbol Normalization**: Consistent format across exchanges (e.g., `BTC/USDT`)
- **Proxy Support**: CORS workaround for restricted exchanges
