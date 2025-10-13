import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class OHLCVDatabase {
  constructor(dbPath) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    
    this.initTables();
    this.prepareStatements();
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ohlcv (
        exchange TEXT,
        symbol TEXT,
        timeframe TEXT,
        ts INTEGER,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        volume REAL,
        PRIMARY KEY(exchange, symbol, timeframe, ts)
      );
      CREATE INDEX IF NOT EXISTS idx_exchange_symbol_timeframe ON ohlcv(exchange, symbol, timeframe, ts);
    `);
  }

  prepareStatements() {
    this.insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO ohlcv (exchange, symbol, timeframe, ts, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.selectStmt = this.db.prepare(`
      SELECT ts, open, high, low, close, volume
      FROM ohlcv
      WHERE exchange = ? AND symbol = ? AND timeframe = ?
      ORDER BY ts DESC
      LIMIT ?
    `);

    this.lastTsStmt = this.db.prepare(`
      SELECT MAX(ts) as last_ts
      FROM ohlcv
      WHERE exchange = ? AND symbol = ? AND timeframe = ?
    `);

    this.countStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM ohlcv
      WHERE exchange = ? AND symbol = ? AND timeframe = ?
    `);

    this.deleteOldStmt = this.db.prepare(`
      DELETE FROM ohlcv
      WHERE exchange = ? AND symbol = ? AND timeframe = ? AND ts < (
        SELECT ts FROM ohlcv
        WHERE exchange = ? AND symbol = ? AND timeframe = ?
        ORDER BY ts DESC
        LIMIT 1 OFFSET ?
      )
    `);
  }

  insertBatch(candles) {
    if (!candles || candles.length === 0) return;

    const insert = this.db.transaction((items) => {
      for (const c of items) {
        this.insertStmt.run(
          c.exchange,
          c.symbol,
          c.interval,
          c.ts,
          c.open,
          c.high,
          c.low,
          c.close,
          c.volume
        );
      }
    });

    insert(candles);
  }

  getOHLCV(exchange, symbol, timeframe, limit = 500) {
    const rows = this.selectStmt.all(exchange, symbol, timeframe, limit);
    return rows.reverse().map(r => [r.ts, r.open, r.high, r.low, r.close, r.volume]);
  }

  getLastTimestamp(exchange, symbol, timeframe) {
    const result = this.lastTsStmt.get(exchange, symbol, timeframe);
    return result?.last_ts || null;
  }

  getCount(exchange, symbol, timeframe) {
    const result = this.countStmt.get(exchange, symbol, timeframe);
    return result?.count || 0;
  }

  cleanupOldData(exchange, symbol, timeframe, maxRecords) {
    const count = this.getCount(exchange, symbol, timeframe);
    if (count > maxRecords) {
      this.deleteOldStmt.run(exchange, symbol, timeframe, exchange, symbol, timeframe, maxRecords);
    }
  }

  close() {
    this.db.close();
  }
}
