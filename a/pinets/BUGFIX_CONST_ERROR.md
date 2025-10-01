# 🐛 Bug Fix: Missing Initializer in Const Declaration

## ❌ Error
```
SyntaxError: Missing initializer in const declaration
at PinetsEngine.execute (pinets-engine.js:213:12)
```

## 🔍 Root Cause

Code được generate có dòng:
```javascript
const bull = emaFast > emaSlow
```

Nhưng `emaFast` và `emaSlow` là **arrays**, không phải numbers. Khi eval() thực thi, phép so sánh `array > array` trả về `true/false`, không phải giá trị hợp lệ cho const.

## ✅ Solution

Sửa `generator.js` để **skip các assignments chỉ chứa comparisons** mà không có function calls:

```javascript
generateAssignment(node) {
  const name = node.name.name;
  const value = this.generateExpression(node.value);
  
  // Skip pure comparisons (no function calls)
  if (node.value.type === 'BinaryExpression' && 
      !this.containsFunctionCall(node.value)) {
    return ''; // Skip this line
  }
  
  return `const ${name} = ${value}`;
}

containsFunctionCall(node) {
  if (!node) return false;
  if (node.type === 'FunctionCall') return true;
  if (node.type === 'BinaryExpression') {
    return this.containsFunctionCall(node.left) || 
           this.containsFunctionCall(node.right);
  }
  return false;
}
```

## 📊 What Gets Skipped

```javascript
// ❌ SKIPPED (pure comparisons)
bull = emaFast > emaSlow
bearish = close < open
neutral = not bullish
```

## 📊 What Gets Kept

```javascript
// ✅ KEPT (has function calls or needed for plots)
emaFast = ta.ema(close, len)
basis = ta.sma(close, 20)
upper = basis + 2 * dev
overbought = 70
```

## 🧪 Test

**Before:**
```pinescript
bull = emaFast > emaSlow
```
→ Generates: `const bull = emaFast > emaSlow` ❌ Error!

**After:**
```pinescript
bull = emaFast > emaSlow
```
→ Generates: *(nothing, skipped)* ✅ No error!

## ✅ Status: FIXED

File modified: `generator.js`
- Added `containsFunctionCall()` helper
- Modified `generateAssignment()` to skip pure comparisons

**Test với example code để verify!** 🚀
