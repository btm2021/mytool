# Hướng dẫn tích hợp LocalStorage cho Settings

## Bước 1: Thêm script vào index.html

Thêm dòng này vào index.html, trước `<script src="app.js"></script>`:

```html
<script src="settings-storage.js"></script>
```

## Bước 2: Cập nhật constructor trong app.js

Tìm dòng:
```javascript
this.symbolSelector = new SymbolSelector(this.binanceAPI);
```

Thêm ngay sau đó:
```javascript
this.settingsStorage = new SettingsStorage();
```

## Bước 3: Thay đổi cách load settings

Tìm dòng:
```javascript
// Indicator settings with default values
this.indicatorSettings = {
```

Thay thế toàn bộ object `this.indicatorSettings = { ... };` bằng:
```javascript
// Load indicator settings from localStorage or use defaults
this.indicatorSettings = this.settingsStorage.load();
```

## Bước 4: Cập nhật applyIndicatorSettings()

Tìm method `applyIndicatorSettings()`, tìm đoạn code:
```javascript
// Close modal
this.closeSettingsModal();
```

Thêm ngay trước đó:
```javascript
// Save settings to localStorage
this.settingsStorage.save(this.indicatorSettings);
```

Và thay đổi message:
```javascript
this.updateStatus('Settings applied and saved.', 'success');
```

## Bước 5: Cập nhật resetIndicatorSettings()

Tìm method `resetIndicatorSettings()`, thay thế toàn bộ phần gán `this.indicatorSettings = { ... };` bằng:
```javascript
// Clear localStorage and load defaults
this.settingsStorage.clear();
this.indicatorSettings = this.settingsStorage.getDefaultSettings();
```

## Kết quả

Sau khi hoàn thành các bước trên:
- Settings sẽ tự động lưu vào localStorage khi click "Apply Settings"
- Settings sẽ tự động load từ localStorage khi mở lại trang
- Click "Reset to Default" sẽ xóa localStorage và load lại settings mặc định
- Nếu localStorage không có hoặc bị lỗi, sẽ sử dụng settings mặc định

## Test

1. Mở webapp, thay đổi settings và click "Apply Settings"
2. Reload trang - settings vẫn giữ nguyên
3. Mở DevTools Console, gõ: `localStorage.getItem('indicatorSettings')` - sẽ thấy settings đã lưu
4. Click "Reset to Default" - settings về mặc định
5. Reload trang - settings vẫn là mặc định
