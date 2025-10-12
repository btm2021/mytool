# Signal Analyzer Dashboard - Hướng Dẫn Chi Tiết

## 🎯 Tổng quan

Signal Analyzer Dashboard là công cụ phân tích toàn diện, hiển thị mọi thông tin quan trọng từ Binance Futures API trong một giao diện dashboard chuyên nghiệp.

## 📊 Cấu trúc Dashboard

### Layout 2 Cột

```
┌─────────────────────────────────────────────────────────┐
│  Header: [Symbol] [Timeframe] [Phân Tích]              │
├──────────────────────┬──────────────────────────────────┤
│  BÊN TRÁI            │  BÊN PHẢI                        │
│                      │                                  │
│  📈 Thông Tin        │  🎯 Tín Hiệu Giao Dịch          │
│     Thị Trường       │     (Speedometer Gauge)          │
│                      │                                  │
│  📊 Order Book       │  📉 Chỉ Báo Kỹ Thuật            │
│     (Realtime)       │     (EMA, RSI, VWAP)             │
│                      │                                  │
│                      │  📝 Chi Tiết Tín Hiệu            │
│                      │                                  │
└──────────────────────┴──────────────────────────────────┘
```

## 🔍 Chi Tiết Các Phần

### 1. Thông Tin Thị Trường (Bên Trái - Trên)

#### Giá Realtime
- **Last Price**: Cập nhật realtime qua WebSocket
- **24h Change**: Thay đổi giá và phần trăm
- **Flash Animation**: Hiệu ứng khi giá thay đổi

#### Thông Tin Giá
- **Mark Price**: Giá đánh dấu
- **Index Price**: Giá chỉ số
- **24h High/Low**: Giá cao/thấp trong 24h

#### Volume & Trading
- **24h Volume**: Khối lượng giao dịch (coin)
- **24h Quote Volume**: Khối lượng giao dịch (USDT)
- **24h Trades**: Số lượng giao dịch

#### Funding & Positions
- **Funding Rate**: Lãi suất funding (realtime)
- **Long/Short Ratio**: Tỷ lệ Long/Short
- **Long Account %**: Phần trăm tài khoản Long
- **Short Account %**: Phần trăm tài khoản Short
- **Open Interest**: Vị thế mở

### 2. Order Book (Bên Trái - Dưới)

#### Hiển thị
- **Top 10 Asks**: 10 lệnh bán tốt nhất (màu đỏ)
- **Top 10 Bids**: 10 lệnh mua tốt nhất (màu xanh)
- **Spread**: Chênh lệch giá mua/bán

#### Cột thông tin
- **Price**: Giá lệnh
- **Amount**: Số lượng
- **Total**: Tổng giá trị (Price × Amount)

#### Tính năng
- **Bar Chart**: Thanh ngang thể hiện volume
- **Realtime Update**: Cập nhật mỗi 2 giây
- **Hover Effect**: Highlight khi di chuột

### 3. Tín Hiệu Giao Dịch (Bên Phải - Trên)

#### Speedometer Gauge
- **Vùng Đỏ (0-40%)**: SELL signal
- **Vùng Vàng (40-60%)**: NOTHING - không rõ ràng
- **Vùng Xanh (60-100%)**: BUY signal
- **Kim chỉ**: Vị trí dựa trên % BUY

#### Kết quả
- **Signal Badge**: BUY / SELL / NOTHING
- **Percentages**: Tỷ lệ BUY% và SELL%

### 4. Chỉ Báo Kỹ Thuật (Bên Phải - Giữa)

#### Grid 3×2
- **Current Price**: Giá hiện tại
- **EMA 20**: Exponential Moving Average 20
- **EMA 50**: Exponential Moving Average 50
- **EMA 200**: Exponential Moving Average 200
- **RSI (14)**: Relative Strength Index
- **VWAP**: Volume Weighted Average Price

#### Precision
- Tất cả giá được làm tròn theo precision của symbol
- VD: BTC = 2 decimals, ETH = 2 decimals, altcoins = 4-8 decimals

### 5. Chi Tiết Tín Hiệu (Bên Phải - Dưới)

#### Mỗi tín hiệu bao gồm:
- **Indicator**: Tên chỉ báo (EMA, RSI, VWAP)
- **Signal**: BUY hoặc SELL
- **Strength**: Độ mạnh (★1 - ★3)
- **Reason**: Lý do chi tiết

## 🔄 Realtime Updates

### WebSocket Connections

#### 1. Price WebSocket
```javascript
wss://fstream.binance.com/ws/{symbol}@markPrice
```
- Cập nhật giá liên tục
- Flash animation khi thay đổi
- Tự động reconnect nếu mất kết nối

#### 2. Orderbook Updates
- Fetch mỗi 2 giây
- Không dùng WebSocket để tránh quá tải
- Smooth transition khi update

## 📡 Binance API Endpoints

### 1. 24hr Ticker Statistics
```
GET /fapi/v1/ticker/24hr?symbol={SYMBOL}
```
**Response:**
- lastPrice, priceChange, priceChangePercent
- highPrice, lowPrice
- volume, quoteVolume
- count (số giao dịch)

### 2. Premium Index (Funding Rate)
```
GET /fapi/v1/premiumIndex?symbol={SYMBOL}
```
**Response:**
- markPrice, indexPrice
- lastFundingRate
- nextFundingTime

