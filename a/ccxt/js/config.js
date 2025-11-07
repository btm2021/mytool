// Default configuration
const DEFAULT_CONFIG = {
    requestsPerMinute: 100,
    symbolsPerBatch: 20,
    ohlcvLimit: 1500,
    defaultTimeframe: '15m',
    cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
    dbName: 'ccxt_screener',
    dbVersion: 1
};

// Load settings from localStorage or use defaults
const loadSettings = () => {
    try {
        const saved = localStorage.getItem('ccxt_screener_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                ...DEFAULT_CONFIG,
                ...parsed
            };
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
    return { ...DEFAULT_CONFIG };
};

// Initialize AppConfig with loaded settings
const AppConfig = loadSettings();
