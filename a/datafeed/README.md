# OHLCV Data Feed System

Hệ thống thu thập, lưu trữ và hiển thị dữ liệu OHLCV realtime từ các sàn giao dịch crypto (Binance, Bybit, OKX).

## 🚀 Cài đặt

```bash
npm install
```

## ▶️ Chạy ứng dụng

```bash
npm start
```

Ứng dụng sử dụng **Worker Threads** để tối ưu hiệu suất và xử lý đa luồng.

## 🌐 Truy cập

Mở trình duyệt: **http://localhost:3000**

## 📁 Cấu trúc dự án

```
src/
├── config/
│   └── config.js              # Configuration manager
├── core/
│   ├── aggregator.js          # OHLCV aggregation logic
│   ├── constants.js           # Constants & timeframes
│   ├── db.js                  # SQLite database wrapper
│   ├── logger.js              # Logging system
│   ├── system_monitor.js      # System metrics monitor
│   ├── utils.js               # Utility functions
│   └── validator.js           # Data validation
├── datasources/
│   ├── datasource_base.js     # Base class for exchanges
│   ├── binance_future.js      # Binance Futures connector
│   ├── bybit_future.js        # Bybit Futures connector
│   └── okx_future.js          # OKX Futures connector
├── server/                     # HTTP Server modules (modular)
│   ├── routes/
│   │   ├── database.routes.js # Database endpoints
│   │   ├── exchange.routes.js # Exchange management
│   │   ├── ohlcv.routes.js    # OHLCV data endpoints
│   │   ├── system.routes.js   # System control
│   │   └── config.routes.js   # Configuration
│   ├── services/
│   │   └── exchange.service.js # Exchange API calls
│   └── websocket/
│       └── handler.js         # WebSocket logic
├── web/                        # Frontend (modular styles)
│   ├── styles/
│   │   ├── base.css           # Base & resets
│   │   ├── header.css         # Header styles
│   │   ├── layout.css         # Layout grid
│   │   ├── buttons.css        # Button styles
│   │   ├── tables.css         # Table styles
│   │   ├── system.css         # System monitor
│   │   ├── terminal.css       # Terminal log
│   │   ├── symbols.css        # Symbols manager
│   │   ├── modal.css          # Modal dialogs
│   │   └── chart.css          # Chart page
│   ├── index.html             # Main dashboard
│   ├── chart.html             # Chart viewer
│   ├── app.js                 # Frontend logic
│   ├── chart.js               # Chart rendering
│   └── style.css              # Main stylesheet (imports)
├── workers/
│   ├── main_worker.js         # Main coordinator worker
│   ├── datasource_worker.js   # Exchange data collector worker
│   └── server_worker.js       # HTTP/WebSocket server worker
├── collector.js               # Data collection orchestrator
└── index_threaded.js          # Entry point (multi-threaded)

config.json                    # User configuration
data/                          # SQLite database storage
```

## ⚙️ Kiến trúc Worker Threads

```
Main Thread (index_threaded.js)
    │
    ├─► Main Worker (main_worker.js)
    │   └─► Coordinates all operations
    │
    ├─► Server Worker (server_worker.js)
    │   ├─► HTTP API Server
    │   └─► WebSocket Server
    │
    └─► Datasource Workers (datasource_worker.js)
        ├─► Binance Worker
        ├─► Bybit Worker
        └─► OKX Worker
```

## 🎯 Tính năng

### Thu thập dữ liệu
- ✅ Realtime WebSocket từ Binance, Bybit, OKX
- ✅ Bootstrap tự động khi khởi động
- ✅ Tự động reconnect khi mất kết nối
- ✅ Validation dữ liệu trước khi lưu

### Lưu trữ
- ✅ SQLite database với WAL mode
- ✅ Batch insert tối ưu hiệu suất
- ✅ Tự động cleanup dữ liệu cũ
- ✅ Index tối ưu cho query nhanh

### Hiển thị
- ✅ Dashboard realtime với WebSocket
- ✅ Chart viewer với nhiều timeframes
- ✅ Quản lý symbols qua UI
- ✅ System monitor (CPU, Memory, Disk)
- ✅ Worker threads metrics

### Quản lý
- ✅ Hot reload configuration
- ✅ Restart system qua UI
- ✅ Delete database qua UI
- ✅ Terminal commands (reload, status, list)

## 🔌 API Endpoints

### Database
- `GET /databaseSymbols` - Lấy tất cả symbols từ database (grouped by exchange)

### OHLCV Data
- `GET /ohlcv?exchange=&symbol=&timeframe=&limit=` - Lấy dữ liệu OHLCV

### Exchanges
- `GET /exchanges` - Lấy danh sách exchanges và config
- `GET /exchangeSymbols/:exchange` - Lấy symbols từ exchange API (Binance/Bybit/OKX)
- `POST /exchangeSymbols` - Cập nhật whitelist symbols

### System
- `GET /status` - Trạng thái hệ thống
- `POST /restart` - Restart ứng dụng
- `POST /deleteDatabase` - Xóa database và restart

### Configuration
- `GET /config` - Lấy cấu hình hiện tại
- `POST /config` - Cập nhật cấu hình
  - Body: `batch_interval`, `max_records`, `bootstrap_load`, `port`

### WebSocket
- `ws://localhost:3000` - WebSocket connection
  - **Receive**: `log`, `candle`, `status`, `worker_status`, `worker_metrics`, `system_info`
  - **Send**: `command` (reload, status, list, clear, help)

## 📝 Configuration (config.json)

```json
{
  "database_path": "data/ohlcv.db",
  "batch_interval": 60000,
  "max_records": 100000,
  "bootstrap_load": 10000,
  "port": 3000,
  "exchanges": {
    "binance_futures": {
      "enabled": true,
      "symbols": ["BTCUSDT", "ETHUSDT"]
    },
    "bybit_futures": {
      "enabled": true,
      "symbols": ["BTCUSDT", "ETHUSDT"]
    },
    "okx_futures": {
      "enabled": false,
      "symbols": []
    }
  }
}
```

## 🛠️ Tối ưu hiệu suất

- **Worker Threads**: Mỗi exchange chạy trên worker riêng
- **Batch Insert**: Ghi database theo batch để giảm I/O
- **WAL Mode**: SQLite WAL mode cho concurrent reads
- **Index**: Index tối ưu cho query nhanh
- **Memory Management**: Tự động cleanup dữ liệu cũ

## 📊 System Requirements

- Node.js >= 18.x
- RAM >= 2GB
- Disk space >= 1GB (cho database)

## 🔧 Development

```bash
# Start in development mode
npm start

# View logs in terminal
# Access dashboard at http://localhost:3000
```

## 📄 License

ISC
