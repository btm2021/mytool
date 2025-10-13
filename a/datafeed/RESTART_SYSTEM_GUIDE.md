# 🔄 System Restart Guide

## 🎯 Overview

Hệ thống hỗ trợ **graceful restart** - khởi động lại toàn bộ collectors và connections mà không cần restart Node.js process.

## ✨ Features

### 1. **Auto Restart on Config Save**
Khi save whitelist symbols, hệ thống tự động:
- Lưu config vào file
- Dừng tất cả collectors
- Đóng WebSocket connections
- Reload config từ file
- Khởi động lại collectors với config mới
- Kết nối lại WebSocket
- Broadcast status update

### 2. **Manual Restart**
Nút **RESTART** trên header cho phép restart thủ công:
- Confirm dialog để tránh restart nhầm
- Restart toàn bộ hệ thống
- Giữ nguyên API server và database

### 3. **Graceful Shutdown**
Tất cả components được dừng đúng cách:
- Stop collectors
- Close WebSocket connections
- Stop validator
- Stop system monitor
- Clear timers và intervals

## 🔄 Restart Flow

```
User clicks SAVE
    ↓
POST /exchange-symbols
    ↓
Save config to file
    ↓
Broadcast "Restarting..." log
    ↓
Send response to client
    ↓
Wait 1 second
    ↓
Trigger restartSystem()
    ↓
stopSystem()
    ├── Stop all collectors
    ├── Close WebSocket connections
    ├── Stop validator
    └── Stop system monitor
    ↓
Wait 2 seconds
    ↓
startSystem()
    ├── Reload config from file
    ├── Initialize new collectors
    ├── Bootstrap historical data
    ├── Connect WebSocket
    └── Start monitoring
    ↓
Broadcast "Restart complete"
    ↓
Send updated status
```

## 🚀 Usage

### Via Symbols Manager

1. Open Symbols Manager (SYMBOLS button)
2. Add/remove symbols
3. Click **SAVE**
4. System automatically restarts
5. Modal closes after 5 seconds
6. Check terminal for restart logs

### Via Restart Button

1. Click **RESTART** button on header
2. Confirm dialog appears
3. Click OK to proceed
4. System restarts
5. Button re-enables after 5 seconds

### Via API

```bash
# Restart application
curl -X POST http://localhost:3000/restart
```

## 📊 What Happens During Restart

### Stopped Components
- ✅ All exchange collectors
- ✅ WebSocket connections
- ✅ Data validator
- ✅ System monitor
- ✅ Batch writers
- ✅ Heartbeat timers

### Preserved Components
- ✅ API Server (keeps running)
- ✅ Database connection
- ✅ WebSocket server (clients stay connected)
- ✅ HTTP server

### Reloaded Components
- ✅ Config from file
- ✅ Exchange datasources
- ✅ Collectors with new symbols
- ✅ Validator with new symbols
- ✅ System monitor

## 🎨 UI Feedback

### Terminal Logs
```
[12:34:56] Configuration saved. Restarting application...
[12:34:57] Stopping all systems...
[12:34:57] All systems stopped
[12:34:59] === Starting Screener System ===
[12:34:59] Database initialized
[12:34:59] Initializing binance_futures...
[12:35:00] [Binance] WebSocket connected
[12:35:00] All systems operational - Ready to collect data
[12:35:00] === SYSTEM RESTARTED SUCCESSFULLY ===
[12:35:00] System restarted successfully
```

### Button States
```
SAVE → SAVING... → RESTARTING... → SAVE (after 5s)
RESTART → RESTARTING... → RESTART (after 5s)
```

### Status Updates
- WebSocket status: OFF → ON
- Symbol count updates
- Exchange name updates

## ⚙️ Configuration

### Restart Delay
```javascript
// In server.js
setTimeout(() => {
    if (this.restartCallback) {
        this.restartCallback();
    }
}, 1000); // Wait 1 second before restart
```

### Stop-Start Gap
```javascript
// In index.js
await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
```

### UI Timeout
```javascript
// In app.js
setTimeout(() => {
    modal.classList.remove('show');
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
}, 5000); // Re-enable after 5 seconds
```

## 🛡️ Error Handling

### Restart Fails
```javascript
try {
    await restartSystem();
} catch (err) {
    logger.error(`Restart failed: ${err.message}`);
    // System continues in stopped state
    // Manual intervention required
}
```

### Config Load Fails
```javascript
try {
    config.reload();
} catch (err) {
    logger.error('Failed to reload config');
    // Uses previous config
    // System continues with old config
}
```

### Collector Init Fails
```javascript
if (collectors.length === 0) {
    logger.error('No exchanges enabled');
    process.exit(1); // Exit if no collectors
}
```

## 🔍 Monitoring

### Check Restart Status

**Via Terminal:**
```bash
# Watch logs
tail -f logs/app.log

# Look for:
# - "RESTARTING SYSTEM"
# - "All systems stopped"
# - "Starting Screener System"
# - "SYSTEM RESTARTED SUCCESSFULLY"
```

**Via UI:**
- Terminal log panel shows all restart messages
- Status bar updates with new symbol count
- WebSocket status shows reconnection

