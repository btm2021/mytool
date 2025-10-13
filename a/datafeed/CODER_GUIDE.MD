Binance Futures Screener System
🔷 PHẦN 1. MỤC TIÊU DỰ ÁN

Xây dựng một ứng dụng Screener Realtime cho dữ liệu Binance Futures,
bao gồm các tính năng:

Thu thập dữ liệu nến 1m realtime (WebSocket).

Lưu trữ vào SQLite, tối ưu IO và dung lượng.

Có API /ohlcv phục vụ dữ liệu và resample động.

Có thể cấu hình symbol/timeframe qua API POST.

Có hệ thống kiểm tra dữ liệu định kỳ (mỗi 1h).

Tự động backfill dữ liệu bị thiếu khi reconnect.

Tải sẵn 50.000 điểm dữ liệu 1m khi khởi động.

Có giao diện web realtime theo dõi tiến trình stream.

🔷 PHẦN 2. CẤU TRÚC DỰ ÁN
/src/
 ├─ datasources/
 │   ├─ datasource_base.js
 │   └─ binance_future.js
 │
 ├─ core/
 │   ├─ db.js
 │   ├─ aggregator.js
 │   ├─ validator.js
 │   ├─ utils.js
 │
 ├─ api/
 │   ├─ server.js
 │   ├─ endpoints/
 │   │   ├─ ohlcv.js
 │   │   ├─ config.js
 │   │   └─ stream.js
 │
 ├─ web/
 │   ├─ index.html
 │   ├─ app.js
 │   └─ style.css
 │
 └─ config.json

🔷 PHẦN 3. CHUẨN HÓA NGUỒN DỮ LIỆU (DATASOURCE)
🔹 File datasource_base.js

Xây dựng lớp cơ sở cho mọi sàn:

export class DataSourceBase {
  connect() {}
  subscribe(symbols, interval) {}
  onMessage(callback) {}
  reconnect() {}
  backfill(symbol, fromTs, toTs) {}
  normalize(raw) {}
}

🔹 File binance_future.js

WebSocket endpoint:
wss://fstream.binance.com/stream?streams=btcusdt@kline_1m/...

REST backfill:
https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT&interval=1m&limit=1000&startTime=...

Chỉ emit khi "x": true (nến đóng hoàn chỉnh).

Normalize dữ liệu về dạng chuẩn:

{
  symbol: "BTCUSDT",
  exchange: "binance_futures",
  interval: "1m",
  ts: 1738747710000,
  open: 43210.5,
  high: 43300.1,
  low: 43120.0,
  close: 43250.0,
  volume: 120.35,
  closed: true
}


Cơ chế:

Kiểm tra và tự reconnect khi socket ngắt.

Khi reconnect → backfill dữ liệu bị thiếu dựa vào last_ts trong DB.

🔷 PHẦN 4. DATABASE (SQLite)
Cấu trúc bảng:
CREATE TABLE IF NOT EXISTS ohlcv (
  symbol TEXT,
  timeframe TEXT,
  ts INTEGER,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume REAL,
  PRIMARY KEY(symbol, timeframe, ts)
);

Kỹ thuật tối ưu:
Kỹ thuật	Mục đích
PRAGMA journal_mode=WAL;	cho phép ghi song song, tránh khóa toàn bộ
PRAGMA synchronous=NORMAL;	cân bằng tốc độ và độ an toàn
Batch insert mỗi 60s	giảm số lần ghi đĩa
Chỉ ghi khi nến đóng (x=true)	tránh ghi liên tục mỗi 250ms
Sử dụng Map cache	kiểm tra trùng lặp trước khi ghi
Tự động nén DB (gzip/ZSTD)	tiết kiệm dung lượng
Xóa dữ liệu quá giới hạn	giữ tối đa 100k nến/symbol
🔷 PHẦN 5. QUY TRÌNH KHỞI ĐỘNG

Đọc config.json (symbol, timeframe, DB path).

Mở kết nối SQLite (tự tạo bảng nếu chưa có).

Tải trước 50.000 nến 1m qua REST Binance cho mỗi symbol.

Ghi batch vào DB (một lần).

Kết nối WebSocket → bắt đầu thu realtime.

Khi "x": true" → push vào queue ghi DB.

Duy trì heartbeat ping/pong để đảm bảo kết nối.

🔷 PHẦN 6. CƠ CHẾ TỰ PHỤC HỒI & KIỂM TRA
Cơ chế	Mô tả
Kiểm tra subscribe	mỗi 10s, kiểm tra stream còn hoạt động không.
Reconnect socket	nếu timeout >10s → reconnect toàn bộ.
Heartbeat ping/pong	mỗi 30s, nếu không có phản hồi → reconnect.
Backfill missing data	khi nến "x":true", so sánh last_ts trong DB. Nếu thiếu → fetch REST để bù.
Kiểm tra định kỳ mỗi 1h	đọc 60 nến cuối, nếu thấy thiếu timestamp → tự gọi REST để bù.
Giới hạn nến lưu trữ	nếu >100k nến → xóa nến cũ nhất.
🔷 PHẦN 7. API ENDPOINTS
🔹 GET /ohlcv

