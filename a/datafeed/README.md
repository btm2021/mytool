# Binance Futures Screener System

Hệ thống thu thập và lưu trữ dữ liệu OHLCV realtime từ Binance Futures phục vụ backtest.

## Tính năng

- Thu thập dữ liệu nến 1m realtime qua WebSocket
- Lưu trữ vào SQLite với tối ưu IO (WAL mode, batch insert)
- API `/ohlcv` hỗ trợ resample động sang các timeframe khác
- Tự động backfill dữ liệu bị thiếu khi reconnect
- Validator kiểm tra tính toàn vẹn dữ liệu mỗi 1h
- Tải sẵn 50,000 nến khi khởi động
- Giao diện web realtime theo dõi tiến trình

## Cài đặt

```bash
npm install
```

## Chạy

```bash
npm start
```

Server sẽ chạy tại: http://localhost:3000

## API Endpoints

### GET /ohlcv
Lấy dữ liệu OHLCV với resample động

```bash
curl "http://localhost:3000/ohlcv?symbol=BTCUSDT&timeframe=15m&limit=500"
```

### POST /config
Cập nhật cấu hình symbol/timeframe runtime

```bash
curl -X POST http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{"symbols":["BTCUSDT","ETHUSDT"],"intervals":["1m"]}'
```

### GET /status
Kiểm tra trạng thái hệ thống

```bash
curl http://localhost:3000/status
```

## Cấu hình

Chỉnh sửa file `config.json`:

```json
{
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "intervals": ["1m"],
  "database_path": "./data/ohlcv.db",
  "batch_interval": 60000,
  "max_records": 100000,
  "bootstrap_load": 50000
}
```

## Cấu trúc dự án

```
src/
├── datasources/          # Nguồn dữ liệu (Binance, có thể mở rộng)
├── core/                 # Database, aggregator, validator, utils
├── api/                  # REST API và WebSocket server
├── web/                  # Frontend HTML/CSS/JS
├── collector.js          # Thu thập và quản lý dữ liệu
└── index.js              # Entry point
```

## Kỹ thuật tối ưu

- WAL mode cho SQLite (ghi song song)
- Batch insert mỗi 60s
- Chỉ ghi nến đã đóng (x=true)
- Auto reconnect với backfill
- Heartbeat ping/pong
- Rate limiting cho REST API
- Cleanup dữ liệu cũ tự động
