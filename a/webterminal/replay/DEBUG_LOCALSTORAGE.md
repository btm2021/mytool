# Debug LocalStorage Settings

## Cách kiểm tra trong Browser Console

### 1. Mở DevTools Console (F12)

### 2. Kiểm tra xem settings có được lưu không:

```javascript
// Xem settings trong localStorage
localStorage.getItem('indicatorSettings')

// Parse và xem dạng object
JSON.parse(localStorage.getItem('indicatorSettings'))

// Xem chỉ botATR1
JSON.parse(localStorage.getItem('indicatorSettings')).botATR1
```

### 3. Kiểm tra xem SettingsStorage class có hoạt động không:

```javascript
// Tạo instance
const storage = new SettingsStorage()

// Load settings
const settings = storage.load()
console.log('Loaded settings:', settings)

// Kiểm tra botATR1
console.log('botATR1:', settings.botATR1)
```

### 4. Test save settings:

```javascript
// Tạo test settings
const storage = new SettingsStorage()
const testSettings = storage.getDefaultSettings()

// Thay đổi một giá trị
testSettings.botATR1.emaLength = 99
testSettings.botATR1.trail1Color = '#ff00ff'

// Save
storage.save(testSettings)

// Verify
console.log('Saved:', localStorage.getItem('indicatorSettings'))
```

### 5. Test load settings:

```javascript
const storage = new SettingsStorage()
const loaded = storage.load()
console.log('Loaded botATR1:', loaded.botATR1)
```

### 6. Clear settings:

```javascript
localStorage.removeItem('indicatorSettings')
console.log('Settings cleared')
```

### 7. Kiểm tra trong app:

```javascript
// Kiểm tra app instance
console.log('App settings:', app.indicatorSettings)

// Kiểm tra settingsStorage
console.log('SettingsStorage:', app.settingsStorage)

// Test save
app.settingsStorage.save(app.indicatorSettings)

// Test load
const loaded = app.settingsStorage.load()
console.log('Loaded:', loaded)
```

## Các vấn đề thường gặp

### 1. Settings không được lưu
- Kiểm tra: `app.settingsStorage` có tồn tại không?
- Kiểm tra: Console có báo lỗi không?
- Kiểm tra: localStorage có bị disable không?

### 2. Settings không được load
- Kiểm tra: `localStorage.getItem('indicatorSettings')` có trả về gì không?
- Kiểm tra: Settings có đúng format JSON không?
- Kiểm tra: `app.settingsStorage.load()` trả về gì?

### 3. Settings bị reset về default
- Kiểm tra: localStorage có bị clear không?
- Kiểm tra: Browser có ở chế độ incognito không?
- Kiểm tra: localStorage có đủ dung lượng không?

## Test File

Mở file `test-localstorage.html` trong browser để test riêng SettingsStorage class.

## Expected Behavior

1. **Lần đầu mở app**: Load settings mặc định
2. **Thay đổi settings và Apply**: Settings được lưu vào localStorage
3. **Reload trang**: Settings được load từ localStorage
4. **Click Reset**: Settings về mặc định và localStorage bị xóa
5. **Reload sau khi reset**: Load settings mặc định

## Verify Steps

1. Mở app lần đầu
2. Mở Console, gõ: `localStorage.getItem('indicatorSettings')` → Kết quả: `null`
3. Thay đổi settings (ví dụ: botATR1 EMA Length = 50)
4. Click "Apply Settings"
5. Gõ lại: `localStorage.getItem('indicatorSettings')` → Kết quả: có data
6. Reload trang (F5)
7. Mở Settings → botATR1 EMA Length vẫn là 50 ✓
8. Click "Reset to Default"
9. Gõ: `localStorage.getItem('indicatorSettings')` → Kết quả: `null`
10. Reload trang → Settings về mặc định ✓
