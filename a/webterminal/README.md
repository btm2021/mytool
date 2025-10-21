# OHLCV Screener

Real-time cryptocurrency trading screener with technical indicators.

## Features

- 🔄 Multi-exchange support (11 exchanges)
- 📊 Technical indicators (RSI, EMA50, EMA200)
- 🎯 Trading signals (BUY/SELL/HOLD)
- ⚡ Real-time WebSocket prices (Binance)
- 📈 Interactive charts
- ⚙️ Whitelist management
- 💾 Settings persistence

## Quick Start

```bash
# Start HTTP server
python -m http.server 8000

# Open browser
http://localhost:8000
```

## Structure

```
📁 Project
├── 📁 exchanges/       # Exchange modules
├── 📁 styles/          # CSS files
├── 📁 chart/           # Chart viewer
│   ├── 📁 js/          # Chart JS modules
│   ├── 📁 styles/      # Chart CSS
│   └── index.html
├── index.html          # Main app
├── app.js              # Vue app
├── config.js           # Configuration (shared)
├── calculator.js       # Indicators calculator
├── indicators.js       # Technical indicators (shared)
└── utils.js            # Utilities (shared)
```

**Note**: Chart module reuses libraries (Vue, Bootstrap, CCXT) and shared modules (config.js, indicators.js, utils.js) from parent directory to avoid duplication.

## Supported Exchanges

- Binance Futures
- Bybit
- OKX
- KuCoin Futures
- BingX
- MEXC
- Bitfinex
- BitMEX
- HTX (Huobi)
- Hyperliquid

## Tech Stack

- Vue.js 2.7.14
- Bootstrap 4.6.2
- CCXT 4.2.25
- Lightweight Charts 4.1.1
- Pure HTML/CSS/JS (no build step)
