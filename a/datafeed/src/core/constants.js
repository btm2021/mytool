// Time constants
export const MINUTE_MS = 60000;
export const HOUR_MS = 3600000;
export const DAY_MS = 86400000;

// WebSocket constants
export const WS_RECONNECT_DELAY = 5000;
export const WS_HEARTBEAT_INTERVAL = 10000;
export const WS_HEARTBEAT_TIMEOUT = 30000;
export const WS_CONNECT_DELAY = 1000;

// API constants
export const DEFAULT_PORT = 3000;
export const DEFAULT_LIMIT = 500;
export const MAX_BACKFILL_LIMIT = 1500;

// Database constants
export const DEFAULT_MAX_RECORDS = 100000;
export const DEFAULT_BATCH_INTERVAL = 60000;
export const DEFAULT_BOOTSTRAP_LOAD = 10000;

// System monitor constants
export const SYSTEM_MONITOR_INTERVAL = 2000;
export const VALIDATION_INTERVAL = 3600000;

// Exchange constants
export const BINANCE_FUTURES_WS = 'wss://fstream.binance.com/ws';
export const BINANCE_FUTURES_API = 'https://fapi.binance.com/fapi/v1';
export const DEFAULT_EXCHANGE = 'binance_futures';

// Timeframe constants
export const TIMEFRAME_1M = '1m';
export const TIMEFRAME_5M = '5m';
export const TIMEFRAME_15M = '15m';
export const TIMEFRAME_1H = '1h';
export const TIMEFRAME_4H = '4h';
export const TIMEFRAME_1D = '1d';
