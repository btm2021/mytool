-- Xóa bảng cũ nếu có (để tránh conflict với UUID)
DROP TABLE IF EXISTS chart_layouts CASCADE;

-- Tạo bảng chart_layouts trong Supabase (Đơn giản - không cần auth)
CREATE TABLE chart_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'default-user',
    name TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo index để tăng tốc truy vấn
CREATE INDEX idx_chart_layouts_user_id ON chart_layouts(user_id);
CREATE INDEX idx_chart_layouts_updated_at ON chart_layouts(updated_at DESC);

-- TẮT Row Level Security để cho phép truy cập public
ALTER TABLE chart_layouts DISABLE ROW LEVEL SECURITY;

-- Tạo function để tự động update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger để tự động update updated_at khi có thay đổi
CREATE TRIGGER update_chart_layouts_updated_at
    BEFORE UPDATE ON chart_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
