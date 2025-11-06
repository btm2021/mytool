class ChartManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.candlestickSeries = null;
        this.volumeSeries = null;
        
        // ATR Bot series
        this.trail1_1Series = null;
        this.trail2_1Series = null;
        this.atrBandFill1Series = null;
        this.trail1_2Series = null;
        this.trail2_2Series = null;
        this.atrBandFill2Series = null;
        
        // VSR rectangles
        this.vsr1Rectangles = [];
        this.vsr2Rectangles = [];
        
        // Donchian series
        this.donchianUpperSeries = null;
        this.donchianLowerSeries = null;
        this.donchianMiddleSeries = null;
        
        // Tenkansen series
        this.tenkansenSeries = null;
        
        this.initialize();
    }
    
    initialize() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            throw new Error(`Container ${this.containerId} not found`);
        }
        
        // Create chart
        this.chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: { type: 'solid', color: '#000000' },
                textColor: '#ffffff',
                fontSize: 10,
            },
            grid: {
                vertLines: { color: '#1a1a1a' },
                horzLines: { color: '#1a1a1a' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: '#2a2a2a',
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderColor: '#2a2a2a',
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
                barSpacing: 3,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });
        
        // Create candlestick series
        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#0ecb81',
            downColor: '#f6465d',
            borderVisible: false,
            wickUpColor: '#0ecb81',
            wickDownColor: '#f6465d',
        });
        
        // Create volume series
        this.volumeSeries = this.chart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
            scaleMargins: { top: 0.8, bottom: 0 },
        });
        
        // ATR Bot 1 series
        this.trail1_1Series = this.chart.addLineSeries({
            color: 'rgba(0, 255, 0, 0)',
            lineWidth: 0,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        this.trail2_1Series = this.chart.addLineSeries({
            color: 'rgba(255, 0, 0, 0)',
            lineWidth: 0,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        this.atrBandFill1Series = this.chart.addCustomSeries(new Bandfillcolor.Bandfillcolor(), {
            highLineWidth: 0,
            lowLineWidth: 0,
        });
        
        // ATR Bot 2 series
        this.trail1_2Series = this.chart.addLineSeries({
            color: 'rgba(0, 150, 255, 0)',
            lineWidth: 0,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        this.trail2_2Series = this.chart.addLineSeries({
            color: 'rgba(255, 150, 0, 0)',
            lineWidth: 0,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        this.atrBandFill2Series = this.chart.addCustomSeries(new Bandfillcolor.Bandfillcolor(), {
            highLineWidth: 0,
            lowLineWidth: 0,
        });
        
        // Donchian series
        this.donchianUpperSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.8)',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        this.donchianLowerSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.8)',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        this.donchianMiddleSeries = this.chart.addLineSeries({
            color: 'rgba(0, 0, 255, 0.5)',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        // Tenkansen series
        this.tenkansenSeries = this.chart.addLineSeries({
            color: 'rgba(255, 165, 0, 0.8)',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        // Handle resize
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 100);
        });
    }
    
    handleResize() {
        const container = document.getElementById(this.containerId);
        if (container && this.chart) {
            this.chart.applyOptions({
                width: container.clientWidth,
                height: container.clientHeight,
            });
        }
    }
    
    clearChart() {
        if (this.candlestickSeries) this.candlestickSeries.setData([]);
        if (this.volumeSeries) this.volumeSeries.setData([]);
        if (this.trail1_1Series) this.trail1_1Series.setData([]);
        if (this.trail2_1Series) this.trail2_1Series.setData([]);
        if (this.atrBandFill1Series) this.atrBandFill1Series.setData([]);
        if (this.trail1_2Series) this.trail1_2Series.setData([]);
        if (this.trail2_2Series) this.trail2_2Series.setData([]);
        if (this.atrBandFill2Series) this.atrBandFill2Series.setData([]);
        if (this.donchianUpperSeries) this.donchianUpperSeries.setData([]);
        if (this.donchianLowerSeries) this.donchianLowerSeries.setData([]);
        if (this.donchianMiddleSeries) this.donchianMiddleSeries.setData([]);
        if (this.tenkansenSeries) this.tenkansenSeries.setData([]);
        this.clearVSR1Rectangles();
        this.clearVSR2Rectangles();
    }
    
    setCandlestickData(data) {
        if (this.candlestickSeries && data && data.length > 0) {
            this.candlestickSeries.setData(data);
        }
    }
    
    setVolumeData(data, upColor, downColor) {
        if (!this.volumeSeries || !data) return;
        
        const volumeData = data.map(candle => ({
            time: candle.time,
            value: candle.volume,
            color: candle.close >= candle.open ? upColor : downColor
        }));
        
        this.volumeSeries.setData(volumeData);
    }
    
    setATRBot1Data(trail1Data, trail2Data, options = {}) {
        const {
            trail1Color = '#00ff00',
            trail1Width = 1,
            trail2Color = '#ff0000',
            trail2Width = 1,
            fillColor = '#808000',
            fillOpacity = 0.2
        } = options;
        
        if (this.trail1_1Series && trail1Data) {
            this.trail1_1Series.applyOptions({
                color: trail1Color,
                lineWidth: trail1Width,
            });
            this.trail1_1Series.setData(trail1Data);
        }
        
        if (this.trail2_1Series && trail2Data) {
            this.trail2_1Series.applyOptions({
                color: trail2Color,
                lineWidth: trail2Width,
            });
            this.trail2_1Series.setData(trail2Data);
        }
        
        // Update band fill
        if (this.atrBandFill1Series && trail1Data && trail2Data) {
            const bandData = this.createBandData(trail1Data, trail2Data, fillColor, fillOpacity);
            this.atrBandFill1Series.setData(bandData);
        }
    }
    
    setATRBot2Data(trail1Data, trail2Data, options = {}) {
        const {
            trail1Color = '#0096ff',
            trail1Width = 1,
            trail2Color = '#ff9600',
            trail2Width = 1,
            fillColor = '#80c8ff',
            fillOpacity = 0.15
        } = options;
        
        if (this.trail1_2Series && trail1Data) {
            this.trail1_2Series.applyOptions({
                color: trail1Color,
                lineWidth: trail1Width,
            });
            this.trail1_2Series.setData(trail1Data);
        }
        
        if (this.trail2_2Series && trail2Data) {
            this.trail2_2Series.applyOptions({
                color: trail2Color,
                lineWidth: trail2Width,
            });
            this.trail2_2Series.setData(trail2Data);
        }
        
        // Update band fill
        if (this.atrBandFill2Series && trail1Data && trail2Data) {
            const bandData = this.createBandData(trail1Data, trail2Data, fillColor, fillOpacity);
            this.atrBandFill2Series.setData(bandData);
        }
    }
    
    createBandData(trail1Data, trail2Data, fillColor, fillOpacity) {
        const bandData = [];
        const trail1Map = new Map(trail1Data.map(d => [d.time, d.value]));
        const trail2Map = new Map(trail2Data.map(d => [d.time, d.value]));
        
        const allTimes = new Set([...trail1Map.keys(), ...trail2Map.keys()]);
        const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);
        
        const rgbaColor = this.hexToRgba(fillColor, fillOpacity);
        
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
        
        return bandData;
    }
    
    hexToRgba(hex, alpha = 1) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    setVSR1Data(upperData, lowerData, fillColor) {
        this.clearVSR1Rectangles();
        if (!upperData || !lowerData) return;
        
        this.vsr1Rectangles = this.createVSRRectangles(upperData, lowerData, fillColor);
    }
    
    setVSR2Data(upperData, lowerData, fillColor) {
        this.clearVSR2Rectangles();
        if (!upperData || !lowerData) return;
        
        this.vsr2Rectangles = this.createVSRRectangles(upperData, lowerData, fillColor);
    }
    
    createVSRRectangles(upperData, lowerData, fillColor) {
        const rectangles = [];
        
        if (!upperData || !lowerData || upperData.length === 0) {
            return rectangles;
        }
        
        // Optimize: Group consecutive rectangles with same upper/lower values
        let startIdx = 0;
        let currentUpper = upperData[0].value;
        let currentLower = lowerData[0].value;
        
        for (let i = 1; i < upperData.length; i++) {
            const upper = upperData[i].value;
            const lower = lowerData[i].value;
            
            // If values changed, create rectangle for previous group
            if (upper !== currentUpper || lower !== currentLower) {
                const rect = new FillRect.FillRect(
                    { time: upperData[startIdx].time, price: currentLower },
                    { time: upperData[i].time, price: currentUpper },
                    { fillColor: fillColor, showLabels: false }
                );
                
                rect.priceAxisViews = () => [];
                rect.timeAxisViews = () => [];
                
                this.candlestickSeries.attachPrimitive(rect);
                rectangles.push(rect);
                
                // Start new group
                startIdx = i;
                currentUpper = upper;
                currentLower = lower;
            }
        }
        
        // Create final rectangle
        if (startIdx < upperData.length) {
            const rect = new FillRect.FillRect(
                { time: upperData[startIdx].time, price: currentLower },
                { time: upperData[upperData.length - 1].time, price: currentUpper },
                { fillColor: fillColor, showLabels: false }
            );
            
            rect.priceAxisViews = () => [];
            rect.timeAxisViews = () => [];
            
            this.candlestickSeries.attachPrimitive(rect);
            rectangles.push(rect);
        }
        
        return rectangles;
    }
    
    clearVSR1Rectangles() {
        if (this.vsr1Rectangles && this.vsr1Rectangles.length > 0) {
            this.vsr1Rectangles.forEach(rect => {
                this.candlestickSeries.detachPrimitive(rect);
            });
            this.vsr1Rectangles = [];
        }
    }
    
    clearVSR2Rectangles() {
        if (this.vsr2Rectangles && this.vsr2Rectangles.length > 0) {
            this.vsr2Rectangles.forEach(rect => {
                this.candlestickSeries.detachPrimitive(rect);
            });
            this.vsr2Rectangles = [];
        }
    }
    
    setDonchianData(data, colors) {
        if (!data) return;
        
        if (this.donchianUpperSeries && data.upper) {
            this.donchianUpperSeries.applyOptions({ color: colors.upper });
            this.donchianUpperSeries.setData(data.upper);
        }
        
        if (this.donchianLowerSeries && data.lower) {
            this.donchianLowerSeries.applyOptions({ color: colors.lower });
            this.donchianLowerSeries.setData(data.lower);
        }
        
        if (this.donchianMiddleSeries && data.middle) {
            this.donchianMiddleSeries.applyOptions({ color: colors.middle });
            this.donchianMiddleSeries.setData(data.middle);
        }
    }
    
    setTenkansenData(data, color) {
        if (this.tenkansenSeries && data) {
            this.tenkansenSeries.applyOptions({ color: color });
            this.tenkansenSeries.setData(data);
        }
    }
}
