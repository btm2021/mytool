import { BinanceFutureDataSource } from './datasources/binance_future.js';
import { BybitFutureDataSource } from './datasources/bybit_future.js';
import { OKXFutureDataSource } from './datasources/okx_future.js';
import { OHLCVDatabase } from './core/db.js';
import { Aggregator } from './core/aggregator.js';
import { Validator } from './core/validator.js';
import { DataCollector } from './collector.js';
import { APIServer } from './api/server.js';
import { logger } from './core/logger.js';
import { config } from './config/config.js';
import { SystemMonitor } from './core/system_monitor.js';
import { SYSTEM_MONITOR_INTERVAL, VALIDATION_INTERVAL } from './core/constants.js';

let systemMonitor = null;
let validator = null;
let apiServer = null;
let collectors = [];
let db = null;

async function startSystem() {
  logger.success('=== Starting Screener System ===');
  
  // Reload config
  config.reload();
  
  db = new OHLCVDatabase(config.databasePath);
  logger.success('Database initialized');

  collectors = [];
  
  for (const [exchangeName, exchangeConfig] of Object.entries(config.exchanges)) {
    if (!exchangeConfig.enabled) continue;
    
    logger.info(`Initializing ${exchangeName}...`);
    
    let dataSource;
    switch (exchangeName) {
      case 'binance_futures':
        dataSource = new BinanceFutureDataSource();
        break;
      case 'bybit_futures':
        dataSource = new BybitFutureDataSource();
        break;
      case 'okx_futures':
        dataSource = new OKXFutureDataSource();
        break;
      default:
        logger.error(`Unknown exchange: ${exchangeName}`);
        continue;
    }
    
    dataSource.setLogger(logger);
    
    const collector = new DataCollector(dataSource, db, config, logger, exchangeName);
    
    collectors.push({ exchange: exchangeName, collector, dataSource });
  }

  if (collectors.length === 0) {
    logger.error('No exchanges enabled. Please enable at least one exchange in config.json');
    process.exit(1);
  }

  apiServer = new APIServer(db, Aggregator, collectors[0].collector, logger);
  apiServer.setRestartCallback(restartSystem);
  apiServer.setDeleteDatabaseCallback(deleteDatabaseAndRestart);
  apiServer.setCollectors(collectors); // Pass all collectors
  apiServer.start(config.port);
  logger.success(`Web server started at http://localhost:${config.port}`);

  for (const { exchange, collector } of collectors) {
    await collector.bootstrap();
    
    collector.setBroadcastCallback((candle) => {
      const candleData = {
        type: 'candle',
        data: {
          exchange: exchange,
          symbol: candle.symbol,
          interval: candle.interval,
          o: candle.open,
          h: candle.high,
          l: candle.low,
          c: candle.close,
          v: candle.volume,
          closed: candle.closed
        }
      };
      
      apiServer.broadcast(candleData);
    });
    
    collector.startRealtime();
  }

  validator = new Validator(db, collectors[0].dataSource, logger);
  validator.start(config.allSymbols, VALIDATION_INTERVAL);

  systemMonitor = new SystemMonitor(config);
  systemMonitor.start((data) => {
    if (apiServer) {
      apiServer.broadcast(data);
    }
  }, SYSTEM_MONITOR_INTERVAL);

  logger.success('All systems operational - Ready to collect data');
}

async function stopSystem() {
  logger.warn('Stopping all systems...');
  
  if (collectors.length > 0) {
    collectors.forEach(({ collector }) => collector.stop());
  }
  
  if (validator) {
    validator.stop();
  }
  
  if (systemMonitor) {
    systemMonitor.stop();
  }
  
  // Don't close API server and DB during restart
  logger.success('All systems stopped');
}

async function deleteDatabaseAndRestart() {
  logger.warn('=== DELETING DATABASE ===');
  
  try {
    // Stop all systems first
    await stopSystem();
    
    // Close and delete database
    if (db) {
      db.close();
      logger.success('Database closed');
      db = null;
    }
    
    // Close API server to free the port
    if (apiServer) {
      await apiServer.close();
      logger.success('API server closed');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Delete database files
    const fs = await import('fs');
    const path = await import('path');
    const dbPath = config.databasePath;
    
    // Delete main database file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      logger.success(`Deleted: ${dbPath}`);
    }
    
    // Delete WAL and SHM files
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
      logger.success(`Deleted: ${walPath}`);
    }
    
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
      logger.success(`Deleted: ${shmPath}`);
    }
    
    logger.success('=== DATABASE DELETED ===');
    
    // Wait before restarting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Restart system with fresh database
    await startSystem();
    
    logger.success('=== SYSTEM RESTARTED WITH FRESH DATABASE ===');
    
    if (apiServer) {
      apiServer.broadcast({
        type: 'log',
        data: {
          message: 'Database deleted and system restarted successfully',
          type: 'connected',
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (err) {
    logger.error(`Delete database failed: ${err.message}`);
    console.error(err);
    
    // Try to restart anyway
    try {
      await startSystem();
    } catch (restartErr) {
      logger.error(`Restart after error failed: ${restartErr.message}`);
    }
  }
}

async function restartSystem() {
  logger.warn('=== RESTARTING SYSTEM ===');
  
  try {
    await stopSystem();
    
    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await startSystem();
    
    logger.success('=== SYSTEM RESTARTED SUCCESSFULLY ===');
    
    // Broadcast restart complete
    if (apiServer) {
      apiServer.broadcast({
        type: 'log',
        data: {
          message: 'System restarted successfully',
          type: 'connected',
          timestamp: new Date().toISOString()
        }
      });
      
      // Send updated status for all exchanges
      const exchanges = config.exchanges || {};
      for (const [exchangeName, exchangeConfig] of Object.entries(exchanges)) {
        if (exchangeConfig.enabled !== false && exchangeConfig.symbols && exchangeConfig.symbols.length > 0) {
          apiServer.broadcast({
            type: 'status',
            data: {
              exchange: exchangeName,
              symbols: exchangeConfig.symbols
            }
          });
        }
      }
    }
  } catch (err) {
    logger.error(`Restart failed: ${err.message}`);
    console.error(err);
  }
}

async function main() {
  await startSystem();

  process.on('SIGINT', async () => {
    logger.warn('Shutting down gracefully...');
    await stopSystem();
    if (apiServer) await apiServer.close();
    if (db) db.close();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('[System] Fatal error:', err);
  process.exit(1);
});
