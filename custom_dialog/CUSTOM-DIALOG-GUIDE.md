# Custom Dialog Development Guide

Hướng dẫn chuẩn hóa việc tạo custom dialog/panel cho TradingView Terminal.

## 📋 Mục lục

1. [Tổng quan](#tổng-quan)
2. [Cấu trúc hệ thống](#cấu-trúc-hệ-thống)
3. [Quick Start](#quick-start)
4. [API Reference](#api-reference)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

---

## Tổng quan

### Hệ thống Custom Dialog

Custom Dialog System cung cấp:
- ✅ Base class chuẩn (`DialogBase`)
- ✅ Theme TradingView đồng nhất
- ✅ Tool Manager để quản lý tools
- ✅ Sidebar navigation
- ✅ LocalStorage support
- ✅ Responsive design

### Kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                    TradingView App                      │
├─────────────────────────────────────────────────────────┤
│  Header: [Menu] [Tool] [Chart Controls]                │
├─────────────────────────────────────────────────────────┤
│  ┌─ Tool Sidebar ─┐  ┌─ Main Chart ─────────────────┐  │
│  │ • PNL Calc     │  │                              │  │
│  │ • Position Size│  │      Chart Area              │  │
│  │ • Screener     │  │                              │  │
│  │ • Calendar     │  │                              │  │
│  │ • Your Tool    │  │                              │  │
│  └────────────────┘  └──────────────────────────────┘  │
│                                                         │
│  ┌─ Dialog Overlay ────────────────────────────────┐   │
│  │  ┌─ Your Custom Dialog ──────────────────────┐ │   │
│  │  │ [Title]                              [X]  │ │   │
│  │  │ ─────────────────────────────────────────│ │   │
│  │  │                                          │ │   │
│  │  │         Your Content Here                │ │   │
│  │  │                                          │ │   │
│  │  └──────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Cấu trúc hệ thống

### Files cốt lõi

```
custom_dialog/
├── dialog-base.js           # Base class - KHÔNG SỬA
├── dialog-styles.css        # Base styles - KHÔNG SỬA
├── tool-manager.js          # Tool manager - CHỈ THÊM TOOL
├── tool-styles.css          # Tool sidebar styles - KHÔNG SỬA
├── template-dialog.js       # Template để copy
└── your-dialog.js           # Dialog của bạn
```

### Dependencies

```html
<!-- index.html -->
<link rel="stylesheet" href="custom_dialog/dialog-styles.css">
<link rel="stylesheet" href="custom_dialog/tool-styles.css">
<link rel="stylesheet" href="custom_dialog/your-styles.css">

<script src="custom_dialog/dialog-base.js"></script>
<script src="custom_dialog/your-dialog.js"></script>
<script src="custom_dialog/tool-manager.js"></script>
```

---

## Quick Start

### Bước 1: Copy Template

```bash
cp custom_dialog/template-dialog.js custom_dialog/my-tool.js
```

### Bước 2: Tạo Dialog Class

```javascript
// my-tool.js
class MyToolDialog extends DialogBase {
    constructor() {
        super({
            id: 'my-tool',              // Unique ID
            title: 'My Tool',           // Dialog title
            width: '600px',             // Dialog width
            height: 'auto',             // Dialog height
            maxHeight: '90vh'           // Max height
        });
    }

    create() {
        super.create();
        this.renderContent();
        return this;
    }

    renderContent() {
        const content = document.createElement('div');
        
        // Tạo UI của bạn ở đây
        const input = this.createInput({
            id: 'my-input',
            type: 'text',
            placeholder: 'Enter value'
        });
        
        content.appendChild(this.createFormGroup('Label', input));
        
        const button = this.createButton('Submit', {
            variant: 'primary',
            onClick: () => this.handleSubmit()
        });
        
        content.appendChild(button);
        this.setContent(content);
    }

    handleSubmit() {
        const value = document.getElementById('my-input').value;
        // Xử lý logic của bạn
        console.log('Value:', value);
    }
}

// Export
window.MyToolDialog = MyToolDialog;
```

### Bước 3: Thêm vào index.html

```html
<script src="custom_dialog/my-tool.js"></script>
```

### Bước 4: Đăng ký Tool

```javascript
// tool-manager.js
toolManager.registerTool({
    name: 'My Tool',
    description: 'Description of my tool',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
    </svg>`,
    action: () => {
        const dialog = new MyToolDialog();
        dialog.show();
    }
});
```

### Bước 5: Test

1. Refresh browser
2. Click nút "Tool" trên header
3. Chọn "My Tool" từ sidebar
4. Dialog sẽ mở

---

## API Reference

### DialogBase Constructor Options

```javascript
{
    id: 'unique-id',           // Required: Unique dialog ID
    title: 'Dialog Title',     // Required: Dialog title
    width: '600px',            // Optional: Dialog width (default: 600px)
    height: 'auto',            // Optional: Dialog height (default: auto)
    maxHeight: '90vh',         // Optional: Max height (default: 90vh)
    onClose: () => {}          // Optional: Callback when closed
}
```

### DialogBase Methods

#### UI Creation

```javascript
// Create input field
this.createInput({
    id: 'input-id',
    type: 'text|number|date|email',
    placeholder: 'Placeholder',
    value: 'Default value',
    step: '0.01',              // For number inputs
    min: 0,                    // For number inputs
    max: 100                   // For number inputs
})

// Create select dropdown
this.createSelect({
    id: 'select-id',
    options: [
        { value: '1', label: 'Option 1', selected: true },
        { value: '2', label: 'Option 2' }
    ]
})

// Create button
this.createButton('Button Text', {
    variant: 'primary|secondary',
    onClick: () => { /* handler */ }
})

// Create form group (label + input)
this.createFormGroup('Label Text', inputElement)

// Create result display
this.createResultDisplay('Label', 'Value', {
    highlight: true  // Optional: highlight style
})
```

#### Dialog Control

```javascript
this.show()        // Show dialog
this.close()       // Close dialog
this.setContent(element)  // Set dialog content
```

### CSS Classes

#### Layout

```css
.tv-dialog-section      /* Section container */
.tv-grid.cols-2         /* 2 column grid */
.tv-grid.cols-3         /* 3 column grid */
.tv-divider             /* Horizontal divider */
```

#### Form Elements

```css
.tv-form-group          /* Form group wrapper */
.tv-form-label          /* Label */
.tv-form-input          /* Input field */
.tv-form-select         /* Select dropdown */
```

#### Buttons

```css
.tv-button.primary      /* Primary button (blue) */
.tv-button.secondary    /* Secondary button (gray) */
.tv-button-group        /* Button group container */
```

#### Results

```css
.tv-result-display      /* Result row */
.tv-result-label        /* Result label */
.tv-result-value        /* Result value */
.tv-result-value.positive   /* Green text */
.tv-result-value.negative   /* Red text */
```

#### Info Boxes

```css
.tv-info-box            /* Info box */
.tv-info-box.success    /* Green border */
.tv-info-box.error      /* Red border */
.tv-info-box.warning    /* Orange border */
```

### Theme Colors

```css
/* Backgrounds */
--bg-primary: #1E222D
--bg-dark: #131722
--bg-hover: #2A2E39

/* Text */
--text-primary: #D1D4DC
--text-secondary: #787B86

/* Colors */
--primary: #2962FF
--success: #089981
--error: #F23645
--warning: #FF9800

/* Borders */
--border: #2A2E39
```

---

## Best Practices

### 1. Naming Convention

```javascript
// Class name: PascalCase + Dialog suffix
class MyToolDialog extends DialogBase {}

// File name: kebab-case
my-tool.js
my-tool-styles.css

// ID: kebab-case
id: 'my-tool'

// CSS classes: kebab-case with prefix
.my-tool-container
.my-tool-header
```

### 2. File Organization

```
custom_dialog/
├── my-tool.js              # Logic
├── my-tool-styles.css      # Styles (if needed)
└── MY-TOOL-GUIDE.md        # Documentation
```

### 3. Code Structure

```javascript
class MyToolDialog extends DialogBase {
    constructor() {
        super({ /* options */ });
        // Initialize properties
        this.data = [];
        this.currentState = null;
    }

    create() {
        super.create();
        this.renderContent();
        return this;
    }

    renderContent() {
        // Build UI
    }

    // Event handlers
    handleSubmit() {}
    handleChange() {}
    
    // Data methods
    loadData() {}
    saveData() {}
    
    // Helper methods
    formatValue() {}
    validateInput() {}
}
```

### 4. Error Handling

```javascript
handleSubmit() {
    try {
        // Validate input
        if (!this.validateInput()) {
            alert('Please fill in all fields');
            return;
        }
        
        // Process data
        const result = this.processData();
        
        // Display result
        this.displayResult(result);
        
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred');
    }
}
```

### 5. LocalStorage

```javascript
// Save data
saveData() {
    const data = { /* your data */ };
    localStorage.setItem('my_tool_data', JSON.stringify(data));
}

// Load data
loadData() {
    const data = localStorage.getItem('my_tool_data');
    return data ? JSON.parse(data) : [];
}

// Clear data
clearData() {
    localStorage.removeItem('my_tool_data');
}
```

### 6. Responsive Design

```css
/* Desktop */
.my-tool-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

/* Tablet */
@media (max-width: 1024px) {
    .my-tool-container {
        grid-template-columns: 1fr;
    }
}

/* Mobile */
@media (max-width: 768px) {
    .my-tool-container {
        padding: 8px;
    }
}
```

---

## Examples

### Example 1: Simple Calculator

```javascript
class SimpleCalculatorDialog extends DialogBase {
    constructor() {
        super({
            id: 'simple-calculator',
            title: 'Simple Calculator',
            width: '400px'
        });
    }

    create() {
        super.create();
        this.renderContent();
        return this;
    }

    renderContent() {
        const content = document.createElement('div');
        
        // Input section
        const section = document.createElement('div');
        section.className = 'tv-dialog-section';
        
        const grid = document.createElement('div');
        grid.className = 'tv-grid cols-2';
        
        const num1 = this.createInput({
            id: 'num1',
            type: 'number',
            placeholder: '0'
        });
        grid.appendChild(this.createFormGroup('Number 1', num1));
        
        const num2 = this.createInput({
            id: 'num2',
            type: 'number',
            placeholder: '0'
        });
        grid.appendChild(this.createFormGroup('Number 2', num2));
        
        section.appendChild(grid);
        
        // Button
        const calcBtn = this.createButton('Calculate', {
            variant: 'primary',
            onClick: () => this.calculate()
        });
        calcBtn.style.width = '100%';
        calcBtn.style.marginTop = '16px';
        section.appendChild(calcBtn);
        
        // Result
        const resultSection = document.createElement('div');
        resultSection.className = 'tv-dialog-section';
        resultSection.id = 'result-section';
        resultSection.style.display = 'none';
        
        content.appendChild(section);
        content.appendChild(resultSection);
        
        this.setContent(content);
    }

    calculate() {
        const num1 = parseFloat(document.getElementById('num1').value);
        const num2 = parseFloat(document.getElementById('num2').value);
        
        if (isNaN(num1) || isNaN(num2)) {
            alert('Please enter valid numbers');
            return;
        }
        
        const sum = num1 + num2;
        
        const resultSection = document.getElementById('result-section');
        resultSection.innerHTML = '';
        resultSection.appendChild(
            this.createResultDisplay('Sum', sum.toString(), { highlight: true })
        );
        resultSection.style.display = 'block';
    }
}

window.SimpleCalculatorDialog = SimpleCalculatorDialog;
```

### Example 2: Data Table

```javascript
class DataTableDialog extends DialogBase {
    constructor() {
        super({
            id: 'data-table',
            title: 'Data Table',
            width: '800px'
        });
        this.data = this.loadData();
    }

    create() {
        super.create();
        this.renderContent();
        return this;
    }

    renderContent() {
        const content = document.createElement('div');
        
        // Table
        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Value</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody id="table-body">
                ${this.renderRows()}
            </tbody>
        `;
        
        content.appendChild(table);
        this.setContent(content);
    }

    renderRows() {
        return this.data.map((item, index) => `
            <tr>
                <td>${item.name}</td>
                <td>${item.value}</td>
                <td>
                    <button onclick="window.currentDialog.deleteRow(${index})">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    deleteRow(index) {
        this.data.splice(index, 1);
        this.saveData();
        this.renderContent();
    }

    loadData() {
        const data = localStorage.getItem('data_table');
        return data ? JSON.parse(data) : [];
    }

    saveData() {
        localStorage.setItem('data_table', JSON.stringify(this.data));
    }

    show() {
        window.currentDialog = this;
        return super.show();
    }
}

window.DataTableDialog = DataTableDialog;
```

### Example 3: Form with Validation

```javascript
class FormDialog extends DialogBase {
    constructor() {
        super({
            id: 'form-dialog',
            title: 'Form Example',
            width: '500px'
        });
    }

    create() {
        super.create();
        this.renderContent();
        return this;
    }

    renderContent() {
        const content = document.createElement('div');
        const section = document.createElement('div');
        section.className = 'tv-dialog-section';
        
        // Name
        const nameInput = this.createInput({
            id: 'name',
            type: 'text',
            placeholder: 'Enter name'
        });
        section.appendChild(this.createFormGroup('Name *', nameInput));
        
        // Email
        const emailInput = this.createInput({
            id: 'email',
            type: 'email',
            placeholder: 'Enter email'
        });
        section.appendChild(this.createFormGroup('Email *', emailInput));
        
        // Age
        const ageInput = this.createInput({
            id: 'age',
            type: 'number',
            min: '0',
            max: '150'
        });
        section.appendChild(this.createFormGroup('Age', ageInput));
        
        // Submit
        const submitBtn = this.createButton('Submit', {
            variant: 'primary',
            onClick: () => this.handleSubmit()
        });
        submitBtn.style.width = '100%';
        submitBtn.style.marginTop = '16px';
        section.appendChild(submitBtn);
        
        content.appendChild(section);
        this.setContent(content);
    }

    handleSubmit() {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const age = document.getElementById('age').value;
        
        // Validate
        if (!name) {
            alert('Name is required');
            return;
        }
        
        if (!email || !this.validateEmail(email)) {
            alert('Valid email is required');
            return;
        }
        
        // Process
        const data = { name, email, age };
        console.log('Form data:', data);
        alert('Form submitted successfully!');
        this.close();
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}

window.FormDialog = FormDialog;
```

---

## Checklist

### Trước khi submit code

- [ ] Class extends `DialogBase`
- [ ] Constructor gọi `super()` với options
- [ ] Method `create()` gọi `super.create()`
- [ ] Method `renderContent()` được implement
- [ ] Export class: `window.YourDialog = YourDialog`
- [ ] Đăng ký tool trong `tool-manager.js`
- [ ] Thêm script vào `index.html`
- [ ] Test trên desktop
- [ ] Test trên mobile
- [ ] Kiểm tra close button hoạt động
- [ ] Kiểm tra ESC key hoạt động
- [ ] Kiểm tra overlay click hoạt động
- [ ] Code không có console errors
- [ ] Styles không conflict với base styles
- [ ] Documentation đầy đủ

### Code Quality

- [ ] Code clean và readable
- [ ] Comments cho logic phức tạp
- [ ] Error handling đầy đủ
- [ ] Input validation
- [ ] No hardcoded values
- [ ] Consistent naming
- [ ] No memory leaks
- [ ] Performance optimized

---

## Common Patterns

### Pattern 1: Input → Calculate → Display

```javascript
renderContent() {
    // 1. Input section
    const inputSection = this.createInputSection();
    
    // 2. Calculate button
    const calcButton = this.createButton('Calculate', {
        variant: 'primary',
        onClick: () => this.calculate()
    });
    
    // 3. Result section (hidden initially)
    const resultSection = document.createElement('div');
    resultSection.id = 'results';
    resultSection.style.display = 'none';
    
    // Assemble
    content.appendChild(inputSection);
    content.appendChild(calcButton);
    content.appendChild(resultSection);
}

calculate() {
    // Get inputs
    // Validate
    // Calculate
    // Display results
    document.getElementById('results').style.display = 'block';
}
```

### Pattern 2: Load → Display → Edit → Save

```javascript
constructor() {
    super({ /* options */ });
    this.data = this.loadData();
}

renderContent() {
    // Display data
    this.renderTable();
    
    // Edit controls
    this.renderEditForm();
}

loadData() {
    return JSON.parse(localStorage.getItem('key') || '[]');
}

saveData() {
    localStorage.setItem('key', JSON.stringify(this.data));
    this.renderContent(); // Refresh
}
```

### Pattern 3: Tabs/Sections

```javascript
renderContent() {
    const content = document.createElement('div');
    
    // Tab buttons
    const tabs = this.createTabs(['Tab 1', 'Tab 2', 'Tab 3']);
    content.appendChild(tabs);
    
    // Tab content
    const tabContent = document.createElement('div');
    tabContent.id = 'tab-content';
    content.appendChild(tabContent);
    
    // Show first tab
    this.showTab(0);
}

showTab(index) {
    const content = document.getElementById('tab-content');
    content.innerHTML = '';
    
    switch(index) {
        case 0: content.appendChild(this.renderTab1()); break;
        case 1: content.appendChild(this.renderTab2()); break;
        case 2: content.appendChild(this.renderTab3()); break;
    }
}
```

---

## Troubleshooting

### Dialog không hiển thị

```javascript
// Check 1: Class exported?
console.log(window.MyToolDialog); // Should not be undefined

// Check 2: Script loaded?
// View Sources in DevTools

// Check 3: Tool registered?
console.log(toolManager.tools); // Should include your tool

// Check 4: Console errors?
// Check browser console
```

### Close button không hoạt động

```javascript
// DialogBase đã handle, nhưng nếu override:
setupEventListeners() {
    super.setupEventListeners(); // MUST call super
    // Your additional listeners
}
```

### Styles không apply

```css
/* Check specificity */
.tv-dialog .my-custom-class { /* More specific */ }

/* Check if CSS file loaded */
/* View Sources in DevTools */

/* Check class names */
console.log(element.className);
```

---

## Resources

### Files để tham khảo

- `template-dialog.js` - Template cơ bản
- `pnl-calculator.js` - Form với calculation
- `screener.js` - Table với data
- `calendar-profit.js` - Calendar view với localStorage

### Documentation

- `README.md` - Overview
- `HUONG-DAN.md` - Hướng dẫn tiếng Việt
- `BUGFIX.md` - Common issues và fixes

### Tools

- Chrome DevTools - Debug
- VS Code - Development
- Browser Console - Testing

---

## Support

Nếu gặp vấn đề:

1. Check console errors
2. Review this guide
3. Check existing examples
4. Ask team members
5. Create issue/ticket

---

**Happy Coding! 🚀**
