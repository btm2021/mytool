# ATR Bot Settings - Hướng dẫn sử dụng

## Tính năng mới

Đã thêm các tùy chọn settings đầy đủ cho 2 ATR Bot, cho phép bạn tùy chỉnh:

### Bot ATR 1 (30/14/2)
- **EMA Length**: Độ dài EMA (1-200)
- **ATR Length**: Độ dài ATR (1-100)
- **ATR Multiplier**: Hệ số nhân ATR (0.1-10)
- **Trail1 Color**: Màu của đường Trail1 (EMA)
- **Trail1 Width**: Độ dày đường Trail1 (0-5, 0 = ẩn)
- **Trail2 Color**: Màu của đường Trail2 (ATR Trailing Stop)
- **Trail2 Width**: Độ dày đường Trail2 (0-5, 0 = ẩn)
- **Fill Color**: Màu vùng fill giữa Trail1 và Trail2
- **Fill Opacity**: Độ trong suốt của vùng fill (0-1)

### Bot ATR 2 (55/14/2)
Các tùy chọn tương tự như Bot ATR 1

## Cách sử dụng

1. Click vào nút **Settings** trên thanh navbar
2. Tìm đến section **Bot ATR 1** hoặc **Bot ATR 2**
3. Bật/tắt indicator bằng toggle switch
4. Điều chỉnh các thông số:
   - Chọn màu bằng color picker
   - Đặt line width = 0 để ẩn đường line
   - Điều chỉnh fill opacity để thay đổi độ trong suốt
5. Click **Apply Settings** để áp dụng

## Ví dụ cấu hình

### Chỉ hiển thị vùng fill, ẩn các đường line:
- Trail1 Width: 0
- Trail2 Width: 0
- Fill Opacity: 0.2

### Hiển thị đầy đủ với màu tùy chỉnh:
- Trail1 Color: #00ff00 (xanh lá)
- Trail1 Width: 1
- Trail2 Color: #ff0000 (đỏ)
- Trail2 Width: 1
- Fill Color: #808000 (vàng olive)
- Fill Opacity: 0.2

### Chỉ hiển thị các đường line, không có fill:
- Trail1 Width: 2
- Trail2 Width: 2
- Fill Opacity: 0

## Lưu ý

- Các thay đổi sẽ được áp dụng ngay lập tức khi click "Apply Settings"
- Backtest sẽ tự động chạy lại với settings mới
- Settings được lưu trong session, sẽ reset về mặc định khi reload trang
- Có thể click "Reset to Default" để khôi phục settings ban đầu

## Màu mặc định

**Bot ATR 1:**
- Trail1: #00ff00 (xanh lá)
- Trail2: #ff0000 (đỏ)
- Fill: #808000 (vàng olive)

**Bot ATR 2:**
- Trail1: #0096ff (xanh dương)
- Trail2: #ff9600 (cam)
- Fill: #80c8ff (xanh nhạt)
