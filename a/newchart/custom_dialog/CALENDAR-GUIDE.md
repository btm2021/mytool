# Trading Calendar - Hướng dẫn chi tiết

## Tổng quan

Trading Calendar là công cụ theo dõi và quản lý trades theo dạng lịch tháng, giúp bạn visualize performance và track trading journal.

## Tính năng chính

### 1. 📅 Calendar View
- Hiển thị lịch tháng với tất cả trades
- Mỗi ngày hiển thị:
  - PNL tổng của ngày (màu xanh/đỏ)
  - Số lượng trades
- Click vào ngày để xem chi tiết trades
- Highlight ngày hôm nay

### 2. 📝 Trade Form
- Nhập thông tin trade:
  - Date (ngày trade)
  - Symbol (BTCUSDT, ETHUSDT, etc.)
  - Entry Price (giá vào)
  - Exit Price (giá ra)
  - Leverage (đòn bẩy)
  - PNL (lãi/lỗ)
  - Notes (ghi chú)
- Lưu vào localStorage
- Clear form sau khi save

### 3. 📊 Statistics
- Total PNL (tổng lãi/lỗ tháng)
- Total Trades (tổng số trades)
- Win Rate (tỷ lệ thắng)
- W/L (số trades thắng/thua)

### 4. 💾 Data Storage
- Lưu trữ trong localStorage
- Không mất data khi refresh
- Export/Import (future feature)

## Giao diện

