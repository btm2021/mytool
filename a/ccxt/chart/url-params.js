/**
 * URL Parameters Handler for Chart
 * Handles auto-loading data from URL parameters
 */

class URLParamsHandler {
    constructor() {
        this.params = this.parseURLParams();
    }

    /**
     * Parse URL parameters
     */
    parseURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            symbol: urlParams.get('symbol'),
            exchangeId: urlParams.get('exchangeId'),
            timeframe: urlParams.get('timeframe') || '15m',
            limit: parseInt(urlParams.get('limit')) || 1500,
            autoload: urlParams.get('autoload') === 'true',
            usecache: urlParams.get('usecache') === 'yes'
        };
    }

    /**
     * Check if should auto-load
     */
    shouldAutoLoad() {
        return this.params.autoload && this.params.symbol && this.params.exchangeId;
    }

    /**
     * Get exchange name for CCXT
     */
    getExchangeName() {
        const exchangeMap = {
            'binanceusdm': 'binanceusdm',
            'bybit': 'bybit',
            'okx': 'okx',
            'bitget': 'bitget'
        };
        return exchangeMap[this.params.exchangeId] || 'binanceusdm';
    }

    /**
     * Get exchange display name
     */
    getExchangeDisplayName() {
        const displayNames = {
            'binanceusdm': 'Binance Futures',
            'bybit': 'Bybit',
            'okx': 'OKX',
            'bitget': 'Bitget'
        };
        return displayNames[this.params.exchangeId] || this.params.exchangeId;
    }

    /**
     * Get symbol in CCXT format
     */
    getSymbolForCCXT() {
        if (!this.params.symbol) return null;
        
        // Convert BTCUSDT -> BTC/USDT:USDT for perpetual futures
        const base = this.params.symbol.replace('USDT', '');
        return `${base}/USDT:USDT`;
    }

    /**
     * Apply params to UI
     */
    applyToUI() {
        if (!this.params.symbol) return;

        // Set symbol
        const symbolDisplay = document.getElementById('selectedSymbol');
        if (symbolDisplay) {
            symbolDisplay.textContent = this.params.symbol;
        }

        // Set timeframe
        const timeframeSelect = document.getElementById('timeframe');
        if (timeframeSelect) {
            timeframeSelect.value = this.params.timeframe;
        }

        // Set candle count
        const candleCountInput = document.getElementById('candleCount');
        if (candleCountInput) {
            candleCountInput.value = this.params.limit;
        }
    }

    /**
     * Get all params
     */
    getParams() {
        return this.params;
    }
}

// Make available globally
window.URLParamsHandler = URLParamsHandler;
