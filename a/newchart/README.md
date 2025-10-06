# TradingView Terminal

Ứng dụng web trading terminal với TradingView Charting Library, hỗ trợ nhiều sàn giao dịch.

## Cài đặt

1. Đảm bảo có thư mục `charting_library/` với TradingView library
2. Chạy web server:
```bash
npx http-server -p 8080
# hoặc
python -m http.server 8080
```
3. Mở `http://localhost:8080`

## API - Thay đổi Symbol

```javascript
// Cú pháp
changeSymbol(symbol, exchange)

// Ví dụ
changeSymbol('ETHUSDT', 'BINANCE');
changeSymbol('BTCUSDT', 'OKX');
changeSymbol('SOLUSDT', 'BYBIT');

// Mặc định là BINANCE nếu không truyền exchange
changeSymbol('XRPUSDT');
```

### Sử dụng trong Console

Mở Console (F12) và chạy:
```javascript
changeSymbol('ETHUSDT');
changeSymbol('BNBUSDT', 'BINANCE');
changeSymbol('ADAUSDT', 'OKX');
```

## Tính năng

- ✅ **Multi-exchange**: Binance Futures, OKX, Bybit
- ✅ **Real-time data**: WebSocket streaming
- ✅ **Watchlist**: Danh sách theo dõi với quotes real-time
- ✅ **Symbol logos**: Hiển thị logo crypto từ local images (726 crypto + 64 exchanges)
- ✅ **Symbol search**: Tìm kiếm với filter exchange
- ✅ **API control**: Thay đổi symbol qua JavaScript
- ✅ **Full-screen**: Chart toàn màn hình
- ✅ **Dark theme**: Giao diện tối chuyên nghiệp
- ✅ **Save/Load Layouts**: Lưu và tải chart layouts với Supabase
- ✅ **Auto-Save**: Tự động lưu khi vẽ/xóa drawings và indicators
- ✅ **Auto-Load**: Tự động load layout gần nhất khi mở app
- ✅ **Simple Setup**: Không cần authentication, setup trong 3 phút

## Cấu trúc

```
├── charting_library/    # TradingView library (required)
├── images/             # Icons (optional)
├── index.html          # Entry point
├── app.js             # Datafeed & logic
└── styles.css         # Minimal styling
```

## Watchlist

Watchlist nằm ở thanh bên phải của chart:

1. **Xem danh sách**: Click icon Watchlist trên widgetbar
2. **Thêm symbol**: 
   - Click vào symbol search
   - Tìm symbol muốn thêm
   - Click dấu ⭐ hoặc + để thêm vào watchlist
3. **Xóa symbol**: Click dấu X bên cạnh symbol
4. **Chuyển chart**: Click vào symbol trong watchlist

Watchlist hiển thị:
- Logo crypto
- Giá hiện tại
- % thay đổi 24h
- Volume
- Real-time updates (3s)

## Search Symbols

Trong TradingView chart:
1. Click vào symbol name trên chart
2. Gõ tên symbol (VD: BTC, ETH, BNB)
3. Xem kết quả với logos (crypto + exchange)
4. Chọn exchange từ dropdown filter
5. Click dấu ⭐ để thêm vào watchlist
6. Chọn symbol từ kết quả

Tính năng:
- ✅ Hiển thị logos trong search results
- ✅ 50 kết quả đầu tiên
- ✅ Search trống = hiển thị tất cả symbols

## Exchanges Support

| Exchange | REST API | WebSocket | Status |
|----------|----------|-----------|--------|
| Binance  | ✅       | ✅        | Full   |
| OKX      | ✅       | ⚠️        | Partial|
| Bybit    | ✅       | ⚠️        | Partial|

## Save/Load Layouts với Supabase

Ứng dụng hỗ trợ lưu và tải chart layouts sử dụng Supabase làm backend.

### Quick Setup (3 phút)

1. **Tạo Supabase project** tại [supabase.com](https://supabase.com)
2. **Chạy SQL schema**: Copy nội dung `supabase-schema.sql` vào SQL Editor và Run
3. **Cấu hình**: Cập nhật `SUPABASE_URL` và `SUPABASE_ANON_KEY` trong `app.js`
4. **Xong!** Không cần authentication

📖 **Chi tiết**: Xem [QUICK_START.md](QUICK_START.md)

### Sử dụng

Chỉ cần click Save/Load buttons trên TradingView toolbar - Không cần đăng nhập!

### Tính năng Save/Load

- ✅ **Auto-Save**: Tự động lưu sau 2 giây khi có thay đổi
- ✅ **Auto-Load**: Tự động load layout gần nhất khi mở app
- ✅ Lưu chart layouts (indicators, drawings, settings)
- ✅ Load layouts đã lưu
- ✅ Quản lý nhiều layouts
- ✅ Xóa layouts không cần
- ✅ Đơn giản - Không cần authentication
- ✅ Tất cả dùng chung 1 user ID

📖 **Chi tiết Auto-Save**: Xem [AUTO_SAVE.md](AUTO_SAVE.md)

## Notes

- Binance Futures API được sử dụng làm primary data source
- OKX và Bybit hỗ trợ historical data, WebSocket đang phát triển
- Không cần API key (chỉ dùng public data)
- Layouts được lưu trên Supabase (PostgreSQL database)
