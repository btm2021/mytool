// Market Trend Candles Custom Study
// Candle coloring based on market structure trend analysis

function createMarketTrendCandles(PineJS) {
    return {
        name: "Market Trend Candles",
        metainfo: {
            _metainfoVersion: 51,
            id: "markettrendcandles@tv-basicstudies-1",
            name: "Market Trend Candles",
            description: "Candle Coloring Based on Market Structure Trend Analysis",
            shortDescription: "Trend Candles",
            isCustomIndicator: true,
            is_price_study: true,
            linkedToSeries: true,

            format: {
                type: "price",
                precision: 4
            },

            plots: [
                { id: "plot_open", type: "ohlc_open", target: "plot_candle" },
                { id: "plot_high", type: "ohlc_high", target: "plot_candle" },
                { id: "plot_low", type: "ohlc_low", target: "plot_candle" },
                { id: "plot_close", type: "ohlc_close", target: "plot_candle" },
                { id: "plot_bar_color", type: "ohlc_colorer", palette: "palette_bar", target: "plot_candle" },
                { id: "plot_wick_color", type: "wick_colorer", palette: "palette_wick", target: "plot_candle" },
                { id: "plot_border_color", type: "border_colorer", palette: "palette_border", target: "plot_candle" }
            ],

            palettes: {
                palette_bar: {
                    colors: [
                        { name: "Downtrend" },
                        { name: "Neutral" },
                        { name: "Uptrend" }
                    ],
                    valToIndex: {
                        0: 0,  // Downtrend
                        1: 1,  // Neutral
                        2: 2   // Uptrend
                    }
                },
                palette_wick: {
                    colors: [
                        { name: "Downtrend" },
                        { name: "Neutral" },
                        { name: "Uptrend" }
                    ],
                    valToIndex: {
                        0: 0,
                        1: 1,
                        2: 2
                    }
                },
                palette_border: {
                    colors: [
                        { name: "Downtrend" },
                        { name: "Neutral" },
                        { name: "Uptrend" }
                    ],
                    valToIndex: {
                        0: 0,
                        1: 1,
                        2: 2
                    }
                }
            },

            ohlcPlots: {
                plot_candle: {
                    title: "Market Trend Candles"
                }
            },

            defaults: {
                ohlcPlots: {
                    plot_candle: {
                        borderColor: "#000000",
                        color: "#000000",
                        drawBorder: true,
                        drawWick: true,
                        plottype: "ohlc_candles",
                        visible: true,
                        wickColor: "#000000"
                    }
                },
                palettes: {
                    palette_bar: {
                        colors: [
                            { color: "#d11c43", width: 1, style: 0 },  // Downtrend - Red
                            { color: "#808080", width: 1, style: 0 },  // Neutral - Gray
                            { color: "#1fc0b0", width: 1, style: 0 }   // Uptrend - Green
                        ]
                    },
                    palette_wick: {
                        colors: [
                            { color: "#d11c43" },  // Downtrend
                            { color: "#808080" },  // Neutral
                            { color: "#1fc0b0" }   // Uptrend
                        ]
                    },
                    palette_border: {
                        colors: [
                            { color: "#d11c43" },  // Downtrend
                            { color: "#808080" },  // Neutral
                            { color: "#1fc0b0" }   // Uptrend
                        ]
                    }
                },
                precision: 4,
                inputs: {
                    leftBars: 8,
                    sensitivity: 1
                }
            },

            inputs: [
                {
                    id: "leftBars",
                    name: "Pivot Period",
                    defval: 8,
                    type: "integer",
                    min: 1,
                    max: 50
                },
                {
                    id: "sensitivity",
                    name: "Trend Sensitivity",
                    defval: 1,
                    type: "integer",
                    min: 1,
                    max: 10
                }
            ],

            styles: {}
        },

        constructor: function () {
            this.init = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                // Variables for pivot detection and trend analysis
                this.priceHistory = [];
                this.barIndex = 0;

                // Structure tracking variables
                this.upperLine = NaN;
                this.lowerLine = NaN;
                this.count1 = 0; // Uptrend structure counter
                this.count2 = 0; // Downtrend structure counter
                this.count_trend1 = 0; // Uptrend counter
                this.count_trend2 = 0; // Downtrend counter

                // Trend state
                this.currentTrend = 1; // 0 = downtrend, 1 = neutral, 2 = uptrend
            };

            this.main = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                // Get input values
                const leftBars = this._input(0);
                const rightBars = leftBars;
                const sensitivity = this._input(1);

                // Select main symbol
                this._context.select_sym(0);

                // Get price data
                const open = PineJS.Std.open(this._context);
                const high = PineJS.Std.high(this._context);
                const low = PineJS.Std.low(this._context);
                const close = PineJS.Std.close(this._context);

                // Store current bar data
                this.priceHistory.push({
                    high: high,
                    low: low,
                    close: close,
                    open: open,
                    barIndex: this.barIndex
                });

                // Keep only necessary history
                const maxHistory = leftBars + rightBars + 20;
                if (this.priceHistory.length > maxHistory) {
                    this.priceHistory.shift();
                }

                // Calculate pivot highs and lows
                if (this.priceHistory.length >= leftBars + rightBars + 1) {
                    const centerIndex = this.priceHistory.length - rightBars - 1;

                    if (centerIndex >= leftBars && centerIndex < this.priceHistory.length - rightBars) {
                        const centerBar = this.priceHistory[centerIndex];

                        // Check for pivot high
                        let isHighPivot = true;
                        for (let i = centerIndex - leftBars; i <= centerIndex + rightBars; i++) {
                            if (i !== centerIndex && i >= 0 && i < this.priceHistory.length) {
                                if (this.priceHistory[i].high >= centerBar.high) {
                                    isHighPivot = false;
                                    break;
                                }
                            }
                        }

                        // Check for pivot low
                        let isLowPivot = true;
                        for (let i = centerIndex - leftBars; i <= centerIndex + rightBars; i++) {
                            if (i !== centerIndex && i >= 0 && i < this.priceHistory.length) {
                                if (this.priceHistory[i].low <= centerBar.low) {
                                    isLowPivot = false;
                                    break;
                                }
                            }
                        }

                        // Update structure lines
                        if (isHighPivot) {
                            this.upperLine = centerBar.high;
                        }

                        if (isLowPivot) {
                            this.lowerLine = centerBar.low;
                        }
                    }
                }

                // Market structure logic
                if (!isNaN(this.upperLine) && high > this.upperLine && low < this.upperLine) {
                    this.count1 += sensitivity;
                    this.count2 = 0;
                }

                if (!isNaN(this.lowerLine) && high > this.lowerLine && low < this.lowerLine) {
                    this.count2 += sensitivity;
                    this.count1 = 0;
                }

                // Update trend counters
                if (this.count1 > 0) {
                    this.count_trend2 = 0;
                    this.count_trend1 += 1;
                    this.currentTrend = 2; // Uptrend
                }
                if (this.count2 > 0) {
                    this.count_trend1 = 0;
                    this.count_trend2 += 1;
                    this.currentTrend = 0; // Downtrend
                }

                this.barIndex++;

                // Return: [open, high, low, close, bar_color, wick_color, border_color]
                return [
                    open,
                    high,
                    low,
                    close,
                    this.currentTrend,  // bar color
                    this.currentTrend,  // wick color
                    this.currentTrend   // border color
                ];
            };
        }
    };
}