Trả dữ liệu nến 1m hoặc timeframe resample.

/ohlcv?symbol=BTCUSDT&timeframe=15m&limit=500


Nếu timeframe=1m → lấy trực tiếp từ DB.

Nếu timeframe khác → resample động từ 1m trong bộ nhớ.

Output:

[
 [timestamp, open, high, low, close, volume],
 ...
]

🔹 POST /config

Cập nhật symbol/timeframe runtime.

Request body:

{
  "symbols": ["BTCUSDT","ETHUSDT"],
  "intervals": ["1m"],
  "batch_interval": 60000
}


Server sẽ:

Đóng WS cũ

Mở WS mới

Reload lại cấu hình DB và tiến trình collector.

🔹 WS /stream

Gửi dữ liệu realtime cho frontend:

{
  "symbol":"BTCUSDT",
  "interval":"1m",
  "o":43210,
  "h":43300,
  "l":43190,
  "c":43250,
  "v":120.5
}

🔷 PHẦN 8. FRONTEND

WebSocket kết nối /stream.

Hiển thị bảng realtime:
| Symbol | Timeframe | Open | High | Low | Close | Volume | Status |

Log console:

Connected

Receiving

Parsed

Backfilling

Validated

Có form POST /config để cập nhật symbol/timeframe ngay tại UI.

🔷 PHẦN 9. CÁC QUY TRÌNH TỐI ƯU
Thành phần	Kỹ thuật
Collector	chỉ lưu nến "closed=true"
DB Writer	transaction bulk mỗi phút
Memory cache	lưu trạng thái nến cuối mỗi symbol
Backfill	chỉ fetch phần thiếu giữa last_ts và now
Validator	tự sửa dữ liệu hỏng mỗi 1h
Compression	nén DB định kỳ
Limiter	xóa dữ liệu cũ để giảm dung lượng
API Layer	query index theo symbol + timeframe + ts
Resample	xử lý nội bộ, không ghi DB
🔷 PHẦN 10. CẤU HÌNH MẶC ĐỊNH
{
  "symbols": ["BTCUSDT","ETHUSDT"],
  "intervals": ["1m"],
  "database_path": "./data/ohlcv.db",
  "batch_interval": 60000,
  "max_records": 100000,
  "bootstrap_load": 50000
}

🔷 PHẦN 11. LUỒNG HOẠT ĐỘNG
[Khởi động] → Đọc config → Tải 50.000 nến 1m
       ↓
[Lưu DB] → Mở WebSocket Binance
       ↓
[Nhận nến realtime] → nếu "x":true → ghi batch vào DB
       ↓
[Mỗi 10s] → kiểm tra subscribe
[Mỗi 1h] → validator kiểm tra tính liên tục
       ↓
[Nếu mất WS] → reconnect + backfill từ last_ts

🔷 PHẦN 12. YÊU CẦU TRIỂN KHAI

Không viết file test hoặc demo.

Chỉ dùng ES Modules (import/export).

Không dùng ORM, chỉ better-sqlite3.

Không sử dụng cron, dùng setInterval.

Tách module rõ ràng.

Ghi log tối giản.

Không dùng framework frontend phức tạp (HTML + JS thuần).

Toàn bộ datasource phải normalize theo cùng format.

Đảm bảo IO thấp và khả năng mở rộng sau này.

🔷 PHẦN 13. KẾT QUẢ MONG ĐỢI

Khi chạy npm start:

Tải 50.000 nến 1m ban đầu từ Binance Futures.

Ghi dữ liệu vào SQLite.

Kết nối WebSocket → nhận nến realtime "x":true".

Ghi batch định kỳ mỗi phút.

Endpoint /ohlcv hoạt động chính xác (tự resample).

Có thể POST /config để reload symbol/timeframe mà không restart app.

Validator tự kiểm tra dữ liệu mỗi 1h.

Frontend hiển thị realtime tiến trình.

🔷 PHẦN 14. TÓM TẮT NHIỆM VỤ CHO AI CODER

Hãy tạo một hệ thống Node.js hoàn chỉnh có các chức năng sau:

Thu thập dữ liệu nến 1m từ Binance Futures qua WebSocket.

Lưu batch vào SQLite với tối ưu IO.

Có endpoint /ohlcv?symbol=...&timeframe=...&limit=....

Có API POST /config để reload cấu hình.

Có cơ chế backfill dữ liệu thiếu và reconnect socket.

Có validator tự động chạy mỗi 1h để kiểm tra tính toàn vẹn.

Có frontend realtime hiển thị tiến trình.

Tải sẵn 50.000 điểm dữ liệu khi khởi động.

Toàn bộ module độc lập, có thể mở rộng thêm sàn khác sau này.

Lưu ý dùng các kĩ thuật để tránh limit của các exchange.