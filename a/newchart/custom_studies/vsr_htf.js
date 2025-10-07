// VSR-HTF (Volume Spike Reversal using Higher Timeframe)
// Fixed version: mặc định khung 1H, bỏ input chọn timeframe
// Yêu cầu: bật enabled_features: ['studies_extend_time_scale']

function createVSR_HTF(PineJS) {
    return {
        name: "VSR HTF",
        metainfo: {
            _metainfoVersion: 51,
            id: "vsr htf@tv-basicstudies-1",
            name: "VSR HTF",
            description: "Volume Spike Reversal (fixed 1H timeframe)",
            shortDescription: "VSR HTF",
            is_price_study: true,
            isCustomIndicator: true,
            canExtendTimeScale: true,

            plots: [
                { id: "plot_0", type: "line" },
                { id: "plot_1", type: "line" }
            ],

            defaults: {
                styles: {
                    plot_0: { color: "#FFEB3B", linewidth: 1 },
                    plot_1: { color: "#FFEB3B", linewidth: 1 }
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
                    defval: 5,
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
                plot_0: { title: "VSR Upper", joinPoints: false },
                plot_1: { title: "VSR Lower", joinPoints: false }
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
            format: { type: "price", precision: 4 }
        },

        constructor: function () {
            this.init = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                this._htfCreated = false;
                this._htfTimeLast = undefined;

                this._currHTF = null;
                this._prevHTF = null;
                this._prevPrevHTF = null;

                this.volume_changes = [];
                this.prev_stdev = NaN;
                this.vsr_upper = NaN;
                this.vsr_lower = NaN;
            };

            this.main = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                const length = this._input(0);
                const threshold = this._input(1);
                const htfRes = "60"; // ✅ cố định khung 1H

                this._context.select_sym(0);
                const baseSymbol = PineJS.Std.ticker(this._context);

                // Tạo symbol khung 1H nếu chưa có
                if (!this._htfCreated) {
                    this._context.new_sym(baseSymbol, htfRes);
                    this._htfCreated = true;
                }

                // Chuyển sang symbol HTF (1H)
                this._context.select_sym(1);

                const h = PineJS.Std.high(this._context);
                const l = PineJS.Std.low(this._context);
                const c = PineJS.Std.close(this._context);
                const v = PineJS.Std.volume(this._context);
                const t = this._context.symbol.time;

                if (this._htfTimeLast === undefined) {
                    this._currHTF = { time: t, high: h, low: l, close: c, volume: v };
                    this._htfTimeLast = t;
                    return [NaN, NaN];
                }

                if (t !== this._htfTimeLast) {
                    this._prevPrevHTF = this._prevHTF;
                    this._prevHTF = this._currHTF;
                    this._currHTF = { time: t, high: h, low: l, close: c, volume: v };

                    if (this._prevHTF && this._prevPrevHTF && this._prevPrevHTF.volume !== 0) {
                        const change = this._prevHTF.volume / this._prevPrevHTF.volume - 1;
                        this.volume_changes.push(change);
                        if (this.volume_changes.length > length) this.volume_changes.shift();

                        let stdev = 0;
                        if (this.volume_changes.length >= 2) {
                            const mean = this.volume_changes.reduce((a, b) => a + b, 0) / this.volume_changes.length;
                            const variance = this.volume_changes.reduce(
                                (acc, val) => acc + Math.pow(val - mean, 2),
                                0
                            ) / this.volume_changes.length;
                            stdev = Math.sqrt(variance);
                        }

                        const norm = !isNaN(this.prev_stdev) && this.prev_stdev !== 0 ? this.prev_stdev : stdev;
                        const signal = norm > 0 ? Math.abs(change) / norm : 0;

                        if (signal > threshold) {
                            this.vsr_upper = Math.max(this._prevHTF.high, this._prevHTF.close);
                            this.vsr_lower = Math.min(this._prevHTF.low, this._prevHTF.close);
                        }

                        this.prev_stdev = stdev;
                    }

                    this._htfTimeLast = t;
                } else {
                    this._currHTF = { time: t, high: h, low: l, close: c, volume: v };
                }

                return [this.vsr_upper, this.vsr_lower];
            };
        }
    };
}
