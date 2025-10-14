# Frontend Documentation

## 🎨 Overview

Vue.js 3 based dashboard for monitoring and managing the OHLCV data collection system. Modular architecture with ES6 modules for maintainability.

## 📁 Structure

```
src/web/
├── js/
│   ├── app.js                 # Main entry point
│   ├── utils.js               # Utility functions
│   ├── websocket.js           # WebSocket management
│   ├── system.js              # System monitoring
│   ├── logs.js                # Terminal logs
│   ├── command.js             # Command input
│   ├── symbols.js             # Symbols display
│   ├── realtime.js            # Realtime data
│   ├── config.js              # Configuration modal
│   ├── symbols-manager.js     # Symbols manager modal
│   ├── app-actions.js         # App actions
│   └── reload-progress.js     # Reload progress overlay
├── styles/
│   ├── base.css               # Base styles
│   ├── header.css             # Header styles
│   ├── layout.css             # Layout grid
│   ├── buttons.css            # Button styles
│   ├── tables.css             # Table styles
│   ├── system.css             # System monitor
│   ├── terminal.css           # Terminal log
│   ├── symbols.css            # Symbols manager
│   ├── modal.css              # Modal dialogs
│   ├── chart.css              # Chart viewer
│   └── reload-progress.css    # Progress overlay
├── index.html                 # Main dashboard
├── chart.html                 # Chart viewer
└── style.css                  # Main stylesheet (imports)
```

## 🔧 Architecture

### Modular Design

Each feature is a separate Vue mixin module:

```javascript
// Example: symbols.js
export function createSymbolsMixin() {
  return {
    data() { /* state */ },
    computed: { /* computed properties */ },
    methods: { /* methods */ }
  };
}
```

### Main App

```javascript
// app.js
import { createSymbolsMixin } from './symbols.js';
import { createLogsMixin } from './logs.js';
// ... other imports

const appConfig = mergeMixins(
  createSymbolsMixin(),
  createLogsMixin(),
  // ... other mixins
);

createApp(appConfig).mount('#app');
```

## 📊 Components

### 1. System Monitor

**File**: `js/system.js`

**Features**:
- CPU usage and cores
- Memory usage
- Heap memory
- Database size
- Disk space
- Uptime
- Platform info

**Data Source**: `/system_info` WebSocket message

### 2. Worker Threads

**File**: `js/system.js`

**Features**:
- Worker name
- CPU usage (ms)
- Heap usage (MB)
- Status indicator (●/X)

**Data Source**: `/worker_metrics` WebSocket message

**Styling**:
- Fixed height: 180px
- Auto-scroll
- Color-coded status

### 3. Symbols Table

**File**: `js/symbols.js`

**Features**:
- Symbol list from config
- Exchange name (color-coded)
- Status indicator
- Quick chart access
- Filter by exchange
- Search symbols

**Data Source**: `/config` endpoint

**Exchange Colors**:
- Binance: `#f0b90b` (yellow)
- Bybit: `#f7931a` (orange)
- OKX: `#00d4aa` (teal)

### 4. Realtime Data

**File**: `js/realtime.js`

**Features**:
- Live OHLCV updates
- Price flash effects (green/red)
- Volume display
- Timestamp
- Exchange color-coding

**Data Source**: `/candle` WebSocket message

**Flash Effects**:
- Green: Price increased
- Red: Price decreased
- Duration: 500ms

### 5. Terminal Log

**File**: `js/logs.js`

**Features**:
- System events
- Worker status
- Errors and warnings
- Command responses
- Auto-scroll
- Max 500 entries

**Log Types**:
- `info`: Blue
- `success`: Green
- `warn`: Yellow
- `error`: Red
- `validated`: Green

### 6. Symbols Manager

**File**: `js/symbols-manager.js`

**Features**:
- Exchange tabs
- Whitelist management
- Available symbols (sorted by volume)
- Search and filter
- Enable/disable exchange
- Save configuration

**Workflow**:
1. Open modal
2. Select exchange
3. Add/remove symbols
4. Click SAVE
5. System reloads

**Loading States**:
- Exchange switch: Loading overlay
- Symbol fetch: Loading message
- Save: Progress updates

### 7. Reload Progress

**File**: `js/reload-progress.js`

**Features**:
- Full-screen overlay
- Animated spinner
- Status messages
- Progress bar
- Auto-hide on complete

**Statuses**:
- Stopping: ⏸️ Orange
- Updating: 📝 Blue
- Checking: 🔍 Purple
- Backfilling: 📥 Cyan
- Subscribing: 🔔 Green
- Completed: ✅ Green
- Error: ❌ Red

## 🎨 Styling

### Theme

- Background: `#0a0a0a` (dark)
- Text: `#e0e0e0` (light gray)
- Primary: `#0af` (cyan)
- Success: `#0f0` (green)
- Warning: `#ff9800` (orange)
- Error: `#f00` (red)

### Typography

- Font: System fonts with monospace fallback
- Base size: 13px
- Line height: 1.5
- Antialiasing: Enabled

