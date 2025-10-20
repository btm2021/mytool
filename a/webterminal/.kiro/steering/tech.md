# Technology Stack

## Core Technologies

- **Frontend Framework**: Vue.js 2.7.14 (CDN-based, no build step)
- **UI Framework**: Bootstrap 4.6.2 + Bootstrap Vue 2.23.1
- **Charting Library**: Lightweight Charts 4.1.1
- **Exchange Integration**: CCXT 4.2.25 (browser version)
- **Architecture**: Web Workers for parallel processing

## Project Structure

- **No Build System**: Pure HTML/CSS/JS served directly
- **No Package Manager**: All dependencies loaded via CDN
- **No Transpilation**: Modern ES6+ JavaScript
- **Browser-Based**: Runs entirely in the browser

## Key Libraries

```javascript
// CDN Dependencies
- Vue.js 2.7.14
- Bootstrap 4.6.2
- Bootstrap Vue 2.23.1
- CCXT 4.2.25 (ccxt.browser.js)
- Lightweight Charts 4.1.1
```

## Running the Application

**Development/Production**:
- Serve files with any static HTTP server
- Example: `python -m http.server 8000`
- Open `index.html` in browser
- No compilation or build step required

**Testing Workers**:
- Open `test-worker.html` for isolated worker debugging

## Browser Requirements

- Modern browser with ES6+ support
- WebSocket support for real-time updates
- Web Workers support for parallel processing
- LocalStorage for settings persistence

## Configuration

All configuration is in `config.js`:
- Exchange settings (colors, weights, whitelists)
- Processing parameters (batch size, delays, timeframes)
- Indicator settings (RSI, EMA periods)
- Proxy configuration for CORS-restricted exchanges
