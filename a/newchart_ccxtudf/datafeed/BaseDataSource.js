/**
 * Base class cho tất cả các DataSource
 * Định nghĩa interface chuẩn mà mọi datasource phải implement
 */
class BaseDataSource {
    constructor(config = {}) {
        this.config = config;
        this.name = 'BaseDataSource';
    }

    /**
     * Lấy thông tin cấu hình của exchange
     * @returns {Object} Configuration object
     */
    async onReady() {
        throw new Error('onReady() must be implemented');
    }

    /**
     * Tìm kiếm symbols
     * @param {string} userInput - Input từ user
     * @param {string} exchange - Exchange name
     * @param {string} symbolType - Loại symbol
     * @param {Function} onResult - Callback với kết quả
     */
    async searchSymbols(userInput, exchange, symbolType, onResult) {
        throw new Error('searchSymbols() must be implemented');
    }

    /**
     * Resolve symbol từ symbol name
     * @param {string} symbolName - Tên symbol
     * @param {Function} onResolve - Callback khi resolve thành công
     * @param {Function} onError - Callback khi có lỗi
     */
    async resolveSymbol(symbolName, onResolve, onError) {
        throw new Error('resolveSymbol() must be implemented');
    }

    /**
     * Lấy dữ liệu bars (OHLCV)
     * @param {Object} symbolInfo - Thông tin symbol
     * @param {string} resolution - Timeframe
     * @param {Object} periodParams - from, to, firstDataRequest
     * @param {Function} onResult - Callback với kết quả
     * @param {Function} onError - Callback khi có lỗi
     */
    async getBars(symbolInfo, resolution, periodParams, onResult, onError) {
        throw new Error('getBars() must be implemented');
    }

    /**
     * Subscribe realtime data
     * @param {Object} symbolInfo - Thông tin symbol
     * @param {string} resolution - Timeframe
     * @param {Function} onTick - Callback khi có tick mới
     * @param {string} listenerGuid - ID của listener
     * @param {Function} onResetCacheNeededCallback - Callback reset cache
     */
    async subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
        throw new Error('subscribeBars() must be implemented');
    }

    /**
     * Unsubscribe realtime data
     * @param {string} listenerGuid - ID của listener
     */
    async unsubscribeBars(listenerGuid) {
        throw new Error('unsubscribeBars() must be implemented');
    }

    /**
     * Kiểm tra xem datasource có hỗ trợ symbol này không
     * @param {string} symbolName - Tên symbol (format: EXCHANGE:SYMBOL)
     * @returns {boolean}
     */
    canHandle(symbolName) {
        return false;
    }

    /**
     * Parse symbol name thành exchange và symbol
     * @param {string} symbolName - Tên symbol (format: EXCHANGE:SYMBOL)
     * @returns {Object} {exchange, symbol}
     */
    parseSymbol(symbolName) {
        const parts = symbolName.split(':');
        if (parts.length === 2) {
            return {
                exchange: parts[0],
                symbol: parts[1]
            };
        }
        return {
            exchange: '',
            symbol: symbolName
        };
    }
}

export default BaseDataSource;
