# Test Auto-Save

## Checklist để test tính năng auto-save

### 1. Setup
- [ ] Đã chạy SQL trong Supabase
- [ ] Đã config SUPABASE_URL và SUPABASE_ANON_KEY
- [ ] App đã mở và chart đã load

### 2. Test Auto-Save với Drawings

#### Test 1: Vẽ Line
1. Click vào drawing tool "Trend Line"
2. Vẽ 1 đường trên chart
3. Mở Console (F12)
4. Chờ 2 giây
5. Kiểm tra log: "Performing auto-save..." và "Auto-saved successfully"

#### Test 2: Xóa Drawing
1. Click vào drawing vừa vẽ
2. Nhấn Delete hoặc click Remove
3. Chờ 2 giây
4. Kiểm tra log auto-save

#### Test 3: Vẽ nhiều drawings
1. Vẽ 3-4 drawings khác nhau (line, rectangle, fibonacci)
2. Chờ 2 giây sau drawing cuối cùng
3. Kiểm tra log auto-save

### 3. Test Auto-Save với Indicators

#### Test 4: Thêm Indicator
1. Click "Indicators" button
2. Tìm và thêm "RSI"
3. Chờ 2 giây
4. Kiểm tra log auto-save

#### Test 5: Xóa Indicator
1. Click vào indicator name trên chart
2. Click Remove
3. Chờ 2 giây
4. Kiểm tra log auto-save

#### Test 6: Thay đổi Indicator Settings
1. Click vào indicator name
2. Click Settings (⚙️)
3. Thay đổi parameters
4. Click OK
5. Chờ 2 giây
6. Kiểm tra log auto-save

### 4. Test Auto-Load

#### Test 7: Reload Page
1. Vẽ 2-3 drawings và thêm 1 indicator
2. Chờ auto-save (2 giây)
3. Reload page (F5)
4. Kiểm tra:
   - [ ] Drawings đã được restore
   - [ ] Indicators đã được restore
   - [ ] Console log: "Auto-loaded layout"

#### Test 8: Close và Open lại Browser
1. Vẽ drawings mới
2. Chờ auto-save
3. Close browser hoàn toàn
4. Open lại app
5. Kiểm tra tất cả đã được restore

### 5. Test Manual Save/Load

#### Test 9: Save thủ công không ảnh hưởng auto-save
1. Vẽ drawings
2. Click Save button → Đặt tên "Test Layout"
3. Vẽ thêm drawings mới
4. Chờ auto-save
5. Reload page
6. Kiểm tra: Drawings mới nhất được load (từ autosave)

#### Test 10: Load layout thủ công
1. Click Load button
2. Chọn "Test Layout" (không phải __autosave__)
3. Kiểm tra layout được load đúng
4. Vẽ thêm drawings
5. Chờ auto-save
6. Reload → Kiểm tra drawings mới được load

### 6. Test Commands

#### Test 11: Manual trigger auto-save
```javascript
// Trong console
autoSave.saveNow();
// Kiểm tra log "Auto-saved successfully"
```

#### Test 12: Manual load latest
```javascript
// Trong console
autoSave.loadLatest();
// Kiểm tra chart được reload
```

#### Test 13: Get info
```javascript
// Trong console
autoSave.getInfo();
// Kiểm tra output có currentChartId
```

#### Test 14: List all charts
```javascript
// Trong console
const charts = await saveLoadAdapter.getAllCharts();
console.log(charts);
// Kiểm tra có layout __autosave__
```

### 7. Test Edge Cases

#### Test 15: Nhiều thay đổi nhanh
1. Vẽ 5 drawings liên tục (không chờ)
2. Chờ 2 giây
3. Kiểm tra chỉ save 1 lần (debounce hoạt động)

#### Test 16: Thay đổi symbol
1. Vẽ drawings
2. Chờ auto-save
3. Đổi symbol: `changeSymbol('ETHUSDT')`
4. Vẽ drawings mới
5. Chờ auto-save
6. Reload
7. Kiểm tra: Symbol và drawings được restore

#### Test 17: Không có layout autosave
1. Vào Supabase → Table Editor
2. Xóa row có name = "__autosave__"
3. Reload app
4. Kiểm tra: App vẫn hoạt động bình thường
5. Vẽ drawings → Auto-save tạo layout mới

### 8. Performance Test

#### Test 18: Nhiều drawings
1. Vẽ 20-30 drawings
2. Chờ auto-save
3. Reload
4. Kiểm tra: Tất cả được restore nhanh chóng

#### Test 19: Nhiều indicators
1. Thêm 5-10 indicators
2. Chờ auto-save
3. Reload
4. Kiểm tra: Tất cả được restore

### Expected Results

✅ **Auto-save**
- Trigger sau mỗi thay đổi (drawings/indicators)
- Debounce 2 giây
- Log "Auto-saved successfully" trong console

✅ **Auto-load**
- Tự động load khi mở app
- Restore tất cả drawings và indicators
- Log "Auto-loaded layout" trong console

✅ **Manual save/load**
- Không ảnh hưởng auto-save
- Có thể save nhiều layouts khác nhau
- Auto-save vẫn hoạt động độc lập

✅ **Performance**
- Không lag khi vẽ
- Load nhanh khi reload
- Debounce tránh save quá nhiều

### Troubleshooting

**Không thấy log auto-save**
```javascript
// Check widget và adapter
console.log(tvWidget);
console.log(saveLoadAdapter);

// Check subscriptions
console.log('Subscriptions setup');
```

**Auto-load không hoạt động**
```javascript
// Check có layout không
const charts = await saveLoadAdapter.getAllCharts();
console.log(charts.find(c => c.name === '__autosave__'));
```

**Lỗi khi save**
```javascript
// Check Supabase connection
console.log(saveLoadAdapter.supabase);

// Manual test save
autoSave.saveNow();
```
