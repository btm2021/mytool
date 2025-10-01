# 📖 Hướng dẫn sử dụng PineScript to Pinets Converter

## 🚀 Cách chạy ứng dụng

### Phương pháp 1: Double-click file HTML
1. Mở thư mục `pinets`
2. Double-click vào file `index.html`
3. Ứng dụng sẽ mở trong trình duyệt mặc định

### Phương pháp 2: Sử dụng LAUNCH.bat (Windows)
1. Double-click vào file `LAUNCH.bat`
2. Ứng dụng tự động mở trong trình duyệt

### Phương pháp 3: Kéo thả vào trình duyệt
1. Kéo file `index.html` vào cửa sổ trình duyệt
2. Ứng dụng sẽ load ngay lập tức

## 💡 Cách sử dụng Converter

### Bước 1: Nhập code PineScript
- Paste code PineScript vào khung **"PineScript Input"** bên trái
- Hoặc click nút **"Load Example"** để load code mẫu

### Bước 2: Convert
- Click nút **"Convert to Pinets"**
- Hoặc nhấn tổ hợp phím **Ctrl + Enter**

### Bước 3: Xem kết quả
- Code Pinets sẽ hiển thị trong khung **"Pinets Output"** bên phải
- Nếu có lỗi, thông báo lỗi sẽ hiển thị màu đỏ

### Bước 4: Copy code
- Click nút **"Copy to Clipboard"** để copy code Pinets
- Paste vào project của bạn

### Bước 5: Clear (tùy chọn)
- Click nút **"Clear"** để xóa cả input và output
- Bắt đầu convert code mới

## 🎯 Các tính năng chính

### 1. Indicator Declaration
**Input:**
```pinescript
indicator("My Indicator", overlay=true)
```
**Output:**
```javascript
context.indicator("My Indicator", {overlay:true})
```

### 2. Input Functions
**Input:**
```pinescript
length = input.int(9, "EMA Length")
factor = input.float(2.0, "Multiplier")
enabled = input.bool(true, "Enable Filter")
```
**Output:**
```javascript
const length = Input.int(9, {title:"EMA Length"})
const factor = Input.float(2.0, {title:"Multiplier"})
const enabled = Input.bool(true, {title:"Enable Filter"})
```

### 3. Technical Analysis Functions
**Input:**
```pinescript
ema9 = ta.ema(close, 9)
rsi14 = ta.rsi(close, 14)
atr = ta.atr(14)
```
**Output:**
```javascript
const ema9 = ta.ema(close, 9)
const rsi14 = ta.rsi(close, 14)
const atr = ta.atr(14)
```

### 4. Plot Functions
**Input:**
```pinescript
plot(ema9, "EMA9", color=color.red)
```
**Output:**
```javascript
context.plot(ema9, {title:"EMA9", color:"red"})
```

### 5. Logic Operators
**Input:**
```pinescript
bull = ema9 > ema18 and close > open
bear = ema9 < ema18 or close < open
neutral = not bull
```
**Output:**
```javascript
const bull = ema9 > ema18 && close > open
const bear = ema9 < ema18 || close < open
const neutral = !bull
```

### 6. Math & Comparison
**Input:**
```pinescript
upper = basis + mult * dev
lower = basis - mult * dev
crossover = fast > slow
```
**Output:**
```javascript
const upper = basis + mult * dev
const lower = basis - mult * dev
const crossover = fast > slow
```

## ⌨️ Keyboard Shortcuts

| Phím | Chức năng |
|------|-----------|
| `Ctrl + Enter` | Convert code |
| `Tab` | Indent trong textarea |

## 🔍 Xử lý lỗi

### Lỗi Parse Error
Nếu gặp lỗi "Parse Error", kiểm tra:
- ✅ Cú pháp PineScript có đúng không
- ✅ Có thiếu dấu ngoặc, dấu phẩy không
- ✅ Tên biến có hợp lệ không (không bắt đầu bằng số)
- ✅ Xem dòng và cột báo lỗi để tìm vị trí chính xác

