# 📊 Symbols Manager - Hướng Dẫn Sử Dụng

## 🎯 Tính Năng

Symbols Manager cho phép bạn quản lý danh sách symbols (cặp giao dịch) mà ứng dụng sẽ theo dõi và lưu trữ dữ liệu.

## 🚀 Cách Sử Dụng

### 1. Mở Symbols Manager

- Click nút **SYMBOLS** trên header
- Modal sẽ hiển thị với 2 cột:
  - **WHITELIST**: Symbols đang được theo dõi
  - **AVAILABLE SYMBOLS**: Tất cả symbols có sẵn trên sàn

### 2. Thêm Symbol vào Whitelist

1. Tìm symbol trong cột **AVAILABLE SYMBOLS**
2. Sử dụng ô search để lọc nhanh
3. Click nút **ADD** bên cạnh symbol muốn thêm
4. Symbol sẽ chuyển sang cột **WHITELIST**

### 3. Xóa Symbol khỏi Whitelist

1. Tìm symbol trong cột **WHITELIST**
2. Click nút **REMOVE** bên cạnh symbol muốn xóa
3. Symbol sẽ chuyển về cột **AVAILABLE SYMBOLS**

### 4. Lưu Thay Đổi

1. Click nút **SAVE** ở góc trên bên phải cột WHITELIST
2. Ứng dụng sẽ:
   - Lưu config vào file `config.json`
   - Reload lại cấu hình
   - Ngắt kết nối WebSocket cũ
   - Kết nối lại với danh sách symbols mới
   - Bắt đầu thu thập dữ liệu cho symbols mới

### 5. Làm Mới Danh Sách

- Click nút **REFRESH** để tải lại danh sách symbols từ exchange
- Hữu ích khi exchange thêm cặp giao dịch mới

## 🏢 Multi-Exchange Support

### Tabs cho từng Exchange

- Mỗi exchange có một tab riêng
- Hiện tại hỗ trợ: **BINANCE FUTURES**
- Dễ dàng mở rộng cho exchanges khác (Binance Spot, Bybit, OKX, etc.)

### Thêm Exchange Mới

1. **Backend**: Thêm datasource mới trong `src/datasources/`
2. **Config**: Thêm exchange vào `config.json`
3. **Frontend**: Thêm tab button trong HTML

```html
<button class="tab-btn" data-exchange="new_exchange">NEW EXCHANGE</button>
```

## 🔧 API Endpoints

### GET `/exchanges`
Lấy danh sách tất cả exchanges và symbols đang theo dõi

**Response:**
```json
{
  "binance_futures": {
    "enabled": true,
    "symbols": ["BTCUSDT", "ETHUSDT"]
  }
}
```

### GET `/exchange-symbols/:exchange`
Lấy tất cả symbols có sẵn trên exchange với volume 24h

**Response:**
```json
{
  "symbols": [
    {
      "symbol": "BTCUSDT",
      "volume": "45234567890",
      "volumeFormatted": "45.23B"
    },
    {
      "symbol": "ETHUSDT",
      "volume": "23456789012",
      "volumeFormatted": "23.46B"
    }
  ]
}
```

**Note**: Symbols được sắp xếp theo volume từ cao xuống thấp

### POST `/exchange-symbols`
Cập nhật whitelist cho exchange

**Request:**
```json
{
  "exchange": "binance_futures",
  "symbols": ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Symbols updated successfully"
}
```

## 📁 File Structure

```
src/
├── api/
│   └── server.js          ← API endpoints cho symbols manager
├── config/
│   └── config.js          ← Config với save() method
├── web/
│   ├── index.html         ← Modal UI
│   ├── style.css          ← Styles cho modal
│   └── app.js             ← Logic xử lý symbols manager
└── datasources/
    └── binance_future.js  ← Fetch symbols từ Binance API
```

## 🎨 UI Components

### Modal Layout
```
┌─────────────────────────────────────────────┐
│  SYMBOLS MANAGER                         ×  │
├─────────────────────────────────────────────┤
│  [BINANCE FUTURES] [OTHER EXCHANGE]         │
├─────────────────────────────────────────────┤
│  WHITELIST (2)        │  AVAILABLE (300)    │
│  [SAVE]               │  [REFRESH]          │
│  ┌─────────────────┐  │  ┌─────────────────┐│
│  │ [Search...]     │  │  │ [Search...]     ││
│  ├─────────────────┤  │  ├─────────────────┤│
│  │ BTCUSDT [REMOVE]│  │  │ SOLUSDT [ADD]   ││
│  │ ETHUSDT [REMOVE]│  │  │ BNBUSDT [ADD]   ││
│  │                 │  │  │ ADAUSDT [ADD]   ││
│  └─────────────────┘  │  └─────────────────┘│
└─────────────────────────────────────────────┘
```

