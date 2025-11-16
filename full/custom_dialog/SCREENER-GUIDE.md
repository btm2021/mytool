# Market Screener - Hướng dẫn chi tiết

## Tổng quan

Market Screener là công cụ xem tổng quan thị trường Binance Futures, hiển thị tất cả symbols đang giao dịch với dữ liệu realtime.

## Giao diện

### 1. Header Statistics

```
┌─────────────────────────────────────────────────────────────┐
│ Total Symbols: 200  │  24h Volume: 45.2B  │  Gainers: 120  │
│                     │                      │  Losers: 80    │
│                                            [Refresh Button]  │
└─────────────────────────────────────────────────────────────┘
```

**Thống kê realtime**:
- **Total Symbols**: Tổng số symbols đang giao dịch
- **24h Volume**: Tổng khối lượng giao dịch toàn thị trường (USDT)
- **Gainers**: Số lượng coins tăng giá trong 24h
- **Losers**: Số lượng coins giảm giá trong 24h

### 2. Table View

```
┌──────────┬─────────┬─────────┬────────────┬──────────────┬─────────┬─────────┬─────────┐
│ Symbol ▼ │ Price   │ 24h %   │ 24h Change │ Volume (USDT)│ High    │ Low     │ Trades  │
├──────────┼─────────┼─────────┼────────────┼──────────────┼─────────┼─────────┼─────────┤
│ BTC/USDT │ 50000.00│ +2.45%  │ +1200.00   │ 15.2B        │ 51000.00│ 49000.00│ 1,234,567│
│ ETH/USDT │ 3000.00 │ +1.85%  │ +55.00     │ 8.5B         │ 3100.00 │ 2950.00 │ 987,654 │
│ BNB/USDT │ 450.00  │ -0.50%  │ -2.25      │ 2.1B         │ 455.00  │ 445.00  │ 456,789 │
└──────────┴─────────┴─────────┴────────────┴──────────────┴─────────┴─────────┴─────────┘
```

## Tính năng

### 1. Sorting (Sắp xếp)

Click vào bất kỳ column header nào để sắp xếp:

- **Symbol**: Sắp xếp theo tên (A-Z hoặc Z-A)
- **Price**: Sắp xếp theo giá (cao → thấp hoặc thấp → cao)
- **24h %**: Sắp xếp theo % thay đổi (tăng nhiều nhất hoặc giảm nhiều nhất)
- **Volume**: Sắp xếp theo khối lượng giao dịch (mặc định)
- **High/Low**: Sắp xếp theo giá cao/thấp nhất
- **Trades**: Sắp xếp theo số lượng giao dịch

**Indicator**: Mũi tên ▲ (tăng dần) hoặc ▼ (giảm dần) hiển thị bên cạnh column đang sort.

### 2. Quick Symbol Change

Click vào bất kỳ row nào trong table để:
- Tự động chuyển symbol trên chart chính
- Đóng Screener dialog
- Bắt đầu xem chart của symbol đó

**Ví dụ**: Click vào row "ETH/USDT" → Chart chuyển sang BINANCE:ETHUSDT

### 3. Refresh Data

Click nút **Refresh** để:
- Tải lại dữ liệu mới nhất từ Binance API
- Cập nhật tất cả giá và volume
- Refresh statistics header

**Auto-refresh**: Không có auto-refresh để tiết kiệm API calls. Bạn cần click Refresh thủ công.

### 4. Color Coding

**Màu xanh (Positive)**: 
- 24h % > 0
- 24h Change > 0
- Coins đang tăng giá

**Màu đỏ (Negative)**:
- 24h % < 0
- 24h Change < 0
- Coins đang giảm giá

**Màu trắng (Neutral)**:
- Các thông tin khác (Price, Volume, High, Low, Trades)

## Data Source

### API Endpoint
```
https://fapi.binance.com/fapi/v1/ticker/24hr
```

### Data Fields

| Field | Description | Format |
|-------|-------------|--------|
| symbol | Tên symbol | String (e.g., "BTCUSDT") |
| lastPrice | Giá hiện tại | Number (8 decimals) |
| priceChange | Thay đổi giá 24h | Number |
| priceChangePercent | % thay đổi 24h | Number (2 decimals) |
| quoteVolume | Volume 24h (USDT) | Number |
| highPrice | Giá cao nhất 24h | Number |
| lowPrice | Giá thấp nhất 24h | Number |
| count | Số lượng trades 24h | Integer |

### Filtering

Chỉ hiển thị symbols:
- Kết thúc bằng "USDT" (USDT pairs)
- Status = "TRADING" (đang giao dịch)

## Use Cases

### 1. Tìm coins có volume cao

