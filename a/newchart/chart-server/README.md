# TradingView Chart Server

Backend server cho save/load TradingView charts với SQLite database.

## Cài đặt

```bash
npm install
```

## Chạy local

```bash
npm start
```

Server sẽ chạy ở `http://localhost:3000`

## Deploy lên Koyeb

1. Push code lên GitHub repository
2. Tạo app mới trên Koyeb
3. Chọn GitHub repository
4. Build command: `npm install`
5. Run command: `npm start`
6. Port: `3000`
7. Deploy!

## Deploy lên Railway

1. Push code lên GitHub
2. Tạo project mới trên Railway
3. Connect GitHub repository
4. Railway sẽ tự động detect và deploy

## Deploy lên Render

1. Push code lên GitHub
2. Tạo Web Service mới
3. Connect repository
4. Build command: `npm install`
5. Start command: `npm start`
6. Deploy!

## API Endpoints

### GET /charts
Lấy danh sách tất cả charts của user
- Query params: `client` hoặc `user` (user ID)

### GET /charts/:chartId
Lấy nội dung của một chart
- Query params: `client` hoặc `user` (user ID)

### POST /charts
Lưu chart (tạo mới hoặc update)
- Query params: `client` hoặc `user` (user ID)
- Body: `{ id?, name, content, symbol?, resolution? }`

### DELETE /charts/:chartId
Xóa chart
- Query params: `client` hoặc `user` (user ID)

## Environment Variables

- `PORT`: Port để chạy server (default: 3000)
- `DB_PATH`: Đường dẫn đến SQLite database file (default: charts.db)
