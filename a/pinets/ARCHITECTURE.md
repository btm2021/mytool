# 🏗️ Architecture Diagram - PineScript to Pinets Converter

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                         (index.html)                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │  PineScript      │              │   Pinets         │        │
│  │  Input Panel     │              │   Output Panel   │        │
│  │  (textarea)      │              │   (pre)          │        │
│  └──────────────────┘              └──────────────────┘        │
│                                                                  │
│  [Convert] [Load Example] [Clear]        [Copy to Clipboard]   │
│                                                                  │
│  Status Bar: ⚠️ Success / Error / Info messages                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│                        (app.js)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  class PineScriptConverter {                                    │
│    ├─ initializeParser()    // Compile PEG.js grammar          │
│    ├─ convert(code)          // Main conversion flow           │
│    ├─ showStatus(msg)        // UI feedback                    │
│    └─ formatError(err)       // Error formatting               │
│  }                                                              │
│                                                                  │
│  Event Handlers:                                                │
│    ├─ convertBtn.click()     → convert()                       │
│    ├─ copyBtn.click()        → clipboard.writeText()           │
│    ├─ clearBtn.click()       → clear inputs                    │
│    ├─ exampleBtn.click()     → load example                    │
│    └─ Ctrl+Enter             → convert()                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      PARSER LAYER                               │
│                   (grammar.js + peg.js)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PineScript Code (String)                                       │
│           ↓                                                     │
│  PEG.js Parser (compiled from grammar)                          │
│           ↓                                                     │
│  Abstract Syntax Tree (AST)                                     │
│                                                                  │
│  Grammar Rules:                                                 │
│    ├─ Start → Program                                          │
│    ├─ Statement → Indicator | Assignment | Plot                │
│    ├─ Expression → LogicalOr → LogicalAnd → Comparison         │
│    ├─ FunctionCall → MemberExpression + Arguments              │
│    ├─ Literal → Number | String | Boolean | Color              │
│    └─ Identifier → Variable names                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    GENERATOR LAYER                              │
│                     (generator.js)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  class PinetsGenerator {                                        │
│    ├─ generate(ast)              // Entry point                │
│    ├─ generateStatement(node)    // Route by type              │
│    ├─ generateIndicator(node)    // indicator() → context.*    │
│    ├─ generateAssignment(node)   // Add const prefix           │
│    ├─ generatePlot(node)         // plot() → context.plot()    │
│    ├─ generateExpression(node)   // Handle expressions         │
│    ├─ generateBinaryExpression() // and/or → &&/||             │
│    ├─ generateFunctionCall()     // input.* → Input.*          │
│    └─ generateNamedArgument()    // Map argument names         │
│  }                                                              │
│                                                                  │
│  AST Node → Pinets Code (String)                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                         OUTPUT                                  │
│                    Pinets Code (String)                         │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

```
┌──────────────┐
│ User Input   │
│ PineScript   │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────┐
│ 1. Parse Phase                       │
│    PineScript → AST                  │
│                                      │
│    Example:                          │
│    "ema9 = ta.ema(close, 9)"        │
│           ↓                          │
│    {                                 │
│      type: 'Assignment',             │
│      name: {type:'Identifier',...},  │
│      value: {type:'FunctionCall'...} │
│    }                                 │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ 2. Generate Phase                    │
│    AST → Pinets Code                 │
│                                      │
│    Walk AST tree:                    │
│    - Visit each node                 │
│    - Apply transformation rules      │
│    - Build output string             │
│                                      │
│    Result:                           │
│    "const ema9 = ta.ema(close, 9)"  │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────┐
│ Display      │
│ Output       │
└──────────────┘
```

## 🎯 Transformation Rules

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSFORMATION MAPPING                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PineScript                    →    Pinets                      │
│  ─────────────────────────────────────────────────────────      │
│                                                                  │
│  indicator(...)                →    context.indicator(...)      │
│  input.int(...)                →    Input.int(...)              │
│  input.float(...)              →    Input.float(...)            │
│  input.bool(...)               →    Input.bool(...)             │
│  plot(...)                     →    context.plot(...)           │
│                                                                  │
│  var = value                   →    const var = value           │
│                                                                  │
│  and                           →    &&                          │
│  or                            →    ||                          │
│  not                           →    !                           │
│                                                                  │
│  color.red                     →    "red"                       │
│  color.green                   →    "green"                     │
│                                                                  │
│  ta.ema(...)                   →    ta.ema(...)  (unchanged)    │
│  ta.sma(...)                   →    ta.sma(...)  (unchanged)    │
│                                                                  │
│  open, high, low, close        →    (unchanged)                 │
│                                                                  │
│  Named args:                                                    │
│    func(x, title="T")          →    func(x, {title:"T"})        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🧩 Module Dependencies