### Theme
- **Background**: Đen (#0a0a0a, #1a1a1a)
- **Text**: Trắng (#fff)
- **Borders**: Trắng (#fff, #333)
- **Hover**: Highlight với border trắng
- **Buttons**: Đen/trắng với hover effect đảo ngược

## 🔄 Workflow

```
User clicks SYMBOLS button
    ↓
Load current whitelist from /exchanges
    ↓
Load available symbols from /exchange-symbols/:exchange
    ↓
User adds/removes symbols
    ↓
User clicks SAVE
    ↓
POST to /exchange-symbols
    ↓
Backend updates config.json
    ↓
Backend calls collector.updateConfig()
    ↓
Collector stops old connections
    ↓
Collector starts with new symbols
    ↓
WebSocket broadcasts new status
    ↓
UI updates automatically
```

## 📊 Volume-Based Sorting

Symbols được sắp xếp theo **24h Quote Volume** (USDT) từ cao xuống thấp:
- Top symbols có volume cao nhất xuất hiện đầu tiên
- Giúp dễ dàng chọn các cặp có thanh khoản tốt
- Volume được format: B (Billion), M (Million), K (Thousand)

**Ví dụ:**
```
1. BTCUSDT    Vol: 45.2B
2. ETHUSDT    Vol: 23.8B
3. SOLUSDT    Vol: 2.5B
4. BNBUSDT    Vol: 1.8B
...
```

## ⚡ Performance

- **Lazy Loading**: Symbols chỉ load khi mở modal
- **Search**: Client-side filtering, instant results
- **Caching**: Available symbols cached trong session
- **Volume Data**: Fetched from Binance 24hr ticker API
- **Smart Filtering**: Search updates count dynamically

## 🛡️ Error Handling

- Network errors → Show error message in terminal
- Invalid exchange → 404 response
- Save failed → Revert button state, show error
- Empty whitelist → Warning message

## 🎯 Best Practices

1. **Không thêm quá nhiều symbols**: Mỗi symbol tốn bandwidth và storage
2. **Chọn symbols có volume cao**: Dữ liệu chất lượng hơn
3. **Test với ít symbols trước**: Đảm bảo hệ thống ổn định
4. **Backup config.json**: Trước khi thay đổi lớn
5. **Monitor system resources**: Khi thêm nhiều symbols

## 🔮 Future Enhancements

- [ ] Bulk add/remove symbols
- [ ] Import/export whitelist
- [ ] Symbol groups/categories
- [ ] Auto-add top volume symbols
- [ ] Symbol statistics (volume, price change)
- [ ] Drag & drop reordering
- [ ] Multi-select with checkboxes
- [ ] Symbol search with filters (volume, price range)
- [ ] Favorites/starred symbols
- [ ] Recently added symbols

## 📝 Example Use Cases

### 1. Monitor Top 10 Coins
```javascript
// Add BTC, ETH, BNB, SOL, XRP, ADA, DOGE, MATIC, DOT, AVAX
```

### 2. DeFi Tokens Only
```javascript
// Add UNI, AAVE, COMP, MKR, SNX, CRV, etc.
```

### 3. Meme Coins
```javascript
// Add DOGE, SHIB, PEPE, FLOKI, etc.
```

### 4. Layer 1 Blockchains
```javascript
// Add ETH, SOL, AVAX, NEAR, FTM, ATOM, etc.
```

## 🐛 Troubleshooting

### Symbols không load
- Check network connection
- Verify exchange API is accessible
- Check browser console for errors

### Save không hoạt động
- Check file permissions on config.json
- Verify backend is running
- Check terminal logs for errors

### Symbols mới không xuất hiện
- Wait for WebSocket reconnection (3-5 seconds)
- Refresh page if needed
- Check if symbols are valid on exchange

## 💡 Tips

- Use search to quickly find symbols
- Sort symbols alphabetically for easier management
- Keep whitelist focused on symbols you actively trade
- Remove inactive symbols to save resources
- Check terminal logs for real-time updates
