# Binance Chart Mobile Version

Phiên bản mobile của webapp Binance Chart, được tối ưu cho màn hình dọc (portrait mode) giống TradingView mobile.

## Tính năng

### Layout Mobile-First
- **Header**: Hiển thị tên symbol và giá hiện tại
- **Chart**: Vùng chart nến + volume chiếm phần lớn màn hình
- **Bottom Controls**: Thanh điều khiển cố định ở dưới cùng với 4 nút chính

### Chức năng chính

1. **Symbol Selection**
   - Danh sách tất cả cặp USDT trên Binance
   - Tìm kiếm symbol
   - Hiển thị giá, % thay đổi, volume
   - Sắp xếp theo volume

2. **Timeframe Selection**
   - 1m, 5m, 15m, 30m, 1h, 4h, 1d
   - Giao diện grid dễ chọn

3. **Indicators**
   - Bot ATR 1 (30/14/2)
   - Bot ATR 2 (55/14/2)
   - VSR 1 (10/10)
   - VSR 2 (20/20)
   - Volume
   - Donchian Channel (50)
   - Tenkansen (50)
   - Bật/tắt từng indicator

4. **Settings**
   - Số lượng nến (mặc định 2000, max 3000)

## Cấu trúc thư mục

```
mobi/
├── index.html          # HTML chính
├── styles.css          # CSS responsive cho mobile
├── app.js              # Logic chính của app
├── chart-manager.js    # Quản lý chart và indicators
├── binance-api.js      # API Binance
└── README.md           # File này
```

## Sử dụng

### Cách 1: Mở trực tiếp
```
mobi/index.html
```

### Cách 2: Chạy với HTTP server
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# Sau đó truy cập: http://localhost:8000/mobi/
```

## Dependencies

Tất cả dependencies được load từ CDN:
- **Lightweight Charts** v4.2.1 - Chart library
- **FillRect Plugin** - VSR rectangles
- **BandFill Plugin** - ATR band fill

## Shared Code

Các file được dùng chung từ thư mục gốc:
- `../botatr.js` - Bot ATR indicator
- `../vsr-indicator.js` - VSR indicator
- `../donchian.js` - Donchian Channel
- `../tenkansen.js` - Tenkansen indicator
- `../dist/rectfill/` - FillRect plugin
- `../dist/bandfill/` - BandFill plugin

## Tối ưu cho Mobile

### Touch Gestures
- Pinch to zoom
- Swipe to pan
- Tap to select

### Performance Optimizations
- **Reduced candle count**: Default 2000 (max 3000) vs desktop 10000
- **VSR optimization**: Gộp các rectangles liên tiếp có cùng giá trị
  - Trước: 5000 nến = 5000 rectangles
  - Sau: 5000 nến = ~50-200 rectangles (giảm 95%+)
- **VSR disabled by default**: Tắt mặc định vì tốn performance nhất
- **Lazy loading symbols**: Load danh sách symbol theo yêu cầu
- **No cache system**: Fetch trực tiếp từ API, đơn giản hơn
- **Debounced updates**: Delay 300ms khi toggle indicators
- **Performance logging**: Console log để debug timing

### UI/UX
- Large touch targets (44px minimum)
- Clear visual hierarchy
- Bottom navigation (thumb-friendly)
- Full-screen modals
- No hover states (touch-only)

## Browser Support

- iOS Safari 12+
- Chrome Mobile 80+
- Firefox Mobile 80+
- Samsung Internet 12+

## Lưu ý

1. **Không ảnh hưởng code gốc**: Tất cả code mobile nằm riêng trong thư mục `mobi/`
2. **Shared indicators**: Dùng chung các indicator từ thư mục gốc
3. **Responsive**: Tự động điều chỉnh khi xoay màn hình
4. **No cache**: Luôn fetch dữ liệu mới từ API

## Khác biệt với Desktop Version

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Layout | Horizontal navbar | Bottom controls |
| Modals | Centered overlay | Full-screen |
| Controls | Mouse + keyboard | Touch only |
| Chart size | Flexible | Optimized for portrait |
| Replay | ✅ | ❌ (không cần) |
| Backtest | ✅ | ❌ (không cần) |
| Measure tool | ✅ | ❌ (không cần) |
| Cache system | ✅ | ❌ (đơn giản hơn) |
| Real-time | ❌ | ❌ |

## Future Enhancements

- [ ] PWA support (install to home screen)
- [ ] Dark/Light theme toggle
- [ ] Favorite symbols
- [ ] Price alerts
- [ ] Multiple chart layouts
- [ ] Drawing tools
- [ ] Export chart as image
- [ ] Optional cache system (if needed)
