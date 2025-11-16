/**
 * Title Updater - Cập nhật title của trang với symbol và giá realtime
 */
class TitleUpdater {
    constructor() {
        this.currentSymbol = '';
        this.currentPrice = null;
        this.previousClose = null;
        this.priceChange = null;
        this.priceChangePercent = null;
        this.originalTitle = document.title;
        this.chart = null;
        this.lastBarTime = null;
    }

    /**
     * Khởi tạo title updater với TradingView widget và datafeed
     */
    init(tvWidget, datafeed) {
        if (!tvWidget) {
            console.error('[TitleUpdater] TradingView widget is required');
            return;
        }

        // Hook datafeed trước khi chart ready
        if (datafeed) {
            this.hookDatafeed(datafeed);
        }

        tvWidget.onChartReady(() => {
            this.chart = tvWidget.activeChart();

            // Lấy symbol hiện tại
            this.currentSymbol = this.chart.symbol();
            console.log('[TitleUpdater] Current symbol:', this.currentSymbol);
            this.updateTitle();

            // Lắng nghe sự kiện thay đổi symbol
            this.chart.onSymbolChanged().subscribe(null, (symbolData) => {
                console.log('[TitleUpdater] Symbol changed to:', symbolData.name);
                this.currentSymbol = symbolData.name;
                this.currentPrice = null;
                this.previousClose = null;
                this.priceChange = null;
                this.priceChangePercent = null;
                this.lastBarTime = null;
                this.updateTitle();
            });

            // Sử dụng onDataLoaded để lấy giá ban đầu
            this.chart.onDataLoaded().subscribe(null, () => {
                this.loadInitialPrice();
            });
        });
    }

    /**
     * Load giá ban đầu từ chart
     */
    loadInitialPrice() {
        try {
            // Sử dụng getSeries để lấy data
            this.chart.getSeries().then((series) => {
                if (series && series.data && series.data.length > 0) {
                    const lastBar = series.data[series.data.length - 1];
                    console.log('[TitleUpdater] Initial bar:', lastBar);
                    if (lastBar && lastBar.close !== undefined) {
                        this.updatePriceFromBar(lastBar);
                    }
                }
            }).catch(err => {
                console.log('[TitleUpdater] getSeries not available:', err.message);
            });
        } catch (error) {
            console.log('[TitleUpdater] Cannot load initial price:', error.message);
        }
    }

    /**
     * Hook vào datafeed để intercept realtime data
     */
    hookDatafeed(datafeed) {
        try {
            if (!datafeed || !datafeed.subscribeBars) {
                console.warn('[TitleUpdater] Cannot hook datafeed - subscribeBars not found');
                return;
            }

            // Backup original subscribeBars
            const originalSubscribeBars = datafeed.subscribeBars.bind(datafeed);

            // Override subscribeBars để intercept realtime data
            datafeed.subscribeBars = (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
                console.log('[TitleUpdater] subscribeBars called for:', symbolInfo.name);

                // Wrap callback để lấy dữ liệu
                const wrappedCallback = (bar) => {
                    //      console.log('[TitleUpdater] Bar received:', bar);
                    // Chỉ cập nhật nếu là symbol hiện tại
                    if (symbolInfo.name === this.currentSymbol) {
                        this.updatePriceFromBar(bar);
                    }

                    // Gọi callback gốc
                    onRealtimeCallback(bar);
                };

                // Gọi subscribeBars gốc với wrapped callback
                return originalSubscribeBars(symbolInfo, resolution, wrappedCallback, subscriberUID, onResetCacheNeededCallback);
            };

            //     console.log('[TitleUpdater] Datafeed hooked successfully');
        } catch (error) {
            console.error('[TitleUpdater] Failed to hook datafeed:', error);
        }
    }

    /**
     * Cập nhật giá từ bar data
     */
    updatePriceFromBar(bar) {
        if (!bar || bar.close === undefined) {
            //   console.log('[TitleUpdater] Invalid bar data');
            return;
        }

        // console.log('[TitleUpdater] Updating price from bar:', {
        //     time: bar.time,
        //     close: bar.close,
        //     open: bar.open
        // });

        // Nếu là bar mới (khác thời gian), lưu giá đóng cửa của bar trước làm previousClose
        if (this.lastBarTime !== null && bar.time !== this.lastBarTime) {
            if (this.currentPrice !== null) {
                this.previousClose = this.currentPrice;
            }
        }

        this.lastBarTime = bar.time;
        this.currentPrice = bar.close;

        // Tính toán price change
        if (this.previousClose !== null) {
            this.priceChange = this.currentPrice - this.previousClose;
            this.priceChangePercent = (this.priceChange / this.previousClose) * 100;
        } else if (bar.open !== undefined) {
            // Fallback: so sánh với giá mở cửa của bar hiện tại
            this.priceChange = this.currentPrice - bar.open;
            this.priceChangePercent = (this.priceChange / bar.open) * 100;
        }



        this.updateTitle();
    }

    /**
     * Format giá theo số thập phân phù hợp
     */
    formatPrice(price) {
        if (price === null || price === undefined) return '';

        // Xác định số chữ số thập phân dựa trên giá trị
        let decimals = 2;
        if (price < 0.01) {
            decimals = 6;
        } else if (price < 1) {
            decimals = 4;
        } else if (price < 100) {
            decimals = 3;
        }

        return price.toFixed(decimals);
    }

    /**
     * Format price change với màu sắc (sử dụng emoji)
     */
    formatPriceChange() {
        if (this.priceChange === null || this.priceChangePercent === null) {
            return '';
        }

        const sign = this.priceChange >= 0 ? '+' : '';
        const emoji = this.priceChange >= 0 ? '📈' : '📉';
        const changeStr = `${sign}${this.formatPrice(Math.abs(this.priceChange))}`;


        return `${changeStr} ${emoji} `;
    }

    /**
     * Cập nhật title với symbol và giá
     */
    updateTitle() {
        if (!this.currentSymbol) {
            document.title = this.originalTitle;
            return;
        }

        // Lấy tên symbol ngắn gọn (bỏ exchange prefix nếu có)
        const symbolParts = this.currentSymbol.split(':');
        const shortSymbol = symbolParts.length > 1 ? symbolParts[1] : this.currentSymbol;

        let title = shortSymbol;

        if (this.currentPrice !== null) {
            const priceStr = this.formatPrice(this.currentPrice);

            title = `${shortSymbol} ${priceStr} `;
        }

        document.title = title;
    }

    /**
     * Cập nhật title chỉ với symbol (fallback)
     */
    updateTitleWithSymbolOnly() {
        if (!this.currentSymbol) {
            document.title = this.originalTitle;
            return;
        }

        const symbolParts = this.currentSymbol.split(':');
        const shortSymbol = symbolParts.length > 1 ? symbolParts[1] : this.currentSymbol;
        document.title = shortSymbol;
    }

    /**
     * Dọn dẹp resources
     */
    destroy() {
        document.title = this.originalTitle;
        this.chart = null;
    }
}

// Export để sử dụng trong các file khác
window.TitleUpdater = TitleUpdater;