```
┌─────────────────────────────────────────────────────────────────┐
│ Trading Calendar                                         [X]     │
├─────────────────────────────────────────────────────────────────┤
│ [◀] January 2025 [▶] [Today]  │ PNL: +$1,234 │ Trades: 45 │ ... │
├─────────────────────────────────────────────────────────────────┤
│ Calendar View                  │ Add Trade Form                  │
│ ┌─────────────────────────────┐│ ┌─────────────────────────────┐│
│ │ Sun Mon Tue Wed Thu Fri Sat ││ │ Date: [2025-01-15]          ││
│ │                             ││ │ Symbol: [BTCUSDT]           ││
│ │  1   2   3   4   5   6   7  ││ │ Entry: [50000]              ││
│ │ +$50 +$30 -$20 +$100 ...    ││ │ Exit: [51000]               ││
│ │  8   9  10  11  12  13  14  ││ │ Leverage: [10x]             ││
│ │ ...                         ││ │ PNL: [+100]                 ││
│ └─────────────────────────────┘│ │ Notes: [...]                ││
│                                 │ │ [Save] [Clear]              ││
│                                 │ └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Cách sử dụng

### Thêm Trade mới

1. Click nút **"Tool"** → Chọn **"Trading Calendar"**
2. Điền form bên phải:
   - **Date**: Chọn ngày trade
   - **Symbol**: Nhập symbol (VD: BTCUSDT)
   - **Entry Price**: Giá vào lệnh
   - **Exit Price**: Giá thoát lệnh
   - **Leverage**: Chọn đòn bẩy
   - **PNL**: Nhập lãi/lỗ (số dương = lãi, số âm = lỗ)
   - **Notes**: Ghi chú về trade (optional)
3. Click **"Save Trade"**
4. Trade sẽ xuất hiện trên calendar

### Xem Trades của một ngày

1. Click vào ngày trên calendar
2. Popup hiển thị tất cả trades của ngày đó
3. Xem chi tiết:
   - Symbol
   - Entry/Exit prices
   - Leverage
   - PNL
   - Notes
4. Click **"Delete"** để xóa trade

### Điều hướng Calendar

- **◀ / ▶**: Chuyển tháng trước/sau
- **Today**: Quay về tháng hiện tại
- **Click ngày**: Chọn ngày để add trade

### Xóa Trade

1. Click vào ngày có trade
2. Trong popup, click nút **"Delete"** ở trade muốn xóa
3. Confirm xóa
4. Trade sẽ bị xóa khỏi calendar

## Data Format

### Trade Object
```javascript
{
    id: 1234567890,           // Timestamp
    date: "2025-01-15",       // YYYY-MM-DD
    symbol: "BTCUSDT",        // Symbol name
    entry: "50000",           // Entry price
    exit: "51000",            // Exit price
    leverage: "10",           // Leverage
    pnl: "100",               // PNL in USD
    notes: "Good trade"       // Notes
}
```

### LocalStorage Key
```
trading_calendar_trades
```

### Example Data
```javascript
[
    {
        "id": 1705334400000,
        "date": "2025-01-15",
        "symbol": "BTCUSDT",
        "entry": "50000",
        "exit": "51000",
        "leverage": "10",
        "pnl": "100",
        "notes": "Breakout trade"
    },
    {
        "id": 1705334500000,
        "date": "2025-01-15",
        "symbol": "ETHUSDT",
        "entry": "3000",
        "exit": "2950",
        "leverage": "5",
        "pnl": "-50",
        "notes": "Stop loss hit"
    }
]
```

## Statistics Calculation

### Total PNL
```javascript
totalPnl = trades.reduce((sum, trade) => sum + parseFloat(trade.pnl), 0)
```

### Win Rate
```javascript
winTrades = trades.filter(t => parseFloat(t.pnl) > 0).length
winRate = (winTrades / totalTrades) * 100
```

### W/L Ratio
```javascript
wins = trades.filter(t => parseFloat(t.pnl) > 0).length
losses = trades.filter(t => parseFloat(t.pnl) < 0).length
```

## Use Cases

### 1. Daily Trading Journal

**Workflow**:
1. Sau mỗi trade, mở Calendar
2. Nhập thông tin trade
3. Thêm notes về setup, emotion, mistakes
4. Review cuối ngày

**Benefits**:
- Track tất cả trades
- Identify patterns
- Learn from mistakes

### 2. Monthly Performance Review

**Workflow**:
1. Cuối tháng, mở Calendar
2. Xem statistics header
3. Review từng ngày có trades
4. Analyze win/loss days

**Benefits**:
- See big picture
- Calculate monthly ROI
- Set goals cho tháng sau

### 3. Strategy Testing

**Workflow**:
1. Test strategy trong 1 tháng
2. Record tất cả trades
3. Analyze win rate, PNL
4. Decide keep or discard strategy

**Benefits**:
- Data-driven decisions
- Objective evaluation
- Track multiple strategies

### 4. Risk Management

**Workflow**:
1. Set daily loss limit
2. Track PNL mỗi ngày
3. Stop trading khi hit limit
4. Review risk management rules

**Benefits**:
- Prevent big losses
- Discipline
- Consistent risk

## Tips & Best Practices

### 1. Nhập Trade ngay sau khi close

✅ **Do**:
- Nhập ngay khi close trade
- Thông tin còn fresh
- Không quên details

❌ **Don't**:
- Đợi cuối ngày
- Nhập nhiều trades cùng lúc
- Skip notes

### 2. Ghi chú chi tiết

**Good Notes**:
```
Setup: Bull flag breakout
Entry: Waited for retest
Exit: Target hit at resistance
Emotion: Calm, followed plan
Mistake: Entry too early, should wait for confirmation
```

**Bad Notes**:
```
Good trade
```

### 3. Review thường xuyên

- **Daily**: Review trades của ngày
- **Weekly**: Review tuần, tính win rate
- **Monthly**: Big picture review

### 4. Honest tracking

- Record cả wins và losses
- Không skip bad trades
- Accurate PNL numbers
- Honest notes về mistakes

## Advanced Features (Future)

### Planned Features

1. **Charts & Analytics**
   - PNL chart theo thời gian
   - Win rate chart
   - Drawdown chart
   - Equity curve

2. **Filters & Search**
   - Filter by symbol
   - Filter by PNL range
   - Search trades
   - Date range filter

3. **Export/Import**
   - Export to CSV
   - Export to Excel
   - Import from CSV
   - Backup/Restore

4. **Tags & Categories**
   - Tag trades (scalp, swing, etc.)
   - Category by strategy
   - Filter by tags
   - Performance by category

5. **Goals & Targets**
   - Set monthly PNL target
   - Track progress
   - Alerts when close to target
   - Celebrate achievements

## Troubleshooting

### Data không lưu

**Nguyên nhân**: localStorage bị disable hoặc full

**Giải pháp**:
1. Check browser settings
2. Enable localStorage
3. Clear old data
4. Try incognito mode

### Calendar không hiển thị trades

**Nguyên nhân**: Date format không đúng

**Giải pháp**:
1. Check date format: YYYY-MM-DD
2. Inspect localStorage data
3. Clear và nhập lại
4. Check console errors

### PNL calculation sai

**Nguyên nhân**: Nhập sai số

**Giải pháp**:
1. Double check entry/exit prices
2. Verify PNL calculation
3. Use PNL Calculator tool
4. Update trade với số đúng

## Keyboard Shortcuts

- **ESC**: Close calendar
- **Left/Right Arrow**: Previous/Next month (future)
- **T**: Go to Today (future)
- **N**: New trade (future)

## Mobile Support

- Responsive design
- Touch-friendly
- Swipe to change month (future)
- Mobile-optimized form

## Data Privacy

- **Local Storage**: Data chỉ lưu trên browser
- **No Server**: Không gửi data lên server
- **Private**: Chỉ bạn thấy được
- **Backup**: Nên backup định kỳ (export feature coming)

## FAQ

**Q: Data có mất khi clear browser cache không?**
A: Có, localStorage sẽ bị xóa. Nên export backup trước khi clear cache.

**Q: Có thể sync giữa nhiều devices không?**
A: Hiện tại không. Data chỉ lưu local. Cloud sync sẽ có trong future.

**Q: Có giới hạn số lượng trades không?**
A: Không có hard limit, nhưng localStorage có limit ~5-10MB tùy browser.

**Q: Có thể edit trade đã save không?**
A: Hiện tại chỉ có thể delete và add lại. Edit feature coming soon.

**Q: PNL có tự động calculate không?**
A: Không, bạn phải nhập manual. Auto-calculate sẽ có trong future.

## Changelog

### Version 1.0.0
- Initial release
- Calendar view
- Add/Delete trades
- Monthly statistics
- localStorage storage
- Responsive design
