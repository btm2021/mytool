// VSR (Volume Spike Reversal) Custom Study
// Converted from PineScript to TradingView Charting Library format

function createVSR(PineJS) {
    return {
        name: "VSR",
        metainfo: {
            _metainfoVersion: 51,
            id: "vsr@tv-basicstudies-1",
            name: "VSR",
            description: "Volume Spike Reversal Levels",
            shortDescription: "VSR",
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
                        color: "#FFEB3B"
                    },
                    plot_1: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#FFEB3B"
                    }
                },
                filledAreasStyle: {
                    fillarea_0: {
                        color: "#FFEB3B",
                        transparency: 90,
                        visible: true
                    }
                },
                inputs: {
                    vsr2_length: 10,
                    vsr2_threshold: 5.0
                }
            },

            inputs: [
                {
                    id: "vsr2_length",
                    name: "Volume SD Length",
                    defval: 10,
                    type: "integer",
                    min: 1,
                    max: 500
                },
                {
                    id: "vsr2_threshold",
                    name: "Volume Threshold",
                    defval: 5.0,
                    type: "float",
                    min: 1.0,
                    max: 20.0,
                    step: 0.1
                }
            ],

            styles: {
                plot_0: {
                    title: "VSR Upper",
                    histogramBase: 0,
                    joinPoints: false
                },
                plot_1: {
                    title: "VSR Lower",
                    histogramBase: 0,
                    joinPoints: false
                }
            },

            filledAreas: [
                {
                    id: "fillarea_0",
                    objAId: "plot_0",
                    objBId: "plot_1",
                    type: "plot_plot",
                    title: "VSR Zone"
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
                this.prev_volume = NaN;
                this.prev_high = NaN;
                this.prev_low = NaN;
                this.prev_close = NaN;
                this.prev_stdev = NaN;

                this.vsr_upper = NaN;
                this.vsr_lower = NaN;

                // Array to store volume changes for stdev calculation
                this.volume_changes = [];
            };

            this.main = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                // Get input values
                const length = this._input(0);
                const threshold = this._input(1);

                // Get price and volume data
                const high = PineJS.Std.high(this._context);
                const low = PineJS.Std.low(this._context);
                const close = PineJS.Std.close(this._context);
                const volume = PineJS.Std.volume(this._context);

                // Calculate volume change
                let change = 0;
                if (!isNaN(this.prev_volume) && this.prev_volume !== 0) {
                    change = volume / this.prev_volume - 1;
                }

                // Store volume change in array
                this.volume_changes.push(change);
                if (this.volume_changes.length > length) {
                    this.volume_changes.shift(); // Remove oldest value
                }

                // Calculate standard deviation of volume changes
                let stdev = 0;
                if (this.volume_changes.length >= 2) {
                    // Calculate mean
                    const sum = this.volume_changes.reduce((a, b) => a + b, 0);
                    const mean = sum / this.volume_changes.length;

                    // Calculate variance
                    const variance = this.volume_changes.reduce((acc, val) => {
                        return acc + Math.pow(val - mean, 2);
                    }, 0) / this.volume_changes.length;

                    // Standard deviation
                    stdev = Math.sqrt(variance);
                }

                // Calculate difference and signal
                let difference = 0;
                let signal = 0;

                if (!isNaN(this.prev_stdev) && this.prev_stdev !== 0 && this.volume_changes.length >= 2) {
                    difference = change / this.prev_stdev;
                    signal = Math.abs(difference);
                }

                // Update VSR levels when signal exceeds threshold
                // Use previous bar's high/close for upper and low/close for lower
                if (signal > threshold && !isNaN(this.prev_high)) {
                    this.vsr_upper = Math.max(this.prev_high, this.prev_close);
                    this.vsr_lower = Math.min(this.prev_low, this.prev_close);

                    // Debug log

                }

                // Store current values for next bar
                this.prev_volume = volume;
                this.prev_high = high;
                this.prev_low = low;
                this.prev_close = close;
                this.prev_stdev = stdev;

                // Return current VSR levels (or NaN if not set yet)
                let upper = this.vsr_upper;
                let lower = this.vsr_lower;

                // If no VSR levels set yet, don't plot anything
                if (isNaN(upper)) {
                    upper = NaN;
                }
                if (isNaN(lower)) {
                    lower = NaN;
                }

                return [upper, lower];
            };
        }
    };
}
