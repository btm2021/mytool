# Dashboard Tools

Giao diện dashboard đơn giản với phong cách paper để hiển thị các tool dưới dạng iframe.

## Tính năng

- ✨ Giao diện đơn giản, nhẹ nhàng với phong cách paper
- 🎯 Hiển thị các tool dưới dạng card
- 🖼️ Modal full màn hình khi click vào tool
- 📱 Responsive design
- ⌨️ Hỗ trợ phím tắt (ESC để đóng modal)
- 🎨 Animation mượt mà

## Cách sử dụng

1. Mở file `index.html` trong trình duyệt
2. Click vào bất kỳ tool card nào để mở trong modal full màn hình
3. Sử dụng nút X hoặc phím ESC để đóng modal

## Cấu hình Tools

Để thêm/sửa các tool, chỉnh sửa mảng `tools` trong file `script.js`:

```javascript
const tools = [
    {
        id: 'tool1',
        title: 'Tên Tool',
        description: 'Mô tả tool',
        icon: '📊', // Emoji icon
        url: 'https://your-tool-url.com'
    }
    // Thêm các tool khác...
];
```

## Cấu trúc file

```
├── index.html      # File HTML chính
├── styles.css      # CSS styling
├── script.js       # JavaScript logic
└── README.md       # Tài liệu hướng dẫn
```

## Tùy chỉnh

- **Màu sắc**: Chỉnh sửa các biến CSS trong `styles.css`
- **Layout**: Thay đổi grid layout trong `.tools-grid`
- **Animation**: Tùy chỉnh các keyframes và transition
- **Icons**: Sử dụng emoji hoặc thay bằng icon fonts

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+