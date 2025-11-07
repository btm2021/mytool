class ChartManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.candlestickSeries = null;
        this.emaSeries = null;
        
        // Measure tool state
        this.measureTools = [];
        this.isDrawingMode = false;
        this.drawingStartPoint = null;
        this.tempMeasureTool = null;
        this.onMeasureComplete = null;
        
        this.initialize();
    }

    // Initialize the chart
    initialize() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            throw new Error(`Container with id '${this.containerId}' not found`);
        }

        // Create chart with configuration
        this.chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: {
                    type: 'solid',
                    color: '#000000',
                },
                textColor: '#ffffff',
                fontSize: 11,
            },
            watermark: {
                visible: true,
                fontSize: 48,
                horzAlign: 'center',
                vertAlign: 'center',
                color: 'rgba(255, 255, 255, 0.05)',
                text: '',
            },
            grid: {
                vertLines: {
                    color: '#333333',
                },
                horzLines: {
                    color: '#333333',
                },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: '#333333',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
                mode: LightweightCharts.PriceScaleMode.Normal,
                autoScale: true,
            },
            timeScale: {
                borderColor: '#333333',
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
                barSpacing: 6,
            },
        });

        // Create candlestick series
        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#00ff00',
            downColor: '#ff0000',
            borderVisible: false,
            wickUpColor: '#00ff00',
            wickDownColor: '#ff0000',
            borderUpColor: '#00ff00',
            borderDownColor: '#ff0000',
        });

        // Create volume histogram series
        this.volumeSeries = this.chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: 'volume',
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
            title: '',
            lastValueVisible: false
        });

        // Configure volume price scale
        this.chart.priceScale('volume').applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        // Create ATR Bot 1 series (lines hidden, only show bandfill)
        this.trail1_1Series = this.chart.addLineSeries({
            color: 'rgba(0, 255, 0, 0)',
            lineWidth: 0,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false
        });

        this.trail2_1Series = this.chart.addLineSeries({
            color: 'rgba(255, 0, 0, 0)',
            lineWidth: 0,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false
        });

        this.atrBandFill1Series = this.chart.addCustomSeries(new Bandfillcolor.Bandfillcolor(), {
            highLineColor: 'rgba(0, 255, 0, 0)',
            lowLineColor: 'rgba(255, 0, 0, 0)',
            areaColor: 'rgba(128, 128, 0, 0.2)',
            highLineWidth: 0,
            lowLineWidth: 0,
            title: '',
            lastValueVisible: false
        });

        // Create ATR Bot 2 series (lines hidden, only show bandfill)
        this.trail1_2Series = this.chart.addLineSeries({
            color: 'rgba(0, 150, 255, 0)',
            lineWidth: 0,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false
        });

        this.trail2_2Series = this.chart.addLineSeries({
            color: 'rgba(255, 150, 0, 0)',
            lineWidth: 0,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false
        });

        this.atrBandFill2Series = this.chart.addCustomSeries(new Bandfillcolor.Bandfillcolor(), {
            highLineColor: 'rgba(0, 150, 255, 0)',
            lowLineColor: 'rgba(255, 150, 0, 0)',
            areaColor: 'rgba(128, 200, 255, 0.15)',
            highLineWidth: 0,
            lowLineWidth: 0,
            title: '',
            lastValueVisible: false
        });

        // Backward compatibility aliases
        this.trail1Series = this.trail1_1Series;
        this.trail2Series = this.trail2_1Series;
        this.atrBandFillSeries = this.atrBandFill1Series;


        // VSR will use FillRect plugin instead of line series
        // Store VSR rectangles arrays for both VSR indicators
        this.vsr1Rectangles = [];
        this.vsr2Rectangles = [];
        // Backward compatibility
        this.vsrRectangles = this.vsr1Rectangles;

        // Create Donchian Channel series
        this.donchianUpperSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.8)',
            lineWidth: 1,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false
        });

        this.donchianLowerSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.8)',
            lineWidth: 1,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false
        });

        this.donchianMiddleSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.5)',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dotted,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false
        });

        // Create Tenkan-sen series
        this.tenkansenSeries = this.chart.addLineSeries({
            color: 'rgba(255, 165, 0, 0.8)',
            lineWidth: 1,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false
        });

        // Handle resize
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    // Handle window resize
    handleResize() {
        const container = document.getElementById(this.containerId);
        if (container && this.chart) {
            this.chart.applyOptions({
                width: container.clientWidth,
                height: container.clientHeight,
            });
        }
    }

    // Update watermark with exchange, symbol, and timeframe
    updateWatermark(exchange, symbol, timeframe) {
        if (!this.chart) return;
        
        const watermarkText = `${exchange.toUpperCase()} ${symbol.toUpperCase()} ${timeframe.toUpperCase()}`;
        
        this.chart.applyOptions({
            watermark: {
                visible: true,
                fontSize: 48,
                horzAlign: 'center',
                vertAlign: 'center',
                color: 'rgba(230, 28, 28, 0.54)',
                text: watermarkText,
            }
        });
        
        console.log('Watermark updated:', watermarkText);
    }

    // Clear watermark
    clearWatermark() {
        if (!this.chart) return;
        
        this.chart.applyOptions({
            watermark: {
                visible: false,
            }
        });
    }

    // Clear all data from chart
    clearChart() {
        if (this.candlestickSeries) {
            this.candlestickSeries.setData([]);
        }
        // Clear ATR Bot 1
        if (this.trail1_1Series) {
            this.trail1_1Series.setData([]);
        }
        if (this.trail2_1Series) {
            this.trail2_1Series.setData([]);
        }
        if (this.atrBandFill1Series) {
            this.atrBandFill1Series.setData([]);
        }
        // Clear ATR Bot 2
        if (this.trail1_2Series) {
            this.trail1_2Series.setData([]);
        }
        if (this.trail2_2Series) {
            this.trail2_2Series.setData([]);
        }
        if (this.atrBandFill2Series) {
            this.atrBandFill2Series.setData([]);
        }
        // Clear VSR rectangles
        this.clearVSRRectangles();
        if (this.donchianUpperSeries) {
            this.donchianUpperSeries.setData([]);
        }
        if (this.donchianLowerSeries) {
            this.donchianLowerSeries.setData([]);
        }
        if (this.donchianMiddleSeries) {
            this.donchianMiddleSeries.setData([]);
        }
        if (this.tenkansenSeries) {
            this.tenkansenSeries.setData([]);
        }
        if (this.volumeSeries) {
            this.volumeSeries.setData([]);
        }
        // Clear SMC data
        this.clearSMCData();
    }

    // Add a single candle to the chart
    addCandle(candle) {
        if (this.candlestickSeries) {
            this.candlestickSeries.update(candle);
        }
    }

    // Add Trail1 point to the chart
    addTrail1Point(point) {
        if (this.trail1Series) {
            this.trail1Series.update(point);
        }
    }

    // Add Trail2 point to the chart
    addTrail2Point(point) {
        if (this.trail2Series) {
            this.trail2Series.update(point);
        }
    }


    // Clear all VSR rectangles (backward compatibility)
    clearVSRRectangles() {
        this.clearVSR1Rectangles();
        this.clearVSR2Rectangles();
    }

    // Clear VSR1 rectangles
    clearVSR1Rectangles() {
        if (this.vsr1Rectangles && this.vsr1Rectangles.length > 0) {
            this.vsr1Rectangles.forEach(rect => {
                if (this.candlestickSeries) {
                    this.candlestickSeries.detachPrimitive(rect);
                }
            });
            this.vsr1Rectangles = [];
        }
    }

    // Clear VSR2 rectangles
    clearVSR2Rectangles() {
        if (this.vsr2Rectangles && this.vsr2Rectangles.length > 0) {
            this.vsr2Rectangles.forEach(rect => {
                if (this.candlestickSeries) {
                    this.candlestickSeries.detachPrimitive(rect);
                }
            });
            this.vsr2Rectangles = [];
        }
    }

    // Set all candlestick data at once
    setCandlestickData(data) {
        if (this.candlestickSeries && data && data.length > 0) {
            // Determine precision based on price range
            const prices = data.map(d => d.close);
            const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

            let precision = 2;
            let minMove = 0.01;

            if (avgPrice < 1) {
                precision = 6;
                minMove = 0.0001;
            } else if (avgPrice < 10) {
                precision = 4;
                minMove = 0.0001;
            } else if (avgPrice < 100) {
                precision = 3;
                minMove = 0.001;
            }

            // Update chart options with better price formatting
            this.chart.applyOptions({
                rightPriceScale: {
                    borderColor: '#cccccc',
                    scaleMargins: {
                        top: 0.1,
                        bottom: 0.1,
                    },
                    mode: LightweightCharts.PriceScaleMode.Normal,
                    autoScale: true,
                },
                localization: {
                    priceFormatter: (price) => {
                        return price.toFixed(precision);
                    },
                },
            });

            // Update candlestick series with proper precision
            this.candlestickSeries.applyOptions({
                priceFormat: {
                    type: 'price',
                    precision: precision,
                    minMove: minMove,
                },
            });

            this.candlestickSeries.setData(data);
        }
    }

    // Set all Trail1 data at once (Bot 1 - backward compatibility)
    setTrail1Data(data, opacity = 0.2) {
        this.setTrail1_1Data(data, opacity);
    }

    // Set all Trail2 data at once (Bot 1 - backward compatibility)
    setTrail2Data(data, opacity = 0.2) {
        this.setTrail2_1Data(data, opacity);
    }

    // Set ATR Bot 1 with full styling options
    setATRBot1Data(trail1Data, trail2Data, options = {}) {
        const {
            trail1Color = '#00ff00',
            trail1Width = 1,
            trail2Color = '#ff0000',
            trail2Width = 1,
            fillColor = '#808000',
            fillOpacity = 0.2
        } = options;

        // Update trail1 series
        if (this.trail1_1Series && trail1Data) {
            this.trail1_1Series.applyOptions({
                color: trail1Color,
                lineWidth: trail1Width,
                visible: trail1Width > 0
            });
            this.trail1_1Series.setData(trail1Data);
        }

        // Update trail2 series
        if (this.trail2_1Series && trail2Data) {
            this.trail2_1Series.applyOptions({
                color: trail2Color,
                lineWidth: trail2Width,
                visible: trail2Width > 0
            });
            this.trail2_1Series.setData(trail2Data);
        }

        // Update band fill
        this._trail1_1Data = trail1Data;
        this._trail2_1Data = trail2Data;
        this._updateATRBandFill1WithColor(fillColor, fillOpacity);
    }

    // Set ATR Bot 2 with full styling options
    setATRBot2Data(trail1Data, trail2Data, options = {}) {
        const {
            trail1Color = '#0096ff',
            trail1Width = 1,
            trail2Color = '#ff9600',
            trail2Width = 1,
            fillColor = '#80c8ff',
            fillOpacity = 0.15
        } = options;

        // Update trail1 series
        if (this.trail1_2Series && trail1Data) {
            this.trail1_2Series.applyOptions({
                color: trail1Color,
                lineWidth: trail1Width,
                visible: trail1Width > 0
            });
            this.trail1_2Series.setData(trail1Data);
        }

        // Update trail2 series
        if (this.trail2_2Series && trail2Data) {
            this.trail2_2Series.applyOptions({
                color: trail2Color,
                lineWidth: trail2Width,
                visible: trail2Width > 0
            });
            this.trail2_2Series.setData(trail2Data);
        }

        // Update band fill
        this._trail1_2Data = trail1Data;
        this._trail2_2Data = trail2Data;
        this._updateATRBandFill2WithColor(fillColor, fillOpacity);
    }

    // Clear ATR Bot 1
    clearATRBot1() {
        if (this.trail1_1Series) {
            this.trail1_1Series.setData([]);
        }
        if (this.trail2_1Series) {
            this.trail2_1Series.setData([]);
        }
        if (this.atrBandFill1Series) {
            this.atrBandFill1Series.setData([]);
        }
        this._trail1_1Data = null;
        this._trail2_1Data = null;
    }

    // Clear ATR Bot 2
    clearATRBot2() {
        if (this.trail1_2Series) {
            this.trail1_2Series.setData([]);
        }
        if (this.trail2_2Series) {
            this.trail2_2Series.setData([]);
        }
        if (this.atrBandFill2Series) {
            this.atrBandFill2Series.setData([]);
        }
        this._trail1_2Data = null;
        this._trail2_2Data = null;
    }

    // Update ATR Bot 1 BandFill with custom color
    _updateATRBandFill1WithColor(fillColor, opacity = 0.2) {
        if (!this.atrBandFill1Series) return;

        if (this._trail1_1Data && this._trail2_1Data &&
            this._trail1_1Data.length > 0 && this._trail2_1Data.length > 0) {

            const bandData = [];
            const trail1Map = new Map(this._trail1_1Data.map(d => [d.time, d.value]));
            const trail2Map = new Map(this._trail2_1Data.map(d => [d.time, d.value]));

            const allTimes = new Set([...trail1Map.keys(), ...trail2Map.keys()]);
            const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);

            // Convert hex color to rgba
            const rgbaColor = this._hexToRgba(fillColor, opacity);

            for (const time of sortedTimes) {
                const trail1Value = trail1Map.get(time);
                const trail2Value = trail2Map.get(time);

                if (trail1Value !== undefined && trail2Value !== undefined) {
                    bandData.push({
                        time: time,
                        high: Math.max(trail1Value, trail2Value),
                        low: Math.min(trail1Value, trail2Value),
                        color: rgbaColor
                    });
                }
            }

            this.atrBandFill1Series.setData(bandData);
        } else {
            this.atrBandFill1Series.setData([]);
        }
    }

    // Update ATR Bot 2 BandFill with custom color
    _updateATRBandFill2WithColor(fillColor, opacity = 0.15) {
        if (!this.atrBandFill2Series) return;

        if (this._trail1_2Data && this._trail2_2Data &&
            this._trail1_2Data.length > 0 && this._trail2_2Data.length > 0) {

            const bandData = [];
            const trail1Map = new Map(this._trail1_2Data.map(d => [d.time, d.value]));
            const trail2Map = new Map(this._trail2_2Data.map(d => [d.time, d.value]));

            const allTimes = new Set([...trail1Map.keys(), ...trail2Map.keys()]);
            const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);

            // Convert hex color to rgba
            const rgbaColor = this._hexToRgba(fillColor, opacity);

            for (const time of sortedTimes) {
                const trail1Value = trail1Map.get(time);
                const trail2Value = trail2Map.get(time);

                if (trail1Value !== undefined && trail2Value !== undefined) {
                    bandData.push({
                        time: time,
                        high: Math.max(trail1Value, trail2Value),
                        low: Math.min(trail1Value, trail2Value),
                        color: rgbaColor
                    });
                }
            }

            this.atrBandFill2Series.setData(bandData);
        } else {
            this.atrBandFill2Series.setData([]);
        }
    }

    // Helper: Convert hex color to rgba
    _hexToRgba(hex, alpha = 1) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Set ATR Bot 1 Trail1 data
    setTrail1_1Data(data, opacity = 0.2, color = null) {
        this._trail1_1Data = data;
        this._opacity1 = opacity;

        if (this.trail1_1Series) {
            if (data && data.length > 0) {
                const values = data.map(d => d.value);
                const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;

                let precision = 2;
                let minMove = 0.01;

                if (avgValue < 1) {
                    precision = 6;
                    minMove = 0.0001;
                } else if (avgValue < 10) {
                    precision = 4;
                    minMove = 0.0001;
                } else if (avgValue < 100) {
                    precision = 3;
                    minMove = 0.001;
                }

                const options = {
                    priceFormat: {
                        type: 'price',
                        precision: precision,
                        minMove: minMove,
                    }
                };

                if (color) {
                    options.color = color;
                }

                this.trail1_1Series.applyOptions(options);
                this.trail1_1Series.setData(data);
            } else {
                // Clear data when empty
                this.trail1_1Series.setData([]);
            }
        }

        this.updateATRBandFill1(opacity);
    }

    // Set ATR Bot 1 Trail2 data
    setTrail2_1Data(data, opacity = 0.2, color = null) {
        this._trail2_1Data = data;
        this._opacity1 = opacity;

        if (this.trail2_1Series) {
            if (data && data.length > 0) {
                const values = data.map(d => d.value);
                const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;

                let precision = 2;
                let minMove = 0.01;

                if (avgValue < 1) {
                    precision = 6;
                    minMove = 0.0001;
                } else if (avgValue < 10) {
                    precision = 4;
                    minMove = 0.0001;
                } else if (avgValue < 100) {
                    precision = 3;
                    minMove = 0.001;
                }

                const options = {
                    priceFormat: {
                        type: 'price',
                        precision: precision,
                        minMove: minMove,
                    }
                };

                if (color) {
                    options.color = color;
                }

                this.trail2_1Series.applyOptions(options);
                this.trail2_1Series.setData(data);
            } else {
                // Clear data when empty
                this.trail2_1Series.setData([]);
            }
        }

        this.updateATRBandFill1(opacity);
    }

    // Set ATR Bot 2 Trail1 data
    setTrail1_2Data(data, opacity = 0.15, color = null) {
        this._trail1_2Data = data;
        this._opacity2 = opacity;

        if (this.trail1_2Series) {
            if (data && data.length > 0) {
                const values = data.map(d => d.value);
                const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;

                let precision = 2;
                let minMove = 0.01;

                if (avgValue < 1) {
                    precision = 6;
                    minMove = 0.0001;
                } else if (avgValue < 10) {
                    precision = 4;
                    minMove = 0.0001;
                } else if (avgValue < 100) {
                    precision = 3;
                    minMove = 0.001;
                }

                const options = {
                    priceFormat: {
                        type: 'price',
                        precision: precision,
                        minMove: minMove,
                    }
                };

                if (color) {
                    options.color = color;
                }

                this.trail1_2Series.applyOptions(options);
                this.trail1_2Series.setData(data);
            } else {
                // Clear data when empty
                this.trail1_2Series.setData([]);
            }
        }

        this.updateATRBandFill2(opacity);
    }

    // Set ATR Bot 2 Trail2 data
    setTrail2_2Data(data, opacity = 0.15, color = null) {
        this._trail2_2Data = data;
        this._opacity2 = opacity;

        if (this.trail2_2Series) {
            if (data && data.length > 0) {
                const values = data.map(d => d.value);
                const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;

                let precision = 2;
                let minMove = 0.01;

                if (avgValue < 1) {
                    precision = 6;
                    minMove = 0.0001;
                } else if (avgValue < 10) {
                    precision = 4;
                    minMove = 0.0001;
                } else if (avgValue < 100) {
                    precision = 3;
                    minMove = 0.001;
                }

                const options = {
                    priceFormat: {
                        type: 'price',
                        precision: precision,
                        minMove: minMove,
                    }
                };

                if (color) {
                    options.color = color;
                }

                this.trail2_2Series.applyOptions(options);
                this.trail2_2Series.setData(data);
            } else {
                // Clear data when empty
                this.trail2_2Series.setData([]);
            }
        }

        this.updateATRBandFill2(opacity);
    }

    // Update ATR BandFill between Trail1 and Trail2 (Bot 1)
    updateATRBandFill() {
        this.updateATRBandFill1();
    }

    // Update ATR Bot 1 BandFill
    updateATRBandFill1(opacity = 0.2) {
        if (!this.atrBandFill1Series) return;

        if (this._trail1_1Data && this._trail2_1Data &&
            this._trail1_1Data.length > 0 && this._trail2_1Data.length > 0) {

            const bandData = [];
            const trail1Map = new Map(this._trail1_1Data.map(d => [d.time, d.value]));
            const trail2Map = new Map(this._trail2_1Data.map(d => [d.time, d.value]));

            const allTimes = new Set([...trail1Map.keys(), ...trail2Map.keys()]);
            const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);

            for (const time of sortedTimes) {
                const trail1Value = trail1Map.get(time);
                const trail2Value = trail2Map.get(time);

                if (trail1Value !== undefined && trail2Value !== undefined) {
                    const color = trail1Value > trail2Value
                        ? `rgba(0, 255, 0, ${opacity})`
                        : `rgba(255, 0, 0, ${opacity})`;

                    bandData.push({
                        time: time,
                        high: Math.max(trail1Value, trail2Value),
                        low: Math.min(trail1Value, trail2Value),
                        color: color
                    });
                }
            }

            this.atrBandFill1Series.setData(bandData);
        } else {
            // Clear bandfill when data is empty
            this.atrBandFill1Series.setData([]);
        }
    }

    // Update ATR Bot 2 BandFill
    updateATRBandFill2(opacity = 0.15) {
        if (!this.atrBandFill2Series) return;

        if (this._trail1_2Data && this._trail2_2Data &&
            this._trail1_2Data.length > 0 && this._trail2_2Data.length > 0) {

            const bandData = [];
            const trail1Map = new Map(this._trail1_2Data.map(d => [d.time, d.value]));
            const trail2Map = new Map(this._trail2_2Data.map(d => [d.time, d.value]));

            const allTimes = new Set([...trail1Map.keys(), ...trail2Map.keys()]);
            const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);

            for (const time of sortedTimes) {
                const trail1Value = trail1Map.get(time);
                const trail2Value = trail2Map.get(time);

                if (trail1Value !== undefined && trail2Value !== undefined) {
                    const color = trail1Value > trail2Value
                        ? `rgba(0, 150, 255, ${opacity})`
                        : `rgba(255, 150, 0, ${opacity})`;

                    bandData.push({
                        time: time,
                        high: Math.max(trail1Value, trail2Value),
                        low: Math.min(trail1Value, trail2Value),
                        color: color
                    });
                }
            }

            this.atrBandFill2Series.setData(bandData);
        } else {
            // Clear bandfill when data is empty
            this.atrBandFill2Series.setData([]);
        }
    }

    // Set VSR data using FillRect plugin
    setVSRData(upperData, lowerData) {
        // Clear existing rectangles
        this.clearVSRRectangles();

        if (!upperData || !lowerData || upperData.length === 0 || lowerData.length === 0) {
            return;
        }

        // Create rectangles for each VSR zone
        // Group consecutive points with same upper/lower values
        let currentUpper = null;
        let currentLower = null;
        let startTime = null;

        for (let i = 0; i < Math.max(upperData.length, lowerData.length); i++) {
            const upperPoint = upperData[i];
            const lowerPoint = lowerData[i];

            // Get current values
            const upperValue = upperPoint ? upperPoint.value : currentUpper;
            const lowerValue = lowerPoint ? lowerPoint.value : currentLower;
            const currentTime = (upperPoint || lowerPoint).time;

            // Check if we need to create a new rectangle
            const valuesChanged = (upperValue !== currentUpper || lowerValue !== currentLower);

            if (valuesChanged && currentUpper !== null && currentLower !== null && startTime !== null) {
                // Create rectangle for previous zone
                const rect = new FillRect.FillRect(
                    { time: startTime, price: currentLower },
                    { time: currentTime, price: currentUpper },
                    {
                        fillColor: 'rgba(255, 251, 0, 0.5)',
                        showLabels: false
                    }
                );

                // Hide axis markers by overriding the views
                rect.priceAxisViews = () => [];
                rect.timeAxisViews = () => [];

                this.candlestickSeries.attachPrimitive(rect);
                this.vsrRectangles.push(rect);
            }

            // Update current values
            if (valuesChanged) {
                currentUpper = upperValue;
                currentLower = lowerValue;
                startTime = currentTime;
            }
        }

        // Create final rectangle if exists
        if (currentUpper !== null && currentLower !== null && startTime !== null) {
            // Get the last time from data
            const lastTime = Math.max(
                upperData.length > 0 ? upperData[upperData.length - 1].time : 0,
                lowerData.length > 0 ? lowerData[lowerData.length - 1].time : 0
            );

            const rect = new FillRect.FillRect(
                { time: startTime, price: currentLower },
                { time: lastTime, price: currentUpper },
                {
                    fillColor: 'rgba(255, 251, 0, 0.5)',
                    showLabels: false
                }
            );

            // Hide axis markers by overriding the views
            rect.priceAxisViews = () => [];
            rect.timeAxisViews = () => [];

            this.candlestickSeries.attachPrimitive(rect);
            this.vsrRectangles.push(rect);
        }
    }

    // Set VSR1 data using FillRect plugin
    setVSR1Data(upperData, lowerData, fillColor = 'rgba(255, 251, 0, 0.5)') {
        this.clearVSR1Rectangles();

        if (!upperData || !lowerData || upperData.length === 0 || lowerData.length === 0) {
            return;
        }

        this._createVSRRectangles(upperData, lowerData, fillColor, this.vsr1Rectangles);
    }

    // Set VSR2 data using FillRect plugin
    setVSR2Data(upperData, lowerData, fillColor = 'rgba(255, 100, 200, 0.4)') {
        this.clearVSR2Rectangles();

        if (!upperData || !lowerData || upperData.length === 0 || lowerData.length === 0) {
            return;
        }

        this._createVSRRectangles(upperData, lowerData, fillColor, this.vsr2Rectangles);
    }

    // Helper method to create VSR rectangles
    _createVSRRectangles(upperData, lowerData, fillColor, rectanglesArray) {
        let currentUpper = null;
        let currentLower = null;
        let startTime = null;

        for (let i = 0; i < Math.max(upperData.length, lowerData.length); i++) {
            const upperPoint = upperData[i];
            const lowerPoint = lowerData[i];

            const upperValue = upperPoint ? upperPoint.value : currentUpper;
            const lowerValue = lowerPoint ? lowerPoint.value : currentLower;
            const currentTime = (upperPoint || lowerPoint).time;

            const valuesChanged = (upperValue !== currentUpper || lowerValue !== currentLower);

            if (valuesChanged && currentUpper !== null && currentLower !== null && startTime !== null) {
                const rect = new FillRect.FillRect(
                    { time: startTime, price: currentLower },
                    { time: currentTime, price: currentUpper },
                    {
                        fillColor: fillColor,
                        showLabels: false
                    }
                );

                rect.priceAxisViews = () => [];
                rect.timeAxisViews = () => [];

                this.candlestickSeries.attachPrimitive(rect);
                rectanglesArray.push(rect);
            }

            if (valuesChanged) {
                currentUpper = upperValue;
                currentLower = lowerValue;
                startTime = currentTime;
            }
        }

        if (currentUpper !== null && currentLower !== null && startTime !== null) {
            const lastTime = Math.max(
                upperData.length > 0 ? upperData[upperData.length - 1].time : 0,
                lowerData.length > 0 ? lowerData[lowerData.length - 1].time : 0
            );

            const rect = new FillRect.FillRect(
                { time: startTime, price: currentLower },
                { time: lastTime, price: currentUpper },
                {
                    fillColor: fillColor,
                    showLabels: false
                }
            );

            rect.priceAxisViews = () => [];
            rect.timeAxisViews = () => [];

            this.candlestickSeries.attachPrimitive(rect);
            rectanglesArray.push(rect);
        }
    }

    // Backward compatibility - convert old API to new
    setVSRUpperLineData(data) {
        this._vsrUpperData = data;
        if (this._vsrLowerData) {
            this.setVSRData(this._vsrUpperData, this._vsrLowerData);
        }
    }

    setVSRLowerLineData(data) {
        this._vsrLowerData = data;
        if (this._vsrUpperData) {
            this.setVSRData(this._vsrUpperData, this._vsrLowerData);
        }
    }

    // Set volume data
    setVolumeData(data, upColor = 'rgba(0, 255, 0, 0.5)', downColor = 'rgba(255, 0, 0, 0.5)') {
        if (this.volumeSeries && data && data.length > 0) {
            // Convert candle data to volume histogram data with colors
            const volumeData = data.map(candle => ({
                time: candle.time,
                value: candle.volume || 0,
                color: candle.close >= candle.open ? upColor : downColor
            }));

            this.volumeSeries.setData(volumeData);
        } else if (this.volumeSeries) {
            this.volumeSeries.setData([]);
        }
    }

    setDonchianData(data, colors = null) {
        if (colors) {
            if (this.donchianUpperSeries && colors.upper) {
                this.donchianUpperSeries.applyOptions({ color: colors.upper });
            }
            if (this.donchianLowerSeries && colors.lower) {
                this.donchianLowerSeries.applyOptions({ color: colors.lower });
            }
            if (this.donchianMiddleSeries && colors.middle) {
                this.donchianMiddleSeries.applyOptions({ color: colors.middle });
            }
        }
        if (this.donchianUpperSeries && data.upper) {
            this.donchianUpperSeries.setData(data.upper);
        }
        if (this.donchianLowerSeries && data.lower) {
            this.donchianLowerSeries.setData(data.lower);
        }
        if (this.donchianMiddleSeries && data.middle) {
            this.donchianMiddleSeries.setData(data.middle);
        }
    }

    setTenkansenData(data, color = null) {
        if (this.tenkansenSeries) {
            if (color) {
                this.tenkansenSeries.applyOptions({ color: color });
            }
            // Handle both array format and object format
            if (Array.isArray(data)) {
                this.tenkansenSeries.setData(data);
            } else if (data && data.tenkansen) {
                this.tenkansenSeries.setData(data.tenkansen);
            } else {
                this.tenkansenSeries.setData([]);
            }
        }
    }

    // Set SMC (Smart Money Concept) data
    setSMCData(smcData, colors = {}, candles = []) {
        if (!smcData || !this.candlestickSeries) {
            this.clearSMCData();
            return;
        }

        // Clear existing SMC data
        this.clearSMCData();

        // Initialize SMC storage
        if (!this.smcLineSeries) {
            this.smcLineSeries = [];
        }
        if (!this.smcMarkers) {
            this.smcMarkers = [];
        }

        const markers = [];

        // Draw CHoCH lines and markers
        if (smcData.chochPoints && smcData.chochPoints.length > 0) {
            smcData.chochPoints.forEach(choch => {
                const color = choch.direction === 'bullish' ? 
                    (colors.chochBullish || '#0ecb81') : 
                    (colors.chochBearish || '#f6465d');
                
                // Create line series for CHoCH
                const lineSeries = this.chart.addLineSeries({
                    color: color,
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                    crosshairMarkerVisible: false,
                    priceLineVisible: false,
                    lastValueVisible: false
                });
                
                // Set line data from start to end
                lineSeries.setData([
                    { time: choch.startTime, value: choch.price },
                    { time: choch.endTime, value: choch.price }
                ]);
                
                this.smcLineSeries.push(lineSeries);
                
                // Add marker at start position
                markers.push({
                    time: choch.startTime,
                    position: choch.direction === 'bullish' ? 'belowBar' : 'aboveBar',
                    color: color,
                    shape: 'arrowDown',
                    text: 'CHoCH',
                    size: 1
                });
            });
        }

        // Draw BoS lines and markers
        if (smcData.bosPoints && smcData.bosPoints.length > 0) {
            smcData.bosPoints.forEach(bos => {
                const color = bos.direction === 'bullish' ? 
                    (colors.bosBullish || 'rgba(14, 203, 129, 0.7)') : 
                    (colors.bosBearish || 'rgba(246, 70, 93, 0.7)');
                
                // Create line series for BoS
                const lineSeries = this.chart.addLineSeries({
                    color: color,
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Dotted,
                    crosshairMarkerVisible: false,
                    priceLineVisible: false,
                    lastValueVisible: false
                });
                
                // Set line data from start to end
                lineSeries.setData([
                    { time: bos.startTime, value: bos.price },
                    { time: bos.endTime, value: bos.price }
                ]);
                
                this.smcLineSeries.push(lineSeries);
                
                // Add marker at start position
                markers.push({
                    time: bos.startTime,
                    position: bos.direction === 'bullish' ? 'belowBar' : 'aboveBar',
                    color: color,
                    shape: 'arrowDown',
                    text: 'BoS',
                    size: 1
                });
            });
        }

        // Draw Liquidity Sweep lines and markers
        if (smcData.liquiditySweeps && smcData.liquiditySweeps.length > 0) {
            smcData.liquiditySweeps.forEach(sweep => {
                const color = '#f0b90b';
                
                // Create line series for Liquidity Sweep
                const lineSeries = this.chart.addLineSeries({
                    color: color,
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Dashed,
                    crosshairMarkerVisible: false,
                    priceLineVisible: false,
                    lastValueVisible: false
                });
                
                // Set line data from start to end
                lineSeries.setData([
                    { time: sweep.startTime, value: sweep.price },
                    { time: sweep.endTime, value: sweep.price }
                ]);
                
                this.smcLineSeries.push(lineSeries);
                
                // Add marker at start position
                markers.push({
                    time: sweep.startTime,
                    position: sweep.direction === 'bullish' ? 'belowBar' : 'aboveBar',
                    color: color,
                    shape: 'arrowDown',
                    text: 'LS',
                    size: 1
                });
            });
        }

        // Draw Strong/Weak High/Low lines (only last ones, extending to current time)
        const lastCandleTime = candles.length > 0 ? candles[candles.length - 1].time : null;
        
        if (lastCandleTime) {
            // Strong Highs
            if (smcData.strongHighs && smcData.strongHighs.length > 0) {
                smcData.strongHighs.filter(h => h.isLast).forEach(high => {
                    const lineSeries = this.chart.addLineSeries({
                        color: colors.strongHigh || '#e53935',
                        lineWidth: 1,
                        lineStyle: LightweightCharts.LineStyle.Dashed,
                        crosshairMarkerVisible: false,
                        priceLineVisible: false,
                        lastValueVisible: false
                    });
                    
                    lineSeries.setData([
                        { time: high.time, value: high.price },
                        { time: lastCandleTime, value: high.price }
                    ]);
                    
                    this.smcLineSeries.push(lineSeries);
                    
                    markers.push({
                        time: high.time,
                        position: 'aboveBar',
                        color: colors.strongHigh || '#e53935',
                        shape: 'arrowDown',
                        text: 'SH',
                        size: 1
                    });
                });
            }

            // Weak Highs
            if (smcData.weakHighs && smcData.weakHighs.length > 0) {
                smcData.weakHighs.filter(h => h.isLast).forEach(high => {
                    const lineSeries = this.chart.addLineSeries({
                        color: colors.weakHigh || '#f57f17',
                        lineWidth: 1,
                        lineStyle: LightweightCharts.LineStyle.Dashed,
                        crosshairMarkerVisible: false,
                        priceLineVisible: false,
                        lastValueVisible: false
                    });
                    
                    lineSeries.setData([
                        { time: high.time, value: high.price },
                        { time: lastCandleTime, value: high.price }
                    ]);
                    
                    this.smcLineSeries.push(lineSeries);
                    
                    markers.push({
                        time: high.time,
                        position: 'aboveBar',
                        color: colors.weakHigh || '#f57f17',
                        shape: 'arrowDown',
                        text: 'WH',
                        size: 1
                    });
                });
            }

            // Strong Lows
            if (smcData.strongLows && smcData.strongLows.length > 0) {
                smcData.strongLows.filter(l => l.isLast).forEach(low => {
                    const lineSeries = this.chart.addLineSeries({
                        color: colors.strongLow || '#00897b',
                        lineWidth: 1,
                        lineStyle: LightweightCharts.LineStyle.Dashed,
                        crosshairMarkerVisible: false,
                        priceLineVisible: false,
                        lastValueVisible: false
                    });
                    
                    lineSeries.setData([
                        { time: low.time, value: low.price },
                        { time: lastCandleTime, value: low.price }
                    ]);
                    
                    this.smcLineSeries.push(lineSeries);
                    
                    markers.push({
                        time: low.time,
                        position: 'belowBar',
                        color: colors.strongLow || '#00897b',
                        shape: 'arrowUp',
                        text: 'SL',
                        size: 1
                    });
                });
            }

            // Weak Lows
            if (smcData.weakLows && smcData.weakLows.length > 0) {
                smcData.weakLows.filter(l => l.isLast).forEach(low => {
                    const lineSeries = this.chart.addLineSeries({
                        color: colors.weakLow || '#43a047',
                        lineWidth: 1,
                        lineStyle: LightweightCharts.LineStyle.Dashed,
                        crosshairMarkerVisible: false,
                        priceLineVisible: false,
                        lastValueVisible: false
                    });
                    
                    lineSeries.setData([
                        { time: low.time, value: low.price },
                        { time: lastCandleTime, value: low.price }
                    ]);
                    
                    this.smcLineSeries.push(lineSeries);
                    
                    markers.push({
                        time: low.time,
                        position: 'belowBar',
                        color: colors.weakLow || '#43a047',
                        shape: 'arrowUp',
                        text: 'WL',
                        size: 1
                    });
                });
            }
        }

        // Store SMC markers
        this.smcMarkers = markers;

        // Set markers on candlestick series
        this.candlestickSeries.setMarkers(markers);
    }

    // Clear SMC data
    clearSMCData() {
        // Remove all SMC line series
        if (this.smcLineSeries && this.smcLineSeries.length > 0) {
            this.smcLineSeries.forEach(series => {
                if (series && this.chart) {
                    this.chart.removeSeries(series);
                }
            });
            this.smcLineSeries = [];
        }
        
        // Clear SMC markers
        if (this.smcMarkers && this.smcMarkers.length > 0) {
            if (this.candlestickSeries) {
                this.candlestickSeries.setMarkers([]);
            }
            this.smcMarkers = [];
        }
    }

    // Set trade markers (buy/sell arrows)
    setTradeMarkers(entries, buyColor = '#00ff00', sellColor = '#ff0000') {
        if (!this.candlestickSeries || !entries || entries.length === 0) {
            // Clear markers if no data
            if (this.candlestickSeries) {
                this.candlestickSeries.setMarkers([]);
            }
            return;
        }

        const markers = [];

        entries.forEach(entry => {
            // Only show entry markers for closed entries with entry time
            if (entry.status === 'CLOSED' && entry.entryTime) {
                // Entry marker (buy or sell only)
                markers.push({
                    time: entry.entryTime,
                    position: entry.side === 'LONG' ? 'belowBar' : 'aboveBar',
                    color: entry.side === 'LONG' ? buyColor : sellColor,
                    shape: entry.side === 'LONG' ? 'arrowUp' : 'arrowDown',
                    text: '',
                    size: 1
                });
            }
        });

        this.candlestickSeries.setMarkers(markers);
    }

    // Clear trade markers
    clearTradeMarkers() {
        if (this.candlestickSeries) {
            this.candlestickSeries.setMarkers([]);
        }
    }

    // Fit chart content to visible area
    fitContent() {
        if (this.chart) {
            this.chart.timeScale().fitContent();
        }
    }

    // Get chart instance (for advanced usage)
    getChart() {
        return this.chart;
    }

    // Measure Tool Methods
    startMeasureDrawing() {
        this.isDrawingMode = true;
        this.drawingStartPoint = null;
        this.tempMeasureTool = null;
        
        // Change cursor to crosshair
        const container = document.getElementById(this.containerId);
        if (container) {
            container.style.cursor = 'crosshair';
        }
    }

    stopMeasureDrawing() {
        this.isDrawingMode = false;
        this.drawingStartPoint = null;
        
        // Remove temp tool if exists
        if (this.tempMeasureTool && this.candlestickSeries) {
            this.candlestickSeries.detachPrimitive(this.tempMeasureTool);
            this.tempMeasureTool = null;
        }
        
        // Reset cursor
        const container = document.getElementById(this.containerId);
        if (container) {
            container.style.cursor = 'default';
        }
    }

    handleMeasureClick(param) {
        if (!this.isDrawingMode || !param.time || !param.point) return;

        const price = this.candlestickSeries.coordinateToPrice(param.point.y);
        
        if (!this.drawingStartPoint) {
            // First click - set start point
            this.drawingStartPoint = {
                time: param.time,
                price: price
            };
        } else {
            // Second click - create measure tool
            const endPoint = {
                time: param.time,
                price: price
            };
            
            // Remove temp tool if exists
            if (this.tempMeasureTool && this.candlestickSeries) {
                this.candlestickSeries.detachPrimitive(this.tempMeasureTool);
                this.tempMeasureTool = null;
            }
            
            // Create permanent measure tool
            this.addMeasureTool(this.drawingStartPoint, endPoint);
            
            // Reset for next drawing
            this.drawingStartPoint = null;
            
            // Auto stop drawing mode after completing a measure
            this.stopMeasureDrawing();
            
            // Trigger callback to update UI
            if (this.onMeasureComplete) {
                this.onMeasureComplete();
            }
        }
    }

    handleMeasureMouseMove(param) {
        if (!this.isDrawingMode || !this.drawingStartPoint || !param.time || !param.point) return;

        const price = this.candlestickSeries.coordinateToPrice(param.point.y);
        
        // Remove previous temp tool
        if (this.tempMeasureTool && this.candlestickSeries) {
            this.candlestickSeries.detachPrimitive(this.tempMeasureTool);
        }
        
        // Create new temp tool
        try {
            // Check if PriceMeasureTool is available
            if (typeof LwcPluginRuletool !== 'undefined' && LwcPluginRuletool.PriceMeasureTool) {
                this.tempMeasureTool = new LwcPluginRuletool.PriceMeasureTool(
                    this.drawingStartPoint,
                    { time: param.time, price: price },
                    {
                        fillColor: 'rgba(41, 98, 255, 0.15)',
                        borderColor: 'rgba(41, 98, 255, 0.5)',
                        borderWidth: 1,
                        leverage: 200,
                        positionSize: 20,
                        showDeleteButton: false
                    }
                );
                
                this.candlestickSeries.attachPrimitive(this.tempMeasureTool);
            }
        } catch (error) {
            console.error('Error creating temp measure tool:', error);
        }
    }

    addMeasureTool(startPoint, endPoint, options = {}) {
        if (!this.candlestickSeries) return null;

        try {
            // Check if PriceMeasureTool is available
          

            const defaultOptions = {
                fillColor: 'rgba(41, 98, 255, 0.15)',
                borderColor: 'rgba(41, 98, 255, 1)',
                borderWidth: 2,
                textColor: '#ffffff',
                fontSize: 12,
                fontFamily: 'Arial, sans-serif',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                padding: 8,
                leverage: 200,
                positionSize: 20,
                showDeleteButton: true
            };

            if (typeof LwcPluginRuletool === 'undefined' || !LwcPluginRuletool.PriceMeasureTool) {
                console.error('PriceMeasureTool is not loaded');
                return null;
            }

            const measureTool = new LwcPluginRuletool.PriceMeasureTool(
                startPoint,
                endPoint,
                { 
                    ...defaultOptions, 
                    ...options,
                    onDelete: () => {
                        // Find and remove this tool
                        const index = this.measureTools.findIndex(t => t.tool === measureTool);
                        if (index !== -1) {
                            this.candlestickSeries.detachPrimitive(measureTool);
                            this.measureTools.splice(index, 1);
                            console.log('Measure tool deleted');
                        }
                    }
                }
            );

            this.candlestickSeries.attachPrimitive(measureTool);
            
            const toolData = {
                id: Date.now() + Math.random(),
                tool: measureTool,
                startPoint,
                endPoint,
                options: { ...defaultOptions, ...options }
            };
            
            this.measureTools.push(toolData);
            
            return toolData;
        } catch (error) {
            console.error('Error adding measure tool:', error);
            return null;
        }
    }

    removeMeasureTool(toolId) {
        const index = this.measureTools.findIndex(t => t.id === toolId);
        if (index === -1) return false;

        const toolData = this.measureTools[index];
        if (toolData.tool && this.candlestickSeries) {
            this.candlestickSeries.detachPrimitive(toolData.tool);
        }

        this.measureTools.splice(index, 1);
        return true;
    }

    removeAllMeasureTools() {
        this.measureTools.forEach(toolData => {
            if (toolData.tool && this.candlestickSeries) {
                this.candlestickSeries.detachPrimitive(toolData.tool);
            }
        });
        this.measureTools = [];
    }

    getMeasureTools() {
        return this.measureTools.map(t => ({
            id: t.id,
            startPoint: t.startPoint,
            endPoint: t.endPoint,
            options: t.options
        }));
    }

    isInDrawingMode() {
        return this.isDrawingMode;
    }

    setMeasureCompleteCallback(callback) {
        this.onMeasureComplete = callback;
    }

    // Destroy chart
    destroy() {
        if (this.chart) {
            // Clean up measure tools
            this.removeAllMeasureTools();
            
            this.chart.remove();
            this.chart = null;
            this.candlestickSeries = null;
            // ATR Bot 1
            this.trail1_1Series = null;
            this.trail2_1Series = null;
            this.atrBandFill1Series = null;
            this._trail1_1Data = null;
            this._trail2_1Data = null;
            // ATR Bot 2
            this.trail1_2Series = null;
            this.trail2_2Series = null;
            this.atrBandFill2Series = null;
            this._trail1_2Data = null;
            this._trail2_2Data = null;
            // Backward compatibility
            this.trail1Series = null;
            this.trail2Series = null;
            this.atrBandFillSeries = null;
            this.clearVSRRectangles();
            this.vsr1Rectangles = null;
            this.vsr2Rectangles = null;
            this.vsrRectangles = null;
            this.volumeSeries = null;
            this.donchianUpperSeries = null;
            this.donchianLowerSeries = null;
            this.donchianMiddleSeries = null;
            this.tenkansenSeries = null;
            this.clearSMCData();
            this.smcMarkers = null;
            this.smcLineSeries = null;
            this.measureTools = null;
        }
        window.removeEventListener('resize', this.handleResize);
    }
}