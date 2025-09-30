/**
 * Custom Indicators for TradingView Advanced Chart
 * ATR Trailing Stop - Based on PineScript
 */

// ============================================================================
// ATR Trailing Stop Indicator
// ============================================================================
function createTrailIndicator(PineJS) {
    return {
        name: 'ATR Trailing Stop',
        metainfo: {
            _metainfoVersion: 52,
            id: "ATRTrailingStop@tv-basicstudies-1",
            description: "ATR Trailing Stop",
            shortDescription: "ATR TS",
            
            is_price_study: true,
            is_hidden_study: false,
            
            format: {
                type: 'price',
                precision: 4,
            },
            
            defaults: {
                styles: {
                    plot_0: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: '#22AB94' // Green for Trail1
                    },
                    plot_1: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: '#F23645' // Red for Trail2
                    }
                }
            },
            
            plots: [
                { id: 'plot_0', type: 'line' },
                { id: 'plot_1', type: 'line' }
            ],
            
            styles: {
                plot_0: { title: 'Trail1 (EMA)', histogramBase: 0 },
                plot_1: { title: 'Trail2 (ATR Stop)', histogramBase: 0 }
            },
            
            inputs: [
                {
                    id: 'atr_length',
                    name: 'ATR Length',
                    defval: 14,
                    type: 'integer',
                    min: 1,
                    max: 100
                },
                {
                    id: 'atr_mult',
                    name: 'ATR Multiplier',
                    defval: 2.0,
                    type: 'float',
                    min: 0.1,
                    max: 10.0,
                    step: 0.1
                },
                {
                    id: 'ema_length',
                    name: 'EMA Length',
                    defval: 30,
                    type: 'integer',
                    min: 1,
                    max: 200
                }
            ]
        },
        
        constructor: function() {
            this.init = function(context, inputCallback) {
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
            
            this.main = function(context, inputCallback) {
                this._context = context;
                this._input = inputCallback;
                
                // Get input values
                const atr_length = this._input(0);
                const atr_mult = this._input(1);
                const ema_length = this._input(2);
                
                // Get price data
                const high = PineJS.Std.high(this._context);
                const low = PineJS.Std.low(this._context);
                const close = PineJS.Std.close(this._context);
                
                // Calculate EMA (Trail1)
                let trail1;
                if (isNaN(this.ema_prev)) {
                    // First bar - use close as initial value
                    trail1 = close;
                } else {
                    // EMA formula: alpha * close + (1 - alpha) * prev_ema
                    const alpha = 2.0 / (ema_length + 1);
                    trail1 = alpha * close + (1 - alpha) * this.ema_prev;
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
                
                if (trail1 > trail2_prev) {
                    if (trail1_prev > trail2_prev) {
                        // math.max(trail2_prev, trail1 - atr_value)
                        trail2 = Math.max(trail2_prev, trail1 - atr_value);
                    } else {
                        // trail1 - atr_value
                        trail2 = trail1 - atr_value;
                    }
                } else {
                    if (trail1 < trail2_prev && trail1_prev < trail2_prev) {
                        // math.min(trail2_prev, trail1 + atr_value)
                        trail2 = Math.min(trail2_prev, trail1 + atr_value);
                    } else {
                        // trail1 + atr_value
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

// ============================================================================
// VSR (Volume Support Resistance) Indicator
// ============================================================================
function createVSRIndicator(PineJS) {
    return {
        name: 'VSR - Volume Support Resistance',
        metainfo: {
            _metainfoVersion: 52,
            id: "VSR@tv-basicstudies-1",
            description: "Volume Support Resistance",
            shortDescription: "VSR",
            
            is_price_study: true,
            is_hidden_study: false,
            
            format: {
                type: 'price',
                precision: 4,
            },
            
            defaults: {
                styles: {
                    plot_0: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 100,
                        visible: true,
                        color: '#2962FF'
                    },
                    plot_1: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 100,
                        visible: true,
                        color: '#2962FF'
                    }
                },
                filledAreasStyle: {
                    fill_0: {
                        color: '#2962FF',
                        transparency: 50,
                        visible: true
                    }
                }
            },
            
            plots: [
                { id: 'plot_0', type: 'line' },
                { id: 'plot_1', type: 'line' }
            ],
            
            styles: {
                plot_0: { title: 'VSR Upper', histogramBase: 0 },
                plot_1: { title: 'VSR Lower', histogramBase: 0 }
            },
            
            filledAreas: [
                {
                    id: 'fill_0',
                    objAId: 'plot_0',
                    objBId: 'plot_1',
                    type: 'plot_plot',
                    title: 'VSR Zone'
                }
            ],
            
            inputs: [
                {
                    id: 'vsr_length',
                    name: 'Volume SD Length',
                    defval: 10,
                    type: 'integer',
                    min: 1,
                    max: 100
                },
                {
                    id: 'vsr_threshold',
                    name: 'Volume Threshold',
                    defval: 10.0,
                    type: 'float',
                    min: 1.0,
                    max: 50.0,
                    step: 0.5
                },
                {
                    id: 'show_vsr',
                    name: 'Show VSR',
                    defval: true,
                    type: 'bool'
                }
            ]
        },
        
        constructor: function() {
            this.init = function(context, inputCallback) {
                this._context = context;
                this._input = inputCallback;
                
                // Store history for calculations
                this.volume_history = [];
                this.change_history = [];
                this.stdev_history = [];
                this.high_history = [];
                this.low_history = [];
                this.close_history = [];
                
                // Store last valid VSR levels
                this.last_upper = NaN;
                this.last_lower = NaN;
            };
            
            this.main = function(context, inputCallback) {
                this._context = context;
                this._input = inputCallback;
                
                // Get input values
                const vsr_length = this._input(0);
                const vsr_threshold = this._input(1);
                const show_vsr = this._input(2);
                
                // Get current bar data
                const volume = PineJS.Std.volume(this._context);
                const high = PineJS.Std.high(this._context);
                const low = PineJS.Std.low(this._context);
                const close = PineJS.Std.close(this._context);
                
                // Store current values
                this.volume_history.push(volume);
                this.high_history.push(high);
                this.low_history.push(low);
                this.close_history.push(close);
                
                // Keep only necessary length
                const keep_length = vsr_length + 2;
                if (this.volume_history.length > keep_length) {
                    this.volume_history.shift();
                    this.high_history.shift();
                    this.low_history.shift();
                    this.close_history.shift();
                }
                
                // Need at least 2 bars to calculate
                if (this.volume_history.length < 2) {
                    return [NaN, NaN];
                }
                
                // Calculate volume change: volume / volume[1] - 1
                const prev_volume = this.volume_history[this.volume_history.length - 2];
                const change = (volume / prev_volume) - 1;
                
                this.change_history.push(change);
                if (this.change_history.length > vsr_length) {
                    this.change_history.shift();
                }
                
                // Calculate standard deviation of change
                if (this.change_history.length >= vsr_length) {
                    const mean = this.change_history.reduce((a, b) => a + b, 0) / this.change_history.length;
                    const variance = this.change_history.reduce((sum, val) => {
                        return sum + Math.pow(val - mean, 2);
                    }, 0) / this.change_history.length;
                    const stdev = Math.sqrt(variance);
                    
                    this.stdev_history.push(stdev);
                    if (this.stdev_history.length > 2) {
                        this.stdev_history.shift();
                    }
                    
                    // Calculate difference and signal
                    if (this.stdev_history.length >= 1) {
                        const prev_stdev = this.stdev_history[0];
                        
                        if (prev_stdev > 0) {
                            const difference = change / prev_stdev;
                            const signal = Math.abs(difference);
                            
                            // Check if signal exceeds threshold (valuewhen logic)
                            if (signal > vsr_threshold) {
                                // Get previous bar's high, low, close
                                const prev_high = this.high_history[this.high_history.length - 2];
                                const prev_low = this.low_history[this.low_history.length - 2];
                                const prev_close = this.close_history[this.close_history.length - 2];
                                
                                // Update VSR levels
                                this.last_upper = Math.max(prev_high, prev_close);
                                this.last_lower = Math.min(prev_low, prev_close);
                            }
                        }
                    }
                }
                
                // Return current VSR levels (or NaN if show_vsr is false)
                if (show_vsr) {
                    return [this.last_upper, this.last_lower];
                } else {
                    return [NaN, NaN];
                }
            };
        }
    };
}

// ============================================================================
// REGISTER INDICATORS
// ============================================================================

// TEMPORARILY DISABLED FOR DEBUGGING
// window.createCustomIndicators = function(PineJS) {
//     return [
//         createTrailIndicator(PineJS),
//         createVSRIndicator(PineJS)
//     ];
// };

console.log('Custom Indicators module loaded (DISABLED FOR DEBUGGING)');
