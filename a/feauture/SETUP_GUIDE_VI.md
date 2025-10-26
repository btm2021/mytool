# Hướng dẫn Setup PocketBase - Chi tiết từng bước

## 📋 Tổng quan
Bạn cần tạo 2 collections (bảng) trong PocketBase:
1. **events** - Lưu các loại event (setup, pattern, indicator...)
2. **logs** - Lưu lịch sử các lần event xảy ra

---

## 🔧 BƯỚC 1: Truy cập PocketBase Admin

1. Mở trình duyệt
2. Truy cập: **https://btm2021.pockethost.io/_/**
3. Đăng nhập (hoặc tạo tài khoản admin nếu chưa có)

---

## 📊 BƯỚC 2: Tạo Collection "events"

### 2.1. Tạo Collection mới
```
1. Click "Collections" ở sidebar bên trái
2. Click nút "+ New collection"
3. Chọn "Base collection"
4. Điền:
   - Name: events
   - Để các tùy chọn khác mặc định
```

### 2.2. Thêm Fields cho "events"

Click "New field" và thêm lần lượt 4 fields sau:

#### Field 1: name (Tên event)
```
- Field type: Text
- Name: name
- ✅ Tick vào "Required"
- Các tùy chọn khác: để mặc định
- Click "Save"
```

#### Field 2: type (Loại event)
```
- Field type: Text
- Name: type
- ❌ KHÔNG tick "Required"
- Click "Save"
```

#### Field 3: data (Dữ liệu event)
```
- Field type: Text
- Name: data
- ❌ KHÔNG tick "Required"
- Click "Save"
```

#### Field 4: comment (Ghi chú)
```
- Field type: Text
- Name: comment
- ❌ KHÔNG tick "Required"
- Click "Save"
```

### 2.3. Cấu hình API Rules cho "events"

```
1. Click vào tab "API Rules"
2. Có 5 rules cần cấu hình:
   - List/Search
   - View
   - Create
   - Update
   - Delete

3. ĐỂ ĐƠN GIẢN: Để TẤT CẢ 5 rules TRỐNG
   (Điều này cho phép public access - ai cũng có thể truy cập)

4. Click "Save" để lưu collection
```

**✅ Hoàn thành collection "events"**

---

## 📝 BƯỚC 3: Tạo Collection "logs"

### 3.1. Tạo Collection mới
```
1. Click nút "+ New collection" lần nữa
2. Chọn "Base collection"
3. Điền:
   - Name: logs
   - Để các tùy chọn khác mặc định
```

### 3.2. Thêm Fields cho "logs"

Click "New field" và thêm lần lượt 4 fields sau:

#### Field 1: event_id (ID của event)
```
- Field type: Text
- Name: event_id
- ✅ Tick vào "Required"
- Click "Save"
```

#### Field 2: side (Long/Short)
```
- Field type: Text
- Name: side
- ✅ Tick vào "Required"
- Click "Save"
```

#### Field 3: result (Win/Loss/Breakeven)
```
- Field type: Text
- Name: result
- ✅ Tick vào "Required"
- Click "Save"
```

#### Field 4: notes (Ghi chú)
```
- Field type: Text
- Name: notes
- ❌ KHÔNG tick "Required"
- Click "Save"
```

### 3.3. Cấu hình API Rules cho "logs"

```
1. Click vào tab "API Rules"
2. ĐỂ TẤT CẢ 5 rules TRỐNG (giống như collection "events")
3. Click "Save" để lưu collection
```

**✅ Hoàn thành collection "logs"**

---

## ✅ BƯỚC 4: Kiểm tra

Sau khi hoàn thành, bạn sẽ thấy trong PocketBase:

### Collection "events" có cấu trúc:
```
- id (auto)
- name (text, required)
- type (text)
- data (text)
- comment (text)
- created (auto)
- updated (auto)
```

### Collection "logs" có cấu trúc:
```
- id (auto)
- event_id (text, required)
- side (text, required)
- result (text, required)
- notes (text)
- created (auto)
- updated (auto)
```

