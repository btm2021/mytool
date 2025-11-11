/**
 * Configuration Example
 * Copy file này thành config.js và điền thông tin của bạn
 */

export const CONFIG = {
    // Binance Configuration
    binance: {
        // Không cần API key cho public data
    },

    // OANDA Configuration
    oanda: {
        apiKey: 'YOUR_OANDA_API_KEY',
        accountId: 'YOUR_OANDA_ACCOUNT_ID',
        practice: true  // true = practice account, false = live account
    },

    // Thêm exchanges khác ở đây
    // myExchange: {
    //     apiKey: 'YOUR_API_KEY',
    //     apiSecret: 'YOUR_API_SECRET',
    //     // ... other config
    // }
};

// TradingView Widget Options
export const WIDGET_OPTIONS = {
    symbol: 'BINANCE:BTCUSDT',  // Default symbol
    interval: '15',              // Default timeframe
    locale: 'vi',                // Language
    theme: 'Dark',               // Theme
    
    disabled_features: [
        'object_tree',
        'tradingview_logo',
        'bottom_toolbar',
        'control_bar',
    ],
    
    enabled_features: [
        'studies_extend_time_scale',
        'items_favoriting',
        'use_localstorage_for_settings',
    ],
};