```
index.html
    │
    ├─→ styles.css          (UI styling)
    │
    ├─→ peg.min.js          (Parser generator library)
    │
    ├─→ grammar.js          (PineScript grammar definition)
    │       │
    │       └─→ Uses: peg.generate()
    │
    ├─→ generator.js        (AST to Pinets converter)
    │       │
    │       └─→ class PinetsGenerator
    │
    └─→ app.js              (Main application logic)
            │
            ├─→ Uses: PINESCRIPT_GRAMMAR (from grammar.js)
            ├─→ Uses: PinetsGenerator (from generator.js)
            └─→ Uses: peg.generate() (from peg.min.js)
```

## 📦 Class Diagram

```
┌─────────────────────────────────────┐
│     PineScriptConverter             │
├─────────────────────────────────────┤
│ - parser: Parser                    │
│ - generator: PinetsGenerator        │
├─────────────────────────────────────┤
│ + initializeParser(): void          │
│ + convert(code: string): Result     │
│ + showStatus(msg, type): void       │
│ + formatError(err, loc): string     │
└─────────────────────────────────────┘
                │
                │ uses
                ↓
┌─────────────────────────────────────┐
│       PinetsGenerator               │
├─────────────────────────────────────┤
│ - output: string[]                  │
├─────────────────────────────────────┤
│ + generate(ast): string             │
│ + generateStatement(node): string   │
│ + generateIndicator(node): string   │
│ + generateAssignment(node): string  │
│ + generatePlot(node): string        │
│ + generateExpression(node): string  │
│ + generateBinaryExpression(): str   │
│ + generateFunctionCall(node): str   │
│ + generateMemberExpression(): str   │
│ + generateNamedArgument(arg): str   │
└─────────────────────────────────────┘
```

## 🔍 AST Structure Example

```javascript
// Input: indicator("EMA", overlay=true)

{
  type: 'Program',
  body: [
    {
      type: 'IndicatorDeclaration',
      name: {
        type: 'StringLiteral',
        value: 'EMA'
      },
      arguments: [
        {
          type: 'NamedArgument',
          name: { type: 'Identifier', name: 'overlay' },
          value: { type: 'BooleanLiteral', value: true }
        }
      ]
    }
  ]
}

// Output: context.indicator("EMA", {overlay:true})
```

## 🎨 UI Component Structure

```
<body>
  <div class="container">
    
    <header class="header">
      ├─ <h1> Title
      └─ <p> Description
    
    <div id="status" class="status">
      └─ Dynamic status messages
    
    <div class="content">
      │
      ├─ <div class="panel"> (Input)
      │   ├─ <div class="panel-header">
      │   └─ <div class="panel-body">
      │       ├─ <textarea id="pineInput">
      │       └─ <div class="button-group">
      │           ├─ [Convert]
      │           ├─ [Load Example]
      │           └─ [Clear]
      │
      └─ <div class="panel"> (Output)
          ├─ <div class="panel-header">
          └─ <div class="panel-body">
              ├─ <pre id="output">
              └─ <div class="button-group">
                  └─ [Copy to Clipboard]
    
    <section class="features">
      └─ Feature showcase grid
    
    <footer class="footer">
      └─ Credits & copyright
  
  </div>
  
  <script src="peg.min.js">
  <script src="grammar.js">
  <script src="generator.js">
  <script src="app.js">
</body>
```

## 🚦 Error Handling Flow

```
User Input
    ↓
Try Parse
    │
    ├─ Success → Generate Code → Display Output
    │
    └─ Error → Catch Exception
                    ↓
               Extract Error Info
                    ↓
               Format Error Message
                    ↓
               Show in Status Bar
                    ↓
               Display in Output Panel
```

## 💾 State Management

```
Application State:
├─ parser: null | Parser instance
├─ generator: PinetsGenerator instance
└─ DOM Elements:
    ├─ pineInput: textarea
    ├─ output: pre
    ├─ status: div
    └─ buttons: NodeList

No persistent state (no localStorage/cookies)
All state is ephemeral (session-only)
```

## 🔐 Security Model

```
┌─────────────────────────────────────┐
│         Client-Side Only            │
├─────────────────────────────────────┤
│                                     │
│  ✅ No server communication         │
│  ✅ No external API calls           │
│  ✅ No data persistence             │
│  ✅ No cookies/localStorage         │
│  ✅ No user tracking                │
│  ✅ Pure JavaScript execution       │
│  ✅ Sandboxed in browser            │
│                                     │
│  All code runs locally in browser   │
│  No data leaves user's machine      │
│                                     │
└─────────────────────────────────────┘
```

---

## 📝 Notes

- **Modular Design**: Each component has single responsibility
- **Separation of Concerns**: UI, Parser, Generator are independent
- **Error Resilient**: Graceful error handling at each layer
- **Extensible**: Easy to add new grammar rules and generators
- **Testable**: Each module can be tested independently
- **Performant**: Minimal overhead, fast parsing and generation
- **Maintainable**: Clear code structure with documentation

