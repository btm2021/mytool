# Hướng dẫn Deploy lên Koyeb

## Bước 1: Chuẩn bị

1. Tạo tài khoản tại https://koyeb.com
2. Push code lên GitHub repository

## Bước 2: Deploy trên Koyeb

### Cách 1: Deploy từ GitHub (Khuyến nghị)

1. Đăng nhập vào Koyeb
2. Click "Create App"
3. Chọn "GitHub" làm deployment method
4. Connect GitHub account và chọn repository
5. Cấu hình:
   - **Branch**: main (hoặc branch của bạn)
   - **Build command**: `npm install`
   - **Run command**: `npm start`
   - **Port**: `3000`
   - **Instance type**: Free (hoặc chọn theo nhu cầu)
6. Click "Deploy"

### Cách 2: Deploy từ Docker

1. Build Docker image:
```bash
docker build -t tradingview-chart-server .
```

2. Push lên Docker Hub hoặc GitHub Container Registry

3. Trên Koyeb, chọn "Docker" và nhập image URL

## Bước 3: Lấy URL

Sau khi deploy thành công, Koyeb sẽ cung cấp URL dạng:
```
https://your-app-name.koyeb.app
```

## Bước 4: Cập nhật Frontend

Mở file `app.js` và thay đổi:

```javascript
const CHART_SERVER_URL = 'https://your-app-name.koyeb.app';
```

## Bước 5: Test

1. Mở browser console
2. Thử save một chart layout
3. Reload trang và kiểm tra xem layout có được load lại không

---

# Deploy lên Railway

1. Đăng nhập https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Chọn repository
4. Railway tự động detect và deploy
5. Lấy URL từ Settings → Domains

---

# Deploy lên Render

1. Đăng nhập https://render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Cấu hình:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Port**: `3000`
5. Click "Create Web Service"

---

# Deploy lên Fly.io

1. Cài đặt Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login:
```bash
fly auth login
```

3. Deploy:
```bash
fly launch
```

4. Lấy URL:
```bash
fly status
```

---

# Lưu ý quan trọng

## CORS
Server đã được cấu hình CORS cho phép tất cả origins. Nếu muốn giới hạn, sửa trong `server.js`:

```javascript
app.use(cors({
  origin: 'https://your-frontend-domain.com'
}));
```

## Database Persistence

Trên các PaaS, SQLite database có thể bị xóa khi restart. Để giữ data:

### Koyeb
- Sử dụng Koyeb Volumes (Persistent Storage)
- Hoặc chuyển sang PostgreSQL

### Railway
- Railway tự động persist filesystem
- Hoặc dùng Railway PostgreSQL

### Render
- Sử dụng Render Disks
- Hoặc chuyển sang PostgreSQL

## Chuyển sang PostgreSQL (Production)

Nếu cần database ổn định hơn, cài thêm:

```bash
npm install pg
```

Và sửa code trong `server.js` để dùng PostgreSQL thay vì SQLite.

---

# Troubleshooting

## Lỗi CORS
- Kiểm tra server URL trong `app.js`
- Đảm bảo server đang chạy và accessible

## Database không lưu
- Kiểm tra logs: `fly logs` hoặc trên dashboard
- Xem phần Database Persistence ở trên

## Port issues
- Đảm bảo server listen trên `process.env.PORT`
- Code đã được cấu hình đúng: `const PORT = process.env.PORT || 3000`
