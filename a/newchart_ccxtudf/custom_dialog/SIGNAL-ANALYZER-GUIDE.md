# Signal Analyzer - Hướng Dẫn Sử Dụng

## Tổng quan

Signal Analyzer là công cụ phân tích tín hiệu giao dịch tự động sử dụng các chỉ báo kỹ thuật phổ biến để đưa ra khuyến nghị BUY, SELL hoặc NOTHING.

## Tính năng

### 1. Phân tích đa chỉ báo
- **EMA (Exponential Moving Average)**: EMA 20, 50, 200
- **RSI (Relative Strength Index)**: RSI 14 periods
- **VWAP (Volume Weighted Average Price)**: VWAP tích lũy

### 2. Tải dữ liệu realtime
- Fetch tối đa 1500 nến từ Binance Futures
- Hỗ trợ nhiều khung thời gian: 1m, 5m, 15m, 30m, 1h, 4h, 1d
- Tự động lấy symbol đang hiển thị trên chart

### 3. Hiển thị trực quan
- **Speedometer Gauge**: Hiển thị tỷ lệ BUY/SELL bằng đồng hồ đo
- **Chi tiết tín hiệu**: Phân tích từng chỉ báo với độ mạnh và lý do
- **Giá trị chỉ báo**: Hiển thị giá trị hiện tại của tất cả indicators

## Cách sử dụng

### Bước 1: Mở Signal Analyzer
1. Click nút **Tool** trên header TradingView
2. Chọn **Signal Analyzer** từ sidebar

### Bước 2: Cấu hình phân tích
- **Symbol**: Nhập symbol muốn phân tích (mặc định lấy từ chart)
- **Khung thời gian**: Chọn timeframe (1m - 1d)
- **Số nến**: Chọn số lượng nến để phân tích (100-1500)

### Bước 3: Phân tích
1. Click nút **Phân Tích**
2. Chờ hệ thống tải dữ liệu và tính toán
3. Xem kết quả

## Cách đọc kết quả

### Speedometer Gauge
- **Vùng đỏ (trái)**: SELL signal
- **Vùng vàng (giữa)**: NOTHING - không có tín hiệu rõ ràng
- **Vùng xanh (phải)**: BUY signal
- **Kim chỉ**: Vị trí kim cho biết xu hướng tổng thể

### Tín hiệu cuối cùng
- **BUY**: Khi tỷ lệ BUY >= 60%
- **SELL**: Khi tỷ lệ SELL >= 60%
- **NOTHING**: Khi không có xu hướng rõ ràng

### Chi tiết tín hiệu

Mỗi tín hiệu bao gồm:
- **Indicator**: Chỉ báo tạo ra tín hiệu (EMA, RSI, VWAP)
- **Signal**: BUY hoặc SELL
- **Độ mạnh**: 1-3 (càng cao càng mạnh)
- **Lý do**: Giải thích tại sao có tín hiệu này

## Thuật toán phân tích

### EMA Analysis
1. **Uptrend mạnh** (3 điểm BUY):
   - Giá > EMA20 > EMA50 > EMA200
   
2. **Downtrend mạnh** (3 điểm SELL):
   - Giá < EMA20 < EMA50 < EMA200
   
3. **Xu hướng yếu** (1 điểm):
   - Giá > EMA20: BUY
   - Giá < EMA20: SELL

### RSI Analysis
1. **Oversold** (2 điểm BUY):
   - RSI < 30
   
2. **Overbought** (2 điểm SELL):
   - RSI > 70
   
3. **Xu hướng** (1 điểm):
   - RSI > 50: BUY
   - RSI < 50: SELL

### VWAP Analysis
1. **Bullish** (2 điểm BUY):
   - Giá > VWAP
   
2. **Bearish** (2 điểm SELL):
   - Giá < VWAP

### Tính điểm cuối cùng
- Tổng điểm BUY và SELL
- Tính tỷ lệ phần trăm
- Nếu BUY >= 60%: Signal = BUY
- Nếu SELL >= 60%: Signal = SELL
- Còn lại: Signal = NOTHING

## Ví dụ

### Ví dụ 1: Strong BUY Signal
```
Giá: 50,000
EMA20: 49,500 (Giá > EMA20) → +1 BUY
EMA50: 49,000
EMA200: 48,000
Trend: Uptrend mạnh → +3 BUY

RSI: 55 (> 50) → +1 BUY

VWAP: 49,800 (Giá > VWAP) → +2 BUY

Total: 7 BUY, 0 SELL
Percentage: 100% BUY
Signal: BUY
```

### Ví dụ 2: Mixed Signal
```
Giá: 50,000
EMA20: 50,200 (Giá < EMA20) → +1 SELL

RSI: 45 (< 50) → +1 SELL

VWAP: 49,500 (Giá > VWAP) → +2 BUY

Total: 2 BUY, 2 SELL
Percentage: 50% BUY, 50% SELL
Signal: NOTHING
```

## Lưu ý quan trọng

### ⚠️ Không phải lời khuyên tài chính
- Tool này chỉ là công cụ phân tích kỹ thuật
- Không nên dựa hoàn toàn vào tín hiệu tự động
- Luôn kết hợp với phân tích của bạn

### 📊 Độ chính xác
- Độ chính xác phụ thuộc vào:
  - Điều kiện thị trường
  - Khung thời gian được chọn
  - Số lượng nến phân tích
  
### 🔄 Cập nhật
- Dữ liệu không tự động cập nhật
- Click **Phân Tích** lại để refresh

### 💡 Tips
1. Sử dụng nhiều khung thời gian để xác nhận
2. Kết hợp với volume và price action
3. Chú ý đến các vùng support/resistance
4. Không trade ngược trend chính

## Mở rộng trong tương lai

### Indicators có thể thêm
- [ ] MACD (Moving Average Convergence Divergence)
- [ ] Bollinger Bands
- [ ] Stochastic RSI
- [ ] Fibonacci Retracement
- [ ] Volume Profile
- [ ] ATR (Average True Range)
- [ ] Ichimoku Cloud

### Tính năng có thể thêm
- [ ] Lưu lịch sử phân tích
- [ ] So sánh nhiều symbol
- [ ] Alert khi có tín hiệu mới
- [ ] Backtest tín hiệu
- [ ] Export kết quả
- [ ] Custom indicator weights

## Technical Details

### API Endpoint
```
https://fapi.binance.com/fapi/v1/klines
```

### Parameters
- `symbol`: Trading pair (e.g., BTCUSDT)
- `interval`: Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d)
- `limit`: Number of candles (max 1500)

### Response Format
```javascript
[
  [
    1499040000000,      // Open time
    "0.01634790",       // Open
    "0.80000000",       // High
    "0.01575800",       // Low
    "0.01577100",       // Close
    "148976.11427815",  // Volume
    ...
  ]
]
```

## Troubleshooting

### Lỗi: "Không thể tải dữ liệu"
- Kiểm tra kết nối internet
- Đảm bảo symbol đúng format (VD: BTCUSDT)
- Thử giảm số lượng nến

### Gauge không hiển thị
- Refresh lại dialog
- Kiểm tra console log
- Đảm bảo canvas được render

### Tín hiệu không chính xác
- Thử tăng số lượng nến
- Đổi khung thời gian
- Kết hợp nhiều phân tích

## Support

Nếu gặp vấn đề:
1. Check browser console
2. Xem file CUSTOM-DIALOG-GUIDE.md
3. Liên hệ team support

---

**Happy Trading! 📈**
