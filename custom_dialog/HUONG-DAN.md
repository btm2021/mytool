# Hướng dẫn sử dụng Custom Dialog System

## Tổng quan

Hệ thống Custom Dialog cho phép bạn tạo các công cụ mở rộng cho TradingView một cách dễ dàng với giao diện chuẩn và theme đồng nhất.

## Cấu trúc hệ thống

```
custom_dialog/
├── dialog-base.js                    # Class cơ sở cho tất cả dialog
├── dialog-styles.css                 # Styles cho dialog
├── tool-manager.js                   # Quản lý tools và sidebar
├── tool-styles.css                   # Styles cho tool sidebar
├── pnl-calculator.js                 # Ví dụ: Máy tính PNL
├── position-size-calculator.js       # Ví dụ: Máy tính kích thước vị thế
├── template-dialog.js                # Template để tạo tool mới
├── README.md                         # Tài liệu tiếng Anh
└── HUONG-DAN.md                      # Tài liệu này
```

## Cách sử dụng

### 1. Nút Tool trên Header

Sau khi load trang, bạn sẽ thấy nút "Tool" (biểu tượng dấu +) ở góc trên bên trái, cạnh nút "Menu".

Click vào nút này để mở sidebar chứa các công cụ.

### 2. Sidebar Tools

Sidebar hiển thị danh sách các công cụ có sẵn:
- **PNL Calculator**: Tính toán lãi/lỗ cho vị thế futures
- **Position Size Calculator**: Tính toán kích thước vị thế dựa trên risk management
- **Market Screener**: Xem tất cả symbols Binance Futures với dữ liệu realtime

Click vào bất kỳ tool nào để mở dialog tương ứng.

### 3. Sử dụng PNL Calculator

**Chức năng**: Tính toán lãi/lỗ cho vị thế Long hoặc Short

**Các bước**:
1. Chọn mode: Long hoặc Short
2. Nhập Entry Price (giá vào lệnh)
3. Nhập Exit Price (giá thoát lệnh)
4. Nhập Quantity (số lượng)
5. Chọn Leverage (đòn bẩy)
6. Click "Calculate"

**Kết quả hiển thị**:
- Position Size: Tổng giá trị vị thế
- Margin Required: Margin cần thiết
- PNL: Lãi/lỗ (màu xanh = lãi, đỏ = lỗ)
- PNL %: Phần trăm lãi/lỗ
- ROI: Return on Investment

### 4. Sử dụng Market Screener

**Chức năng**: Hiển thị tất cả symbols đang giao dịch trên Binance Futures với dữ liệu realtime

**Tính năng**:
- Hiển thị tất cả USDT pairs
- Dữ liệu 24h từ Binance API
- Sắp xếp theo bất kỳ cột nào (click vào header)
- Click vào row để chuyển symbol trên chart
- Refresh data bằng nút Refresh

**Thông tin hiển thị**:
- Symbol: Tên coin
- Price: Giá hiện tại
- 24h %: Phần trăm thay đổi 24h (màu xanh/đỏ)
- 24h Change: Thay đổi giá 24h
- Volume (USDT): Khối lượng giao dịch 24h
- High: Giá cao nhất 24h
- Low: Giá thấp nhất 24h
- Trades: Số lượng giao dịch 24h

**Statistics Header**:
- Total Symbols: Tổng số symbols
- 24h Volume: Tổng volume toàn thị trường
- Gainers: Số coin tăng giá
- Losers: Số coin giảm giá

**Mặc định**: Sắp xếp theo Volume (cao nhất trước)

### 5. Sử dụng Position Size Calculator

**Chức năng**: Tính toán kích thước vị thế tối ưu dựa trên risk management

**Các bước**:
1. Nhập Account Balance (số dư tài khoản)
2. Nhập Risk % (phần trăm rủi ro, thường 1-2%)
3. Nhập Entry Price (giá vào lệnh)
4. Nhập Stop Loss Price (giá cắt lỗ)
5. Chọn Leverage (đòn bẩy)
6. Click "Calculate Position Size"

**Kết quả hiển thị**:
- Risk Amount: Số tiền rủi ro
- Price Risk: Khoảng cách giá đến stop loss
- Position Size: Số lượng nên mua (đơn vị)
- Position Value: Giá trị vị thế
- Margin Required: Margin cần thiết
- Margin Usage: % margin sử dụng

## Tạo Tool mới

### Bước 1: Copy template

```bash
cp custom_dialog/template-dialog.js custom_dialog/my-tool.js
```

### Bước 2: Chỉnh sửa file

```javascript
// Đổi tên class
class MyToolDialog extends DialogBase {
    constructor() {
        super({
            id: 'my-tool',
            title: 'Công cụ của tôi',
            width: '500px'
        });
    }

    // Implement các method
    renderContent() {
        // Tạo giao diện
    }

    handleAction() {
        // Xử lý logic
    }
}

// Export
window.MyToolDialog = MyToolDialog;
```

### Bước 3: Thêm vào index.html

```html
<script src="custom_dialog/my-tool.js"></script>
```

### Bước 4: Đăng ký trong tool-manager.js

```javascript
toolManager.registerTool({
    name: 'Công cụ của tôi',
    description: 'Mô tả ngắn gọn',
    icon: `<svg>...</svg>`,
    action: () => {
        const dialog = new MyToolDialog();
        dialog.show();
    }
});
```

## API Reference

### DialogBase Methods

