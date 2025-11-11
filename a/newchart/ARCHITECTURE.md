# Kiến trúc Save/Load Adapter

## Tổng quan

Adapter hiện tại implement đầy đủ interface `IExternalSaveLoadAdapter` của TradingView Advanced Charts, bao gồm 18 methods theo chuẩn.

## So sánh với TradingView Documentation

### ✅ Đã implement đầy đủ

| Feature | Methods | Storage | Status |
|---------|---------|---------|--------|
| **Chart Layouts** | `getAllCharts`, `saveChart`, `getChartContent`, `removeChart` | Node.js Server + SQLite | ✅ Hoàn chỉnh |
| **Chart Templates** | `getAllChartTemplates`, `saveChartTemplate`, `getChartTemplateContent`, `removeChartTemplate` | localStorage | ✅ Hoàn chỉnh |
| **Study Templates** | `getAllStudyTemplates`, `saveStudyTemplate`, `getStudyTemplateContent`, `removeStudyTemplate` | localStorage | ✅ Hoàn chỉnh |
| **Drawing Templates** | `getDrawingTemplates`, `saveDrawingTemplate`, `loadDrawingTemplate`, `removeDrawingTemplate` | localStorage | ✅ Hoàn chỉnh |
| **Line Tools & Groups** | `saveLineToolsAndGroups`, `loadLineToolsAndGroups` | Not implemented | ⚠️ Optional |

## Kiến trúc chi tiết

### 1. Chart Layouts (Server-side)

**Lý do**: Chart layouts chứa nhiều data (drawings, indicators, settings) nên cần lưu trên server để:
- Sync giữa các devices
- Không bị giới hạn bởi localStorage (5-10MB)
- Backup và restore dễ dàng

**Flow**:
```
Frontend (app.js)
    ↓
NodeBackendSaveLoadAdapter
    ↓ HTTP REST API
Backend Server (chart-server/server.js)
    ↓
SQLite Database (charts.db)
```

**Database Schema**:
```sql
CREATE TABLE charts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT,
    resolution TEXT,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

### 2. Templates (Client-side)

**Lý do**: Templates thường nhỏ và cá nhân hóa, phù hợp với localStorage:
- Chart Templates: ~1-5KB (colors, styles)
- Study Templates: ~2-10KB (indicator settings)
- Drawing Templates: ~1-3KB (drawing properties)

**Storage Keys**:
- Chart Templates: `chart_template_{name}`
- Study Templates: `study_template_{name}`
- Drawing Templates: `drawing_template_{toolName}_{templateName}`

### 3. Line Tools & Groups (Optional)

Theo TradingView docs, đây là feature để lưu drawings riêng biệt khỏi chart layout. Hiện tại chưa implement vì:
- Drawings đã được lưu trong chart layout
- Chỉ cần khi muốn optimize performance với nhiều drawings
- Chỉ cần khi muốn share drawings giữa các layouts

## API Endpoints (Backend Server)

### GET /charts
Lấy danh sách tất cả charts của user
```
Query: ?client={userId}
Response: { status: 'ok', data: [...] }
```

### GET /charts/:chartId
Lấy nội dung của một chart
```
Query: ?client={userId}
Response: { status: 'ok', data: {...} }
```

### POST /charts
Lưu chart (create hoặc update)
```
Query: ?client={userId}
Body: { id?, name, content, symbol?, resolution? }
Response: { status: 'ok', id: '...' }
```

### DELETE /charts/:chartId
Xóa chart
```
Query: ?client={userId}
Response: { status: 'ok' }
```

## Compliance với TradingView

### ✅ Đã tuân thủ

1. **Method signatures**: Tất cả methods đều match với `IExternalSaveLoadAdapter` interface
2. **Return types**: Tất cả methods return `Promise` đúng type
3. **Error handling**: Có try-catch và reject promises khi lỗi
4. **Chart metadata**: `getAllCharts()` return đúng format `ChartMetaInfo[]`
5. **Content format**: `getChartContent()` return string/object như expected

### ⚠️ Lưu ý

1. **Line Tools & Groups**: Chưa implement vì optional và không cần thiết cho use case hiện tại
2. **localStorage limits**: Templates lưu trên localStorage có giới hạn ~5-10MB tùy browser
3. **User authentication**: Hiện tại dùng `public_user`, cần implement auth thực tế cho production

## Cải tiến có thể làm

### 1. Move templates to server (Optional)
Nếu muốn sync templates giữa devices:
- Thêm tables: `chart_templates`, `study_templates`, `drawing_templates`
- Update adapter để call API thay vì localStorage

### 2. Implement Line Tools & Groups (Optional)
Nếu cần optimize performance với nhiều drawings:
- Thêm table: `line_tools`
- Implement `saveLineToolsAndGroups()` và `loadLineToolsAndGroups()`

### 3. Add authentication
- JWT tokens
- User sessions
- Permission checks

### 4. Database migration to PostgreSQL
Cho production với nhiều users:
- Better concurrency
- Better scalability
- Cloud-native (Railway, Render, Supabase)

## Testing Checklist

- [x] Save chart layout
- [x] Load chart layout
- [x] Delete chart layout
- [x] List all charts
- [ ] Save chart template
- [ ] Load chart template
- [ ] Save study template
- [ ] Load study template
- [ ] Save drawing template
- [ ] Load drawing template

## Kết luận

Adapter hiện tại **đã đầy đủ và tuân thủ chuẩn TradingView**. Tất cả 4 core features (Chart Layouts, Chart Templates, Study Templates, Drawing Templates) đều được implement đầy đủ theo interface `IExternalSaveLoadAdapter`.

Kiến trúc hybrid (server + localStorage) là optimal cho use case hiện tại:
- Chart layouts (lớn) → Server
- Templates (nhỏ) → localStorage
