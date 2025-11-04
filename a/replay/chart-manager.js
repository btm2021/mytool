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

        // Create Trail1 series (EMA)
        this.trail1Series = this.chart.addLineSeries({
            color: 'rgba(0, 255, 0, 0.8)',
            lineWidth: 2,
            title: 'Trail1 (EMA)',
            priceLineVisible: false,
            axisLabelVisible: false
        });

        // Create Trail2 series (ATR Trailing Stop)
        this.trail2Series = this.chart.addLineSeries({
            color: 'rgba(255, 0, 0, 0.8)',
            lineWidth: 2,
            title: 'Trail2 (ATR)',
            priceLineVisible: false,
            axisLabelVisible: false
        });

        // Create BandFill for ATR (fill between Trail1 and Trail2)
        this.atrBandFill = null;


        // VSR will use FillRect plugin instead of line series
        // Store VSR rectangles array
        this.vsrRectangles = [];

        // Create Donchian Channel series
        this.donchianUpperSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.8)',
            lineWidth: 1,
            title: 'Donchian Upper',
            priceLineVisible: false,
            axisLabelVisible: false,
        });

        this.donchianLowerSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.8)',
            lineWidth: 1,
            title: 'Donchian Lower',
            priceLineVisible: false,
            axisLabelVisible: false,
        });

        this.donchianMiddleSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.5)',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dotted,
            title: 'Donchian Middle',
            priceLineVisible: false,
            axisLabelVisible: false,
        });

        // Create Tenkan-sen series
        this.tenkansenSeries = this.chart.addLineSeries({
            color: 'rgba(255, 165, 0, 0.8)',
            lineWidth: 1,
            title: 'Tenkan-sen',
            priceLineVisible: false,
            axisLabelVisible: false,
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
        if (this.trail1Series) {
            this.trail1Series.setData([]);
        }
        if (this.trail2Series) {
            this.trail2Series.setData([]);
        }
        // Clear ATR BandFill
        this.clearATRBandFill();
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

    // Set all Trail1 data at once
    setTrail1Data(data) {
        // Store for BandFill
        this._trail1Data = data;

        if (this.trail1Series && data && data.length > 0) {
            // Determine precision based on data values
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

            this.trail1Series.applyOptions({
                priceFormat: {
                    type: 'price',
                    precision: precision,
                    minMove: minMove,
                },
            });

            this.trail1Series.setData(data);
        }

        // Update BandFill if both trails are set
        this.updateATRBandFill();
    }

    // Set all Trail2 data at once
    setTrail2Data(data) {
        // Store for BandFill
        this._trail2Data = data;

        if (this.trail2Series && data && data.length > 0) {
            // Determine precision based on data values
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

            this.trail2Series.applyOptions({
                priceFormat: {
                    type: 'price',
                    precision: precision,
                    minMove: minMove,
                },
            });

            this.trail2Series.setData(data);
        }

        // Update BandFill if both trails are set
        this.updateATRBandFill();
    }

    // Update ATR BandFill between Trail1 and Trail2
    updateATRBandFill() {
        // Remove existing BandFill if any
        if (this.atrBandFill && this.candlestickSeries) {
            this.candlestickSeries.detachPrimitive(this.atrBandFill);
            this.atrBandFill = null;
        }

        // Create new BandFill if both trails have data
        if (this._trail1Data && this._trail2Data &&
            this._trail1Data.length > 0 && this._trail2Data.length > 0 &&
            this.trail1Series && this.trail2Series && this.candlestickSeries) {

            this.atrBandFill = new Bandfill.BandFill({
                upperSeries: this.trail1Series,
                lowerSeries: this.trail2Series,
                topColor: 'rgba(0, 255, 0, 0.15)',
                bottomColor: 'rgba(255, 0, 0, 0.15)'
            });

            this.candlestickSeries.attachPrimitive(this.atrBandFill);
        }
    }

    // Clear ATR BandFill
    clearATRBandFill() {
        if (this.atrBandFill && this.candlestickSeries) {
            this.candlestickSeries.detachPrimitive(this.atrBandFill);
            this.atrBandFill = null;
        }
        this._trail1Data = null;
        this._trail2Data = null;
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
        if (color && this.tenkansenSeries) {
            this.tenkansenSeries.applyOptions({ color: color });
        }
        if (this.tenkansenSeries && data.tenkansen) {
            this.tenkansenSeries.setData(data.tenkansen);
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
            this.trail1Series = null;
            this.trail2Series = null;
            this.clearATRBandFill();
            this.atrBandFill = null;
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