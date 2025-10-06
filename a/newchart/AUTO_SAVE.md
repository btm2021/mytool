# Auto-Save & Auto-Load

## Tính năng

✅ **Auto-Save**: Tự động lưu layout khi có thay đổi  
✅ **Auto-Load**: Tự động load layout gần nhất khi mở app  
✅ **Debounce**: Chờ 2 giây sau thay đổi cuối cùng mới save  

## Cách hoạt động

### Auto-Save
Khi bạn:
- Vẽ drawing (line, trendline, fibonacci, etc.)
- Xóa drawing
- Thêm indicator
- Xóa indicator
- Thay đổi settings

→ Hệ thống sẽ tự động lưu sau 2 giây

### Auto-Load
Khi mở app:
- Tự động tìm layout `__autosave__`
- Load layout đó nếu tồn tại
- Restore tất cả drawings và indicators

## Layout Name

Auto-save sử dụng tên đặc biệt: `__autosave__`

Bạn vẫn có thể:
- Save layouts khác với tên tùy chỉnh
- Load layouts khác
- Auto-save sẽ không ghi đè layouts thủ công

## API Commands

### Save ngay lập tức
```javascript
// Trong browser console (F12)
autoSave.saveNow();
```

### Load lại layout gần nhất
```javascript
autoSave.loadLatest();
```

### Xem thông tin auto-save
```javascript
autoSave.getInfo();
// => {
//   currentChartId: "uuid-here",
//   layoutName: "__autosave__",
//   autoSaveDelay: 2000
// }
```

### Xem tất cả layouts
```javascript
await saveLoadAdapter.getAllCharts();
```

## Cấu hình

Trong `app.js`, bạn có thể thay đổi:

```javascript
const AUTO_SAVE_LAYOUT_NAME = '__autosave__';  // Tên layout
const AUTO_SAVE_DELAY = 2000;  // Delay (ms) - 2 giây
```

## Lưu ý

⚠️ **Auto-save chỉ lưu 1 layout duy nhất** với tên `__autosave__`  
✅ **Không ảnh hưởng** đến layouts khác bạn save thủ công  
✅ **Debounce 2 giây** để tránh save quá nhiều lần  
✅ **Tự động load** khi mở app lần sau  

## Troubleshooting

### Auto-save không hoạt động
```javascript
// Kiểm tra trong console:
console.log(tvWidget);  // Phải có widget
console.log(saveLoadAdapter);  // Phải có adapter

// Trigger manual save để test:
autoSave.saveNow();
```

### Auto-load không hoạt động
```javascript
// Kiểm tra có layout autosave không:
const charts = await saveLoadAdapter.getAllCharts();
console.log(charts);

// Tìm layout __autosave__:
const autosave = charts.find(c => c.name === '__autosave__');
console.log(autosave);

// Load thủ công:
autoSave.loadLatest();
```

### Xem logs
Mở Console (F12) để xem:
- "Drawing event" - Khi vẽ/xóa drawing
- "Study event" - Khi thêm/xóa indicator
- "Performing auto-save..." - Khi đang save
- "Auto-saved successfully" - Khi save xong
- "Auto-loaded layout" - Khi load xong

## Workflow

1. **Lần đầu mở app**
   - Không có autosave → Bắt đầu với chart trống
   - Vẽ drawings/indicators
   - Auto-save sau 2 giây

2. **Lần sau mở app**
   - Tự động load layout `__autosave__`
   - Tất cả drawings/indicators được restore
   - Tiếp tục vẽ → Auto-save tiếp

3. **Save thủ công**
   - Click Save button → Đặt tên khác (VD: "My Strategy")
   - Layout này độc lập với autosave
   - Auto-save vẫn hoạt động bình thường

## Best Practices

✅ **Để auto-save xử lý** - Không cần save thủ công thường xuyên  
✅ **Save thủ công** khi có setup quan trọng muốn giữ lại  
✅ **Đặt tên rõ ràng** cho layouts thủ công  
✅ **Kiểm tra console** nếu có vấn đề  
