# Quick Start - Supabase Save/Load

## Setup nhanh trong 3 phút

### 1. Tạo Supabase Project
```
1. Vào https://supabase.com
2. Tạo project mới
3. Copy Project URL và anon key
```

### 2. Chạy SQL
```
1. Vào SQL Editor trong Supabase Dashboard
2. Copy nội dung file supabase-schema.sql
3. Paste và Run
```

### 3. Cấu hình App
Mở `app.js` và thay đổi:
```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...';
```

### 4. Xong! 
Không cần authentication - Tất cả dùng chung 1 user ID `default-user`

## Sử dụng

### Auto-Save & Auto-Load (Tự động)
- **Vẽ/Xóa drawings** → Tự động lưu sau 2 giây
- **Thêm/Xóa indicators** → Tự động lưu sau 2 giây
- **Mở app lần sau** → Tự động load layout gần nhất

### Manual Save/Load (Thủ công)
1. **Lưu**: Click icon Save (💾) → Đặt tên → Save
2. **Load**: Click icon Load → Chọn layout → Load

📖 **Chi tiết**: Xem [AUTO_SAVE.md](AUTO_SAVE.md)

## Commands hữu ích (Browser Console)

```javascript
// Auto-save ngay lập tức
autoSave.saveNow();

// Load lại layout gần nhất
autoSave.loadLatest();

// Xem thông tin auto-save
autoSave.getInfo();

// Xem tất cả layouts đã lưu
await saveLoadAdapter.getAllCharts();

// Xem user ID hiện tại
console.log(saveLoadAdapter.userId);
```

## Lưu ý

- Tất cả dùng chung 1 user ID: `default-user`
- Layouts được lưu dưới dạng JSON trong Supabase
- Không cần authentication - Đơn giản và nhanh
- Tất cả mọi người có thể xem và chỉnh sửa layouts

## Troubleshooting

**Không thấy layouts**
```javascript
// Kiểm tra layouts trong console:
const charts = await saveLoadAdapter.getAllCharts();
console.log(charts);
```

**Lỗi khi save/load**
```javascript
// Kiểm tra adapter:
console.log(saveLoadAdapter);
console.log(saveLoadAdapter.userId);
```

**Lỗi CORS hoặc connection**
- Kiểm tra SUPABASE_URL và SUPABASE_ANON_KEY đã đúng chưa
- Kiểm tra Supabase project có đang active không
- Mở Network tab (F12) để xem request/response

## Nâng cao (Optional)

Nếu muốn có nhiều users riêng biệt, thay đổi trong `app.js`:

```javascript
// Thay vì 'default-user', dùng ID riêng
saveLoadAdapter = new SupabaseSaveLoadAdapter(
    SUPABASE_URL, 
    SUPABASE_ANON_KEY,
    'my-custom-user-id'  // Thay đổi ở đây
);
```

## Next Steps

- Implement Study Templates
- Implement Drawing Templates
- Thêm tính năng export/import layouts
- Thêm authentication nếu cần bảo mật
