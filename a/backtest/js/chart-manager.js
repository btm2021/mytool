/**
 * Chart Manager
 * Handles Lightweight Charts initialization and management
 */
class ChartManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.indicatorSeries = new Map();
        this.allData = [];
        this.currentDataIndex = 0;
        this.indicators = new TechnicalIndicators();
        
        this.initializeChart();
    }

    /**
     * Initialize the Lightweight Charts instance
     */
    initializeChart() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            throw new Error(`Container with id '${this.containerId}' not found`);
        }

        // Chart configuration
        const chartOptions = {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: {
                    type: 'solid',
                    color: '#111111'
                },
                textColor: '#ffffff',
                fontSize: 10,
                fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
            },
            grid: {
                vertLines: {
                    color: '#333333',
                    style: 1,
                    visible: true
                },
                horzLines: {
                    color: '#333333',
                    style: 1,
                    visible: true
                }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    width: 1,
                    color: '#666666',
                    style: 2
                },
                horzLine: {
                    width: 1,
                    color: '#666666',
                    style: 2
                }
            },
            rightPriceScale: {
                borderColor: '#333333',
                borderVisible: true,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2
                }
            },
            timeScale: {
                borderColor: '#333333',
                borderVisible: true,
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 12,
                barSpacing: 6,
                fixLeftEdge: false,
                lockVisibleTimeRangeOnResize: true,
                rightBarStaysOnScroll: true,
                visible: true
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
                axisDoubleClickReset: true
            }
        };

        // Create chart
        this.chart = LightweightCharts.createChart(container, chartOptions);

        // Create candlestick series
        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            priceFormat: {
                type: 'price',
                precision: 4,
                minMove: 0.0001
            }
        });

        // Create volume series
        this.volumeSeries = this.chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
                type: 'volume'
            },
            priceScaleId: 'volume',
            scaleMargins: {
                top: 0.8,
                bottom: 0
            }
        });

        // Handle resize
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        // Add crosshair move handler for displaying current values
        this.chart.subscribeCrosshairMove(this.handleCrosshairMove.bind(this));

        console.log('Chart initialized successfully');
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const container = document.getElementById(this.containerId);
        if (container && this.chart) {
            this.chart.applyOptions({
                width: container.clientWidth,
                height: container.clientHeight
            });
        }
    }

    /**
     * Handle crosshair move to update current candle info
     */
    handleCrosshairMove(param) {
        if (!param.time || !this.allData.length) {
            this.clearCurrentInfo();
            return;
        }

        // Find the corresponding data point
        const dataPoint = this.allData.find(d => d.time === param.time);
        if (dataPoint) {
            this.updateCurrentInfo(dataPoint);
        }
    }

    /**
     * Update current candle information display
     */
    updateCurrentInfo(candle) {
        const formatPrice = (price) => price.toFixed(4);
        const formatVolume = (volume) => {
            if (volume >= 1000000) {
                return (volume / 1000000).toFixed(2) + 'M';
            } else if (volume >= 1000) {
                return (volume / 1000).toFixed(2) + 'K';
            }
            return volume.toFixed(2);
        };

        const formatTime = (timestamp) => {
            const date = new Date(timestamp * 1000);
            return date.toLocaleString();
        };

        document.getElementById('currentTime').textContent = formatTime(candle.time);
        document.getElementById('currentOpen').textContent = formatPrice(candle.open);
        document.getElementById('currentHigh').textContent = formatPrice(candle.high);
        document.getElementById('currentLow').textContent = formatPrice(candle.low);
        document.getElementById('currentClose').textContent = formatPrice(candle.close);
        document.getElementById('currentVolume').textContent = formatVolume(candle.volume);
    }

    /**
     * Clear current candle information display
     */
    clearCurrentInfo() {
        const fields = ['currentTime', 'currentOpen', 'currentHigh', 'currentLow', 'currentClose', 'currentVolume'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) element.textContent = '-';
        });
    }

    /**
     * Load complete dataset
     * @param {Array} data - Array of OHLCV data
     */
    loadData(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid data provided');
        }

        this.allData = [...data];
        this.currentDataIndex = 0;

        // Set candlestick data
        this.candlestickSeries.setData(data);

        // Set volume data
        const volumeData = data.map(candle => ({
            time: candle.time,
            value: candle.volume,
            color: candle.close >= candle.open ? '#26a69a80' : '#ef535080'
        }));
        this.volumeSeries.setData(volumeData);

        // Update indicators
        this.updateAllIndicators();

        // Fit content to show all data
        this.chart.timeScale().fitContent();

        console.log(`Loaded ${data.length} candles to chart`);
    }

    /**
     * Add or update an indicator
     * @param {string} name - Indicator name
     * @param {string} type - Indicator type (ema, sma, etc.)
     * @param {Object} params - Indicator parameters
     * @param {string} color - Line color
     */
    addIndicator(name, type, params = {}, color = '#2196F3') {
        try {
            // Calculate indicator data
            const indicatorData = this.indicators.calculate(type, this.allData, params);
            
            // Remove existing indicator if it exists
            if (this.indicatorSeries.has(name)) {
                this.removeIndicator(name);
            }

            // Create new line series for the indicator
            const lineSeries = this.chart.addLineSeries({
                color: color,
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Solid,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 4,
                priceFormat: {
                    type: 'price',
                    precision: 4,
                    minMove: 0.0001
                }
            });

            // Set indicator data
            if (Array.isArray(indicatorData)) {
                lineSeries.setData(indicatorData);
            } else if (indicatorData.middle) {
                // For Bollinger Bands, add middle line
                lineSeries.setData(indicatorData.middle);
                
                // Add upper and lower bands
                const upperSeries = this.chart.addLineSeries({
                    color: color + '60',
                    lineWidth: 1,
                    lineStyle: LightweightCharts.LineStyle.Dashed
                });
                upperSeries.setData(indicatorData.upper);
                
                const lowerSeries = this.chart.addLineSeries({
                    color: color + '60',
                    lineWidth: 1,
                    lineStyle: LightweightCharts.LineStyle.Dashed
                });
                lowerSeries.setData(indicatorData.lower);
                
                // Store all series
                this.indicatorSeries.set(name, {
                    main: lineSeries,
                    upper: upperSeries,
                    lower: lowerSeries,
                    type: type,
                    params: params,
                    color: color
                });
            } else {
                // For MACD, add main line
                lineSeries.setData(indicatorData.macd);
                this.indicatorSeries.set(name, {
                    main: lineSeries,
                    type: type,
                    params: params,
                    color: color
                });
            }

            if (!this.indicatorSeries.has(name)) {
                this.indicatorSeries.set(name, {
                    main: lineSeries,
                    type: type,
                    params: params,
                    color: color
                });
            }

            console.log(`Added ${type} indicator: ${name}`);
        } catch (error) {
            console.error(`Error adding indicator ${name}:`, error);
        }
    }

    /**
     * Remove an indicator
     * @param {string} name - Indicator name
     */
    removeIndicator(name) {
        if (this.indicatorSeries.has(name)) {
            const indicator = this.indicatorSeries.get(name);
            
            // Remove main series
            if (indicator.main) {
                this.chart.removeSeries(indicator.main);
            }
            
            // Remove additional series (for Bollinger Bands)
            if (indicator.upper) {
                this.chart.removeSeries(indicator.upper);
            }
            if (indicator.lower) {
                this.chart.removeSeries(indicator.lower);
            }
            
            this.indicatorSeries.delete(name);
            console.log(`Removed indicator: ${name}`);
        }
    }

    /**
     * Update all indicators with current data
     */
    updateAllIndicators() {
        for (const [name, indicator] of this.indicatorSeries) {
            this.addIndicator(name, indicator.type, indicator.params, indicator.color);
        }
    }

    /**
     * Set data for replay mode (show only up to current index) with performance optimization
     * @param {number} index - Current data index
     */
    setReplayData(index) {
        if (index < 0 || index >= this.allData.length) {
            return;
        }

        this.currentDataIndex = index;
        const replayData = this.allData.slice(0, index + 1);

        // Performance optimization: Use update instead of setData for large datasets
        const useUpdate = replayData.length > 1000 && index > 0;

        if (useUpdate) {
            // For large datasets, just update the last few candles
            const lastCandle = this.allData[index];
            this.candlestickSeries.update({
                time: lastCandle.time,
                open: lastCandle.open,
                high: lastCandle.high,
                low: lastCandle.low,
                close: lastCandle.close
            });

            this.volumeSeries.update({
                time: lastCandle.time,
                value: lastCandle.volume,
                color: lastCandle.close >= lastCandle.open ? '#26a69a80' : '#ef535080'
            });
        } else {
            // For smaller datasets or initial load, use setData
            this.candlestickSeries.setData(replayData);

            const volumeData = replayData.map(candle => ({
                time: candle.time,
                value: candle.volume,
                color: candle.close >= candle.open ? '#26a69a80' : '#ef535080'
            }));
            this.volumeSeries.setData(volumeData);
        }

        // Update indicators with throttling for performance
        if (index % 10 === 0 || index === replayData.length - 1) {
            this.updateIndicatorsForReplay(replayData, useUpdate);
        }

        // Auto-scroll to keep latest data visible
        if (replayData.length > 50) {
            this.chart.timeScale().scrollToPosition(2, false);
        }
    }

    /**
     * Update indicators for replay with performance optimization
     */
    updateIndicatorsForReplay(replayData, useUpdate = false) {
        for (const [name, indicator] of this.indicatorSeries) {
            try {
                const indicatorData = this.indicators.calculate(indicator.type, replayData, indicator.params);
                
                if (useUpdate && indicatorData.length > 0) {
                    // For large datasets, just update the last point
                    const lastPoint = indicatorData[indicatorData.length - 1];
                    if (lastPoint && indicator.main) {
                        indicator.main.update(lastPoint);
                    }
                } else {
                    // For smaller datasets, set all data
                    if (Array.isArray(indicatorData)) {
                        indicator.main.setData(indicatorData);
                    } else if (indicatorData.middle) {
                        // Bollinger Bands
                        indicator.main.setData(indicatorData.middle);
                        if (indicator.upper) indicator.upper.setData(indicatorData.upper);
                        if (indicator.lower) indicator.lower.setData(indicatorData.lower);
                    } else if (indicatorData.macd) {
                        // MACD
                        indicator.main.setData(indicatorData.macd);
                    }
                }
            } catch (error) {
                console.error(`Error updating indicator ${name} for replay:`, error);
            }
        }
    }

    /**
     * Get current data index for replay
     * @returns {number} Current data index
     */
    getCurrentDataIndex() {
        return this.currentDataIndex;
    }

    /**
     * Get total data length
     * @returns {number} Total number of candles
     */
    getTotalDataLength() {
        return this.allData.length;
    }

    /**
     * Get all loaded data
     * @returns {Array} All OHLCV data
     */
    getAllData() {
        return [...this.allData];
    }

    /**
     * Clear all data and indicators
     */
    clearChart() {
        // Clear series data
        if (this.candlestickSeries) {
            this.candlestickSeries.setData([]);
        }
        if (this.volumeSeries) {
            this.volumeSeries.setData([]);
        }

        // Clear indicators
        for (const [name] of this.indicatorSeries) {
            this.removeIndicator(name);
        }

        // Clear data arrays
        this.allData = [];
        this.currentDataIndex = 0;

        // Clear current info display
        this.clearCurrentInfo();

        console.log('Chart cleared');
    }

    /**
     * Destroy the chart instance
     */
    destroy() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
        }
        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.indicatorSeries.clear();
        this.allData = [];
        this.currentDataIndex = 0;
    }
}

// Export for use in other modules
window.ChartManager = ChartManager;