---

## 🧪 BƯỚC 5: Test ứng dụng

### 5.1. Mở ứng dụng
```
1. Mở file index.html trong trình duyệt
2. Kiểm tra header: phải hiển thị "Connected" (màu xanh)
```

### 5.2. Tạo Event đầu tiên
```
1. Click tab "Manage Events"
2. Điền form:
   - Event Name: EMA Cross
   - Type: Indicator
   - Data: 20/50 EMA
   - Comment: Test event
3. Click "Create Event"
4. Event sẽ xuất hiện trong danh sách bên dưới
```

### 5.3. Log Event đầu tiên
```
1. Click tab "Log Event"
2. Chọn event vừa tạo từ dropdown
3. Chọn Side: Long
4. Chọn Result: Win
5. Notes: Test log
6. Click "Log Event"
7. Log sẽ xuất hiện trong bảng bên phải
```

---

## 🎯 Ví dụ dữ liệu

### Ví dụ Event:
```
Event Name: EMA Crossover
Type: Indicator
Data: 20/50 EMA bullish cross
Comment: Strong momentum signal
```

### Ví dụ Log:
```
Event: EMA Crossover
Side: Long
Result: Win
Notes: Entry at 45000, exit at 46500, +3.3%
```

---

## ❌ Xử lý lỗi thường gặp

### Lỗi: "Missing collection context"
**Nguyên nhân:** Collection chưa được tạo hoặc tên sai
**Giải pháp:**
- Kiểm tra tên collection phải chính xác: `events` và `logs` (chữ thường)
- Kiểm tra lại đã tạo đủ 2 collections chưa

### Lỗi: "Failed to load events"
**Nguyên nhân:** Không kết nối được PocketBase
**Giải pháp:**
- Kiểm tra URL: https://btm2021.pockethost.io/
- Kiểm tra kết nối internet
- Mở Console (F12) để xem chi tiết lỗi

### Lỗi: "Failed to create event"
**Nguyên nhân:** API Rules chưa đúng
**Giải pháp:**
- Vào PocketBase Admin
- Chọn collection "events"
- Tab "API Rules"
- Để TẤT CẢ rules TRỐNG
- Save lại

### Status hiển thị "Error" hoặc "Connecting..."
**Giải pháp:**
- Refresh lại trang
- Kiểm tra PocketBase có đang hoạt động không
- Kiểm tra Console (F12) để xem lỗi cụ thể

---

## 📞 Checklist hoàn thành

- [ ] Đã truy cập được PocketBase Admin
- [ ] Đã tạo collection "events" với 4 fields
- [ ] Đã tạo collection "logs" với 4 fields
- [ ] Đã cấu hình API Rules (để trống tất cả)
- [ ] Mở index.html thấy status "Connected"
- [ ] Tạo được event thử nghiệm
- [ ] Log được event thử nghiệm
- [ ] Thấy dữ liệu hiển thị trong bảng

**Nếu tất cả đều ✅ → Setup thành công!**

---

## 💡 Tips

1. **Backup dữ liệu:** PocketBase có tính năng export/import, nên backup định kỳ
2. **API Rules:** Hiện tại để public, sau này có thể thêm authentication
3. **Field types:** Có thể dùng "Select" thay vì "Text" cho side/result để giới hạn giá trị
4. **Relations:** Có thể dùng "Relation" field thay vì text cho event_id (nâng cao)

---

## 🚀 Sử dụng sau khi setup

1. **Tạo events trước:** Tạo tất cả các loại event bạn muốn theo dõi
2. **Log khi xảy ra:** Mỗi khi event xảy ra, vào tab "Log Event" để ghi lại
3. **Phân tích:** Xem bảng để phân tích win rate, pattern nào hiệu quả
4. **Export:** Export CSV để phân tích sâu hơn trong Excel/Google Sheets

**Chúc bạn trading thành công! 📈**
