# Supabase Save/Load - Đơn giản hóa

## Thay đổi chính

✅ **Không cần Authentication** - Tất cả dùng chung 1 user ID: `default-user`  
✅ **Không cần RLS** - Database public, ai cũng có thể truy cập  
✅ **Setup nhanh** - Chỉ 3 bước, không cần config auth  

## Cách hoạt động

1. Tất cả layouts được lưu với `user_id = 'default-user'`
2. Không có authentication - Mọi người đều xem và chỉnh sửa được
3. Đơn giản và nhanh - Phù hợp cho personal use hoặc demo

## Setup

### 1. Tạo Supabase Project
- Vào https://supabase.com
- Tạo project mới
- Copy URL và anon key

### 2. Chạy SQL
```sql
-- Copy từ supabase-schema.sql và run
CREATE TABLE IF NOT EXISTS chart_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'default-user',
    name TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chart_layouts_user_id ON chart_layouts(user_id);
CREATE INDEX idx_chart_layouts_updated_at ON chart_layouts(updated_at DESC);

ALTER TABLE chart_layouts DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chart_layouts_updated_at
    BEFORE UPDATE ON chart_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3. Cấu hình app.js
```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...';
```

### 4. Xong!
Mở app và dùng Save/Load buttons trên TradingView toolbar.

## Nâng cao

Nếu muốn nhiều users riêng biệt, thay đổi user ID:

```javascript
// Trong app.js
saveLoadAdapter = new SupabaseSaveLoadAdapter(
    SUPABASE_URL, 
    SUPABASE_ANON_KEY,
    'user-123'  // Thay đổi ID này
);
```

Mỗi user ID khác nhau sẽ có layouts riêng.

## Lưu ý

⚠️ **Bảo mật**: Database public, không phù hợp cho production với nhiều users  
✅ **Phù hợp**: Personal use, demo, prototype  
✅ **Đơn giản**: Không cần lo về authentication  

## Test

```javascript
// Trong browser console (F12)
await saveLoadAdapter.getAllCharts();
// => Xem tất cả layouts đã lưu

console.log(saveLoadAdapter.userId);
// => 'default-user'
```
