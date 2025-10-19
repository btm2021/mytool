# Whitelist Feature

## Tổng quan
Tính năng whitelist cho phép bạn chọn lọc các symbol cụ thể để theo dõi trên mỗi sàn giao dịch.

## Cách sử dụng

### 1. Mở Modal Whitelist
- Click vào tên sàn trong panel bên trái
- Modal sẽ tự động load danh sách tất cả symbols của sàn đó

### 2. Thêm/Xóa Symbol khỏi Whitelist
- Sử dụng nút **+** để thêm symbol vào whitelist
- Sử dụng nút **−** để xóa symbol khỏi whitelist
- Symbols trong whitelist sẽ được highlight với màu xanh

### 3. Tự động Restart
- Khi thay đổi whitelist, nếu sàn đang chạy, nó sẽ tự động stop và restart
- Chỉ các symbols trong whitelist sẽ được xử lý

### 4. Xem Whitelist Status
- Trong tab Settings, mỗi sàn sẽ hiển thị số lượng symbols trong whitelist
- Badge "⚡ X whitelisted" cho biết có bao nhiêu symbols đang được theo dõi

## Whitelist Mặc định

Mỗi sàn đã được cấu hình với 10 symbols phổ biến:

### Binance
- BTC/USDT, ETH/USDT, BNB/USDT, SOL/USDT, XRP/USDT
- ADA/USDT, DOGE/USDT, AVAX/USDT, DOT/USDT, MATIC/USDT

### Bybit
- BTC/USDT:USDT, ETH/USDT:USDT, SOL/USDT:USDT, XRP/USDT:USDT, BNB/USDT:USDT
- ADA/USDT:USDT, DOGE/USDT:USDT, AVAX/USDT:USDT, DOT/USDT:USDT, MATIC/USDT:USDT

### OKX
- BTC/USDT:USDT, ETH/USDT:USDT, SOL/USDT:USDT, XRP/USDT:USDT, BNB/USDT:USDT
- ADA/USDT:USDT, DOGE/USDT:USDT, AVAX/USDT:USDT, DOT/USDT:USDT, LINK/USDT:USDT

### KuCoin Futures
- BTC/USDT:USDT, ETH/USDT:USDT, SOL/USDT:USDT, XRP/USDT:USDT, BNB/USDT:USDT
- ADA/USDT:USDT, DOGE/USDT:USDT, AVAX/USDT:USDT, DOT/USDT:USDT, MATIC/USDT:USDT

### BingX
- BTC/USDT, ETH/USDT, SOL/USDT, XRP/USDT, BNB/USDT
- ADA/USDT, DOGE/USDT, AVAX/USDT, DOT/USDT, MATIC/USDT

### MEXC
- BTC/USDT, ETH/USDT, SOL/USDT, XRP/USDT, BNB/USDT
- ADA/USDT, DOGE/USDT, AVAX/USDT, DOT/USDT, MATIC/USDT

### Kraken Futures
- BTC/USD:USD, ETH/USD:USD, SOL/USD:USD, XRP/USD:USD, ADA/USD:USD
- DOGE/USD:USD, AVAX/USD:USD, DOT/USD:USD, MATIC/USD:USD, LINK/USD:USD

## Lưu trữ
- Whitelist được lưu trong localStorage
- Mỗi sàn có whitelist riêng biệt
- Whitelist được giữ nguyên khi reload trang

## Lợi ích
- Giảm tải API requests
- Tập trung vào các symbols quan tâm
- Tăng tốc độ xử lý
- Tiết kiệm bandwidth
