# URL Parameters Guide

Ứng dụng hỗ trợ tự động load dữ liệu thông qua URL parameters. Khi truy cập với các tham số URL, ứng dụng sẽ tự động khởi tạo và load dữ liệu mà không cần thao tác thủ công.

## Các Tham Số URL
### 1. `symbol` (Bắt buộc)
Tên symbol cần load (ví dụ: BTCUSDT, ETHUSDT, BNBUSDT)

**Ví dụ:**
```
?symbol=BTCUSDT
```

### 2. `timeframe` (Tùy chọn)
Khung thời gian của nến. Mặc định: 15m

**Giá trị hợp lệ:**
- `1m` - 1 phút
- `5m` - 5 phút
- `15m` - 15 phút (mặc định)
- `1h` - 1 giờ

**Ví dụ:**
```
?symbol=BTCUSDT&timeframe=1h
```

### 3. `limit` (Tùy chọn)
Số lượng nến cần load. Mặc định: 10000
Tối thiểu: 100

**Ví dụ:**
```
?symbol=BTCUSDT&limit=5000
```

### 4. `exchange` (Tùy chọn)
Tên sàn giao dịch. Hỗ trợ nhiều exchange thông qua CCXT library.

**Giá trị hỗ trợ:**
- `binance` (mặc định)
- `binanceusdm` - Binance USD-M Futures
- `bybit` - Bybit
- `okx` - OKX
- `bitget` - Bitget
- `gate` - Gate.io
- `kucoin` - KuCoin
- `huobi` - Huobi
- `mexc` - MEXC

**Ví dụ:**
```
?symbol=BTCUSDT&exchange=bybit
```

### 5. `usecache` (Tùy chọn)
Quyết định có sử dụng cache hay không. Mặc định: yes

**Giá trị:**
- `yes` - Sử dụng cache nếu có (mặc định)
- `no` - Bỏ qua cache và fetch dữ liệu mới từ API

**Ví dụ:**
```
?symbol=BTCUSDT&usecache=no
```

## Ví Dụ Đầy Đủ

### Ví dụ 1: Load BTCUSDT với cài đặt mặc định
```
https://your-domain.com/?symbol=BTCUSDT
```

### Ví dụ 2: Load ETHUSDT, timeframe 1h, 3000 nến
```
https://your-domain.com/?symbol=ETHUSDT&timeframe=1h&limit=3000
```

### Ví dụ 3: Load BNBUSDT, timeframe 5m, không dùng cache
```
https://your-domain.com/?symbol=BNBUSDT&timeframe=5m&usecache=no
```

### Ví dụ 4: Load với tất cả tham số
```
https://your-domain.com/?exchange=binance&symbol=SOLUSDT&timeframe=15m&limit=5000&usecache=yes
```

### Ví dụ 5: Load từ Bybit
```
https://your-domain.com/?exchange=bybit&symbol=BTCUSDT&timeframe=1h&limit=2000
```

### Ví dụ 6: Load từ OKX
```
https://your-domain.com/?exchange=okx&symbol=ETHUSDT&timeframe=5m&limit=3000&usecache=no
```

## Lưu Ý

1. **Symbol là bắt buộc**: Nếu không có tham số `symbol`, ứng dụng sẽ hoạt động bình thường và chờ người dùng chọn symbol thủ công.

2. **Cache**: Khi `usecache=no`, dữ liệu mới sẽ được fetch từ API và sau đó được lưu vào cache để sử dụng cho lần sau.

3. **Timeframe không hợp lệ**: Nếu timeframe không nằm trong danh sách hợp lệ, ứng dụng sẽ sử dụng giá trị mặc định (15m).

4. **Limit tối thiểu**: Nếu limit < 100, ứng dụng sẽ báo lỗi và không load dữ liệu.

5. **Auto-load**: Khi có URL params hợp lệ, ứng dụng sẽ tự động load sau 500ms để đảm bảo tất cả components đã được khởi tạo.

## Sử Dụng Trong Iframe

Bạn có thể nhúng ứng dụng vào iframe với URL params:

```html
<iframe 
    src="https://your-domain.com/?symbol=BTCUSDT&timeframe=1h&limit=2000" 
    width="100%" 
    height="800px"
    frameborder="0">
</iframe>
```

## API Integration

Bạn có thể tạo link động từ backend:

```javascript
// Node.js example
const symbol = 'BTCUSDT';
const timeframe = '1h';
const limit = 5000;
const useCache = 'no';

const url = `https://your-domain.com/?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}&usecache=${useCache}`;

// Redirect hoặc trả về link
res.redirect(url);
```

```python
# Python example
symbol = 'BTCUSDT'
timeframe = '1h'
limit = 5000
use_cache = 'no'

url = f"https://your-domain.com/?symbol={symbol}&timeframe={timeframe}&limit={limit}&usecache={use_cache}"

# Redirect hoặc trả về link
return redirect(url)
```

## Troubleshooting

### Không tự động load
- Kiểm tra console log để xem có lỗi gì không
- Đảm bảo tham số `symbol` được viết đúng
- Kiểm tra network tab để xem API call có thành công không

### Dữ liệu không đúng
- Thử thêm `usecache=no` để fetch dữ liệu mới
- Kiểm tra symbol có tồn tại trên Binance không
- Kiểm tra timeframe có hợp lệ không

### Lỗi CORS
- Đảm bảo ứng dụng được host trên domain hợp lệ
- Kiểm tra Binance API có bị chặn không
