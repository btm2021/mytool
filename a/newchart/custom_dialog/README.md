# Custom Dialog System - TradingView

Hệ thống dialog chuẩn với theme TradingView, cho phép tạo các công cụ mở rộng dễ dàng.

## Cấu trúc

```
custom_dialog/
├── dialog-base.js       # Base class cho tất cả dialogs
├── dialog-styles.css    # Styles cho dialogs
├── tool-manager.js      # Quản lý tools và sidebar
├── tool-styles.css      # Styles cho tool sidebar
├── pnl-calculator.js    # Ví dụ: PNL Calculator
└── README.md           # Tài liệu này
```

## Cách sử dụng

### 1. Tạo Dialog mới

Kế thừa từ `DialogBase`:

```javascript
class MyCustomDialog extends DialogBase {
    constructor() {
        super({
            id: 'my-dialog',
            title: 'My Custom Tool',
            width: '600px'
        });
    }

    create() {
        super.create();
        this.renderContent();
        return this;
    }

    renderContent() {
        const content = document.createElement('div');
        
        // Tạo form inputs
        const input = this.createInput({
            id: 'my-input',
            type: 'text',
            placeholder: 'Enter value'
        });
        
        content.appendChild(this.createFormGroup('Label', input));
        
        // Tạo button
        const button = this.createButton('Submit', {
            variant: 'primary',
            onClick: () => this.handleSubmit()
        });
        
        content.appendChild(button);
        this.setContent(content);
    }

    handleSubmit() {
        const value = document.getElementById('my-input').value;
        // Xử lý logic
    }
}
```

### 2. Đăng ký Tool

Thêm tool vào `tool-manager.js`:

```javascript
toolManager.registerTool({
    name: 'My Tool',
    description: 'Description of my tool',
    icon: `<svg>...</svg>`,
    action: () => {
        const dialog = new MyCustomDialog();
        dialog.show();
    }
});
```

### 3. API có sẵn

#### DialogBase Methods

- `createInput(options)` - Tạo input field
- `createSelect(options)` - Tạo select dropdown
- `createButton(text, options)` - Tạo button
- `createFormGroup(label, input)` - Tạo form group
- `createResultDisplay(label, value, options)` - Tạo result display
- `show()` - Hiển thị dialog
- `close()` - Đóng dialog

#### Input Options

```javascript
{
    id: 'input-id',
    type: 'text|number|email|...',
    placeholder: 'Placeholder text',
    value: 'Default value',
    step: '0.01',  // For number inputs
    min: 0,        // For number inputs
    max: 100       // For number inputs
}
```

#### Select Options

```javascript
{
    id: 'select-id',
    options: [
        { value: '1', label: 'Option 1', selected: true },
        { value: '2', label: 'Option 2' }
    ]
}
```

#### Button Options

```javascript
{
    variant: 'primary|secondary',
    onClick: () => { /* handler */ }
}
```

## Ví dụ: PNL Calculator

Xem file `pnl-calculator.js` để tham khảo implementation đầy đủ.

### Features:
- Mode selector (Long/Short)
- Input fields với validation
- Tính toán PNL, ROI
- Hiển thị kết quả với màu sắc
- Responsive design

## Styling

### CSS Classes có sẵn

#### Layout
- `.tv-dialog-section` - Section container
- `.tv-grid.cols-2` - 2 column grid
- `.tv-grid.cols-3` - 3 column grid
- `.tv-divider` - Horizontal divider

#### Form Elements
- `.tv-form-group` - Form group
- `.tv-form-label` - Label
- `.tv-form-input` - Input field
- `.tv-form-select` - Select dropdown

#### Buttons
- `.tv-button.primary` - Primary button (blue)
- `.tv-button.secondary` - Secondary button (gray)
- `.tv-button-group` - Button group container

#### Results
- `.tv-result-display` - Result row
- `.tv-result-label` - Result label
- `.tv-result-value` - Result value
- `.tv-result-value.positive` - Green text
- `.tv-result-value.negative` - Red text

#### Info Boxes
- `.tv-info-box` - Info box
- `.tv-info-box.success` - Green border
- `.tv-info-box.error` - Red border
- `.tv-info-box.warning` - Orange border

## Theme Colors

```css
Background: #1E222D
Dark Background: #131722
Border: #2A2E39
Text: #D1D4DC
Muted Text: #787B86
Primary: #2962FF
Success: #089981
Error: #F23645
Warning: #FF9800
```

## Best Practices

1. **Validation**: Luôn validate input trước khi xử lý
2. **Error Handling**: Hiển thị error messages rõ ràng
3. **Responsive**: Test trên nhiều kích thước màn hình
4. **Accessibility**: Sử dụng semantic HTML và ARIA labels
5. **Performance**: Tránh re-render không cần thiết

## Mở rộng

### Thêm Tool mới

1. Tạo file mới trong `custom_dialog/`
2. Kế thừa từ `DialogBase`
3. Implement `renderContent()`
4. Đăng ký trong `tool-manager.js`
5. Thêm script vào `index.html`

### Custom Styles

Thêm styles vào file riêng hoặc inline trong dialog:

```javascript
const style = document.createElement('style');
style.textContent = `
    .my-custom-class {
        /* styles */
    }
`;
document.head.appendChild(style);
```

## Troubleshooting

### Dialog không hiển thị
- Kiểm tra console errors
- Đảm bảo `tvWidget` đã ready
- Kiểm tra z-index conflicts

### Styles không apply
- Kiểm tra CSS files đã được load
- Kiểm tra class names
- Inspect element để debug

### Tool không xuất hiện trong sidebar
- Kiểm tra `registerTool()` được gọi
- Kiểm tra `tool-manager.js` đã load
- Kiểm tra console errors

## Support

Để thêm tính năng mới hoặc báo lỗi, vui lòng tạo issue hoặc pull request.
