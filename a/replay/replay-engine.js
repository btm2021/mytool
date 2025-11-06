class ReplayEngine {
    constructor(chartManager) {
        this.chartManager = chartManager;
        this.data = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.speed = 5; // Default speed multiplier
        this.intervalId = null;
        
        // Indicator instances - will be initialized when needed
        this.indicators = {
            botATR1: null,
            botATR2: null,
            vsr1: null,
            vsr2: null,
            donchian: null,
            tenkansen: null,
            smc: null
        };
        
        // Accumulated data for replay
        this.accumulatedData = {
            candles: [],
            trail1_1: [],
            trail2_1: [],
            trail1_2: [],
            trail2_2: [],
            vsr1Upper: [],
            vsr1Lower: [],
            vsr2Upper: [],
            vsr2Lower: [],
            donchianUpper: [],
            donchianLower: [],
            donchianMiddle: [],
            tenkansen: [],
            volume: []
        };
        
        this.baseDelay = 1000; // Base delay in milliseconds (1 second)
    }

    // Load data for replay
    loadData(data) {
        this.data = data;
        this.reset();
    }

    // Initialize indicators with settings
    initializeIndicators(settings) {
        this.indicatorSettings = settings;
        
        // Initialize ATR Bot 1
        if (settings.botATR1 && settings.botATR1.enabled) {
            this.indicators.botATR1 = new BotATRIndicator(
                settings.botATR1.emaLength,
                settings.botATR1.atrLength,
                settings.botATR1.atrMultiplier
            );
        }
        
        // Initialize ATR Bot 2
        if (settings.botATR2 && settings.botATR2.enabled) {
            this.indicators.botATR2 = new BotATRIndicator(
                settings.botATR2.emaLength,
                settings.botATR2.atrLength,
                settings.botATR2.atrMultiplier
            );
        }
        
        // Initialize VSR 1
        if (settings.vsr1 && settings.vsr1.enabled) {
            this.indicators.vsr1 = new VSRIndicator(
                settings.vsr1.length,
                settings.vsr1.threshold
            );
        }
        
        // Initialize VSR 2
        if (settings.vsr2 && settings.vsr2.enabled) {
            this.indicators.vsr2 = new VSRIndicator(
                settings.vsr2.length,
                settings.vsr2.threshold
            );
        }
        
        // Initialize Donchian
        if (settings.donchian && settings.donchian.enabled) {
            this.indicators.donchian = new DonchianIndicator(
                settings.donchian.length,
                settings.donchian.colors
            );
        }
        
        // Initialize Tenkan-sen
        if (settings.tenkansen && settings.tenkansen.enabled) {
            this.indicators.tenkansen = new TenkansenIndicator(
                settings.tenkansen.length,
                settings.tenkansen.color
            );
        }
        
        // Initialize SMC
        if (settings.smc && settings.smc.enabled) {
            this.indicators.smc = new SMCIndicator({
                leftBars: settings.smc.leftBars,
                rightBars: settings.smc.rightBars,
                useBos: settings.smc.useBos,
                sweepX: settings.smc.sweepX
            });
        }
    }

    // Reset replay to beginning
    reset() {
        this.currentIndex = 0;
        this.isPlaying = false;
        this.clearInterval();
        
        // Reset all indicators
        Object.keys(this.indicators).forEach(key => {
            if (this.indicators[key]) {
                this.indicators[key].reset();
            }
        });
        
        // Clear accumulated data
        Object.keys(this.accumulatedData).forEach(key => {
            this.accumulatedData[key] = [];
        });
        
        this.chartManager.clearChart();
    }

    // Start replay from beginning
    startReplay() {
        console.log('ReplayEngine.startReplay called');
        console.log('Data length:', this.data.length);
        this.reset();
        console.log('After reset - currentIndex:', this.currentIndex);
        const stepResult = this.step(); // Show first candle
        console.log('Step result:', stepResult);
        console.log('After step - currentIndex:', this.currentIndex);
    }

    // Step forward one candle
    step() {
        if (this.currentIndex >= this.data.length) {
            this.stop();
            return false;
        }

        const currentCandle = this.data[this.currentIndex];
        
        // Add candle to accumulated data
        this.accumulatedData.candles.push(currentCandle);
        
        // Calculate and accumulate ATR Bot 1
        if (this.indicators.botATR1) {
            const atrResult = this.indicators.botATR1.calculateIncremental(currentCandle);
            this.accumulatedData.trail1_1.push(atrResult.ema);
            this.accumulatedData.trail2_1.push(atrResult.trail);
        }
        
        // Calculate and accumulate ATR Bot 2
        if (this.indicators.botATR2) {
            const atrResult = this.indicators.botATR2.calculateIncremental(currentCandle);
            this.accumulatedData.trail1_2.push(atrResult.ema);
            this.accumulatedData.trail2_2.push(atrResult.trail);
        }
        
        // Calculate and accumulate VSR 1
        if (this.indicators.vsr1) {
            const vsrResult = this.indicators.vsr1.calculateIncremental(currentCandle);
            if (vsrResult.upper) {
                this.accumulatedData.vsr1Upper.push(vsrResult.upper);
            }
            if (vsrResult.lower) {
                this.accumulatedData.vsr1Lower.push(vsrResult.lower);
            }
        }
        
        // Calculate and accumulate VSR 2
        if (this.indicators.vsr2) {
            const vsrResult = this.indicators.vsr2.calculateIncremental(currentCandle);
            if (vsrResult.upper) {
                this.accumulatedData.vsr2Upper.push(vsrResult.upper);
            }
            if (vsrResult.lower) {
                this.accumulatedData.vsr2Lower.push(vsrResult.lower);
            }
        }
        
        // Calculate Donchian (needs full history)
        if (this.indicators.donchian && this.accumulatedData.candles.length >= this.indicators.donchian.length) {
            const donchianData = this.indicators.donchian.calculateArray(this.accumulatedData.candles);
            const lastIndex = donchianData.upper.length - 1;
            if (lastIndex >= 0 && donchianData.upper[lastIndex].value !== undefined) {
                this.accumulatedData.donchianUpper = donchianData.upper;
                this.accumulatedData.donchianLower = donchianData.lower;
                this.accumulatedData.donchianMiddle = donchianData.middle;
            }
        }
        
        // Calculate Tenkan-sen (needs full history)
        if (this.indicators.tenkansen && this.accumulatedData.candles.length >= this.indicators.tenkansen.length) {
            const tenkansenData = this.indicators.tenkansen.calculateArray(this.accumulatedData.candles);
            this.accumulatedData.tenkansen = tenkansenData.tenkansen;
        }
        
        // Accumulate volume data
        this.accumulatedData.volume.push({
            time: currentCandle.time,
            value: currentCandle.volume || 0,
            color: currentCandle.close >= currentCandle.open ? 
                (this.indicatorSettings?.volume?.upColor || 'rgba(0, 255, 0, 0.5)') : 
                (this.indicatorSettings?.volume?.downColor || 'rgba(255, 0, 0, 0.5)')
        });
        
        // Update chart with all accumulated data
        this.updateChart();
        
        this.currentIndex++;
        
        // Update progress display
        this.updateProgress();
        
        // Check if replay is complete
        if (this.currentIndex >= this.data.length) {
            this.stop();
            return false;
        }
        
        return true;
    }
    
    // Update chart with accumulated data
    updateChart() {
        // Update candles
        this.chartManager.setCandlestickData(this.accumulatedData.candles);
        
        // Update ATR Bot 1
        if (this.indicators.botATR1 && this.indicatorSettings?.botATR1?.enabled) {
            this.chartManager.setTrail1_1Data(
                this.accumulatedData.trail1_1,
                this.indicatorSettings.botATR1.fillOpacity,
                this.indicatorSettings.botATR1.trail1Color
            );
            this.chartManager.setTrail2_1Data(
                this.accumulatedData.trail2_1,
                this.indicatorSettings.botATR1.fillOpacity,
                this.indicatorSettings.botATR1.trail2Color
            );
        }
        
        // Update ATR Bot 2
        if (this.indicators.botATR2 && this.indicatorSettings?.botATR2?.enabled) {
            this.chartManager.setTrail1_2Data(
                this.accumulatedData.trail1_2,
                this.indicatorSettings.botATR2.fillOpacity,
                this.indicatorSettings.botATR2.trail1Color
            );
            this.chartManager.setTrail2_2Data(
                this.accumulatedData.trail2_2,
                this.indicatorSettings.botATR2.fillOpacity,
                this.indicatorSettings.botATR2.trail2Color
            );
        }
        
        // Update VSR 1
        if (this.indicators.vsr1 && this.indicatorSettings?.vsr1?.enabled) {
            this.chartManager.setVSR1Data(
                this.accumulatedData.vsr1Upper,
                this.accumulatedData.vsr1Lower,
                this.indicatorSettings.vsr1.fillColor
            );
        }
        
        // Update VSR 2
        if (this.indicators.vsr2 && this.indicatorSettings?.vsr2?.enabled) {
            this.chartManager.setVSR2Data(
                this.accumulatedData.vsr2Upper,
                this.accumulatedData.vsr2Lower,
                this.indicatorSettings.vsr2.fillColor
            );
        }
        
        // Update Donchian
        if (this.indicators.donchian && this.indicatorSettings?.donchian?.enabled) {
            this.chartManager.setDonchianData({
                upper: this.accumulatedData.donchianUpper,
                lower: this.accumulatedData.donchianLower,
                middle: this.accumulatedData.donchianMiddle
            }, this.indicatorSettings.donchian.colors);
        }
        
        // Update Tenkan-sen
        if (this.indicators.tenkansen && this.indicatorSettings?.tenkansen?.enabled) {
            this.chartManager.setTenkansenData(
                this.accumulatedData.tenkansen,
                this.indicatorSettings.tenkansen.color
            );
        }
        
        // Update Volume
        if (this.indicatorSettings?.volume?.enabled) {
            this.chartManager.volumeSeries?.setData(this.accumulatedData.volume);
        }
        
        // Update SMC (needs full recalculation)
        if (this.indicators.smc && this.indicatorSettings?.smc?.enabled) {
            const smcData = this.indicators.smc.calculateArray(this.accumulatedData.candles);
            this.chartManager.setSMCData(smcData, this.indicatorSettings.smc.colors, this.accumulatedData.candles);
        }
        
        // Update trade markers - only show markers up to current replay position
        this.updateTradeMarkersForReplay();
    }
    
    // Update trade markers to only show up to current replay position
    updateTradeMarkersForReplay() {
        if (!this.indicatorSettings?.tradeMarkers?.enabled) {
            return;
        }
        
        // Get backtest entries from app (if available)
        if (window.app && window.app.simpleBacktest) {
            const allEntries = window.app.simpleBacktest.getAllEntries();
            const closedEntries = allEntries.filter(e => e.status === 'CLOSED');
            
            // Get current time from last accumulated candle
            const currentTime = this.accumulatedData.candles.length > 0 ? 
                this.accumulatedData.candles[this.accumulatedData.candles.length - 1].time : 0;
            
            // Filter entries to only show those with entry time <= current replay time
            const visibleEntries = closedEntries.filter(entry => {
                return entry.entryTime && entry.entryTime <= currentTime;
            });
            
            // Update markers with filtered entries
            this.chartManager.setTradeMarkers(
                visibleEntries,
                this.indicatorSettings.tradeMarkers.buyColor,
                this.indicatorSettings.tradeMarkers.sellColor
            );
        }
    }

    // Start auto play
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        const delay = this.baseDelay / this.speed;
        
        this.intervalId = setInterval(() => {
            if (!this.step()) {
                this.stop();
            }
        }, delay);
    }

    // Pause auto play
    pause() {
        this.isPlaying = false;
        this.clearInterval();
    }

    // Stop replay
    stop() {
        this.isPlaying = false;
        this.clearInterval();
    }

    // Set replay speed
    setSpeed(speed) {
        this.speed = speed;
        
        // If currently playing, restart with new speed
        if (this.isPlaying) {
            this.pause();
            this.play();
        }
    }

    // Clear interval
    clearInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    // Update progress display
    updateProgress() {
        const progressElement = document.getElementById('progress');
        if (progressElement) {
            const percentage = ((this.currentIndex / this.data.length) * 100).toFixed(1);
            progressElement.textContent = `${this.currentIndex}/${this.data.length} (${percentage}%)`;
        }
    }

    // Get current state
    getState() {
        return {
            isPlaying: this.isPlaying,
            currentIndex: this.currentIndex,
            totalCandles: this.data.length,
            speed: this.speed,
            isComplete: this.currentIndex >= this.data.length,
            hasData: this.data.length > 0,
            canStep: this.currentIndex < this.data.length
        };
    }

    // Check if replay can step forward
    canStep() {
        return this.currentIndex < this.data.length;
    }

    // Check if replay has data
    hasData() {
        return this.data.length > 0;
    }
}