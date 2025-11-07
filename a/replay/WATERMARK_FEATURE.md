# Chart Watermark Feature

Ứng dụng hiển thị watermark ở background của chart để dễ dàng nhận biết exchange, symbol và timeframe đang xem.

## Tính Năng

### Hiển Thị Tự Động

Khi load data thành công, watermark sẽ tự động hiển thị với format:

```
EXCHANGE SYMBOL TIMEFRAME
```

**Ví dụ:**
- `BINANCE BTCUSDT 15M`
- `BYBIT ETHUSDT 1H`
- `OKX SOLUSDT 5M`

### Vị Trí và Styling

- **Vị trí**: Giữa chart (center horizontal và vertical)
- **Font size**: 48px
- **Màu sắc**: Trắng với opacity 5% (`rgba(255, 255, 255, 0.05)`)
- **Hiệu ứng**: Watermark mờ, không che khuất dữ liệu chart

## Cách Sử Dụng

### Tự Động

Watermark được cập nhật tự động khi:

1. **Load data thủ công**: Click nút "Load" sau khi chọn symbol và timeframe
2. **Load từ URL params**: Truy cập với URL có params
3. **Chuyển đổi exchange**: Khi switch sang exchange khác

### Thủ Công (Trong Code)

```javascript
// Update watermark
chartManager.updateWatermark('binance', 'BTCUSDT', '1h');

// Clear watermark
chartManager.clearWatermark();
```

## Ví Dụ

### Load Từ URL

```
https://your-domain.com/?exchange=bybit&symbol=SOLUSDT&timeframe=15m&limit=5000
```

Watermark sẽ hiển thị: **BYBIT SOLUSDT 15M**

### Load Thủ Công

1. Chọn symbol: ETHUSDT
2. Chọn timeframe: 1h
3. Click "Load"

Watermark sẽ hiển thị: **BINANCE ETHUSDT 1H** (hoặc exchange đang sử dụng)

## Tùy Chỉnh

### Thay Đổi Styling

Để thay đổi appearance của watermark, edit trong `chart-manager.js`:

```javascript
updateWatermark(exchange, symbol, timeframe) {
    this.chart.applyOptions({
        watermark: {
            visible: true,
            fontSize: 48,              // Thay đổi kích thước font
            horzAlign: 'center',       // left, center, right
            vertAlign: 'center',       // top, center, bottom
            color: 'rgba(255, 255, 255, 0.05)', // Thay đổi màu và opacity
            text: watermarkText,
        }
    });
}
```

### Ví Dụ Tùy Chỉnh

**Watermark lớn hơn và đậm hơn:**
```javascript
fontSize: 64,
color: 'rgba(255, 255, 255, 0.1)',
```

**Watermark ở góc trên bên trái:**
```javascript
horzAlign: 'left',
vertAlign: 'top',
```

**Watermark với màu xanh:**
```javascript
color: 'rgba(0, 150, 255, 0.08)',
```

### Thay Đổi Format Text

Để thay đổi format của text, edit trong `chart-manager.js`:

```javascript
updateWatermark(exchange, symbol, timeframe) {
    // Format mặc định
    const watermarkText = `${exchange.toUpperCase()} ${symbol.toUpperCase()} ${timeframe.toUpperCase()}`;
    
    // Hoặc format khác:
    // const watermarkText = `${exchange} - ${symbol} (${timeframe})`;
    // const watermarkText = `${symbol} @ ${exchange}`;
    // const watermarkText = `${exchange}\n${symbol}\n${timeframe}`; // Multi-line
    
    this.chart.applyOptions({
        watermark: {
            text: watermarkText,
            // ...
        }
    });
}
```

## API Reference

### ChartManager Methods

#### `updateWatermark(exchange, symbol, timeframe)`

Cập nhật watermark với thông tin mới.

**Parameters:**
- `exchange` (string): Tên exchange (e.g., 'binance', 'bybit')
- `symbol` (string): Symbol (e.g., 'BTCUSDT', 'ETHUSDT')
- `timeframe` (string): Timeframe (e.g., '1m', '5m', '15m', '1h')

**Example:**
```javascript
chartManager.updateWatermark('binance', 'BTCUSDT', '1h');
```

#### `clearWatermark()`

Ẩn watermark.

**Example:**
```javascript
chartManager.clearWatermark();
```

## Lợi Ích

### 1. Nhận Biết Nhanh
Dễ dàng biết đang xem chart của exchange nào, symbol nào, timeframe nào mà không cần nhìn vào navbar.

### 2. Screenshot/Recording
Khi chụp màn hình hoặc record video, watermark giúp người xem biết rõ thông tin chart.

### 3. Multi-Tab
Khi mở nhiều tab với các symbol/exchange khác nhau, watermark giúp phân biệt nhanh.

### 4. Không Gây Nhiễu
Với opacity thấp (5%), watermark không che khuất dữ liệu chart nhưng vẫn đủ rõ để đọc.

## Troubleshooting

### Watermark Không Hiển Thị

**Nguyên nhân:**
- Chart chưa được khởi tạo
- Data chưa được load

**Giải pháp:**
- Đảm bảo load data thành công
- Check console log để xem có lỗi không

### Watermark Quá Mờ/Đậm

**Giải pháp:**
Điều chỉnh opacity trong `updateWatermark()`:

```javascript
// Mờ hơn
color: 'rgba(255, 255, 255, 0.03)',

// Đậm hơn
color: 'rgba(255, 255, 255, 0.1)',
```

### Watermark Bị Che Bởi Indicators

**Nguyên nhân:**
Watermark luôn ở background, không thể đưa lên foreground.

**Giải pháp:**
- Thay đổi vị trí watermark (horzAlign, vertAlign)
- Giảm opacity để ít bị che hơn

### Text Quá Dài

**Giải pháp:**
Rút ngắn format text:

```javascript
// Thay vì: BINANCE BTCUSDT 15M
// Dùng: BTC 15M
const watermarkText = `${symbol.replace('USDT', '')} ${timeframe.toUpperCase()}`;
```

## Best Practices

### 1. Giữ Opacity Thấp
Watermark nên mờ để không gây nhiễu:
```javascript
color: 'rgba(255, 255, 255, 0.05)', // Recommended
```

### 2. Font Size Phù Hợp
Font size nên đủ lớn để đọc nhưng không quá lớn:
```javascript
fontSize: 48, // Recommended for 1080p
fontSize: 64, // For 4K displays
fontSize: 32, // For smaller screens
```

### 3. Vị Trí Center
Vị trí center thường là tốt nhất vì không che các thông tin quan trọng ở góc:
```javascript
horzAlign: 'center',
vertAlign: 'center',
```

### 4. Format Ngắn Gọn
Giữ text ngắn gọn và dễ đọc:
```javascript
// Good
"BINANCE BTCUSDT 15M"

// Too long
"Binance Futures BTCUSDT Perpetual 15 Minutes"
```

## Tương Lai

Các tính năng có thể thêm:

- [ ] Toggle watermark on/off từ UI
- [ ] Tùy chỉnh watermark từ settings modal
- [ ] Thêm thông tin khác (date range, candle count)
- [ ] Multiple watermarks (góc khác nhau)
- [ ] Animated watermark
- [ ] Custom logo/image watermark

## Tham Khảo

- [LightweightCharts Watermark Documentation](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/WatermarkOptions)
- [LightweightCharts API Reference](https://tradingview.github.io/lightweight-charts/docs/api)
