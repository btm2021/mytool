# Chart Modal Fix

## Vấn đề

Bootstrap Vue modal không hiển thị đúng style trong chart viewer.

## Giải pháp

### 1. Thêm custom classes cho modal

```html
<b-modal v-model="showConfigModal" 
         title="Indicator Configuration" 
         size="lg"
         modal-class="chart-config-modal"
         header-class="chart-modal-header"
         body-class="chart-modal-body"
         footer-class="chart-modal-footer">
```

### 2. Override Bootstrap Vue styles trong modal.css

```css
/* Modal content */
.chart-config-modal .modal-content {
    background: #1a1a1a !important;
    border: 2px solid #ff8c00 !important;
    font-family: 'Courier New', monospace !important;
}

/* Header */
.chart-modal-header {
    background: #2a2a2a !important;
    border-bottom: 1px solid #ff8c00 !important;
}

.chart-modal-header .modal-title {
    color: #ff8c00 !important;
}

/* Body */
.chart-modal-body {
    background: #1a1a1a !important;
    color: #e0e0e0 !important;
    max-height: 60vh !important;
    overflow-y: auto !important;
}

/* Footer */
.chart-modal-footer {
    background: #2a2a2a !important;
    border-top: 1px solid #333 !important;
}

/* Buttons */
.chart-modal-footer .btn-warning {
    background: #ff8c00 !important;
    color: #000 !important;
}

/* Backdrop */
.modal-backdrop {
    background-color: rgba(0, 0, 0, 0.8) !important;
}
```

### 3. Style cho form elements

```css
/* Checkbox override */
.custom-checkbox .custom-control-input:checked ~ .custom-control-label::before {
    background-color: #ff8c00 !important;
    border-color: #ff8c00 !important;
}

/* Input fields */
.config-row input,
.config-row select {
    background: #2a2a2a !important;
    border: 1px solid #444 !important;
    color: #ffb000 !important;
}

.config-row input:focus,
.config-row select:focus {
    border-color: #ff8c00 !important;
    box-shadow: 0 0 0 0.2rem rgba(255, 140, 0, 0.25) !important;
}
```

## Kết quả

- ✅ Modal hiển thị với dark theme phù hợp
- ✅ Border màu cam (#ff8c00)
- ✅ Form elements có style đúng
- ✅ Buttons có màu sắc phù hợp
- ✅ Checkbox có accent color cam
- ✅ Backdrop tối hơn (80% opacity)

## Lưu ý

- Phải dùng `!important` để override Bootstrap Vue default styles
- Modal classes phải được define trong modal.css
- Bootstrap Vue CSS phải được load trước custom CSS
