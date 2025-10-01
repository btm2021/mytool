# 🌲 PineScript to Pinets Converter

Ứng dụng web thuần (HTML + CSS + JavaScript) chuyển đổi code PineScript sang định dạng Pinets, chạy hoàn toàn trong trình duyệt không cần backend.

## 📋 Tính năng

### Hỗ trợ cú pháp PineScript

- ✅ **Indicator Declaration**: `indicator("Name", overlay=true)` → `context.indicator("Name", {overlay:true})`
- ✅ **Input Functions**: `input.int()`, `input.float()`, `input.bool()` → `Input.*`
- ✅ **Plot Functions**: `plot(value, "Title", color=color.red)` → `context.plot(value, {title:"Title", color:"red"})`
- ✅ **Variables & Series**: `ema9 = ta.ema(close, 9)` → `const ema9 = ta.ema(close, 9)`
- ✅ **Logic Operators**: `and`, `or`, `not` → `&&`, `||`, `!`
- ✅ **Comparison Operators**: `>`, `<`, `>=`, `<=`, `==`, `!=`
- ✅ **Math Operators**: `+`, `-`, `*`, `/`, `%`
- ✅ **Technical Analysis Functions**: `ta.ema`, `ta.sma`, `ta.rsi`, `ta.atr`, etc.
- ✅ **Built-in Variables**: `open`, `high`, `low`, `close`, `volume`
- ✅ **Color Literals**: `color.red` → `"red"`

## 🚀 Cách sử dụng

### Chạy ứng dụng

1. Mở file `index.html` trong trình duyệt (Chrome, Firefox, Edge, Safari)
2. **Lưu ý:** Cần kết nối internet lần đầu để tải PEG.js từ CDN (sau đó browser sẽ cache)

### Sử dụng converter

1. **Paste code PineScript** vào khung bên trái
2. **Click "Convert to Pinets"** hoặc nhấn `Ctrl+Enter`
3. **Xem kết quả** ở khung bên phải
4. **Copy code** bằng nút "Copy to Clipboard"

### Ví dụ

**Input (PineScript):**
```pinescript
indicator("EMA Cross", overlay=true)
len = input.int(9, "EMA Length")
emaFast = ta.ema(close, len)
emaSlow = ta.ema(close, 21)
bull = emaFast > emaSlow
plot(emaFast, "Fast EMA", color=color.green)
plot(emaSlow, "Slow EMA", color=color.red)
```

**Output (Pinets):**
```javascript
context.indicator("EMA Cross", {overlay:true})
const len = Input.int(9, {title:"EMA Length"})
const emaFast = ta.ema(close, len)
const emaSlow = ta.ema(close, 21)
const bull = emaFast > emaSlow
context.plot(emaFast, {title:"Fast EMA", color:"green"})
context.plot(emaSlow, {title:"Slow EMA", color:"red"})
```

## 📁 Cấu trúc file

```
pinets/
├── index.html      # File HTML chính
├── styles.css      # CSS styling
├── grammar.js      # PEG.js grammar định nghĩa cú pháp PineScript
├── generator.js    # Code generator chuyển AST → Pinets
├── app.js          # Logic ứng dụng chính
├── peg.min.js      # PEG.js library (parser generator)
└── README.md       # Tài liệu này
```

## 🛠️ Kiến trúc

### 1. Grammar (grammar.js)
- Định nghĩa cú pháp PineScript bằng PEG.js grammar
- Parse code thành Abstract Syntax Tree (AST)
- Hỗ trợ: expressions, statements, functions, operators

### 2. Generator (generator.js)
- Class `PinetsGenerator` duyệt AST
- Chuyển đổi từng node thành code Pinets
- Áp dụng các quy tắc mapping:
  - `indicator()` → `context.indicator()`
  - `input.*` → `Input.*`
  - `plot()` → `context.plot()`
  - Logic operators → JS operators

### 3. App Logic (app.js)
- Class `PineScriptConverter` quản lý flow
- Compile grammar khi khởi động
- Xử lý events: convert, copy, clear, load example
- Hiển thị status và error messages

### 4. UI (index.html + styles.css)
- Modern, responsive design
- Split view: Input | Output
- Status bar với color coding
- Button actions với keyboard shortcuts

## 🔧 Công nghệ

- **PEG.js**: Parser generator cho JavaScript
- **Vanilla JavaScript**: Không dùng framework
- **CSS3**: Modern styling với CSS Grid & Flexbox
- **HTML5**: Semantic markup

## 📝 Ghi chú

### Hạn chế hiện tại
- Chưa hỗ trợ: `if/else`, `for` loops, functions definition
- Chưa hỗ trợ: array indexing, complex expressions
- Chưa hỗ trợ: multi-line strings, comments

### Mở rộng trong tương lai
- Thêm hỗ trợ control flow (if/else, for)
- Hỗ trợ function definitions
- Syntax highlighting cho input/output
- Export/Import file
- Validation & error recovery

## 📄 License

MIT License - Free to use and modify

## 👨‍💻 Development

Để mở rộng grammar, chỉnh sửa file `grammar.js`:
```javascript
// Thêm rule mới
NewRule
  = "keyword" _ expr:Expression {
      return { type: 'NewRule', expression: expr };
    }
```

Để thêm generator logic, chỉnh sửa `generator.js`:
```javascript
generateNewRule(node) {
  // Xử lý node mới
  return `generated_code`;
}
```

## 🐛 Bug Reports

Nếu gặp lỗi parsing hoặc conversion không đúng, vui lòng:
1. Check console log (F12) để xem AST
2. Verify grammar rule trong `grammar.js`
3. Test với code đơn giản hơn

---

**Enjoy converting! 🚀**
