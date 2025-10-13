import { sleep } from './core/utils.js';
import { MINUTE_MS, TIMEFRAME_1M } from './core/constants.js';

export class DataCollector {
  constructor(dataSource, db, config, logger, exchange) {
    this.dataSource = dataSource;
    this.db = db;
    this.config = config;
    this.logger = logger;
    this.exchange = exchange;
    this.queue = [];
    this.batchTimer = null;
    this.broadcastCallback = null;
  }

  setBroadcastCallback(callback) {
    this.broadcastCallback = callback;
  }

  async bootstrap() {
    this.logger.warn('Starting bootstrap - checking and loading historical data...');
    
    const symbols = this.config.getExchangeSymbols(this.exchange);
    
    for (const symbol of symbols) {
      await this.loadHistoricalData(symbol, this.config.bootstrapLoad);
      await sleep(1000);
    }
    
    this.logger.success('Bootstrap completed');
  }

  async loadHistoricalData(symbol, totalCandles) {
    const lastTs = this.db.getLastTimestamp(this.exchange, symbol, TIMEFRAME_1M);
    const now = Date.now();
    
    if (lastTs) {
      const existingCount = this.db.getCount(this.exchange, symbol, TIMEFRAME_1M);
      const gap = now - lastTs;
      const gapMinutes = Math.floor(gap / MINUTE_MS);
      
      if (gapMinutes <= 1) {
        this.logger.info(`${symbol}: Already up to date (${existingCount} candles)`);
        return;
      }
      
      this.logger.info(`${symbol}: Found ${existingCount} existing candles, fetching ${gapMinutes} missing...`);
      
      const candles = await this.fetchMissingCandles(symbol, lastTs + MINUTE_MS, now);
      if (candles.length > 0) {
        this.db.insertBatch(candles);
        this.logger.success(`${symbol}: Added ${candles.length} new candles`);
      }
      return;
    }
    
    this.logger.info(`${symbol}: No existing data, loading ${totalCandles} candles...`);
    
    const batchSize = 1000;
    const batches = Math.ceil(totalCandles / batchSize);
    let endTime = now;
    let loaded = 0;

    for (let i = 0; i < batches; i++) {
      const startTime = endTime - (batchSize * MINUTE_MS);
      const candles = await this.dataSource.backfill(symbol, startTime, endTime, batchSize);
      
      if (candles.length > 0) {
        this.db.insertBatch(candles);
        loaded += candles.length;
        endTime = candles[0].ts - MINUTE_MS;
        this.logger.receiving(`${symbol}: ${loaded}/${totalCandles} candles loaded`);
      }
      
      await sleep(500);
    }
  }

  async fetchMissingCandles(symbol, fromTs, toTs) {
    const allCandles = [];
    let currentStart = fromTs;
    
    while (currentStart < toTs) {
      const candles = await this.dataSource.backfill(symbol, currentStart, toTs, 1000);
      if (candles.length === 0) break;
      
      allCandles.push(...candles);
      currentStart = candles[candles.length - 1].ts + MINUTE_MS;
      
      await sleep(500);
    }
    
    return allCandles;
  }

  startRealtime() {
    this.logger.success('Starting realtime collection...');
    
    this.dataSource.connect();
    
    const symbols = this.config.getExchangeSymbols(this.exchange);
    
    setTimeout(() => {
      this.dataSource.subscribe(symbols, TIMEFRAME_1M);
    }, 2000);

    this.dataSource.onMessage((candle) => {
      if (this.broadcastCallback) {
        this.broadcastCallback(candle);
      }
      
      if (candle.closed) {
        this.queue.push(candle);
        this.logger.success(`🟢 ${candle.symbol} closed at ${candle.close.toFixed(2)}`);
      }
    });

    this.startBatchWriter();
  }

  startBatchWriter() {
    if (this.batchTimer) clearInterval(this.batchTimer);
    
    this.batchTimer = setInterval(() => {
      if (this.queue.length > 0) {
        const batch = [...this.queue];
        this.queue = [];
        
        this.db.insertBatch(batch);
        this.logger.receiving(`Wrote ${batch.length} candles to DB`);

        const symbols = this.config.getExchangeSymbols(this.exchange);
        for (const symbol of symbols) {
          this.db.cleanupOldData(this.exchange, symbol, TIMEFRAME_1M, this.config.maxRecords);
        }
      }
    }, this.config.batchInterval);
  }

  async updateConfig(newConfig) {
    this.logger.warn('Updating configuration...');
    
    this.dataSource.close();
    if (this.batchTimer) clearInterval(this.batchTimer);

    this.config.update(newConfig);
    
    await sleep(1000);
    this.startRealtime();
  }

  async checkAndBackfill(symbol) {
    const lastTs = this.db.getLastTimestamp(this.exchange, symbol, TIMEFRAME_1M);
    if (!lastTs) return;

    const now = Date.now();
    const gap = now - lastTs;
    
    if (gap > MINUTE_MS * 2) {
      this.logger.warn(`Detected gap for ${symbol}, backfilling...`);
      const candles = await this.dataSource.backfill(symbol, lastTs + MINUTE_MS, now, 1000);
      if (candles.length > 0) {
        this.db.insertBatch(candles);
        this.logger.success(`Backfilled ${candles.length} candles for ${symbol}`);
      }
    }
  }

  stop() {
    if (this.batchTimer) clearInterval(this.batchTimer);
    this.dataSource.close();
  }
}
