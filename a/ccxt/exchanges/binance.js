class BinanceExchange extends BaseExchange {
    constructor() {
        super('binanceusdm', {
            name: 'Binance Futures'
        });
    }

    filterSymbol(symbol) {
        // Loại bỏ stablecoins không mong muốn
        const excludeCoins = ['USDC', 'BUSD', 'DAI', 'TUSD', 'USDP'];
        for (const coin of excludeCoins) {
            if (symbol.includes(coin)) return false;
        }

        // Loại bỏ symbols có dấu gạch dưới
        if (symbol.includes('_')) return false;

        // Loại bỏ symbols có dấu gạch ngang (options/dated contracts)
        // Ví dụ: BTC/USDT:USDT-260327-60000-P
        const parts = symbol.split(':');
        if (parts.length > 1 && parts[1].includes('-')) return false;

        // Loại bỏ symbols có chứa số (ngoại trừ trong tên coin thông thường như 1INCH)
        // Pattern: có số sau dấu : hoặc có nhiều số liên tiếp
        if (/:\w*\d/.test(symbol) || /\d{4,}/.test(symbol)) return false;

        // Chỉ lấy perpetual USDT
        return symbol.includes('/USDT');
    }
}
