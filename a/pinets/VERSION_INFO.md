# 📦 Version Information

## 🌐 Two Versions Available

### Version 1: Online (CDN) - `index.html` ✅ RECOMMENDED
**Uses:** PEG.js from CDN  
**Pros:**
- ✅ Full PEG.js parser power
- ✅ More accurate parsing
- ✅ Better error messages with line/column info
- ✅ Handles complex expressions

**Cons:**
- ❌ Requires internet connection on first load
- ✅ Browser caches CDN file after first load

**How to use:**
```bash
Open: index.html
```

---

### Version 2: Offline - `index-offline.html` 🔌 FULLY OFFLINE
**Uses:** Simple regex-based parser (no external dependencies)  
**Pros:**
- ✅ 100% offline, no internet needed
- ✅ No external dependencies
- ✅ Works anywhere, anytime
- ✅ Faster initial load

**Cons:**
- ⚠️ Simpler parser (regex-based)
- ⚠️ May not handle very complex expressions
- ⚠️ Less detailed error messages

**How to use:**
```bash
Open: index-offline.html
```

---

## 🔧 Error Fix Applied

### Original Issue:
```
Uncaught SyntaxError: Unexpected token 'export' (at peg.min.js:7:97281)
ReferenceError: peg is not defined
```

### Root Cause:
The local `peg.min.js` file was an ES6 module version that uses `export` statements, which don't work directly in browser `<script>` tags without module type.

### Solutions Implemented:

#### Solution 1: Use CDN (index.html)
Changed from:
```html
<script src="peg.min.js"></script>
```

To:
```html
<script src="https://cdn.jsdelivr.net/npm/pegjs@0.10.0/peg.min.js"></script>
```

#### Solution 2: Create Offline Version (index-offline.html)
- Created `app-offline.js` with custom regex-based parser
- No PEG.js dependency
- Works 100% offline

---

## 📊 Comparison Table

| Feature | Online Version | Offline Version |
|---------|---------------|-----------------|
| Internet Required | First load only | Never |
| Parser Type | PEG.js (full) | Regex (simple) |
| Parsing Accuracy | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Complex Expressions | ✅ Yes | ⚠️ Limited |
| Error Messages | Detailed | Basic |
| File Size | ~25 KB | ~35 KB |
| Load Speed | Medium | Fast |
| Recommended For | Production use | Development/Testing |

---

## 🎯 Which Version to Use?

### Use **Online Version** (`index.html`) if:
- ✅ You have internet connection
- ✅ You need accurate parsing
- ✅ You work with complex PineScript
- ✅ You want detailed error messages

### Use **Offline Version** (`index-offline.html`) if:
- ✅ You need 100% offline capability
- ✅ You work with simple PineScript
- ✅ You're in an environment without internet
- ✅ You want fastest load time

---

## 🚀 Quick Start

### Online Version:
```bash
1. Open index.html in browser
2. Wait for PEG.js to load from CDN (1-2 seconds)
3. Start converting!
```

### Offline Version:
```bash
1. Open index-offline.html in browser
2. No waiting, works immediately
3. Start converting!
```

---

## 📝 Files Overview

```
Online Version:
├── index.html          → Main HTML (uses CDN)
├── app.js              → Uses PEG.js parser
├── grammar.js          → PEG.js grammar definition
├── generator.js        → Code generator
└── styles.css          → Styling

Offline Version:
├── index-offline.html  → Main HTML (no CDN)
├── app-offline.js      → Custom regex parser + app logic
├── generator.js        → Code generator (shared)
└── styles.css          → Styling (shared)
```

---

## 🔍 Testing Both Versions

### Test with this example:
```pinescript
indicator("EMA Cross", overlay=true)
len = input.int(9, "EMA Length")
emaFast = ta.ema(close, len)
emaSlow = ta.ema(close, 21)
bull = emaFast > emaSlow
plot(emaFast, "Fast EMA", color=color.green)
plot(emaSlow, "Slow EMA", color=color.red)
```

### Expected output (both versions):
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

## 💡 Recommendation

**For most users:** Use `index.html` (Online Version)
- Better parsing
- More reliable
- Browser caches the CDN file

**For offline environments:** Use `index-offline.html`
- No dependencies
- Works anywhere
- Good for simple scripts

---

## 🆘 Troubleshooting

### Online Version Issues:
**Problem:** "peg is not defined"  
**Solution:** Check internet connection, CDN may be blocked

**Problem:** Slow to load  
**Solution:** Wait for CDN to load, or use offline version

### Offline Version Issues:
**Problem:** Complex expressions not parsing  
**Solution:** Simplify code or use online version

**Problem:** Unexpected output  
**Solution:** Check syntax, try online version for comparison

---

## 📞 Support

Both versions support the same core features:
- ✅ indicator() declarations
- ✅ input.int/float/bool()
- ✅ plot() statements
- ✅ ta.* functions
- ✅ Logic operators (and/or/not)
- ✅ Variables and assignments
- ✅ Color literals

Choose the version that fits your needs! 🎉