### 3. Exchange Info (Precision)
```
GET /fapi/v1/exchangeInfo
```
**Response:**
- symbols[].pricePrecision
- symbols[].quantityPrecision

### 4. Order Book
```
GET /fapi/v1/depth?symbol={SYMBOL}&limit=20
```
**Response:**
- bids: [[price, quantity], ...]
- asks: [[price, quantity], ...]

### 5. Long/Short Ratio
```
GET /futures/data/globalLongShortAccountRatio?symbol={SYMBOL}&period=5m&limit=1
```
**Response:**
- longAccount, shortAccount
- longShortRatio

### 6. Open Interest
```
GET /fapi/v1/openInterest?symbol={SYMBOL}
```
**Response:**
- openInterest

### 7. Klines (Candles)
```
GET /fapi/v1/klines?symbol={SYMBOL}&interval={INTERVAL}&limit=500
```
**Response:**
- [time, open, high, low, close, volume, ...]

## 🎨 Color Scheme

### Prices
- **Positive**: `#089981` (Green)
- **Negative**: `#F23645` (Red)
- **Neutral**: `#D1D4DC` (Light Gray)

### Signals
- **BUY**: `#089981` (Green)
- **SELL**: `#F23645` (Red)
- **NOTHING**: `#FF9800` (Orange)

### Background
- **Primary**: `#1E222D`
- **Secondary**: `#131722`
- **Border**: `#2A2E39`

## 🔧 Cách sử dụng

### Bước 1: Mở Dashboard
1. Click nút **Tool** trên header
2. Chọn **Signal Analyzer**
3. Dashboard tự động load symbol từ chart

### Bước 2: Phân tích
1. Kiểm tra symbol (tự động điền)
2. Chọn timeframe (mặc định 15m)
3. Click **Phân Tích**

### Bước 3: Đọc kết quả
1. **Bên trái**: Xem thông tin thị trường và orderbook
2. **Bên phải**: Xem tín hiệu và chỉ báo
3. **Realtime**: Giá cập nhật liên tục

### Bước 4: Đổi Symbol
1. Nhập symbol mới vào input
2. Click **Phân Tích** lại
3. Hoặc đổi symbol trên chart và mở lại dialog

## 💡 Tips Sử Dụng

### 1. Đọc Order Book
- **Nhiều bid xanh**: Lực mua mạnh
- **Nhiều ask đỏ**: Lực bán mạnh
- **Spread nhỏ**: Thanh khoản tốt
- **Spread lớn**: Thanh khoản kém

### 2. Phân tích Funding Rate
- **Funding > 0**: Long trả Short (thị trường bullish)
- **Funding < 0**: Short trả Long (thị trường bearish)
- **Funding cao**: Cảnh báo quá tải một bên

### 3. Long/Short Ratio
- **Ratio > 1**: Nhiều Long hơn Short
- **Ratio < 1**: Nhiều Short hơn Long
- **Ratio cực đoan**: Cảnh báo đảo chiều

### 4. Kết hợp Indicators
- **EMA**: Xu hướng dài hạn
- **RSI**: Overbought/Oversold
- **VWAP**: Giá trị trung bình có trọng số
- **Tất cả cùng chiều**: Tín hiệu mạnh

### 5. Timeframe
- **1m, 5m**: Scalping
- **15m, 30m**: Day trading
- **1h, 4h**: Swing trading
- **1d**: Position trading

## ⚠️ Lưu ý

### Performance
- Dashboard load nhiều data → có thể chậm với mạng yếu
- WebSocket có thể disconnect → tự động reconnect
- Orderbook update mỗi 2s → không quá realtime

### Độ chính xác
- Tín hiệu chỉ mang tính tham khảo
- Không phải lời khuyên tài chính
- Luôn kết hợp nhiều yếu tố khác

### Giới hạn API
- Binance có rate limit
- Quá nhiều request → bị block tạm thời
- Nên đợi 1-2s giữa các lần phân tích

## 🚀 Tính năng tương lai

### Có thể thêm
- [ ] Heatmap giá
- [ ] Volume profile
- [ ] Liquidation levels
- [ ] Top traders positions
- [ ] Funding rate history chart
- [ ] Price alerts
- [ ] Export data
- [ ] Multiple symbols comparison
- [ ] AI predictions
- [ ] Backtesting

## 🐛 Troubleshooting

### Giá không cập nhật
- Kiểm tra WebSocket connection
- Refresh lại dialog
- Kiểm tra console log

### Orderbook trống
- Symbol không hợp lệ
- API rate limit
- Mạng bị chậm

### Tín hiệu sai
- Kiểm tra timeframe
- Tăng số nến phân tích
- Kết hợp nhiều timeframe

### Dashboard chậm
- Giảm update frequency
- Đóng các dialog khác
- Refresh browser

## 📚 Tài liệu tham khảo

- [Binance Futures API](https://binance-docs.github.io/apidocs/futures/en/)
- [WebSocket Streams](https://binance-docs.github.io/apidocs/futures/en/#websocket-market-streams)
- [Technical Indicators](https://www.investopedia.com/technical-analysis-4689657)

---

**Happy Trading! 📈💰**
