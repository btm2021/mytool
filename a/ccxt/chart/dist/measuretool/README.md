# 📏 Price Measure Tool - Lightweight Charts Plugin

Plugin đo giá chuyên nghiệp cho Lightweight Charts với khả năng vẽ tự do, hiển thị duration và xóa trực tiếp.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Lightweight Charts](https://img.shields.io/badge/lightweight--charts-v5.0.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## ✨ Tính năng nổi bật

- 🖊️ **Vẽ tự do**: Click 2 lần bất kỳ đâu trên chart, không bị snap vào giá
- ⏱️ **Duration thông minh**: Tự động tính và format thời gian (giây, phút, giờ, ngày)
- 🗑️ **Xóa trực tiếp**: Nút ❌ đỏ hiển thị ngay trong rectangle
- 📐 **Text căn giữa**: Info box hiển thị ở chính giữa với text căn giữa
- 💰 **Tính PNL**: Tự động tính lợi nhuận với leverage và position size
- 🎨 **Tùy chỉnh đầy đủ**: Màu sắc, font, size, opacity...
- 🔄 **Interactive**: Preview real-time khi vẽ

## 📦 Cài đặt

```bash
npm install
```

## 🚀 Chạy Demo

```bash
npm run dev
```

Mở trình duyệt và truy cập:

- **Simple Draw** (Khuyến nghị): `http://localhost:5173/src/example/simple-draw.html`
- **Interactive Full**: `http://localhost:5173/src/example/price-measure-interactive.html`
- **Basic Example**: `http://localhost:5173/src/example/price-measure.html`

## 🔧 Build Plugin

```bash
npm run compile
```

Output trong thư mục `dist/`:
- `lwc-plugin-ruletool.js` - ES Module
- `lwc-plugin-ruletool.umd.cjs` - UMD Module
- `lwc-plugin-ruletool.d.ts` - TypeScript definitions
- `README.md` - Hướng dẫn sử dụng

## 💻 Sử dụng

### 1. Import Plugin

```javascript
import { createChart } from 'lightweight-charts';
import { PriceMeasureTool, DrawingManager } from './dist/lwc-plugin-ruletool.js';
```

### 2. Tạo Tool Thủ Công

```javascript
const chart = createChart(document.getElementById('chart'));
const series = chart.addLineSeries();

const measureTool = new PriceMeasureTool(
  { time: '2023-01-01', price: 100 },  // Điểm bắt đầu
  { time: '2023-01-10', price: 150 },  // Điểm kết thúc
  {
    fillColor: 'rgba(41, 98, 255, 0.15)',
    borderColor: 'rgba(41, 98, 255, 1)',
    borderWidth: 2,
    leverage: 200,
    positionSize: 20,
    showDeleteButton: true,
    onDelete: () => {
      series.detachPrimitive(measureTool);
    }
  }
);

series.attachPrimitive(measureTool);
```

### 3. Vẽ Bằng Chuột (Interactive)

```javascript
const drawingManager = new DrawingManager(
  series,
  {
    leverage: 200,
    positionSize: 20,
    showDeleteButton: true,
  },
  {
    onToolAdded: (toolData) => console.log('Tool added:', toolData),
    onToolRemoved: (id) => console.log('Tool removed:', id),
  }
);

// Bắt đầu vẽ
drawingManager.startDrawing();

// Subscribe events
chart.subscribeClick((param) => {
  drawingManager.handleClick(param);
});

chart.subscribeCrosshairMove((param) => {
  drawingManager.handleMouseMove(param);
});

// Dừng vẽ
drawingManager.stopDrawing();

// Xóa tool
drawingManager.removeTool(toolId);

// Xóa tất cả
drawingManager.removeAllTools();
```

## 📊 Thông Tin Hiển Thị

Info box hiển thị **ở chính giữa rectangle** với **text căn giữa**:

```
┌─────────────────────────────┐
│     Duration: 1h 15m        │
│  Price Change: 50.00        │
│    Change %: 50.00%         │
│     Start: 100.00           │
│      End: 150.00            │
│ PNL (200x20): $200.00   ❌  │
└─────────────────────────────┘
```

### Duration Format

- `30s` - dưới 1 phút
- `45m` - dưới 1 giờ  
- `1h 15m` - giờ + phút
- `34h 5m` - nhiều giờ
- `2d 5h` - ngày + giờ
- `7d` - chỉ ngày

### PNL Formula

```
PNL = Leverage × Position Size × (Price Change % / 100)
```

**Ví dụ:**
- Start: 100, End: 110 → Change: 10%
- Leverage: 200x, Position: 20 USDT
- **PNL = 200 × 20 × 0.1 = $400**

## 🎨 Options

```typescript
interface PriceMeasureOptions {
  fillColor: string;           // Màu nền rectangle
  borderColor: string;          // Màu viền
  borderWidth: number;          // Độ dày viền
  textColor: string;            // Màu chữ
  fontSize: number;             // Kích thước font
  fontFamily: string;           // Font chữ
  backgroundColor: string;      // Màu nền info box
  padding: number;              // Padding
  leverage: number;             // Đòn bẩy (default: 200)
  positionSize: number;         // Vị thế USDT (default: 20)
  showDeleteButton: boolean;    // Hiển thị nút delete
  onDelete?: () => void;        // Callback khi delete
}
```

### Default Values

```javascript
{
  fillColor: 'rgba(41, 98, 255, 0.1)',
  borderColor: 'rgba(41, 98, 255, 0.8)',
  borderWidth: 1,
  textColor: '#ffffff',
  fontSize: 12,
  fontFamily: 'Arial, sans-serif',
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  padding: 8,
  leverage: 200,
  positionSize: 20,
  showDeleteButton: true,
}
```

## 📚 API Reference

### PriceMeasureTool

```typescript
class PriceMeasureTool {
  constructor(
    p1: { time: Time; price: number },
    p2: { time: Time; price: number },
    options?: Partial<PriceMeasureOptions>
  )
  
  applyOptions(options: Partial<PriceMeasureOptions>): void
  get p1(): Point
  get p2(): Point
  get options(): PriceMeasureOptions
}
```

### DrawingManager

```typescript
class DrawingManager {
  constructor(
    series: ISeriesApi,
    defaultOptions?: Partial<PriceMeasureOptions>,
    callbacks?: {
      onToolAdded?: (data: DrawingToolData) => void;
      onToolRemoved?: (id: string) => void;
    }
  )
  
  startDrawing(): void
  stopDrawing(): void
  handleClick(param: MouseEventParams): boolean
  handleMouseMove(param: MouseEventParams): void
  removeTool(id: string): boolean
  removeAllTools(): void
  getTools(): DrawingToolData[]
  isInDrawingMode(): boolean
  updateDefaultOptions(options: Partial<PriceMeasureOptions>): void
}
```

## 🎯 Use Cases

### 1. Đo Khoảng Giá

```javascript
const tool = new PriceMeasureTool(
  { time: '2023-01-01', price: 100 },
  { time: '2023-01-10', price: 150 }
);
series.attachPrimitive(tool);
```

### 2. Tính PNL Cho Trade

```javascript
const tool = new PriceMeasureTool(
  { time: entryTime, price: 100 },
  { time: exitTime, price: 110 },
  { leverage: 200, positionSize: 20 }
);
// Hiển thị: PNL = $400
```

### 3. Nhiều Tools Với Màu Khác Nhau

```javascript
const colors = [
  { fill: 'rgba(41, 98, 255, 0.15)', border: '#2962FF' },   // Blue
  { fill: 'rgba(38, 166, 154, 0.15)', border: '#26a69a' },  // Green
  { fill: 'rgba(239, 83, 80, 0.15)', border: '#ef5350' },   // Red
];

colors.forEach((color) => {
  const tool = new PriceMeasureTool(p1, p2, {
    fillColor: color.fill,
    borderColor: color.border,
  });
  series.attachPrimitive(tool);
});
```

## 💡 Tips & Tricks

1. **Vẽ tự do**: Tool không bị snap vào giá của candle, vẽ chính xác nơi bạn click
2. **Delete nhanh**: Click nút ❌ đỏ trong rectangle thay vì detach thủ công
3. **Text căn giữa**: Info box tự động căn giữa rectangle và có shadow để nổi bật
4. **Duration thông minh**: Tự động format theo đơn vị phù hợp nhất
5. **Preview real-time**: Khi vẽ, rectangle sẽ update theo chuột
6. **Multiple tools**: Tạo nhiều tools với settings khác nhau
7. **Responsive**: Info box tự động điều chỉnh vị trí nếu ra ngoài chart

## 📁 Cấu Trúc Project

```
lwc-plugin-ruletool/
├── src/
│   ├── index.ts                          # Entry point, exports chính
│   ├── price-measure-tool.ts             # Tool chính
│   ├── price-measure-options.ts          # Options config
│   ├── price-measure-pane-view.ts        # View logic + duration
│   ├── price-measure-pane-renderer.ts    # Rendering + delete button
│   ├── drawing-manager.ts                # Interactive drawing
│   ├── ruletool.ts                       # Original tool (legacy)
│   └── example/
│       ├── simple-draw.html              # Demo đơn giản
│       ├── price-measure-interactive.html # Demo đầy đủ
│       └── price-measure.html            # Demo cơ bản
├── dist/                                 # Build output
│   ├── lwc-plugin-ruletool.js
│   ├── lwc-plugin-ruletool.umd.cjs
│   ├── lwc-plugin-ruletool.d.ts
│   └── README.md
├── compile.mjs                           # Build script
├── tsconfig.json                         # TypeScript config
└── README.md                             # File này
```

## 🐛 Troubleshooting

### Plugin chỉ hiển thị rectangle không có text

**Nguyên nhân**: Import sai module

```javascript
// ❌ Sai - file cũ
import { Ruletool } from './ruletool.js';

// ✅ Đúng - file mới
import { PriceMeasureTool, DrawingManager } from './lwc-plugin-ruletool.js';
```

### Duration không hiển thị

**Nguyên nhân**: Format time không đúng

Các format hợp lệ:
- String: `'2023-01-01'`
- Unix timestamp: `1672531200`
- BusinessDay: `{ year: 2023, month: 1, day: 1 }`

### Text bị cắt hoặc ra ngoài

**Giải pháp**: Info box tự động điều chỉnh, nhưng nếu vẫn bị:
- Giảm `fontSize`
- Giảm `padding`
- Tăng kích thước chart

### Delete button không hoạt động

**Kiểm tra**:
1. `showDeleteButton: true` trong options
2. Đã set `onDelete` callback
3. Click đúng vào nút ❌ đỏ

## 📖 Tài Liệu Bổ Sung

- [QUICK_START.md](./QUICK_START.md) - Hướng dẫn nhanh
- [USAGE_GUIDE.md](./USAGE_GUIDE.md) - Hướng dẫn chi tiết
- [PRICE_MEASURE_TOOL.md](./PRICE_MEASURE_TOOL.md) - Technical docs
- [dist/README.md](./DIST_README.md) - Hướng dẫn cho package

## 🔗 Links

- [Lightweight Charts Documentation](https://tradingview.github.io/lightweight-charts/)
- [Lightweight Charts GitHub](https://github.com/tradingview/lightweight-charts)

## 📄 License

MIT License - Xem file [LICENSE](./LICENSE) để biết thêm chi tiết

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 Changelog

### Version 2.0.0 (Current)
- ✨ Thêm Duration tracking với format thông minh
- ✨ Text căn giữa trong info box
- ✨ Info box hiển thị ở chính giữa rectangle
- ✨ Thêm shadow cho info box
- ✨ Vẽ tự do không bị snap vào giá
- ✨ Nút delete trực tiếp trong rectangle
- ✨ Drawing Manager cho interactive drawing
- 🐛 Fix compile từ index.ts thay vì ruletool.ts

### Version 1.0.0
- 🎉 Initial release với Ruletool cơ bản

---

**Developed with ❤️ for Lightweight Charts Community**

**Version**: 2.0.0  
**Last Updated**: November 2024  
**Compatible**: Lightweight Charts v5.0.0+
