# Test Examples for PineScript to Pinets Converter

## Example 1: Basic EMA Cross
**PineScript Input:**
```pinescript
indicator("EMA Cross", overlay=true)
len = input.int(9, "EMA Length")
emaFast = ta.ema(close, len)
emaSlow = ta.ema(close, 21)
bull = emaFast > emaSlow
plot(emaFast, "Fast EMA", color=color.green)
plot(emaSlow, "Slow EMA", color=color.red)
```

**Expected Pinets Output:**
```javascript
context.indicator("EMA Cross", {overlay:true})
const len = Input.int(9, {title:"EMA Length"})
const emaFast = ta.ema(close, len)
const emaSlow = ta.ema(close, 21)
const bull = emaFast > emaSlow
context.plot(emaFast, {title:"Fast EMA", color:"green"})
context.plot(emaSlow, {title:"Slow EMA", color:"red"})
```

---

## Example 2: RSI Indicator
**PineScript Input:**
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

**Expected Pinets Output:**
```javascript
context.indicator("RSI", {overlay:false})
const length = Input.int(14, {title:"RSI Length"})
const rsiValue = ta.rsi(close, length)
const overbought = 70
const oversold = 30
context.plot(rsiValue, {title:"RSI", color:"blue"})
context.plot(overbought, {title:"Overbought", color:"red"})
context.plot(oversold, {title:"Oversold", color:"green"})
```

---

## Example 3: Bollinger Bands
**PineScript Input:**
```pinescript
indicator("Bollinger Bands", overlay=true)
length = input.int(20, "Length")
mult = input.float(2.0, "Multiplier")
basis = ta.sma(close, length)
dev = ta.stdev(close, length)
upper = basis + mult * dev
lower = basis - mult * dev
plot(basis, "Basis", color=color.orange)
plot(upper, "Upper", color=color.red)
plot(lower, "Lower", color=color.green)
```

**Expected Pinets Output:**
```javascript
context.indicator("Bollinger Bands", {overlay:true})
const length = Input.int(20, {title:"Length"})
const mult = Input.float(2.0, {title:"Multiplier"})
const basis = ta.sma(close, length)
const dev = ta.stdev(close, length)
const upper = basis + mult * dev
const lower = basis - mult * dev
context.plot(basis, {title:"Basis", color:"orange"})
context.plot(upper, {title:"Upper", color:"red"})
context.plot(lower, {title:"Lower", color:"green"})
```

---

## Example 4: Logic Operators
**PineScript Input:**
```pinescript
indicator("Logic Test", overlay=true)
fast = ta.ema(close, 9)
slow = ta.ema(close, 21)
bullish = fast > slow and close > open
bearish = fast < slow or close < open
neutral = not bullish and not bearish
```

**Expected Pinets Output:**
```javascript
context.indicator("Logic Test", {overlay:true})
const fast = ta.ema(close, 9)
const slow = ta.ema(close, 21)
const bullish = fast > slow && close > open
const bearish = fast < slow || close < open
const neutral = !bullish && !bearish
```

---

## Example 5: Input Types
**PineScript Input:**
```pinescript
indicator("Input Types", overlay=true)
intValue = input.int(10, "Integer Input")
floatValue = input.float(1.5, "Float Input")
boolValue = input.bool(true, "Boolean Input")
```

**Expected Pinets Output:**
```javascript
context.indicator("Input Types", {overlay:true})
const intValue = Input.int(10, {title:"Integer Input"})
const floatValue = Input.float(1.5, {title:"Float Input"})
const boolValue = Input.bool(true, {title:"Boolean Input"})
```

---

## Example 6: ATR & Volatility
**PineScript Input:**
```pinescript
indicator("ATR Volatility", overlay=false)
atrLength = input.int(14, "ATR Length")
atrValue = ta.atr(atrLength)
highVol = atrValue > ta.sma(atrValue, 20)
plot(atrValue, "ATR", color=color.purple)
```

**Expected Pinets Output:**
```javascript
context.indicator("ATR Volatility", {overlay:false})
const atrLength = Input.int(14, {title:"ATR Length"})
const atrValue = ta.atr(atrLength)
const highVol = atrValue > ta.sma(atrValue, 20)
context.plot(atrValue, {title:"ATR", color:"purple"})
```

---

## How to Test

1. Open `index.html` in your browser
2. Copy any PineScript input from above
3. Paste into the left textarea
4. Click "Convert to Pinets" or press Ctrl+Enter
5. Verify the output matches the expected Pinets output
6. Click "Copy to Clipboard" to copy the result

## Quick Test Checklist

- [ ] Indicator declaration converts correctly
- [ ] Input functions (int, float, bool) work
- [ ] Plot statements convert properly
- [ ] Logic operators (and/or/not) transform to JS
- [ ] Comparison operators work (>, <, ==, etc.)
- [ ] Math operators function correctly
- [ ] TA functions preserve names (ta.ema, ta.sma, etc.)
- [ ] Color literals convert (color.red → "red")
- [ ] Variables get const prefix
- [ ] Copy to clipboard works
- [ ] Clear button works
- [ ] Load example button works
