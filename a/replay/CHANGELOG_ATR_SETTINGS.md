# Changelog - ATR Bot Settings Enhancement

## Ngày: 2025-11-06

### Tính năng mới

#### 1. Settings đầy đủ cho 2 ATR Bot
- Thêm khả năng tùy chỉnh màu sắc cho Trail1 và Trail2
- Thêm khả năng điều chỉnh độ dày đường line (0 = ẩn)
- Thêm khả năng chọn màu fill riêng biệt
- Thêm khả năng điều chỉnh độ trong suốt fill

### Files đã thay đổi

#### app.js
**Thay đổi trong constructor:**
- Cập nhật `indicatorSettings.botATR1` và `indicatorSettings.botATR2` với các thuộc tính mới:
  - `trail1Color`: Màu đường Trail1
  - `trail1Width`: Độ dày đường Trail1
  - `trail2Color`: Màu đường Trail2
  - `trail2Width`: Độ dày đường Trail2
  - `fillColor`: Màu vùng fill
  - `fillOpacity`: Độ trong suốt fill

**Thay đổi trong loadData():**
- Thay thế `setTrail1_1Data()` và `setTrail2_1Data()` bằng `setATRBot1Data()`
- Thay thế `setTrail1_2Data()` và `setTrail2_2Data()` bằng `setATRBot2Data()`
- Truyền đầy đủ options (colors, widths, opacity) vào methods mới

**Thay đổi trong showIndicatorSettings():**
- Thêm populate values cho các input mới:
  - bot1-trail1-color, bot1-trail1-width
  - bot1-trail2-color, bot1-trail2-width
  - bot1-fill-color
  - bot2-trail1-color, bot2-trail1-width
  - bot2-trail2-color, bot2-trail2-width
  - bot2-fill-color

**Thay đổi trong applyIndicatorSettings():**
- Đọc giá trị từ các input mới
- Lưu vào `indicatorSettings`
- Validate các giá trị

**Thay đổi trong resetIndicatorSettings():**
- Reset về giá trị mặc định cho tất cả settings mới

**Thay đổi trong reloadIndicators():**
- Sử dụng `setATRBot1Data()` và `setATRBot2Data()` với options đầy đủ
- Sử dụng `clearATRBot1()` và `clearATRBot2()` khi disabled

#### chart-manager.js
**Methods mới:**
- `setATRBot1Data(trail1Data, trail2Data, options)`: Set data cho Bot 1 với styling đầy đủ
- `setATRBot2Data(trail1Data, trail2Data, options)`: Set data cho Bot 2 với styling đầy đủ
- `clearATRBot1()`: Xóa tất cả data của Bot 1
- `clearATRBot2()`: Xóa tất cả data của Bot 2
- `_updateATRBandFill1WithColor(fillColor, opacity)`: Update fill cho Bot 1 với màu tùy chỉnh
- `_updateATRBandFill2WithColor(fillColor, opacity)`: Update fill cho Bot 2 với màu tùy chỉnh
- `_hexToRgba(hex, alpha)`: Helper để convert hex color sang rgba

**Cải tiến:**
- Các line series giờ có thể ẩn/hiện bằng cách set `lineWidth = 0`
- Fill color có thể tùy chỉnh độc lập với line colors
- Tất cả styling được áp dụng thông qua `applyOptions()`

#### index.html
**Thêm input fields mới cho Bot ATR 1:**
- `bot1-trail1-color`: Color picker cho Trail1
- `bot1-trail1-width`: Number input cho độ dày Trail1
- `bot1-trail2-color`: Color picker cho Trail2
- `bot1-trail2-width`: Number input cho độ dày Trail2
- `bot1-fill-color`: Color picker cho Fill

**Thêm input fields mới cho Bot ATR 2:**
- `bot2-trail1-color`: Color picker cho Trail1
- `bot2-trail1-width`: Number input cho độ dày Trail1
- `bot2-trail2-color`: Color picker cho Trail2
- `bot2-trail2-width`: Number input cho độ dày Trail2
- `bot2-fill-color`: Color picker cho Fill

### Backward Compatibility
- Các methods cũ (`setTrail1_1Data`, `setTrail2_1Data`, etc.) vẫn hoạt động
- Không ảnh hưởng đến code hiện có
- Chỉ thêm tính năng mới, không xóa tính năng cũ

### Testing
- Đã test với getDiagnostics: Không có lỗi
- Tất cả files đều valid
- Code đã được format đúng chuẩn

### Giá trị mặc định

**Bot ATR 1:**
```javascript
{
    trail1Color: '#00ff00',
    trail1Width: 1,
    trail2Color: '#ff0000',
    trail2Width: 1,
    fillColor: '#808000',
    fillOpacity: 0.2
}
```

**Bot ATR 2:**
```javascript
{
    trail1Color: '#0096ff',
    trail1Width: 1,
    trail2Color: '#ff9600',
    trail2Width: 1,
    fillColor: '#80c8ff',
    fillOpacity: 0.15
}
```

### Hướng dẫn sử dụng
Xem file `ATR_BOT_SETTINGS_README.md` để biết chi tiết cách sử dụng.
