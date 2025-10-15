# Client Configuration Guide

## Tính năng mới trong Config Modal

### 1. Layout 2 cột
Modal Config giờ được chia thành 2 phần:
- **Bên trái:** Client Settings (cấu hình client-side)
- **Bên phải:** Server Settings (cấu hình server-side)

### 2. Client Settings

#### Realtime Price Updates
- **Mô tả:** Bật/tắt cập nhật giá realtime và render
- **Mặc định:** Bật (true)
- **Lưu trữ:** localStorage (không cần restart)
- **Tác dụng:** 
  - Khi tắt: Không render dữ liệu realtime vào bảng, giảm tải CPU/GPU
  - Khi bật: Hiển thị giá realtime với animation flash

#### Debug Logs
- **Mô tả:** Bật/tắt hiển thị debug logs
- **Mặc định:** Tắt (false)
- **Lưu trữ:** localStorage (không cần restart)
- **Tác dụng:**
  - Khi tắt: Chỉ hiển thị logs quan trọng (🟢 closed candles, errors, warnings)
  - Khi bật: Hiển thị tất cả logs bao gồm:
    - `[binance_futures] BTCUSDT: 1500/50000 loaded`
    - `[okx_futures] Wrote 3 candles to DB`
    - Các thông tin debug khác

#### Max Log Lines
- **Mô tả:** Số dòng log tối đa giữ trong terminal
- **Mặc định:** 200 dòng
- **Phạm vi:** 50-1000 dòng
- **Lưu trữ:** localStorage

### 3. Server Settings

#### Cleanup Hour
- **Mô tả:** Giờ chạy cleanup hàng ngày (0-23)
- **Mặc định:** 3 (3:00 AM)
- **Yêu cầu:** Restart server

## Phân loại Logs

### Debug Logs (chỉ hiện khi bật Debug Mode)
```
[2025-10-15T04:05:28.523Z] [binance_futures] PENGUUSDT: 1500/50000 loaded
[binance_futures] BTCUSDT: Up to date (50000 candles)
[okx_futures] Wrote 3 candles to DB
[bybit_futures] ETHUSDT: Fetching 5 missing candles...
```

### Important Logs (luôn hiển thị)
```
[okx_futures] 🟢 ETHUSDT closed at 4078.17
[binance_futures] 🟢 BTCUSDT closed at 67234.50
Connected to server
System restarted successfully
⚠️ Deleting database and restarting...
```

## Button OHLCV

### Thay đổi
- **Trước:** Mở modal OHLCV với iframe
- **Sau:** Mở chart với limit=1500 candles
- **URL:** `chart.html?symbol=BTCUSDT&timeframe=1m&exchange=binance_futures&limit=1500`

## Lưu trữ Client Config

Client config được lưu trong `localStorage` với key `clientConfig`:

```javascript
{
  "realtimeUpdate": true,
  "debugLog": false,
  "maxLogLines": 200
}
```

## Sử dụng

### 1. Mở Config Modal
Click nút **CFG** trên header

### 2. Thay đổi Client Settings
- Toggle các checkbox
- Thay đổi max log lines
- **Không cần restart** - áp dụng ngay lập tức

### 3. Thay đổi Server Settings
- Điều chỉnh các giá trị
- Click **SAVE & RESTART**
- Server sẽ restart để áp dụng

## Performance Tips

### Giảm tải CPU/GPU:
1. Tắt **Realtime Price Updates** nếu không cần theo dõi giá liên tục
2. Tắt **Debug Logs** để giảm số lượng DOM updates
3. Giảm **Max Log Lines** xuống 50-100

### Debugging:
1. Bật **Debug Logs** để xem chi tiết quá trình load data
2. Tăng **Max Log Lines** lên 500-1000 để giữ nhiều logs hơn

## Responsive Design

Modal config responsive trên mobile:
- Desktop: 2 cột ngang
- Mobile: 1 cột dọc (stack)

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- localStorage required: ✅ All modern browsers
