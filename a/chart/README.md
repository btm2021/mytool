# TradingView Advanced Chart - Binance Futures

Ứng dụng biểu đồ TradingView với dữ liệu từ Binance Futures API và các chỉ báo tùy chỉnh.

## Tính năng

- ✅ **Biểu đồ fullscreen** - Chiếm toàn bộ màn hình
- ✅ **Dữ liệu thời gian thực** - WebSocket streaming từ Binance Futures
- ✅ **Dữ liệu lịch sử** - Tải nến quá khứ
- ✅ **Nhiều khung thời gian** - Tất cả các khoảng thời gian chuẩn
- ✅ **Tìm kiếm symbol** - Tìm kiếm bất kỳ cặp Binance Futures nào
- ✅ **Giao diện tối** - Giao diện trading chuyên nghiệp
- ✅ **Chỉ báo tùy chỉnh** - Bot ATR và VSR Zones

## Cấu trúc File

```
chart/
├── index.html              # File HTML chính
├── app.js                  # Khởi tạo TradingView widget
├── datafeed.js             # Binance Futures datafeed
├── customindicators.js     # Các chỉ báo tùy chỉnh
├── style.css               # CSS fullscreen
├── charting_library/       # Thư viện TradingView
└── README.md              # File này
```

## Cách sử dụng

1. Mở file `index.html` trong trình duyệt web
2. Biểu đồ sẽ tự động tải với symbol BTCUSDT mặc định
3. Sử dụng thanh tìm kiếm để chuyển đổi giữa các cặp giao dịch
4. Thêm chỉ báo tùy chỉnh từ menu Indicators

## Chỉ báo tùy chỉnh

### 1. Bot ATR Dynamic

Chỉ báo ATR động với EMA trailing stop.

**Tham số:**
- `ATR Length` (14): Độ dài tính ATR
- `ATR Multiplier` (2.0): Hệ số nhân ATR
- `EMA Length` (30): Độ dài EMA
- `Show State Change Labels` (true): Hiển thị nhãn thay đổi trạng thái
- `ADX Length` (14): Độ dài ADX

**Cách thêm:**
- Từ menu Indicators, tìm "Bot ATR Dynamic"
- Hoặc trong code: `chart.createStudy('Bot ATR Dynamic', false, false);`

**Mô tả:**
- Đường xanh (Trail1): EMA của giá đóng cửa
- Đường đỏ (Trail2): ATR trailing stop
- Vùng tô màu: Xanh khi xu hướng tăng, đỏ khi xu hướng giảm

### 2. VSR Zones (Volume Spike Reversal)

Chỉ báo xác định các vùng đảo chiều dựa trên volume đột biến.

**Tham số:**
- `Show VSR Zones` (true): Hiển thị vùng VSR
- `Show Trailing Stops` (false): Hiển thị trailing stops
- `TF1 Volume SD Length` (10): Độ dài tính độ lệch chuẩn volume TF1
- `TF1 Volume Threshold` (10.0): Ngưỡng volume TF1
- `TF2 Volume SD Length` (10): Độ dài tính độ lệch chuẩn volume TF2
- `TF2 Volume Threshold` (5.0): Ngưỡng volume TF2

**Cách thêm:**
- Từ menu Indicators, tìm "VSR Zones"
- Hoặc trong code: `chart.createStudy('VSR Zones', false, false);`

**Mô tả:**
- Vùng xanh dương: VSR Timeframe 1 (độ nhạy cao hơn)
- Vùng vàng: VSR Timeframe 2 (độ nhạy thấp hơn)
- Các vùng này đánh dấu nơi có volume đột biến, thường là điểm đảo chiều

## Binance Futures API

Ứng dụng sử dụng các endpoint sau:

- **REST API**: `https://fapi.binance.com`
  - `/fapi/v1/exchangeInfo` - Thông tin cặp giao dịch
  - `/fapi/v1/klines` - Dữ liệu nến lịch sử
  - `/fapi/v1/time` - Thời gian server

- **WebSocket**: `wss://fstream.binance.com/ws`
  - `{symbol}@kline_{interval}` - Stream nến thời gian thực

## Khung thời gian được hỗ trợ

- 1m, 3m, 5m, 15m, 30m (Phút)
- 1h, 2h, 4h, 6h, 8h, 12h (Giờ)
- 1D, 3D (Ngày)
- 1W (Tuần)
- 1M (Tháng)

## Tùy chỉnh

### Thay đổi symbol mặc định

Trong `app.js`, dòng 27:
```javascript
symbol: 'BTCUSDT',  // Thay đổi thành symbol bạn muốn
```

### Thay đổi khung thời gian mặc định

Trong `app.js`, dòng 29:
```javascript
interval: '15',  // Thay đổi thành '1', '5', '60', '1D', v.v.
```

### Thêm chỉ báo mặc định

Trong `app.js`, bỏ comment các dòng:
```javascript
chart.createStudy('Bot ATR Dynamic', false, false);
chart.createStudy('VSR Zones', false, false);
```

### Thay đổi theme

Trong `app.js`, dòng 52:
```javascript
theme: 'Dark',  // Hoặc 'Light'
```

## Lưu ý

- Ứng dụng cần kết nối internet để lấy dữ liệu từ Binance
- Binance Futures API không yêu cầu API key cho dữ liệu công khai
- WebSocket sẽ tự động kết nối lại nếu bị ngắt
- Các chỉ báo tùy chỉnh được tính toán trên client-side

## Xử lý lỗi

Nếu biểu đồ không tải:
1. Kiểm tra console của trình duyệt (F12)
2. Đảm bảo tất cả các file đều có trong thư mục
3. Kiểm tra kết nối internet
4. Thử tải lại trang (Ctrl+F5)

## Phát triển thêm

Để thêm chỉ báo tùy chỉnh mới:
1. Chỉnh sửa `customindicators.js`
2. Thêm chỉ báo mới vào object `window.CustomIndicators`
3. Chỉ báo sẽ tự động xuất hiện trong menu Indicators

## License

Sử dụng thư viện TradingView Advanced Chart (cần license thương mại cho production).