1. Mở Screener
2. Click vào header "Volume (USDT)"
3. Xem top coins có volume cao nhất
4. Click vào coin để xem chart

**Tại sao**: Volume cao = thanh khoản tốt, dễ vào/ra lệnh

### 2. Tìm coins tăng/giảm mạnh nhất

1. Mở Screener
2. Click vào header "24h %"
3. Xem coins tăng/giảm nhiều nhất
4. Phân tích cơ hội trading

**Tại sao**: Momentum trading, catch trends

### 3. So sánh giá High/Low

1. Mở Screener
2. Xem cột High và Low
3. Tính range: (High - Low) / Low * 100%
4. Tìm coins có volatility cao

**Tại sao**: Volatility cao = cơ hội profit lớn (nhưng risk cao)

### 4. Theo dõi thị trường tổng quan

1. Mở Screener
2. Xem statistics header
3. Nếu Gainers > Losers → Thị trường bullish
4. Nếu Losers > Gainers → Thị trường bearish

**Tại sao**: Market sentiment analysis

## Tips & Tricks

### 1. Keyboard Shortcuts

- **ESC**: Đóng Screener
- **Click row**: Chuyển symbol
- **Scroll**: Xem thêm symbols

### 2. Performance

- Table hiển thị tất cả symbols (~200 coins)
- Smooth scrolling với virtual scrolling
- Lightweight rendering

### 3. Mobile Responsive

- Table tự động adjust trên mobile
- Horizontal scroll nếu cần
- Touch-friendly rows

### 4. Best Practices

**Refresh frequency**:
- Mỗi 1-2 phút cho day trading
- Mỗi 5-10 phút cho swing trading
- Mỗi 30 phút cho position trading

**Sorting strategy**:
- Volume → Tìm coins có thanh khoản
- 24h % → Tìm momentum
- Trades → Tìm coins hot (nhiều người trade)

## Troubleshooting

### Table không load

**Nguyên nhân**: API error hoặc network issue

**Giải pháp**:
1. Check internet connection
2. Click Refresh
3. Check console errors
4. Binance API có thể bị rate limit

### Giá không update

**Nguyên nhân**: Không có auto-refresh

**Giải pháp**:
- Click nút Refresh để update thủ công
- Screener không có WebSocket realtime để tiết kiệm resources

### Click row không chuyển symbol

**Nguyên nhân**: tvWidget chưa ready

**Giải pháp**:
- Đợi chart load xong
- Thử click lại
- Check console errors

## Advanced Features (Future)

### Planned Features

1. **Filters**:
   - Filter by price range
   - Filter by volume range
   - Filter by % change

2. **Search**:
   - Search by symbol name
   - Quick jump to symbol

3. **Favorites**:
   - Mark favorite symbols
   - Quick access list

4. **Alerts**:
   - Price alerts
   - Volume alerts
   - % change alerts

5. **Export**:
   - Export to CSV
   - Export to Excel
   - Copy to clipboard

## Technical Details

### Performance Optimization

```javascript
// Efficient rendering
- Virtual scrolling for large datasets
- Debounced sorting
- Cached calculations

// Memory management
- Clean up on close
- No memory leaks
- Efficient DOM updates
```

### Code Structure

```javascript
class ScreenerDialog extends DialogBase {
    // Data management
    loadData()      // Fetch from API
    sortTable()     // Sort logic
    renderTable()   // Render rows
    
    // UI updates
    updateStats()   // Update header
    updateSortIndicators()  // Update arrows
    
    // Formatting
    formatPrice()   // Format price display
    formatVolume()  // Format volume (K, M, B)
    formatNumber()  // Format with commas
}
```

## FAQ

**Q: Tại sao không có auto-refresh?**
A: Để tiết kiệm API calls và tránh rate limit từ Binance. Bạn có thể click Refresh khi cần.

**Q: Có thể thêm filter không?**
A: Hiện tại chưa có, nhưng đã trong roadmap. Bạn có thể sort để tìm coins phù hợp.

**Q: Tại sao chỉ có USDT pairs?**
A: USDT pairs là phổ biến nhất và có thanh khoản tốt nhất trên Binance Futures.

**Q: Có thể xem perpetual và quarterly futures không?**
A: Hiện tại chỉ perpetual (USDT pairs). Quarterly futures sẽ được thêm sau.

**Q: Data có realtime không?**
A: Data từ API 24hr ticker, update mỗi khi bạn click Refresh. Không phải tick-by-tick realtime.

## Changelog

### Version 1.0.0
- Initial release
- Basic table view
- Sorting functionality
- Quick symbol change
- Statistics header
- Responsive design
