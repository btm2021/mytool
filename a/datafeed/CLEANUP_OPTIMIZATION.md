# Tối ưu IO và Cleanup Schedule

## Thay đổi đã thực hiện

### 1. Cleanup Schedule (3h sáng hàng ngày)
- **Trước:** Cleanup chạy mỗi 60 giây (mỗi lần batch write)
- **Sau:** Cleanup chỉ chạy 1 lần/ngày vào 3h sáng

### 2. Tối ưu Database IO
Các pragma được thêm vào `src/core/db.js`:

```javascript
cache_size = -64000        // 64MB cache (giảm disk reads)
temp_store = MEMORY        // Dùng RAM cho temp tables
mmap_size = 268435456      // 256MB memory-mapped I/O
page_size = 8192           // Tăng page size
wal_autocheckpoint = 10000 // Checkpoint mỗi ~80MB thay vì liên tục
```

### 3. Database Optimization
Thêm method `optimize()` để chạy sau cleanup:
- `VACUUM`: Thu hồi không gian và defragment
- `ANALYZE`: Cập nhật query planner statistics
- `wal_checkpoint(TRUNCATE)`: Merge WAL vào main database

## Cấu hình mới trong config.json

```json
{
  "cleanup_hour": 3,        // Giờ chạy cleanup (0-23)
  "cleanup_enabled": true   // Bật/tắt cleanup tự động
}
```

## Lợi ích

### Giảm IO trên đĩa:
- ✅ Giảm 99% số lần cleanup (từ ~1440 lần/ngày → 1 lần/ngày)
- ✅ Cache 64MB giảm disk reads
- ✅ Memory-mapped I/O giảm system calls
- ✅ WAL checkpoint ít thường xuyên hơn

### Hiệu suất:
- ✅ Batch write nhanh hơn (không có cleanup overhead)
- ✅ Ít disk fragmentation
- ✅ Query nhanh hơn nhờ ANALYZE

### Tính năng mới:
- ✅ Cleanup vào giờ thấp điểm (3h sáng)
- ✅ Có thể tắt cleanup tự động
- ✅ Force cleanup thủ công qua message
- ✅ Log chi tiết số records đã xóa

## Sử dụng

### Thay đổi giờ cleanup:
```json
{
  "cleanup_hour": 4  // Chạy vào 4h sáng
}
```

### Tắt cleanup tự động:
```json
{
  "cleanup_enabled": false
}
```

### Force cleanup thủ công:
Gửi message từ parent process:
```javascript
worker.postMessage({ type: 'force_cleanup' });
```

## Monitoring

Cleanup sẽ log:
- Thời gian bắt đầu
- Số records đã xóa cho mỗi symbol
- Tổng thời gian thực hiện
- Kết quả optimize database

Ví dụ log:
```
[binance_futures] Starting scheduled cleanup at 3:00...
[binance_futures] BTCUSDT: Cleaned 5000 old records
[binance_futures] ETHUSDT: Cleaned 3000 old records
[binance_futures] Cleanup completed: 8000 records removed in 2.34s
[binance_futures] Database optimized
```
