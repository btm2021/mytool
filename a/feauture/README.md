# Trading Event Logger

Event-based trading research note-taking tool with PocketBase backend.

## PocketBase Setup - Hướng dẫn chi tiết

### Bước 1: Truy cập PocketBase Admin
1. Mở trình duyệt và truy cập: `https://btm2021.pockethost.io/_/`
2. Đăng nhập vào admin panel (nếu chưa có tài khoản, tạo tài khoản admin)

### Bước 2: Tạo Collection "events"

1. Click vào **"Collections"** ở menu bên trái
2. Click nút **"New collection"**
3. Chọn **"Base collection"**
4. Điền thông tin:
   - **Name**: `events`
   - **Collection ID**: để mặc định (tự động tạo)

5. **Thêm các fields** (click "New field" cho mỗi field):

   **Field 1: name**
   - Type: `Text`
   - Name: `name`
   - ✅ Required
   - Max length: để trống (unlimited)
   
   **Field 2: type**
   - Type: `Text`
   - Name: `type`
   - ❌ Required (không bắt buộc)
   - Max length: để trống
   
   **Field 3: data**
   - Type: `Text`
   - Name: `data`
   - ❌ Required
   - Max length: để trống
   
   **Field 4: comment**
   - Type: `Text`
   - Name: `comment`
   - ❌ Required
   - Max length: để trống

6. **Cấu hình API Rules** (tab "API Rules"):
   - List/Search rule: `@request.auth.id != ""`  HOẶC để trống nếu muốn public
   - View rule: `@request.auth.id != ""` HOẶC để trống
   - Create rule: `@request.auth.id != ""` HOẶC để trống
   - Update rule: `@request.auth.id != ""` HOẶC để trống
   - Delete rule: `@request.auth.id != ""` HOẶC để trống
   
   **⚠️ Để đơn giản, bạn có thể để TẤT CẢ các rules TRỐNG (public access)**

7. Click **"Create"** để lưu collection

### Bước 3: Tạo Collection "logs"

1. Click nút **"New collection"** lần nữa
2. Chọn **"Base collection"**
3. Điền thông tin:
   - **Name**: `logs`
   - **Collection ID**: để mặc định

4. **Thêm các fields**:

   **Field 1: event_id**
   - Type: `Text`
   - Name: `event_id`
   - ✅ Required
   - Max length: để trống
   
   **Field 2: side**
   - Type: `Text`
   - Name: `side`
   - ✅ Required
   - Max length: để trống
   
   **Field 3: result**
   - Type: `Text`
   - Name: `result`
   - ✅ Required
   - Max length: để trống
   
   **Field 4: notes**
   - Type: `Text`
   - Name: `notes`
   - ❌ Required
   - Max length: để trống

5. **Cấu hình API Rules** (giống như collection events):
   - Để TẤT CẢ các rules TRỐNG để cho phép public access

6. Click **"Create"** để lưu collection

### Bước 4: Kiểm tra

Sau khi tạo xong, bạn sẽ thấy 2 collections:
- ✅ `events` (với 4 fields: name, type, data, comment)
- ✅ `logs` (với 4 fields: event_id, side, result, notes)

### Bước 5: Test ứng dụng

1. Mở file `index.html` trong trình duyệt
2. Vào tab **"Manage Events"**
3. Tạo một event thử:
   - Event Name: `EMA Cross`
   - Type: `Indicator`
   - Data: `20/50 EMA`
   - Comment: `Test event`
4. Click **"Create Event"**
5. Nếu thành công, event sẽ xuất hiện trong danh sách bên dưới

## Cấu trúc dữ liệu

### Collection: events
```json
{
  "id": "auto_generated",
  "name": "EMA Cross",
  "type": "Indicator",
  "data": "20/50 EMA",
  "comment": "Bullish crossover",
  "created": "2024-01-01 10:00:00",
  "updated": "2024-01-01 10:00:00"
}
```

### Collection: logs
```json
{
  "id": "auto_generated",
  "event_id": "event_id_here",
  "side": "long",
  "result": "win",
  "notes": "Good entry, hit target",
  "created": "2024-01-01 10:30:00",
  "updated": "2024-01-01 10:30:00"
}
```

## Sử dụng

1. Mở `index.html` trong trình duyệt
2. Tab **"Manage Events"**: Tạo và quản lý các loại event
3. Tab **"Log Event"**: Ghi nhận khi event xảy ra
4. Bảng bên phải: Xem tất cả logs đã ghi
5. Export: Xuất dữ liệu ra JSON hoặc CSV

## Tính năng

- ✅ Tạo và quản lý trading events
- ✅ Ghi log khi event xảy ra với side (long/short) và result (win/loss/breakeven)
- ✅ Đồng bộ real-time với PocketBase
- ✅ Export logs sang JSON/CSV
- ✅ Giao diện minimal, terminal-style
- ✅ Hoàn toàn offline-capable sau khi load dữ liệu

## Troubleshooting

**Lỗi: "Missing collection context"**
- Kiểm tra lại tên collections phải chính xác: `events` và `logs`
- Kiểm tra API Rules đã được cấu hình đúng (hoặc để trống)

**Lỗi: "Failed to load events"**
- Kiểm tra URL PocketBase: `https://btm2021.pockethost.io/`
- Kiểm tra kết nối internet
- Mở Console (F12) để xem chi tiết lỗi
