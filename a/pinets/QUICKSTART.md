# ⚡ Quick Start Guide

## 🚀 Chạy ngay trong 30 giây!

### Bước 0: Chọn phiên bản
**2 phiên bản có sẵn:**
- `index.html` - Online (cần internet lần đầu) ⭐ RECOMMENDED
- `index-offline.html` - Offline (100% không cần internet)

📖 Xem `VERSION_INFO.md` để biết chi tiết

### Bước 1: Mở ứng dụng
**Chọn 1 trong 3 cách:**

#### Cách 1: Double-click (Đơn giản nhất)
```
📁 Mở thư mục pinets
   ↓
🖱️ Double-click file: index.html (hoặc index-offline.html)
   ↓
🌐 Ứng dụng mở trong trình duyệt
```

#### Cách 2: Dùng LAUNCH.bat (Windows)
```
🖱️ Double-click: LAUNCH.bat
   ↓
🌐 Tự động mở trình duyệt
```

#### Cách 3: Kéo thả
```
📄 Kéo file index.html
   ↓
🌐 Thả vào cửa sổ trình duyệt
```

---

### Bước 2: Thử ngay với Example

1. **Click nút "📋 Load Example"**
2. **Click nút "🔄 Convert to Pinets"** (hoặc Ctrl+Enter)
3. **Xem kết quả** bên phải!

---

### Bước 3: Convert code của bạn

```
1. Paste PineScript vào khung trái
   ↓
2. Click "Convert" hoặc Ctrl+Enter
   ↓
3. Copy kết quả từ khung phải
   ↓
4. Done! ✅
```

---

## 📝 Example nhanh

### Input (PineScript):
```pinescript
indicator("EMA Cross", overlay=true)
len = input.int(9, "Length")
ema = ta.ema(close, len)
plot(ema, "EMA", color=color.blue)
```

### Output (Pinets):
```javascript
context.indicator("EMA Cross", {overlay:true})
const len = Input.int(9, {title:"Length"})
const ema = ta.ema(close, len)
context.plot(ema, {title:"EMA", color:"blue"})
```

---

## 🎯 Các nút chức năng

| Nút | Chức năng | Phím tắt |
|-----|-----------|----------|
| 🔄 Convert to Pinets | Chuyển đổi code | Ctrl+Enter |
| 📋 Load Example | Load code mẫu | - |
| 🗑️ Clear | Xóa tất cả | - |
| 📋 Copy to Clipboard | Copy kết quả | - |

---

## ✅ Checklist nhanh

- [ ] Mở `index.html` trong trình duyệt
- [ ] Click "Load Example"
- [ ] Click "Convert to Pinets"
- [ ] Thấy kết quả ở bên phải
- [ ] Click "Copy to Clipboard"
- [ ] Paste vào editor của bạn

**Xong! Bạn đã sẵn sàng sử dụng! 🎉**

---

## 🆘 Gặp vấn đề?

### Ứng dụng không mở?
- ✅ Đảm bảo file `peg.min.js` cùng thư mục
- ✅ Thử trình duyệt khác (Chrome, Firefox, Edge)
- ✅ Mở Console (F12) xem lỗi

### Không convert được?
- ✅ Kiểm tra cú pháp PineScript
- ✅ Xem thông báo lỗi ở status bar
- ✅ Thử với code đơn giản hơn

### Cần hỗ trợ thêm?
📖 Đọc `USAGE_GUIDE.md` để biết chi tiết

---

## 📚 Tài liệu đầy đủ

| File | Nội dung |
|------|----------|
| `README.md` | Tổng quan dự án |
| `USAGE_GUIDE.md` | Hướng dẫn chi tiết |
| `ARCHITECTURE.md` | Kiến trúc kỹ thuật |
| `test-examples.md` | Các ví dụ test |
| `PROJECT_SUMMARY.md` | Tóm tắt dự án |

---

## 🎓 Syntax được hỗ trợ

✅ **Đã hỗ trợ:**
- `indicator()` declarations
- `input.int/float/bool()`
- `plot()` statements
- `ta.ema/sma/rsi/atr()` functions
- Logic operators: `and`, `or`, `not`
- Comparison: `>`, `<`, `==`, `!=`
- Math: `+`, `-`, `*`, `/`
- Variables: `var = value`
- Colors: `color.red`

❌ **Chưa hỗ trợ:**
- `if/else` statements
- `for` loops
- Function definitions
- Arrays

---

## 💡 Tips

1. **Test từng phần nhỏ** - Dễ debug hơn
2. **Dùng Example** - Xem cấu trúc chuẩn
3. **Ctrl+Enter** - Convert nhanh
4. **F12** - Mở Console để debug

---

**Chúc bạn convert thành công! 🚀**

*Thời gian đọc: 2 phút | Thời gian thực hành: 1 phút*
