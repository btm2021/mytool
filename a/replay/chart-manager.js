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
            color: '#00ff00',
            lineWidth:1,
            title: 'Trail1 (EMA)',
            priceLineVisible: false,
            axisLabelVisible:false
        });

        // Create Trail2 series (ATR Trailing Stop)
        this.trail2Series = this.chart.addLineSeries({
            color: '#ff0000',
            lineWidth: 1,
            title: 'Trail2 (ATR)',
            priceLineVisible: false,
            axisLabelVisible: false
        });


        // Create VSR Upper Line series (upper boundary line)
        this.vsrUpperLineSeries = this.chart.addLineSeries({
            color: 'rgba(0, 255, 0, 1.0)',         // Solid green line
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dotted,
            title: 'VSR Upper',
            crosshairMarkerVisible: true,
            priceLineVisible: false,
            axisLabelVisible:false
        });

        // Create VSR Lower Line series (lower boundary line)
        this.vsrLowerLineSeries = this.chart.addLineSeries({
            color: 'rgba(0, 255, 0, 1.0)',         // Solid green line
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dotted,
            title: 'VSR Lower',
            priceLineVisible: false,
            axisLabelVisible: false,
            crosshairMarkerVisible: true,
        });

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
        if (this.vsrUpperLineSeries) {
            this.vsrUpperLineSeries.setData([]);
        }
        if (this.vsrLowerLineSeries) {
            this.vsrLowerLineSeries.setData([]);
        }
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


    // Add VSR upper line point to the chart
    addVSRUpperLinePoint(point) {
        if (this.vsrUpperLineSeries && point) {
            this.vsrUpperLineSeries.update(point);
        }
    }

    // Add VSR lower line point to the chart
    addVSRLowerLinePoint(point) {
        if (this.vsrLowerLineSeries && point) {
            this.vsrLowerLineSeries.update(point);
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
    }

    // Set all Trail2 data at once
    setTrail2Data(data) {
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
    }

    // Set all VSR Upper Line data at once
    setVSRUpperLineData(data) {
        if (this.vsrUpperLineSeries && data && data.length > 0) {
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
            
            this.vsrUpperLineSeries.applyOptions({
                priceFormat: {
                    type: 'price',
                    precision: precision,
                    minMove: minMove,
                },
            });
            
            this.vsrUpperLineSeries.setData(data);
        }
    }

    // Set all VSR Lower Line data at once
    setVSRLowerLineData(data) {
        if (this.vsrLowerLineSeries && data && data.length > 0) {
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
            
            this.vsrLowerLineSeries.applyOptions({
                priceFormat: {
                    type: 'price',
                    precision: precision,
                    minMove: minMove,
                },
            });
            
            this.vsrLowerLineSeries.setData(data);
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
            this.vsrUpperLineSeries = null;
            this.vsrLowerLineSeries = null;
            this.donchianUpperSeries = null;
            this.donchianLowerSeries = null;
            this.donchianMiddleSeries = null;
            this.tenkansenSeries = null;
        }
        window.removeEventListener('resize', this.handleResize);
    }
}