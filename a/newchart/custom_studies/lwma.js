// LWMA (Linear Weighted Moving Average) Custom Study
// Converted from PineScript to TradingView Charting Library format

function createLWMA(PineJS) {
    return {
        name: "LWMA",
        metainfo: {
            _metainfoVersion: 51,
            id: "lwma@tv-basicstudies-1",
            name: "LWMA",
            description: "Linear Weighted Moving Average",
            shortDescription: "LWMA",
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,

            plots: [
                { id: "plot_0", type: "line" }
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
                        color: "#2196F3"
                    }
                },
                inputs: {
                    lwma_source: "close",
                    lwma_period: 10,
                    lwma_weight: 6,
                    colorChange: true
                }
            },

            inputs: [
                {
                    id: "lwma_source",
                    name: "Source",
                    defval: "close",
                    type: "source"
                },
                {
                    id: "lwma_period",
                    name: "Lookback Period",
                    defval: 10,
                    type: "integer",
                    min: 1,
                    max: 500
                },
                {
                    id: "lwma_weight",
                    name: "Weight",
                    defval: 6,
                    type: "integer",
                    min: 1,
                    max: 100
                },
                {
                    id: "colorChange",
                    name: "Directional Color Change",
                    defval: true,
                    type: "bool"
                }
            ],

            styles: {
                plot_0: {
                    title: "LWMA",
                    histogramBase: 0,
                    joinPoints: true
                }
            },

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
                this.priceHistory = [];
            };

            this.main = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                const sourceType = this._input(0);
                const period = this._input(1);
                const weight = this._input(2);
                const colorChange = this._input(3);

                // Get source price
                let price;
                switch (sourceType) {
                    case "open":
                        price = PineJS.Std.open(this._context);
                        break;
                    case "high":
                        price = PineJS.Std.high(this._context);
                        break;
                    case "low":
                        price = PineJS.Std.low(this._context);
                        break;
                    case "close":
                    default:
                        price = PineJS.Std.close(this._context);
                        break;
                }

                // Store price in history
                this.priceHistory.push(price);
                if (this.priceHistory.length > period) {
                    this.priceHistory.shift();
                }

                // Calculate LWMA
                let lwma = NaN;
                if (this.priceHistory.length >= period) {
                    const sub = (weight / period) - 1;
                    let sum = 0;
                    let divider = 0;

                    for (let i = 0; i < period; i++) {
                        const p = this.priceHistory[period - 1 - i] * ((weight - i) - sub);
                        const d = (weight - i) - sub;
                        sum += p;
                        divider += d;
                    }

                    lwma = sum / divider;
                }

                // Color change logic
                if (colorChange && !isNaN(lwma) && this.priceHistory.length >= period + 1) {
                    const prevLwma = this.calculatePrevLWMA(period, weight);
                    if (!isNaN(prevLwma)) {
                        const lwmaRise = prevLwma < lwma;
                        const color = lwmaRise ? "#089981" : "#F23645";
                        this._context.new_sym(0, PineJS.Std.color(color));
                    }
                }

                return [lwma];
            };

            this.calculatePrevLWMA = function (period, weight) {
                if (this.priceHistory.length < period + 1) {
                    return NaN;
                }

                const sub = (weight / period) - 1;
                let sum = 0;
                let divider = 0;

                for (let i = 0; i < period; i++) {
                    const p = this.priceHistory[period - 2 - i] * ((weight - i) - sub);
                    const d = (weight - i) - sub;
                    sum += p;
                    divider += d;
                }

                return sum / divider;
            };
        }
    };
}
