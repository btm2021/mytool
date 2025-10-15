# Client Config Fix - Sửa lỗi cấu hình client

## Vấn đề đã sửa

1. **Config không load khi page khởi động** - Client config không được load tự động
2. **Cấu trúc dữ liệu không khớp** - Client và server config không đồng bộ
3. **Thiếu endpoint client config** - Không có API riêng cho client settings
4. **Không áp dụng được settings** - Realtime và debug log không hoạt động

## Các thay đổi

### 1. Client-side (`src/web/js/config.js`)

**Thêm:**
- `configTab` để quản lý tab hiện tại (client/server)
- Các trường config đầy đủ:
  - Server: `batch_interval`, `max_records`, `bootstrap_load`, `cleanup_hour`, `port`
  - Client: `realtime_update`, `debug_log`, `max_log_lines`

**Methods mới:**
- `applyClientConfig()` - Áp dụng client settings ngay lập tức
- `saveClientConfig()` - Lưu client settings riêng (không restart)
- `loadConfig()` - Load và map đầy đủ config từ server

**Cách hoạt động:**
```javascript
// Load config khi mở modal hoặc page load
loadConfig() -> applyClientConfig()

// Lưu client settings
saveClientConfig() -> POST /config/client -> applyClientConfig()

// Lưu server settings  
saveConfig() -> POST /config -> Restart server
```

### 2. Realtime Updates (`src/web/js/realtime.js`)

**Thêm:**
- `realtimeEnabled` flag (default: true)
- Check trong `updateRealtimeData()` để skip nếu disabled

**Cách hoạt động:**
```javascript
if (!this.realtimeEnabled) {
  return; // Skip update nếu realtime bị tắt
}
```

### 3. Debug Logs (`src/web/js/logs.js`)

**Thêm:**
- `debugLogEnabled` flag (default: false)
- `maxLogLines` configurable (default: 200)
- Filter logs theo type 'debug'

**Cách hoạt động:**
```javascript
addLog(message, type) {
  if (type === 'debug' && !this.debugLogEnabled) {
    return; // Skip debug logs nếu disabled
  }
  // Trim logs theo maxLogLines
}
```

### 4. Server API (`src/server/routes/config.routes.js`)

**Endpoint mới:**
```javascript
POST /config/client
{
  "realtime_update": true,
  "debug_log": false,
  "max_log_lines": 200
}
```

**Cập nhật:**
- `POST /config` - Thêm `cleanup_hour` vào server config
- Lưu client config vào `config.client` trong file

### 5. App Initialization (`src/web/js/app.js`)

**Thêm:**
```javascript
appConfig.mounted = function() {
  this.connect();
  this.loadDatabaseSymbols();
  this.loadConfig(); // Load config khi page load
};
```

## Cách sử dụng

### Client Settings (Không cần restart)

1. Mở modal config (nút CFG)
2. Chọn tab "CLIENT SETTINGS"
3. Bật/tắt:
   - **Enable Realtime Price Updates** - Hiển thị giá realtime
   - **Enable Debug Logs** - Hiển thị debug logs
   - **Max Log Lines** - Số dòng log tối đa (50-1000)
4. Click "SAVE CLIENT SETTINGS"
5. Settings áp dụng ngay lập tức

### Server Settings (Cần restart)

1. Mở modal config (nút CFG)
2. Chọn tab "SERVER SETTINGS"
3. Chỉnh sửa:
   - Batch Interval
   - Max Records
   - Bootstrap Load
   - Cleanup Hour
   - Server Port
4. Click "SAVE & RESTART"
5. Server sẽ restart tự động

## Lợi ích

✅ Config được load tự động khi page load
✅ Client settings áp dụng ngay không cần reload
✅ Tắt realtime để giảm tải CPU/render
✅ Tắt debug logs để giảm noise
✅ Cấu trúc config đồng bộ client-server
✅ API riêng cho client config

## Testing

1. Load page -> Config tự động load
2. Tắt "Realtime Updates" -> Bảng realtime không update
3. Bật "Debug Logs" -> Hiển thị debug messages
4. Thay đổi "Max Log Lines" -> Logs bị trim theo số mới
5. Lưu client settings -> Không reload page
6. Lưu server settings -> Server restart