### Ví dụ lỗi thường gặp:

**❌ Sai:**
```pinescript
indicator(My Indicator, overlay=true)  // Thiếu dấu ngoặc kép
```

**✅ Đúng:**
```pinescript
indicator("My Indicator", overlay=true)
```

**❌ Sai:**
```pinescript
9ema = ta.ema(close, 9)  // Tên biến bắt đầu bằng số
```

**✅ Đúng:**
```pinescript
ema9 = ta.ema(close, 9)
```

## 📋 Danh sách hàm được hỗ trợ

### Input Functions
- `input.int(default, title)`
- `input.float(default, title)`
- `input.bool(default, title)`

### Technical Analysis Functions (ta.*)
- `ta.ema()` - Exponential Moving Average
- `ta.sma()` - Simple Moving Average
- `ta.rsi()` - Relative Strength Index
- `ta.atr()` - Average True Range
- `ta.stdev()` - Standard Deviation
- `ta.highest()` - Highest value
- `ta.lowest()` - Lowest value
- Và nhiều hàm khác...

### Built-in Variables
- `open` - Giá mở cửa
- `high` - Giá cao nhất
- `low` - Giá thấp nhất
- `close` - Giá đóng cửa
- `volume` - Khối lượng giao dịch

### Color Literals
- `color.red` → `"red"`
- `color.green` → `"green"`
- `color.blue` → `"blue"`
- `color.orange` → `"orange"`
- `color.purple` → `"purple"`
- Và các màu khác...

## 🛠️ Troubleshooting

### Ứng dụng không load
1. Kiểm tra file `peg.min.js` có tồn tại không
2. Mở Console (F12) để xem lỗi JavaScript
3. Đảm bảo tất cả file (.html, .js, .css) cùng thư mục

### Nút Convert không hoạt động
1. Mở Console (F12) để xem lỗi
2. Kiểm tra grammar có compile thành công không
3. Thử refresh trang (F5)

### Output không hiển thị
1. Kiểm tra có lỗi parse không (xem status bar)
2. Thử với code đơn giản hơn
3. Xem Console log để debug

## 📱 Tương thích trình duyệt

| Trình duyệt | Phiên bản | Hỗ trợ |
|-------------|-----------|--------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Opera | 76+ | ✅ Full |

## 💾 Offline Usage

Ứng dụng hoạt động **100% offline**, không cần:
- ❌ Internet connection
- ❌ Backend server
- ❌ Database
- ❌ External APIs

Tất cả xử lý diễn ra ngay trong trình duyệt!

## 📝 Tips & Tricks

### Tip 1: Test từng phần
Nếu code dài, test từng phần nhỏ:
1. Convert indicator declaration trước
2. Thêm input functions
3. Thêm logic và calculations
4. Cuối cùng thêm plot statements

### Tip 2: Sử dụng Example
Click "Load Example" để xem cấu trúc code mẫu chuẩn

### Tip 3: Copy nhanh
Sau khi convert thành công, nhấn Ctrl+C ngay tại output area

### Tip 4: Format code
Sau khi copy code Pinets, format lại trong IDE của bạn (Prettier, ESLint, etc.)

## 🔗 Tài nguyên tham khảo

- **PineScript Documentation**: https://www.tradingview.com/pine-script-docs/
- **PEG.js Documentation**: https://pegjs.org/documentation
- **Pinets Library**: (link to your Pinets documentation)

## ❓ FAQ

**Q: Có thể convert file PineScript lớn không?**
A: Có, nhưng nên test từng phần để dễ debug.

**Q: Có hỗ trợ if/else, for loop không?**
A: Chưa hỗ trợ trong phiên bản hiện tại.

**Q: Có thể export kết quả ra file không?**
A: Hiện tại chỉ hỗ trợ copy to clipboard, bạn có thể paste vào file.

**Q: Làm sao để thêm hàm mới?**
A: Chỉnh sửa file `grammar.js` và `generator.js`.

---

**Happy Converting! 🎉**
