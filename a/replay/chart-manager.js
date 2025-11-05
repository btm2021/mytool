class ChartManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.candlestickSeries = null;
        this.emaSeries = null;
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

        // Create ATR Bot 1 series (lines hidden, only show bandfill)
        this.trail1_1Series = this.chart.addLineSeries({
            color: 'rgba(0, 255, 0, 0)',
            lineWidth: 0,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false
        });

        this.trail2_1Series = this.chart.addLineSeries({
            color: 'rgba(255, 0, 0, 0)',
            lineWidth: 0,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false
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
            lastValueVisible: false
        });

        this.trail2_2Series = this.chart.addLineSeries({
            color: 'rgba(255, 150, 0, 0)',
            lineWidth: 0,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false
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
        // Store VSR rectangles array
        this.vsrRectangles = [];

        // Create Donchian Channel series
        this.donchianUpperSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.8)',
            lineWidth: 1,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false
        });

        this.donchianLowerSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.8)',
            lineWidth: 1,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false
        });

        this.donchianMiddleSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.5)',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dotted,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false
        });

        // Create Tenkan-sen series
        this.tenkansenSeries = this.chart.addLineSeries({
            color: 'rgba(255, 165, 0, 0.8)',
            lineWidth: 1,
            title: '',
            priceLineVisible: false,
            lastValueVisible: false
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


    // Clear all VSR rectangles
    clearVSRRectangles() {
        if (this.vsrRectangles && this.vsrRectangles.length > 0) {
            this.vsrRectangles.forEach(rect => {
                if (this.candlestickSeries) {
                    this.candlestickSeries.detachPrimitive(rect);
                }
            });
            this.vsrRectangles = [];
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

    // Backward compatibility - convert old API to new
    setVSRUpperLineData(data) {
        // Store for later use with setVSRLowerLineData
        this._vsrUpperData = data;
        if (this._vsrLowerData) {
            this.setVSRData(this._vsrUpperData, this._vsrLowerData);
        }
    }

    setVSRLowerLineData(data) {
        // Store for later use with setVSRUpperLineData
        this._vsrLowerData = data;
        if (this._vsrUpperData) {
            this.setVSRData(this._vsrUpperData, this._vsrLowerData);
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

    // Destroy chart
    destroy() {
        if (this.chart) {
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
            this.vsrRectangles = null;
            this.donchianUpperSeries = null;
            this.donchianLowerSeries = null;
            this.donchianMiddleSeries = null;
            this.tenkansenSeries = null;
        }
        window.removeEventListener('resize', this.handleResize);
    }
}