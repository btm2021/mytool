const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Initialize SQLite database
const db = new Database(process.env.DB_PATH || 'charts.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS charts (
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

  CREATE INDEX IF NOT EXISTS idx_user_id ON charts(user_id);
  CREATE INDEX IF NOT EXISTS idx_timestamp ON charts(timestamp);
`);

// Helper function to generate ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'TradingView Chart Server' });
});

// Get all charts for a user
app.get('/charts', (req, res) => {
  try {
    const userId = req.query.client || req.query.user || 'public_user';
    
    const stmt = db.prepare(`
      SELECT id, name, symbol, resolution, timestamp, created_at, updated_at
      FROM charts 
      WHERE user_id = ?
      ORDER BY timestamp DESC
    `);
    
    const charts = stmt.all(userId);
    
    res.json({
      status: 'ok',
      data: charts.map(chart => ({
        id: chart.id,
        name: chart.name,
        symbol: chart.symbol,
        resolution: chart.resolution,
        timestamp: chart.timestamp
      }))
    });
  } catch (error) {
    console.error('Error getting charts:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get chart content by ID
app.get('/charts/:chartId', (req, res) => {
  try {
    const { chartId } = req.params;
    const userId = req.query.client || req.query.user || 'public_user';
    
    const stmt = db.prepare('SELECT content FROM charts WHERE id = ? AND user_id = ?');
    const chart = stmt.get(chartId, userId);
    
    if (!chart) {
      return res.status(404).json({ status: 'error', message: 'Chart not found' });
    }
    
    res.json({
      status: 'ok',
      data: JSON.parse(chart.content)
    });
  } catch (error) {
    console.error('Error getting chart:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Save chart (create or update)
app.post('/charts', (req, res) => {
  try {
    const userId = req.query.client || req.query.user || 'public_user';
    const { id, name, content, symbol, resolution } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ status: 'error', message: 'Name and content are required' });
    }
    
    const chartId = id || generateId();
    const timestamp = Date.now();
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Check if chart exists
    const existing = db.prepare('SELECT id FROM charts WHERE id = ? AND user_id = ?').get(chartId, userId);
    
    if (existing) {
      // Update existing chart
      const stmt = db.prepare(`
        UPDATE charts 
        SET name = ?, content = ?, symbol = ?, resolution = ?, timestamp = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `);
      stmt.run(name, contentStr, symbol, resolution, timestamp, timestamp, chartId, userId);
    } else {
      // Insert new chart
      const stmt = db.prepare(`
        INSERT INTO charts (id, user_id, name, content, symbol, resolution, timestamp, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(chartId, userId, name, contentStr, symbol, resolution, timestamp, timestamp, timestamp);
    }
    
    res.json({
      status: 'ok',
      id: chartId
    });
  } catch (error) {
    console.error('Error saving chart:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Delete chart
app.delete('/charts/:chartId', (req, res) => {
  try {
    const { chartId } = req.params;
    const userId = req.query.client || req.query.user || 'public_user';
    
    const stmt = db.prepare('DELETE FROM charts WHERE id = ? AND user_id = ?');
    const result = stmt.run(chartId, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ status: 'error', message: 'Chart not found' });
    }
    
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error deleting chart:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Chart server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
