# 🚀 SaveLoad Engine for TradingView + PocketBase

Hệ thống Save/Load hoàn toàn client-side cho TradingView Charting Library, kết nối trực tiếp với PocketBase.

## 📋 Tính năng

- ✅ **Save/Load Chart Layouts**: Lưu và tải layout TradingView
- ✅ **AutoSave**: Tự động lưu sau khi thay đổi (debounce 8s)
- ✅ **User Management**: Hỗ trợ gắn layout với user
- ✅ **CRUD Operations**: Create, Read, Update, Delete layouts
- ✅ **Client-side Only**: Không cần backend trung gian
- ✅ **PocketBase Integration**: Sử dụng PocketBase JS SDK

## 🗄️ Database Schema

Tạo collection `chart_layouts` trong PocketBase với các field:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Tên layout |
| `symbol` | text | ✅ | Symbol (VD: BINANCE:BTCUSDT) |
| `interval` | text | ✅ | Interval (VD: 1H, 1D) |
| `layout` | JSON | ✅ | Chart layout JSON từ TradingView |
| `version` | number | ✅ | Chart layout version |
| `user` | relation (users) | ❌ | ID người dùng (optional) |
| `updatedAt` | date | ❌ | Tự động cập nhật |

### Cấu hình Collection Rules

Nếu sử dụng authentication:
```javascript
// List/View rule
@request.auth.id != "" && (user = @request.auth.id || user = "")

// Create rule  
@request.auth.id != ""

// Update rule
@request.auth.id != "" && user = @request.auth.id

// Delete rule
@request.auth.id != "" && user = @request.auth.id
```

Nếu không dùng auth (public):
```javascript
// Tất cả rules để trống hoặc: @request.data.user = ""
```

## 🚀 Cài đặt và Sử dụng

### 1. Thêm PocketBase SDK

```html
<!-- Thêm vào <head> hoặc trước </body> -->
<script src="https://cdn.jsdelivr.net/npm/pocketbase@0.21.1/dist/pocketbase.umd.js"></script>
```

### 2. Import SaveLoad Engine

```javascript
import { createSaveLoadEngine } from './saveload-engine.js';

// Tạo engine instance
const saveLoadEngine = createSaveLoadEngine({
    userId: null, // ID người dùng (optional)
    autoSave: true, // Bật autosave
    autoSaveDelay: 8000, // Delay 8 giây
    pocketbaseUrl: 'https://crypto.pockethost.io'
});
```

### 3. Tích hợp với TradingView

```javascript
const widget = new TradingView.widget({
    // ... các config khác
    save_load_adapter: saveLoadEngine
});
```

## 📖 API Reference

### createSaveLoadEngine(options)

Tạo SaveLoad Engine instance.

**Parameters:**
- `options.userId` (string, optional): ID người dùng
- `options.autoSave` (boolean, default: true): Bật autosave
- `options.autoSaveDelay` (number, default: 8000): Delay autosave (ms)
- `options.pocketbaseUrl` (string): URL PocketBase instance

**Returns:** SaveLoad adapter object

### Các hàm chính (TradingView standard)

#### saveChartToServer(chartData)
Lưu chart layout lên server.

```javascript
const result = await saveLoadEngine.saveChartToServer({
    name: 'My Layout',
    symbol: 'BINANCE:BTCUSDT', 
    interval: '1H',
    layout: { /* chart data */ }
});
console.log('Saved with ID:', result.id);
```

#### loadChartFromServer(chartId)
Tải chart layout từ server.

```javascript
const chartData = await saveLoadEngine.loadChartFromServer('chart_id_here');
// Returns: { symbol, interval, charts: [{ version, data }] }
```

#### onAutoSaveNeeded(widget)
Xử lý autosave (được TradingView gọi tự động).

### Các hàm bổ sung

#### listUserCharts(userId?)
Liệt kê tất cả chart layouts của user.

```javascript
const charts = await saveLoadEngine.listUserCharts();
// hoặc
const charts = await saveLoadEngine.listUserCharts('specific_user_id');
```

#### deleteChart(chartId)
Xóa chart layout.

```javascript
await saveLoadEngine.deleteChart('chart_id_here');
```

#### updateChart(chartId, chartData)
Cập nhật chart layout hiện có.

```javascript
await saveLoadEngine.updateChart('chart_id_here', {
    name: 'Updated Layout',
    // ... other data
});
```

### Getters/Setters

```javascript
// Getters
console.log(saveLoadEngine.userId);
console.log(saveLoadEngine.autoSave);
console.log(saveLoadEngine.autoSaveDelay);

// Setters
saveLoadEngine.setUserId('new_user_id');
saveLoadEngine.setAutoSave(false);
saveLoadEngine.setAutoSaveDelay(5000);
```

## 🧪 Testing

Mở `saveload-demo.html` trong browser để test các chức năng:

1. **Khởi tạo Engine**: Test khởi tạo với các config khác nhau
2. **Save Chart**: Test lưu chart với dữ liệu mẫu
3. **Load Chart**: Test tải chart theo ID
4. **List Charts**: Xem danh sách tất cả charts
5. **Delete Chart**: Xóa chart cụ thể

## 🔧 Troubleshooting

### Lỗi CORS
Nếu gặp lỗi CORS, kiểm tra cấu hình PocketBase:
- Đảm bảo domain được whitelist trong CORS settings
- Hoặc chạy từ localhost/127.0.0.1

### Lỗi Authentication
- Kiểm tra collection rules trong PocketBase Admin
- Đảm bảo user đã login nếu rules yêu cầu auth

### Lỗi Import Module
- Đảm bảo server hỗ trợ ES modules
- Hoặc sử dụng bundler như Webpack/Vite

### Debug Mode
Mở Developer Console để xem logs chi tiết:
```javascript
// Tất cả operations đều có console.log
// Format: [timestamp] operation_name: details
```

## 📝 Ví dụ hoàn chỉnh

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/pocketbase@0.21.1/dist/pocketbase.umd.js"></script>
</head>
<body>
    <div id="tv_chart_container"></div>
    
    <script src="charting_library/charting_library.standalone.js"></script>
    <script type="module">
        import { createSaveLoadEngine } from './saveload-engine.js';
        
        async function init() {
            // Tạo SaveLoad Engine
            const saveLoadEngine = createSaveLoadEngine({
                userId: 'user123',
                autoSave: true,
                autoSaveDelay: 8000
            });
            
            // Tạo TradingView widget
            const widget = new TradingView.widget({
                symbol: 'BINANCE:BTCUSDT',
                interval: '1H',
                container: 'tv_chart_container',
                library_path: 'charting_library/',
                save_load_adapter: saveLoadEngine, // 👈 Quan trọng!
                // ... other options
            });
            
            // Sử dụng các hàm bổ sung
            widget.onChartReady(async () => {
                // List user charts
                const charts = await saveLoadEngine.listUserCharts();
                console.log('User has', charts.length, 'saved charts');
                
                // Load specific chart if needed
                if (charts.length > 0) {
                    const chartData = await saveLoadEngine.loadChartFromServer(charts[0].id);
                    // Apply to widget...
                }
            });
        }
        
        init();
    </script>
</body>
</html>
```

## 🔗 Links

- [PocketBase Documentation](https://pocketbase.io/docs/)
- [TradingView Charting Library](https://www.tradingview.com/charting-library-docs/)
- [PocketBase JS SDK](https://github.com/pocketbase/js-sdk)

---

**Lưu ý**: Đảm bảo PocketBase instance của bạn đã được cấu hình đúng và có thể truy cập từ client.