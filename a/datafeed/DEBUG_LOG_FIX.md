# Debug Log Fix - Sửa lỗi debug logs không hiển thị

## Vấn đề

Debug logs từ server được gửi với flag `isDebug: true` nhưng client không filter và hiển thị đúng.

## Nguyên nhân

1. **WebSocket handler** không check `isDebug` flag khi nhận log messages
2. **addLog()** filter logs type 'debug' nhưng websocket không gán type đúng
3. **CSS** thiếu style cho `.log-debug`, `.log-success`, `.log-warn`

## Giải pháp

### 1. WebSocket Handler (`src/web/js/websocket.js`)

**Trước:**
```javascript
case 'log':
  if (message.data.type !== 'receiving') {
    this.addLog(message.data.message, message.data.type);
  }
  break;
```

**Sau:**
```javascript
case 'log':
  if (message.data.type !== 'receiving') {
    // Convert isDebug flag to 'debug' type
    const logType = message.data.isDebug ? 'debug' : message.data.type;
    this.addLog(message.data.message, logType);
  }
  break;
```

### 2. Log Filter (`src/web/js/logs.js`)

Đã có sẵn filter:
```javascript
addLog(message, type = 'info') {
  // Skip debug logs if debug is disabled
  if (type === 'debug' && !this.debugLogEnabled) {
    return;
  }
  // ... rest of code
}
```

### 3. Terminal CSS (`src/web/styles/terminal.css`)

Thêm styles cho các log types:

```css
.log-debug {
  border-left-color: #888;
  opacity: 0.7;
}

.log-debug .log-message {
  color: #888;
  font-size: 10px;
}

.log-success {
  border-left-color: #0f0;
}

.log-success .log-message {
  color: #0f0;
}

.log-warn {
  border-left-color: #fa0;
}

.log-warn .log-message {
  color: #fa0;
}
```

## Cách hoạt động

### Server → Client Flow

1. **Datasource Worker** gửi log với `isDebug` flag:
   ```javascript
   log(`${symbol}: Up to date (${existingCount} candles)`, 'info', true);
   ```

2. **Main Process** broadcast qua WebSocket:
   ```javascript
   broadcastToClients({
     type: 'log',
     data: {
       message: message.message,
       type: message.level || 'info',
       isDebug: message.isDebug || false,
       timestamp: new Date().toISOString()
     }
   });
   ```

3. **Client WebSocket** nhận và convert:
   ```javascript
   const logType = message.data.isDebug ? 'debug' : message.data.type;
   this.addLog(message.data.message, logType);
   ```

4. **addLog()** filter nếu debug disabled:
   ```javascript
   if (type === 'debug' && !this.debugLogEnabled) {
     return; // Skip
   }
   ```

5. **Terminal** hiển thị với CSS tương ứng:
   ```html
   <div class="log-entry log-debug">
     <span class="log-time">[10:30:45]</span>
     <span class="log-message">BTCUSDT: Up to date (1500 candles)</span>
   </div>
   ```

## Debug Logs trong hệ thống

Các debug logs hiện có (với `isDebug = true`):

1. **Bootstrap loading:**
   - `${symbol}: Up to date (${existingCount} candles)`
   - `${symbol}: Fetching ${gapMinutes} missing candles...`
   - `${symbol}: Added ${candles.length} candles`
   - `${symbol}: Loading ${totalCandles} candles...`
   - `${symbol}: ${loaded}/${totalCandles} loaded`

2. **Batch writing:**
   - `Wrote ${batch.length} candles to DB`

## Kết quả

### Khi Debug Log = OFF (mặc định)
- Chỉ hiển thị logs quan trọng: connected, error, validated, warn
- Terminal sạch sẽ, dễ theo dõi
- Giảm tải render

### Khi Debug Log = ON
- Hiển thị tất cả logs bao gồm debug
- Debug logs có màu xám (#888), opacity 0.7
- Font size nhỏ hơn (10px)
- Dễ phân biệt với logs quan trọng

## Testing

1. **Tắt Debug Logs:**
   - Mở Config Modal → Client Settings
   - Uncheck "Enable Debug Logs"
   - Save → Chỉ thấy logs quan trọng

2. **Bật Debug Logs:**
   - Mở Config Modal → Client Settings
   - Check "Enable Debug Logs"
   - Save → Thấy tất cả logs kể cả debug (màu xám)

3. **Reload symbols:**
   - Reload một exchange
   - Với debug ON: Thấy từng symbol loading progress
   - Với debug OFF: Chỉ thấy start/complete messages

## Log Types & Colors

| Type | Color | Border | Usage |
|------|-------|--------|-------|
| `info` | Cyan (#0af) | Cyan | Thông tin chung |
| `success` | Green (#0f0) | Green | Thành công |
| `warn` | Orange (#fa0) | Orange | Cảnh báo |
| `error` | Red (#f00) | Red | Lỗi |
| `debug` | Gray (#888) | Gray | Debug info |
| `connected` | Green (#0f0) | Green | Kết nối |
| `validated` | Green (#0f0) | Green | Xác nhận |
