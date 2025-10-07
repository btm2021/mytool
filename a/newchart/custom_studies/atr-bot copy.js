// ATR Bot Custom Study
// Converted from PineScript to TradingView Charting Library format

function createATRBot(PineJS) {
    return {
        name: "ATR Bot",
        metainfo: {
            _metainfoVersion: 51,
            id: "atrbot@tv-basicstudies-1",
            name: "ATR Bot",
            description: "ATR Dynamic Trail with EMA and State Change Detection",
            shortDescription: "ATR Bot",
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,

            plots: [
                { id: "plot_0", type: "line" },
                { id: "plot_1", type: "line" }
            ],

            defaults: {
                styles: {
                    plot_0: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#26a69a"
                    },
                    plot_1: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#ef5350"
                    }
                },
                filledAreasStyle: {
                    fillarea_0: {
                        color: "#26a69a",
                        transparency: 90,
                        visible: true
                    }
                },
                inputs: {
                    tf_atr_length: 14,
                    tf_atr_mult: 2.0,
                    source: "close",
                    ema_length: 30
                }
            },

            inputs: [
                {
                    id: "tf_atr_length",
                    name: "ATR Length",
                    defval: 14,
                    type: "integer",
                    min: 1,
                    max: 500
                },
                {
                    id: "tf_atr_mult",
                    name: "ATR Multiplier",
                    defval: 2.0,
                    type: "float",
                    min: 0.1,
                    max: 10.0,
                    step: 0.1
                },
                {
                    id: "source",
                    name: "Source",
                    defval: "close",
                    type: "source",
                    options: ["open", "high", "low", "close", "hl2", "hlc3", "ohlc4"]
                },
                {
                    id: "ema_length",
                    name: "EMA Length",
                    defval: 30,
                    type: "integer",
                    min: 1,
                    max: 500
                }
            ],

            styles: {
                plot_0: {
                    title: "Trail 1 (EMA)",
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_1: {
                    title: "Trail 2 (ATR Trail)",
                    histogramBase: 0,
                    joinPoints: true
                }
            },

            filledAreas: [
                {
                    id: "fillarea_0",
                    objAId: "plot_0",
                    objBId: "plot_1",
                    type: "plot_plot",
                    title: "Trail Fill"
                }
            ],

            precision: 4,
            format: {
                type: "price",
                precision: 4
            }
        },

        constructor: function () {
            this.init = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                // Variables to store previous values
                this.trail2_prev = NaN;
                this.ema_prev = NaN;
                this.trail1_prev_bar = NaN;

                // Variables for ATR RMA calculation
                this.atr_prev = NaN;
                this.prev_close = NaN;
            };

            this.main = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                // Get input values
                const atr_length = this._input(0);
                const atr_mult = this._input(1);
                const source_type = this._input(2);
                const ema_length = this._input(3);

                // Get price data
                const high = PineJS.Std.high(this._context);
                const low = PineJS.Std.low(this._context);
                const close = PineJS.Std.close(this._context);
                const open = PineJS.Std.open(this._context);

                // Get source based on input type
                let src;
                switch (source_type) {
                    case "open":
                        src = open;
                        break;
                    case "high":
                        src = high;
                        break;
                    case "low":
                        src = low;
                        break;
                    case "hl2":
                        src = (high + low) / 2;
                        break;
                    case "hlc3":
                        src = (high + low + close) / 3;
                        break;
                    case "ohlc4":
                        src = (open + high + low + close) / 4;
                        break;
                    default:
                        src = close;
                }

                // Calculate EMA (Trail1)
                let trail1;
                if (isNaN(this.ema_prev)) {
                    // First bar - use source as initial value
                    trail1 = src;
                } else {
                    // EMA formula: alpha * src + (1 - alpha) * prev_ema
                    const alpha = 2.0 / (ema_length + 1);
                    trail1 = alpha * src + (1 - alpha) * this.ema_prev;
                }

                // Calculate True Range
                let tr;
                if (isNaN(this.prev_close)) {
                    // First bar - use high-low
                    tr = high - low;
                } else {
                    tr = Math.max(
                        high - low,
                        Math.abs(high - this.prev_close),
                        Math.abs(low - this.prev_close)
                    );
                }

                // Calculate ATR using RMA (Wilder's smoothing) - same as ta.atr() in PineScript
                let atr;
                if (isNaN(this.atr_prev)) {
                    // First bar - use TR as initial ATR
                    atr = tr;
                } else {
                    // RMA formula: (prev_atr * (length - 1) + tr) / length
                    atr = (this.atr_prev * (atr_length - 1) + tr) / atr_length;
                }

                const atr_value = atr * atr_mult;

                // Calculate Trail2 based on PineScript logic
                let trail2;
                const trail2_prev = isNaN(this.trail2_prev) ? 0 : this.trail2_prev;
                const trail1_prev = isNaN(this.trail1_prev_bar) ? trail1 : this.trail1_prev_bar;

                // PineScript logic:
                // iff_1 = Trail1 > nz(Trail2[1], 0) ? Trail1 - SL2 : Trail1 + SL2
                // iff_2 = Trail1 < nz(Trail2[1], 0) and Trail1[1] < nz(Trail2[1], 0) ? 
                //         math.min(nz(Trail2[1], 0), Trail1 + SL2) : iff_1
                // Trail2 := Trail1 > nz(Trail2[1], 0) and Trail1[1] > nz(Trail2[1], 0) ? 
                //           math.max(nz(Trail2[1], 0), Trail1 - SL2) : iff_2

                if (trail1 > trail2_prev) {
                    if (trail1_prev > trail2_prev) {
                        // Uptrend continues: math.max(trail2_prev, trail1 - atr_value)
                        trail2 = Math.max(trail2_prev, trail1 - atr_value);
                    } else {
                        // New uptrend: trail1 - atr_value
                        trail2 = trail1 - atr_value;
                    }
                } else {
                    if (trail1 < trail2_prev && trail1_prev < trail2_prev) {
                        // Downtrend continues: math.min(trail2_prev, trail1 + atr_value)
                        trail2 = Math.min(trail2_prev, trail1 + atr_value);
                    } else {
                        // New downtrend: trail1 + atr_value
                        trail2 = trail1 + atr_value;
                    }
                }

                // Store values for next bar
                this.trail1_prev_bar = trail1;
                this.trail2_prev = trail2;
                this.ema_prev = trail1;
                this.atr_prev = atr;
                this.prev_close = close;

                // Return plots
                return [trail1, trail2];
            };
        }
    };
}
