import { VALIDATION_INTERVAL, MINUTE_MS, TIMEFRAME_1M, DEFAULT_EXCHANGE } from './constants.js';

export class Validator {
  constructor(db, dataSource, logger) {
    this.db = db;
    this.dataSource = dataSource;
    this.logger = logger;
    this.validationTimer = null;
    this.exchange = DEFAULT_EXCHANGE;
  }

  start(symbols, interval = VALIDATION_INTERVAL) {
    this.logger.validated('Starting periodic validation (every 1 hour)...');
    this.validationTimer = setInterval(() => {
      this.validate(symbols);
    }, interval);
  }

  async validate(symbols) {
    this.logger.validated('Running validation check...');
    
    for (const symbol of symbols) {
      const candles = this.db.getOHLCV(this.exchange, symbol, TIMEFRAME_1M, 60);
      if (candles.length < 2) continue;

      const timestamps = candles.map(c => c[0]);
      const missing = this.findMissingTimestamps(timestamps, MINUTE_MS);

      if (missing.length > 0) {
        this.logger.warn(`Found ${missing.length} missing candles for ${symbol}`);
        await this.backfillMissing(symbol, missing);
      }
    }
  }

  findMissingTimestamps(timestamps, interval) {
    const missing = [];
    for (let i = 1; i < timestamps.length; i++) {
      const expected = timestamps[i - 1] + interval;
      if (timestamps[i] !== expected) {
        let current = expected;
        while (current < timestamps[i]) {
          missing.push(current);
          current += interval;
        }
      }
    }
    return missing;
  }

  async backfillMissing(symbol, missingTimestamps) {
    if (missingTimestamps.length === 0) return;

    const fromTs = Math.min(...missingTimestamps);
    const toTs = Math.max(...missingTimestamps);

    this.logger.warn(`Backfilling ${symbol} from ${new Date(fromTs).toISOString()}`);
    
    const candles = await this.dataSource.backfill(symbol, fromTs, toTs, 1000);
    if (candles.length > 0) {
      this.db.insertBatch(candles);
      this.logger.success(`Backfilled ${candles.length} candles for ${symbol}`);
    }
  }

  stop() {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
    }
  }
}
