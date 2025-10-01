# 📊 Pinets Calculation Guide

## 🎯 Tính năng mới: Run & Calculate

Ứng dụng hiện đã tích hợp **Pinets Engine** để thực thi code và hiển thị kết quả tính toán dưới dạng bảng!

## 🚀 Cách sử dụng

### Bước 1: Convert PineScript
```
1. Paste PineScript code vào khung trái
2. Click "Convert to Pinets"
3. Code Pinets sẽ hiển thị bên phải
```

### Bước 2: Run & Calculate
```
4. Click nút "▶️ Run & Calculate"
5. Pinets Engine sẽ thực thi code
6. Kết quả hiển thị dưới dạng bảng
```

### Bước 3: Xem kết quả
```
7. Xem thông tin indicator
8. Xem các input parameters
9. Xem danh sách plots
10. Xem bảng dữ liệu với giá trị tính toán
```

---

## 📋 Ví dụ hoàn chỉnh

### Input PineScript:
```pinescript
indicator("EMA Cross", overlay=true)
len = input.int(9, "EMA Length")
emaFast = ta.ema(close, len)
emaSlow = ta.ema(close, 21)
bull = emaFast > emaSlow
plot(emaFast, "Fast EMA", color=color.green)
plot(emaSlow, "Slow EMA", color=color.red)
```

### Sau khi Convert:
```javascript
context.indicator("EMA Cross", {overlay:true})
const len = Input.int(9, {title:"EMA Length"})
const emaFast = ta.ema(close, len)
const emaSlow = ta.ema(close, 21)
const bull = emaFast > emaSlow
context.plot(emaFast, {title:"Fast EMA", color:"green"})
context.plot(emaSlow, {title:"Slow EMA", color:"red"})
```

### Sau khi Run & Calculate:

**Indicator Info:**
- 📊 EMA Cross
- Bars: 100
- Inputs:
  - EMA Length: 9
- Plots:
  - ● Fast EMA (green)
  - ● Slow EMA (red)

**Results Table:**
| index | time | open | high | low | close | volume | Fast EMA | Slow EMA |
|-------|------|------|------|-----|-------|--------|----------|----------|
| 0 | 2024-12-23 | 100.00 | 102.34 | 99.12 | 101.45 | 1234567 | 101.45 | - |
| 1 | 2024-12-24 | 101.45 | 103.21 | 100.89 | 102.34 | 1345678 | 101.89 | - |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

---

## 🔧 Pinets Engine Features

### 1. Market Data Simulation
- Generates 100 bars of OHLCV data
- Realistic price movements with trend and volatility
- Daily timeframe

### 2. Technical Analysis Functions

#### ✅ Supported TA Functions:

**ta.ema(source, length)**
- Exponential Moving Average
- Smoothing with exponential weights

**ta.sma(source, length)**
- Simple Moving Average
- Arithmetic mean of last N periods

**ta.rsi(source, length)**
- Relative Strength Index
- Momentum oscillator (0-100)

**ta.atr(length)**
- Average True Range
- Volatility indicator

**ta.stdev(source, length)**
- Standard Deviation
- Measures price dispersion

### 3. Input Functions

**Input.int(default, options)**
- Integer input parameter
- Example: `Input.int(9, {title:"Length"})`

**Input.float(default, options)**
- Float input parameter
- Example: `Input.float(2.0, {title:"Multiplier"})`

**Input.bool(default, options)**
- Boolean input parameter
- Example: `Input.bool(true, {title:"Enable"})`

### 4. Context Functions

**context.indicator(name, options)**
- Declares indicator name
- Options: overlay, etc.

**context.plot(series, options)**
- Plots series on chart
- Options: title, color, linewidth, etc.

### 5. Built-in Series

- `open` - Opening prices
- `high` - High prices
- `low` - Low prices
- `close` - Closing prices
- `volume` - Trading volumes

---

## 📊 Results Display

### Indicator Info Panel
Shows:
- Indicator name
- Number of bars
- Input parameters
- Plot configurations

### Data Table
Displays:
- Market data (OHLCV)
- Calculated indicator values
- Last 50 bars (for performance)
- Scrollable container

