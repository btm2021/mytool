# Crypto Backtest Tool

A comprehensive web application for cryptocurrency backtesting using real-time data from Binance Futures API. Built with HTML, CSS, JavaScript, and Lightweight Charts v4.2.1.

## Features

### 📈 Real-time Data
- Fetches live OHLCV data from Binance Futures API
- Supports multiple trading pairs (BTCUSDT, ETHUSDT, ADAUSDT, BNBUSDT)
- Multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d)
- Automatic data caching for improved performance

### 📊 Advanced Charting
- Professional candlestick charts using Lightweight Charts v4.2.1
- Volume histogram overlay
- Interactive crosshair with real-time price information
- Responsive design that works on all devices
- Smooth zooming and panning

### 🔄 Replay/Backtest Mode
- **TradingView-style replay functionality**
- Play/Pause controls
- Variable speed settings (x1, x2, x5, x10)
- Progress bar with current position
- Keyboard shortcuts for easy control
- Step-by-step candle progression

### 📈 Technical Indicators
- **EMA (Exponential Moving Average)** with customizable periods
- Real-time indicator updates during replay
- Easy to extend with additional indicators
- Support for multiple indicators simultaneously

### 🎛️ User Controls
- Symbol and timeframe selection
- Indicator toggle and parameter adjustment
- Export data functionality
- Error handling and user notifications
- Loading states and progress indicators

## File Structure

```
backtest/
├── index.html              # Main HTML file
├── styles.css              # CSS styling
├── js/
│   ├── binance-api.js      # Binance API service
│   ├── indicators.js       # Technical indicators
│   ├── chart-manager.js    # Chart management
│   ├── replay-manager.js   # Replay functionality
│   └── app.js             # Main application controller
└── README.md              # This file
```

## Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- Internet connection for fetching data from Binance API

### Installation
1. Clone or download the project files
2. Open `index.html` in your web browser
3. The application will automatically load with default settings

### Usage

#### Loading Data
1. Select your desired symbol (e.g., BTCUSDT)
2. Choose a timeframe (e.g., 15m)
3. Click "Load Data" to fetch data from Binance

#### Using Replay Mode
1. Ensure data is loaded
2. Click "Start Replay" to begin backtesting
3. Use "Play/Pause" to control playback
4. Adjust speed using x1, x2, x5, x10 buttons
5. Use "Stop" to end replay and show all data

#### Adding Indicators
1. Check the "EMA (21)" checkbox to enable EMA
2. Adjust the period value as needed
3. The indicator will update in real-time during replay

#### Keyboard Shortcuts (during replay)
- `Space` - Play/Pause
- `Escape` - Stop replay
- `←/→` - Navigate candles when paused
- `1/2/5` - Set speed multipliers

## Technical Details

### Architecture
The application follows a modular architecture with clear separation of concerns:

- **BinanceAPI**: Handles all API communication and data fetching
- **TechnicalIndicators**: Calculates various technical indicators
- **ChartManager**: Manages Lightweight Charts instance and data visualization
- **ReplayManager**: Controls replay functionality and user interactions
- **CryptoBacktestApp**: Main controller that coordinates all components

### API Integration
- Uses Binance Futures public API (no authentication required)
- Implements intelligent caching to reduce API calls
- Handles rate limiting and error scenarios
- Supports both recent and historical data fetching

### Performance Optimizations
- Data caching to minimize API requests
- Efficient chart updates during replay
- Responsive design with optimized rendering
- Memory management for large datasets

## Extending the Application

### Adding New Indicators
1. Add calculation method to `TechnicalIndicators` class
2. Update the `calculate()` method to handle the new indicator
3. Add UI controls in `index.html`
4. Update event handlers in `app.js`

Example:
```javascript
// In indicators.js
calculateRSI(data, period = 14) {
    // Implementation here
}

// In app.js
addRSIIndicator() {
    this.chartManager.addIndicator('RSI', 'rsi', { period: 14 }, '#9C27B0');
}
```

### Adding New Trading Pairs
1. Update the symbol dropdown in `index.html`
2. The application will automatically handle the new symbol

### Customizing Chart Appearance
1. Modify chart options in `ChartManager.initializeChart()`
2. Update CSS variables in `styles.css`
3. Customize colors and themes as needed

## Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## API Rate Limits
- Binance API has rate limits (1200 requests per minute)
- The application implements caching to stay within limits
- For heavy usage, consider implementing additional rate limiting

## Troubleshooting

### Common Issues
1. **Data not loading**: Check internet connection and try a different symbol
2. **Chart not displaying**: Ensure browser supports modern JavaScript features
3. **Replay not working**: Make sure data is loaded before starting replay
4. **Indicators not showing**: Check that the indicator toggle is enabled

### Console Commands
Open browser developer tools and use these commands:
```javascript
// Access the main application instance
app.getState()          // Get current application state
app.loadData()          // Reload data
app.reset()             // Reset application
app.exportData()        // Export current data
```

## Contributing
This application is designed to be easily extensible. Key areas for contribution:
- Additional technical indicators
- More chart types and visualizations
- Advanced backtesting features
- Performance optimizations
- UI/UX improvements

## License
This project is open source and available under the MIT License.

## Disclaimer
This tool is for educational and research purposes only. It is not financial advice. Always do your own research before making trading decisions.

## Support
For issues or questions, please check the browser console for error messages and ensure all files are properly loaded.
