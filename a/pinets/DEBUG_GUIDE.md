# 🐛 Debug Guide - Missing Initializer Error

## 🔍 How to Debug

### Step 1: Open Console
Press **F12** to open browser console

### Step 2: Look for Logs

When you click "Convert to Pinets", you'll see:
```
Skipping comparison assignment: bull
Skipping unary expression assignment: neutral
```

When you click "Run & Calculate", you'll see:
```
=== Executing Pinets Code ===
context.indicator("EMA Cross", {overlay:true})
const len = Input.int(9, {title:"EMA Length"})
const emaFast = ta.ema(close, len)
const emaSlow = ta.ema(close, 21)
context.plot(emaFast, {title:"Fast EMA", color:"green"})
context.plot(emaSlow, {title:"Slow EMA", color:"red"})
============================
```

### Step 3: Check for Invalid Lines

Look for lines like:
```javascript
const something =           // ❌ Missing value!
const x = undefined         // ❌ Undefined!
const y =                   // ❌ Empty!
```

## 🛠️ What Gets Skipped Now

### ✅ Skipped (Safe):
```javascript
// Pure comparisons
bull = emaFast > emaSlow          // → SKIPPED

// Unary expressions
neutral = not bullish             // → SKIPPED

// Invalid values
something = undefined             // → SKIPPED
```

### ✅ Kept (Needed):
```javascript
// Function calls
emaFast = ta.ema(close, len)      // → KEPT

// Calculations with functions
upper = basis + 2 * dev           // → KEPT (if dev has function)

// Simple values
overbought = 70                   // → KEPT
```

## 🧪 Test Cases

### Test 1: EMA Cross (Should Work)
```pinescript
indicator("EMA Cross", overlay=true)
len = input.int(9, "EMA Length")
emaFast = ta.ema(close, len)
emaSlow = ta.ema(close, 21)
bull = emaFast > emaSlow
plot(emaFast, "Fast EMA", color=color.green)
plot(emaSlow, "Slow EMA", color=color.red)
```

**Expected Console:**
```
Skipping comparison assignment: bull
=== Executing Pinets Code ===
context.indicator("EMA Cross", {overlay:true})
const len = Input.int(9, {title:"EMA Length"})
const emaFast = ta.ema(close, len)
const emaSlow = ta.ema(close, 21)
context.plot(emaFast, {title:"Fast EMA", color:"green"})
context.plot(emaSlow, {title:"Slow EMA", color:"red"})
============================
```

**Result:** ✅ Should work!

### Test 2: Bollinger Bands (Should Work)
```pinescript
indicator("BB", overlay=true)
length = input.int(20, "Length")
mult = input.float(2.0, "Mult")
basis = ta.sma(close, length)
dev = ta.stdev(close, length)
upper = basis + mult * dev
lower = basis - mult * dev
plot(basis, "Basis", color=color.orange)
plot(upper, "Upper", color=color.red)
plot(lower, "Lower", color=color.green)
```

**Expected:** ✅ All lines kept (calculations needed for plots)

## 🚨 If Still Getting Error

### Check Console Output

Look at the "Executing Pinets Code" section. If you see:
```javascript
const something =
```

This means generator failed to skip it properly.

### Common Issues:

**Issue 1: Empty value**
```javascript
const x =        // ❌ BAD
```
**Solution:** Generator should skip this (check console for warning)

**Issue 2: Undefined reference**
```javascript
const y = someUndefinedVar    // ❌ BAD
```
**Solution:** Variable not defined in scope

**Issue 3: Invalid syntax**
```javascript
const z = )      // ❌ BAD
```
**Solution:** Parser error, check PineScript syntax

## 📋 Debug Checklist

- [ ] Open console (F12)
- [ ] Click "Convert to Pinets"
- [ ] Check for "Skipping..." messages
- [ ] Look at generated code in output panel
- [ ] Click "Run & Calculate"
- [ ] Check "Executing Pinets Code" log
- [ ] Look for lines with `const x =` (no value)
- [ ] Check error line number
- [ ] Match line number to code

## 💡 Quick Fixes

### Fix 1: Simplify Code
Remove complex comparisons:
```pinescript
// Instead of:
bull = emaFast > emaSlow and close > open

// Use:
// (Just don't assign it, only use in conditions)
```

### Fix 2: Use Only Function Calls
```pinescript
// Good:
ema9 = ta.ema(close, 9)
sma20 = ta.sma(close, 20)

// Avoid:
condition = ema9 > sma20  // This gets skipped
```

### Fix 3: Check Generated Code
Before clicking "Run & Calculate":
1. Look at output panel
2. Check each line has valid syntax
3. No lines ending with `=`

## 🔧 Manual Fix

If you see invalid code in output panel, you can:
1. Copy the code
2. Edit it manually
3. Remove invalid lines
4. Paste back
5. Click "Run & Calculate"

## 📞 Report Issue

If error persists, report with:
1. PineScript input code
2. Generated Pinets code (from output panel)
3. Console logs
4. Error message
5. Line number

---

**Remember:** Open console (F12) first to see debug logs! 🔍