### Table Features:
- ✅ Sticky header
- ✅ Alternating row colors
- ✅ Hover highlighting
- ✅ Right-aligned numbers
- ✅ Null values shown as "-"
- ✅ 2 decimal precision

---

## 💡 Tips & Tricks

### Tip 1: Start Simple
Test with simple indicators first:
```pinescript
indicator("SMA", overlay=true)
sma20 = ta.sma(close, 20)
plot(sma20, "SMA 20", color=color.blue)
```

### Tip 2: Multiple Plots
You can plot multiple series:
```pinescript
indicator("Bollinger Bands", overlay=true)
basis = ta.sma(close, 20)
dev = ta.stdev(close, 20)
upper = basis + 2 * dev
lower = basis - 2 * dev
plot(basis, "Basis", color=color.orange)
plot(upper, "Upper", color=color.red)
plot(lower, "Lower", color=color.green)
```

### Tip 3: Check Console
Open browser console (F12) to see:
- Execution logs
- Debug information
- Error details

### Tip 4: Close Results Panel
Click the ✕ button to hide results and run again

---

## 🐛 Troubleshooting

### Error: "Please convert PineScript code first"
**Solution:** Click "Convert to Pinets" before "Run & Calculate"

### Error: "Execution error: ..."
**Possible causes:**
- Syntax error in converted code
- Unsupported function
- Invalid parameters

**Solution:**
1. Check converted code syntax
2. Verify function names
3. Check console for details

### Empty or Wrong Results
**Possible causes:**
- Plot not called
- Series not calculated correctly

**Solution:**
1. Ensure `plot()` is called
2. Check calculation logic
3. Verify input parameters

---

## 🎓 Advanced Examples

### Example 1: RSI with Levels
```pinescript
indicator("RSI", overlay=false)
length = input.int(14, "RSI Length")
rsiValue = ta.rsi(close, length)
overbought = 70
oversold = 30
plot(rsiValue, "RSI", color=color.blue)
plot(overbought, "Overbought", color=color.red)
plot(oversold, "Oversold", color=color.green)
```

### Example 2: ATR Volatility
```pinescript
indicator("ATR", overlay=false)
atrLength = input.int(14, "ATR Length")
atrValue = ta.atr(atrLength)
plot(atrValue, "ATR", color=color.purple)
```

### Example 3: Multiple EMAs
```pinescript
indicator("Multi EMA", overlay=true)
ema9 = ta.ema(close, 9)
ema21 = ta.ema(close, 21)
ema50 = ta.ema(close, 50)
plot(ema9, "EMA 9", color=color.green)
plot(ema21, "EMA 21", color=color.orange)
plot(ema50, "EMA 50", color=color.red)
```

---

## 📈 Performance Notes

- **Data Generation:** ~1ms
- **Code Execution:** ~10-50ms (depends on complexity)
- **Table Rendering:** ~50-100ms
- **Total Time:** < 200ms typically

**Optimization:**
- Shows last 50 bars only
- Uses efficient array operations
- Minimal DOM manipulation

---

## 🔮 Future Enhancements

Planned features:
- [ ] Chart visualization (canvas/SVG)
- [ ] Export results to CSV
- [ ] Custom timeframes
- [ ] More TA functions
- [ ] Real market data import
- [ ] Backtesting capabilities

---

## ❓ FAQ

**Q: Dữ liệu có thật không?**
A: Không, dữ liệu được generate ngẫu nhiên để demo. Trong production, bạn sẽ dùng dữ liệu thật.

**Q: Có thể thay đổi số lượng bars không?**
A: Hiện tại fix 100 bars. Bạn có thể sửa trong `pinets-engine.js`.

**Q: Tại sao chỉ hiển thị 50 bars cuối?**
A: Để tối ưu performance. Bạn có thể scroll để xem toàn bộ.

**Q: Có thể export kết quả không?**
A: Chưa có tính năng này. Sẽ được thêm trong tương lai.

**Q: Làm sao để thêm TA function mới?**
A: Chỉnh sửa `createTA()` method trong `pinets-engine.js`.

---

**Happy Calculating! 📊**
