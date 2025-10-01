# 📚 PineScript v4 Support

## ✅ Đã thêm hỗ trợ PineScript v4!

### 🔄 Thay đổi chính:

#### 1. **study() Function**
PineScript v4 sử dụng `study()` thay vì `indicator()`

**v4 Code:**
```pinescript
study("My Indicator", overlay=true)
```

**Converted to:**
```javascript
context.indicator("My Indicator", {overlay:true})
```

#### 2. **TA Functions Without Prefix**
PineScript v4 không cần `ta.` prefix

**v4 Code:**
```pinescript
ema9 = ema(close, 9)
sma20 = sma(close, 20)
rsi14 = rsi(close, 14)
```

**Converted to:**
```javascript
const ema9 = ta.ema(close, 9)
const sma20 = ta.sma(close, 20)
const rsi14 = ta.rsi(close, 14)
```

### 📋 Supported TA Functions

Auto-prefix được thêm cho:

**Moving Averages:**
- `ema` → `ta.ema`
- `sma` → `ta.sma`
- `rma` → `ta.rma`
- `wma` → `ta.wma`
- `vwma` → `ta.vwma`
- `hma` → `ta.hma`

**Oscillators:**
- `rsi` → `ta.rsi`
- `macd` → `ta.macd`
- `stoch` → `ta.stoch`
- `cci` → `ta.cci`
- `mfi` → `ta.mfi`

**Volatility:**
- `atr` → `ta.atr`
- `tr` → `ta.tr`
- `bb` → `ta.bb`
- `bbw` → `ta.bbw`
- `stdev` → `ta.stdev`

**Others:**
- `obv` → `ta.obv`
- `sar` → `ta.sar`
- `highest` → `ta.highest`
- `lowest` → `ta.lowest`
- `change` → `ta.change`
- `mom` → `ta.mom`
- `roc` → `ta.roc`
- `crossover` → `ta.crossover`
- `crossunder` → `ta.crossunder`

## 🧪 Test Example

### v4 Code:
```pinescript
study(title = "EMA 20/50/100/200", overlay=true)
shortest = ema(close, 20)
short = ema(close, 50)
longer = ema(close, 100)
longest = ema(close, 200)
plot(shortest, color=red)
plot(short, color=orange)
plot(longer, color=aqua)
plot(longest, color=blue)
```

### Converted Pinets:
```javascript
context.indicator("EMA 20/50/100/200", {overlay:true})
const shortest = ta.ema(close, 20)
const short = ta.ema(close, 50)
const longer = ta.ema(close, 100)
const longest = ta.ema(close, 200)
context.plot(shortest, {color:"red"})
context.plot(short, {color:"orange"})
context.plot(longer, {color:"aqua"})
context.plot(longest, {color:"blue"})
```

## 🔄 v4 vs v5 Comparison

| Feature | v4 | v5 | Converter Output |
|---------|----|----|------------------|
| Declaration | `study()` | `indicator()` | `context.indicator()` |
| TA Functions | `ema()` | `ta.ema()` | `ta.ema()` |
| Input | `input()` | `input.int()` | `Input.int()` |
| Plot | `plot()` | `plot()` | `context.plot()` |

## ✅ What Works

- ✅ `study()` declarations
- ✅ TA functions without prefix
- ✅ `plot()` statements
- ✅ Variable assignments
- ✅ Color literals
- ✅ Named arguments

## ⚠️ Known Limitations

- ❌ `if` statements (not yet supported)
- ❌ `for` loops (not yet supported)
- ❌ Custom functions (not yet supported)
- ❌ Arrays (not yet supported)
- ❌ `var` declarations (use regular assignment)

## 💡 Tips

### Tip 1: Use v5 when possible
v5 syntax is clearer and more explicit

### Tip 2: Check converted code
Always verify the output before running

### Tip 3: Test with simple indicators first
Start with basic EMAs, SMAs before complex ones

## 🐛 Troubleshooting

### Issue: "study is not defined"
**Cause:** Old code using `study()`  
**Solution:** Already handled! Converter auto-converts to `indicator()`

### Issue: "ema is not defined"
**Cause:** v4 code without `ta.` prefix  
**Solution:** Already handled! Converter auto-adds `ta.` prefix

### Issue: Color not working
**Cause:** v4 uses `color=red` instead of `color=color.red`  
**Solution:** Use `color=color.red` or converter will handle `red` → `"red"`

## 📚 More Examples

### Example 1: RSI v4
```pinescript
study("RSI", overlay=false)
length = input(14, "Length")
rsiValue = rsi(close, length)
plot(rsiValue, color=blue)
```

### Example 2: Bollinger Bands v4
```pinescript
study("BB", overlay=true)
length = input(20)
mult = input(2.0)
basis = sma(close, length)
dev = stdev(close, length)
upper = basis + mult * dev
lower = basis - mult * dev
plot(basis, color=orange)
plot(upper, color=red)
plot(lower, color=green)
```

### Example 3: MACD v4
```pinescript
study("MACD", overlay=false)
fast = input(12)
slow = input(26)
signal = input(9)
macdLine = ema(close, fast) - ema(close, slow)
signalLine = ema(macdLine, signal)
histogram = macdLine - signalLine
plot(macdLine, color=blue)
plot(signalLine, color=red)
plot(histogram, color=gray, style=histogram)
```

---

**Now supports both PineScript v4 and v5! 🎉**