#### Tạo Input
```javascript
const input = this.createInput({
    id: 'my-input',
    type: 'number',
    placeholder: 'Nhập giá trị',
    value: '0',
    step: '0.01',
    min: '0'
});
```

#### Tạo Select
```javascript
const select = this.createSelect({
    id: 'my-select',
    options: [
        { value: '1', label: 'Lựa chọn 1', selected: true },
        { value: '2', label: 'Lựa chọn 2' }
    ]
});
```

#### Tạo Button
```javascript
const button = this.createButton('Tính toán', {
    variant: 'primary', // hoặc 'secondary'
    onClick: () => this.calculate()
});
```

#### Tạo Form Group
```javascript
const group = this.createFormGroup('Nhãn', input);
```

#### Tạo Result Display
```javascript
const result = this.createResultDisplay(
    'Kết quả',
    '$1000.00',
    { highlight: true }
);
```

### Layout Classes

#### Grid Layout
```javascript
const grid = document.createElement('div');
grid.className = 'tv-grid cols-2'; // 2 cột
// hoặc
grid.className = 'tv-grid cols-3'; // 3 cột
```

#### Section
```javascript
const section = document.createElement('div');
section.className = 'tv-dialog-section';
```

#### Divider
```javascript
const divider = document.createElement('div');
divider.className = 'tv-divider';
```

#### Info Box
```javascript
const infoBox = document.createElement('div');
infoBox.className = 'tv-info-box success'; // success, error, warning
infoBox.innerHTML = `
    <div class="tv-info-text">Nội dung thông báo</div>
`;
```

## Màu sắc Theme

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

## Tips & Best Practices

### 1. Validation
Luôn validate input trước khi xử lý:
```javascript
if (!value || value <= 0) {
    alert('Vui lòng nhập giá trị hợp lệ');
    return;
}
```

### 2. Error Handling
Sử dụng try-catch cho các tính toán phức tạp:
```javascript
try {
    const result = this.complexCalculation();
    this.displayResults(result);
} catch (error) {
    console.error('Lỗi:', error);
    alert('Đã xảy ra lỗi trong quá trình tính toán');
}
```

### 3. Formatting Numbers
Sử dụng toFixed() để format số:
```javascript
const formatted = value.toFixed(2); // 2 chữ số thập phân
```

### 4. Responsive Design
Test trên nhiều kích thước màn hình:
- Desktop: 1920x1080
- Laptop: 1366x768
- Tablet: 768x1024

### 5. Performance
- Tránh tính toán trong vòng lặp lớn
- Cache các giá trị đã tính
- Sử dụng debounce cho input events

## Ví dụ thực tế

### Ví dụ 1: Risk/Reward Calculator

```javascript
class RiskRewardDialog extends DialogBase {
    constructor() {
        super({
            id: 'risk-reward',
            title: 'Risk/Reward Calculator',
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
        
        // Entry, Stop Loss, Take Profit inputs
        const grid = document.createElement('div');
        grid.className = 'tv-grid cols-3';
        
        const entryInput = this.createInput({
            id: 'entry',
            type: 'number',
            placeholder: 'Entry'
        });
        grid.appendChild(this.createFormGroup('Entry', entryInput));
        
        const slInput = this.createInput({
            id: 'stop-loss',
            type: 'number',
            placeholder: 'Stop Loss'
        });
        grid.appendChild(this.createFormGroup('Stop Loss', slInput));
        
        const tpInput = this.createInput({
            id: 'take-profit',
            type: 'number',
            placeholder: 'Take Profit'
        });
        grid.appendChild(this.createFormGroup('Take Profit', tpInput));
        
        section.appendChild(grid);
        
        const calcBtn = this.createButton('Calculate R/R', {
            variant: 'primary',
            onClick: () => this.calculate()
        });
        calcBtn.style.width = '100%';
        calcBtn.style.marginTop = '16px';
        section.appendChild(calcBtn);
        
        content.appendChild(section);
        this.setContent(content);
    }

    calculate() {
        const entry = parseFloat(document.getElementById('entry').value);
        const sl = parseFloat(document.getElementById('stop-loss').value);
        const tp = parseFloat(document.getElementById('take-profit').value);
        
        const risk = Math.abs(entry - sl);
        const reward = Math.abs(tp - entry);
        const ratio = reward / risk;
        
        alert(`Risk/Reward Ratio: 1:${ratio.toFixed(2)}`);
    }
}

window.RiskRewardDialog = RiskRewardDialog;
```

## Troubleshooting

### Dialog không hiển thị
- Kiểm tra console có lỗi không
- Đảm bảo tvWidget đã ready
- Kiểm tra file đã được load trong index.html

### Styles không đúng
- Kiểm tra CSS files đã được import
- Inspect element để xem class names
- Kiểm tra z-index conflicts

### Tool không xuất hiện trong sidebar
- Kiểm tra registerTool() đã được gọi
- Kiểm tra tool-manager.js đã load
- Xem console có lỗi không

## Hỗ trợ

Nếu gặp vấn đề hoặc cần thêm tính năng, vui lòng:
1. Kiểm tra console errors
2. Đọc lại documentation
3. Xem các ví dụ có sẵn
4. Tạo issue hoặc pull request

## Changelog

### Version 1.0.0
- Hệ thống dialog cơ bản
- Tool Manager với sidebar
- PNL Calculator
- Position Size Calculator
- Template và documentation