**Via API:**
```bash
# Check status
curl http://localhost:3000/status

# Response:
{
  "status": "running",
  "symbols": ["BTCUSDT", "ETHUSDT", ...],
  "intervals": ["1m"]
}
```

## 🐛 Troubleshooting

### Restart Hangs
**Symptoms:**
- Button stays "RESTARTING..."
- No logs appear
- System unresponsive

**Solutions:**
1. Check terminal for errors
2. Verify config.json is valid JSON
3. Check if exchanges are accessible
4. Restart Node.js process manually

### Config Not Reloading
**Symptoms:**
- Old symbols still active
- New symbols not appearing

**Solutions:**
1. Check config.json was saved
2. Verify file permissions
3. Check for JSON syntax errors
4. Manual restart via button

### WebSocket Not Reconnecting
**Symptoms:**
- Status shows "OFF"
- No data flowing
- Terminal shows connection errors

**Solutions:**
1. Check internet connection
2. Verify exchange APIs are accessible
3. Check firewall settings
4. Wait for auto-reconnect (5 seconds)

### Database Errors
**Symptoms:**
- "Database locked" errors
- Data not saving

**Solutions:**
1. Close other database connections
2. Check file permissions
3. Restart Node.js process
4. Check disk space

## 💡 Best Practices

### 1. **Test Config Before Save**
- Verify symbols are valid
- Check exchange is enabled
- Ensure at least one symbol per exchange

### 2. **Monitor Restart Process**
- Watch terminal logs
- Wait for "RESTARTED SUCCESSFULLY"
- Check status bar updates

### 3. **Avoid Rapid Restarts**
- Wait for restart to complete
- Don't spam restart button
- Give system time to stabilize

### 4. **Backup Config**
```bash
cp config.json config.json.backup
```

### 5. **Use Manual Restart Sparingly**
- Only when needed
- Prefer config-triggered restart
- Understand impact on data collection

## 🔮 Advanced Usage

### Programmatic Restart
```javascript
// In your code
apiServer.restartCallback();
```

### Custom Restart Logic
```javascript
// In index.js
async function restartSystem() {
    // Your custom logic here
    await stopSystem();
    await customCleanup();
    await startSystem();
    await customInit();
}
```

### Restart with Different Config
```javascript
// Modify config before restart
config.data.exchanges.binance_futures.symbols = ['BTCUSDT'];
config.save();
await restartSystem();
```

## 📈 Performance Impact

### Restart Duration
- **Stop**: ~1 second
- **Gap**: 2 seconds
- **Start**: ~3-5 seconds
- **Total**: ~6-8 seconds

### Data Loss
- **During restart**: No new data collected
- **Historical data**: Preserved in database
- **WebSocket clients**: Stay connected
- **API requests**: Continue working

### Resource Usage
- **CPU spike**: Brief during restart
- **Memory**: Slight increase during transition
- **Network**: Reconnection traffic
- **Disk**: Config file write

## 🎯 Use Cases

### 1. Add New Symbols
```
1. Open Symbols Manager
2. Add symbols to whitelist
3. Click SAVE
4. System restarts with new symbols
5. Data collection begins immediately
```

### 2. Switch Exchanges
```
1. Edit config.json
2. Enable/disable exchanges
3. Click RESTART button
4. System loads new exchanges
```

### 3. Update Intervals
```
1. Edit config.json intervals
2. Click RESTART button
3. System uses new intervals
```

### 4. Fix Connection Issues
```
1. Click RESTART button
2. System reconnects all WebSockets
3. Data flow resumes
```

## 📝 Logs

### Restart Logs
```
[INFO] Configuration saved. Restarting application...
[WARN] === RESTARTING SYSTEM ===
[WARN] Stopping all systems...
[SUCCESS] All systems stopped
[SUCCESS] === Starting Screener System ===
[SUCCESS] Database initialized
[INFO] Initializing binance_futures...
[SUCCESS] [Binance] WebSocket connected
[SUCCESS] All systems operational - Ready to collect data
[SUCCESS] === SYSTEM RESTARTED SUCCESSFULLY ===
[SUCCESS] System restarted successfully
```

### Error Logs
```
[ERROR] Restart failed: Connection timeout
[ERROR] Failed to reload config: Invalid JSON
[ERROR] No exchanges enabled. Please enable at least one exchange
```

## 🔐 Security

### Restart Endpoint
- No authentication (local only)
- Rate limiting recommended
- Confirm dialog in UI
- Logged for audit

### Config File
- File permissions: 644
- Owner: Application user
- Backup before changes
- Validate JSON syntax

## 🚦 Status Indicators

### System States
- 🟢 **Running**: Normal operation
- 🟡 **Restarting**: In progress
- 🔴 **Stopped**: Error or manual stop

### WebSocket States
- 🟢 **ON**: Connected
- 🔴 **OFF**: Disconnected
- 🟡 **Reconnecting**: In progress

### Collector States
- 🟢 **Active**: Collecting data
- 🟡 **Bootstrapping**: Loading history
- 🔴 **Stopped**: Not running
