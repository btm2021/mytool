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
                { id: "plot_1", type: "line" },
                { id: "plot_2", type: "line" },  // Trail1 for green fill
                { id: "plot_3", type: "line" }   // Trail1 for red fill
            ],

            defaults: {
                styles: {
                    plot_0: {
                        linestyle: 0,
                        linewidth: 0,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#26a69a"
                    },
                    plot_1: {
                        linestyle: 0,
                        linewidth: 0,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#ef5350"
                    },
                    plot_2: {
                        linestyle: 0,
                        linewidth: 0,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 100,
                        visible: true,
                        color: "#26a69a"
                    },
                    plot_3: {
                        linestyle: 0,
                        linewidth: 0,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 100,
                        visible: true,
                        color: "#ef5350"
                    }
                },
                filledAreasStyle: {
                    fillarea_0: {
                        color: "#26a69a",
                        transparency: 50,
                        visible: true
                    },
                    fillarea_1: {
                        color: "#ef5350",
                        transparency: 50,
                        visible: true
                    }
                },
                inputs: {
                    tf_atr_length: 14,
                    tf_atr_mult: 2.0,
                    source: "close",
                    ma_type: "EMA",
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
                    id: "ma_type",
                    name: "MA Type",
                    defval: "EMA",
                    type: "text",
                    options: ["EMA", "WMA", "VWMA", "HMA"]
                },
                {
                    id: "ema_length",
                    name: "MA Length",
                    defval: 30,
                    type: "integer",
                    min: 1,
                    max: 500
                }
            ],

            styles: {
                plot_0: {
                    title: "Trail 1 (MA)",
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_1: {
                    title: "Trail 2 (ATR Trail)",
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_2: {
                    title: "Trail 1 Green",
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_3: {
                    title: "Trail 1 Red",
                    histogramBase: 0,
                    joinPoints: true
                }
            },

            filledAreas: [
                {
                    id: "fillarea_0",
                    objAId: "plot_2",
                    objBId: "plot_1",
                    type: "plot_plot",
                    title: "Green Fill (Trail1 > Trail2)"
                },
                {
                    id: "fillarea_1",
                    objAId: "plot_3",
                    objBId: "plot_1",
                    type: "plot_plot",
                    title: "Red Fill (Trail1 < Trail2)"
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
                this.ma_prev = NaN;
                this.trail1_prev_bar = NaN;

                // Variables for ATR RMA calculation
                this.atr_prev = NaN;
                this.prev_close = NaN;

                // Variables for WMA calculation
                this.wma_buffer = [];

                // Variables for VWMA calculation
                this.vwma_buffer = [];
                this.volume_buffer = [];

                // Variables for HMA calculation
                this.hma_wma_half = NaN;
                this.hma_wma_full = NaN;
                this.hma_buffer = [];
            };

            this.main = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                // Get input values
                const atr_length = this._input(0);
                const atr_mult = this._input(1);
                const source_type = this._input(2);
                const ma_type = this._input(3);
                const ma_length = this._input(4);

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

                // Get volume for VWMA
                const volume = PineJS.Std.volume(this._context);

                // Calculate MA (Trail1) based on selected type
                let trail1;
                
                switch (ma_type) {
                    case "EMA":
                        // EMA calculation
                        if (isNaN(this.ma_prev)) {
                            trail1 = src;
                        } else {
                            const alpha = 2.0 / (ma_length + 1);
                            trail1 = alpha * src + (1 - alpha) * this.ma_prev;
                        }
                        break;

                    case "WMA":
                        // WMA calculation
                        this.wma_buffer.push(src);
                        if (this.wma_buffer.length > ma_length) {
                            this.wma_buffer.shift();
                        }
                        
                        if (this.wma_buffer.length === ma_length) {
                            let sum = 0;
                            let weightSum = 0;
                            for (let i = 0; i < ma_length; i++) {
                                const weight = i + 1;
                                sum += this.wma_buffer[i] * weight;
                                weightSum += weight;
                            }
                            trail1 = sum / weightSum;
                        } else {
                            trail1 = src;
                        }
                        break;

                    case "VWMA":
                        // VWMA calculation
                        this.vwma_buffer.push(src);
                        this.volume_buffer.push(volume);
                        if (this.vwma_buffer.length > ma_length) {
                            this.vwma_buffer.shift();
                            this.volume_buffer.shift();
                        }
                        
                        if (this.vwma_buffer.length === ma_length) {
                            let sum = 0;
                            let volumeSum = 0;
                            for (let i = 0; i < ma_length; i++) {
                                sum += this.vwma_buffer[i] * this.volume_buffer[i];
                                volumeSum += this.volume_buffer[i];
                            }
                            trail1 = volumeSum > 0 ? sum / volumeSum : src;
                        } else {
                            trail1 = src;
                        }
                        break;

                    case "HMA":
                        // HMA calculation: HMA = WMA(2*WMA(n/2) - WMA(n), sqrt(n))
                        const halfLength = Math.floor(ma_length / 2);
                        const sqrtLength = Math.floor(Math.sqrt(ma_length));
                        
                        this.hma_buffer.push(src);
                        if (this.hma_buffer.length > ma_length) {
                            this.hma_buffer.shift();
                        }
                        
                        if (this.hma_buffer.length >= halfLength) {
                            // Calculate WMA(n/2)
                            let sum_half = 0;
                            let weight_half = 0;
                            for (let i = 0; i < halfLength; i++) {
                                const idx = this.hma_buffer.length - halfLength + i;
                                const weight = i + 1;
                                sum_half += this.hma_buffer[idx] * weight;
                                weight_half += weight;
                            }
                            const wma_half = sum_half / weight_half;
                            
                            // Calculate WMA(n)
                            let sum_full = 0;
                            let weight_full = 0;
                            const fullLen = Math.min(this.hma_buffer.length, ma_length);
                            for (let i = 0; i < fullLen; i++) {
                                const idx = this.hma_buffer.length - fullLen + i;
                                const weight = i + 1;
                                sum_full += this.hma_buffer[idx] * weight;
                                weight_full += weight;
                            }
                            const wma_full = sum_full / weight_full;
                            
                            // Calculate 2*WMA(n/2) - WMA(n)
                            const raw_hma = 2 * wma_half - wma_full;
                            
                            // Store for final WMA calculation
                            if (!this.hma_final_buffer) this.hma_final_buffer = [];
                            this.hma_final_buffer.push(raw_hma);
                            if (this.hma_final_buffer.length > sqrtLength) {
                                this.hma_final_buffer.shift();
                            }
                            
                            // Calculate final WMA(sqrt(n))
                            if (this.hma_final_buffer.length === sqrtLength) {
                                let sum_final = 0;
                                let weight_final = 0;
                                for (let i = 0; i < sqrtLength; i++) {
                                    const weight = i + 1;
                                    sum_final += this.hma_final_buffer[i] * weight;
                                    weight_final += weight;
                                }
                                trail1 = sum_final / weight_final;
                            } else {
                                trail1 = raw_hma;
                            }
                        } else {
                            trail1 = src;
                        }
                        break;

                    default:
                        trail1 = src;
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
                this.ma_prev = trail1;
                this.atr_prev = atr;
                this.prev_close = close;

                // Determine which fill to show based on trail1 vs trail2
                let trail1_green = NaN;  // For green fill (when trail1 > trail2)
                let trail1_red = NaN;    // For red fill (when trail1 < trail2)

                if (trail1 > trail2) {
                    trail1_green = trail1;  // Show green fill
                    trail1_red = NaN;       // Hide red fill
                } else {
                    trail1_green = NaN;     // Hide green fill
                    trail1_red = trail1;    // Show red fill
                }

                // Return plots: [trail1, trail2, trail1_green, trail1_red]
                return [trail1, trail2, trail1_green, trail1_red];
            };
        }
    };
}