### Layout

- Grid-based
- Flexbox panels
- Fixed heights for consistency
- Responsive tables
- Sticky headers

### Components

**Buttons**:
- Primary: Cyan background
- Success: Green background
- Warning: Orange background
- Danger: Red background
- Small: Compact padding

**Tables**:
- Sticky headers
- Hover effects
- Zebra striping
- Fixed column widths
- Auto-scroll

**Modals**:
- Dark overlay (90% opacity)
- Centered content
- Close button
- Click outside to close

## 🔄 Data Flow

### WebSocket Connection

```javascript
// websocket.js
connect() {
  this.ws = new WebSocket(`ws://${location.host}`);
  
  this.ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    this.handleMessage(message);
  };
}
```

### Message Handling

```javascript
handleMessage(message) {
  switch (message.type) {
    case 'candle':
      this.updateRealtimeData(message.data);
      break;
    case 'worker_metrics':
      this.workerMetrics = message.data;
      break;
    case 'system_info':
      this.updateSystemInfo(message.data);
      break;
    // ... other cases
  }
}
```

### State Management

```javascript
// Reactive data
data() {
  return {
    wsConnected: false,
    workerMetrics: {},
    dbSymbols: {},
    realtimeDataMap: new Map(),
    logs: []
  };
}

// Computed properties
computed: {
  filteredSymbols() {
    return this.symbols.filter(/* ... */);
  }
}
```

## 🔧 Key Features

### 1. Cache Busting

Always fetch fresh data:

```javascript
const timestamp = Date.now();
const response = await fetch(`/config?_=${timestamp}`);
```

### 2. Loading States

Show loading overlay during async operations:

```javascript
this.isLoadingExchange = true;
try {
  await fetchData();
} finally {
  this.isLoadingExchange = false;
}
```

### 3. Real-time Sync

Immediately update UI when data changes:

```javascript
// Remove symbol
this.removeSymbolFromUI(exchange, symbol);
this.removeRealtimeData(exchange, symbol);

// Add symbol
this.addSymbolToUI(exchange, symbol);
```

### 4. Error Handling

Graceful error handling with user feedback:

```javascript
try {
  await operation();
  this.addLog('✅ Success', 'validated');
} catch (err) {
  this.addLog(`❌ Error: ${err.message}`, 'error');
}
```

## 📱 Responsive Design

- Fixed layout (no mobile support)
- Optimized for 1920x1080
- Minimum width: 1280px
- Three-column layout
- Scrollable panels

## 🎯 Best Practices

### 1. Always Use Cache Busters

```javascript
fetch(`/config?_=${Date.now()}`);
```

### 2. Update UI Immediately

Don't wait for server confirmation:

```javascript
// Update local state first
this.symbols = newSymbols;

// Then sync with server
await fetch('/save', { ... });
```

### 3. Show Loading States

Always indicate async operations:

```javascript
this.isLoading = true;
await operation();
this.isLoading = false;
```

### 4. Handle Errors Gracefully

```javascript
try {
  await operation();
} catch (err) {
  this.addLog(`Error: ${err.message}`, 'error');
}
```

### 5. Clean Up Resources

```javascript
// Remove old data
this.realtimeDataMap.delete(key);

// Clear intervals
clearInterval(this.timer);
```

## 🔍 Debugging

### Vue DevTools

Install Vue DevTools extension to inspect:
- Component state
- Computed properties
- Events
- Performance

### Console Logging

```javascript
console.log('[Module] Action:', data);
```

### Network Tab

Monitor:
- WebSocket messages
- HTTP requests
- Response times
- Errors

## 🚀 Performance

### Optimizations

1. **Virtual Scrolling**: Not implemented (tables are small)
2. **Debouncing**: Search inputs debounced
3. **Lazy Loading**: Symbols loaded on demand
4. **Memoization**: Computed properties cached
5. **Event Delegation**: Minimal event listeners

### Metrics

- Initial load: <1s
- WebSocket latency: <50ms
- UI update: <16ms (60fps)
- Memory: ~50MB

## 📝 Adding New Features

### 1. Create Module

```javascript
// js/new-feature.js
export function createNewFeatureMixin() {
  return {
    data() {
      return { newData: [] };
    },
    methods: {
      newMethod() { /* ... */ }
    }
  };
}
```

### 2. Import in App

```javascript
// js/app.js
import { createNewFeatureMixin } from './new-feature.js';

const appConfig = mergeMixins(
  // ... existing mixins
  createNewFeatureMixin()
);
```

### 3. Add UI

```html
<!-- index.html -->
<div v-for="item in newData" :key="item.id">
  {{ item.name }}
</div>
```

### 4. Add Styles

```css
/* styles/new-feature.css */
.new-feature {
  /* styles */
}
```

## 🔗 Dependencies

- **Vue.js 3**: Reactive framework
- **CCXT Browser**: Exchange API (for future use)

## 📚 Resources

- [Vue.js 3 Docs](https://vuejs.org/)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
