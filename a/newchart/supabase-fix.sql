-- Script để sửa lỗi UUID -> TEXT cho user_id
-- Chạy script này trong Supabase SQL Editor

-- Bước 1: Xóa bảng cũ (nếu có)
DROP TABLE IF EXISTS chart_layouts CASCADE;

-- Bước 2: Tạo lại bảng với user_id là TEXT
CREATE TABLE chart_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'default-user',
    name TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bước 3: Tạo indexes
CREATE INDEX idx_chart_layouts_user_id ON chart_layouts(user_id);
CREATE INDEX idx_chart_layouts_updated_at ON chart_layouts(updated_at DESC);

-- Bước 4: TẮT Row Level Security
ALTER TABLE chart_layouts DISABLE ROW LEVEL SECURITY;

-- Bước 5: Tạo function auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bước 6: Tạo trigger
CREATE TRIGGER update_chart_layouts_updated_at
    BEFORE UPDATE ON chart_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Xong! Bảng đã sẵn sàng sử dụng
