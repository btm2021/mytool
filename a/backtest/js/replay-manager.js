/**
 * Replay Manager
 * Handles backtest replay functionality with play/pause/speed controls
 */
class ReplayManager {
    constructor(chartManager) {
        this.chartManager = chartManager;
        this.isReplaying = false;
        this.isPaused = false;
        this.currentIndex = 0;
        this.totalCandles = 0;
        this.speed = 1; // Speed multiplier
        this.intervalId = null;
        this.baseInterval = 500; // Base interval in milliseconds (0.5 second for better performance)
        this.batchSize = 1; // Number of candles to process per update (for performance)
        
        this.initializeControls();
    }

    /**
     * Initialize replay control event listeners
     */
    initializeControls() {
        // Replay button
        const replayBtn = document.getElementById('replayBtn');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => this.startReplay());
        }

        // Play/Pause button
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        // Stop button
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopReplay());
        }

        // Speed control buttons
        const speedButtons = document.querySelectorAll('.speed-btn');
        speedButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseInt(e.target.dataset.speed);
                this.setSpeed(speed);
                
                // Update active state
                speedButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        console.log('Replay controls initialized');
    }

    /**
     * Start replay from the beginning
     */
    startReplay() {
        const data = this.chartManager.getAllData();
        if (!data || data.length === 0) {
            alert('No data loaded. Please load data first.');
            return;
        }

        this.totalCandles = data.length;
        this.currentIndex = 0;
        this.isReplaying = true;
        this.isPaused = false;

        // Optimize batch size based on data size for performance
        if (this.totalCandles > 10000) {
            this.batchSize = 5; // Process 5 candles at once for large datasets
            this.baseInterval = 200; // Faster interval
        } else if (this.totalCandles > 5000) {
            this.batchSize = 2; // Process 2 candles at once
            this.baseInterval = 300;
        } else {
            this.batchSize = 1; // Process 1 candle at a time for smaller datasets
            this.baseInterval = 500;
        }

        // Update UI
        this.updateControlsState();
        this.updateProgress();

        // Start from first candle
        this.chartManager.setReplayData(this.currentIndex);

        // Start the replay interval
        this.startInterval();

        console.log(`Started replay with ${this.totalCandles} candles (batch size: ${this.batchSize})`);
    }

    /**
     * Toggle play/pause state
     */
    togglePlayPause() {
        if (!this.isReplaying) {
            return;
        }

        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.stopInterval();
        } else {
            this.startInterval();
        }

        this.updateControlsState();
        console.log(this.isPaused ? 'Replay paused' : 'Replay resumed');
    }

    /**
     * Stop replay and reset
     */
    stopReplay() {
        this.isReplaying = false;
        this.isPaused = false;
        this.currentIndex = 0;
        
        this.stopInterval();
        this.updateControlsState();
        this.updateProgress();

        // Show all data
        const data = this.chartManager.getAllData();
        if (data && data.length > 0) {
            this.chartManager.loadData(data);
        }

        console.log('Replay stopped');
    }

    /**
     * Set replay speed
     * @param {number} speed - Speed multiplier (1, 2, 5, 10, etc.)
     */
    setSpeed(speed) {
        this.speed = speed;
        
        // Restart interval with new speed if currently playing
        if (this.isReplaying && !this.isPaused) {
            this.stopInterval();
            this.startInterval();
        }

        console.log(`Replay speed set to x${speed}`);
    }

    /**
     * Start the replay interval
     */
    startInterval() {
        this.stopInterval(); // Clear any existing interval
        
        const interval = this.baseInterval / this.speed;
        this.intervalId = setInterval(() => {
            this.nextCandle();
        }, interval);
    }

    /**
     * Stop the replay interval
     */
    stopInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Move to the next candle(s) in replay with batch processing
     */
    nextCandle() {
        if (!this.isReplaying || this.isPaused) {
            return;
        }

        // Process multiple candles at once for better performance
        const nextIndex = Math.min(this.currentIndex + this.batchSize, this.totalCandles - 1);
        
        if (nextIndex >= this.totalCandles - 1) {
            // Replay finished
            this.currentIndex = this.totalCandles - 1;
            this.chartManager.setReplayData(this.currentIndex);
            this.updateProgress();
            this.stopReplay();
            
            // Use a more subtle notification
            console.log('Replay completed!');
            this.showNotification('Replay completed!', 'success');
            return;
        }

        this.currentIndex = nextIndex;

        // Update chart with current data (throttled for performance)
        this.chartManager.setReplayData(this.currentIndex);
        this.updateProgress();
    }

    /**
     * Move to previous candle (for manual control)
     */
    previousCandle() {
        if (!this.isReplaying || this.currentIndex <= 0) {
            return;
        }

        this.currentIndex--;
        this.chartManager.setReplayData(this.currentIndex);
        this.updateProgress();
    }

    /**
     * Jump to specific candle index
     * @param {number} index - Target candle index
     */
    jumpToCandle(index) {
        if (!this.isReplaying || index < 0 || index >= this.totalCandles) {
            return;
        }

        this.currentIndex = index;
        this.chartManager.setReplayData(this.currentIndex);
        this.updateProgress();
    }

    /**
     * Update control buttons state
     */
    updateControlsState() {
        const replayBtn = document.getElementById('replayBtn');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const stopBtn = document.getElementById('stopBtn');

        if (replayBtn) {
            replayBtn.disabled = this.isReplaying;
            replayBtn.textContent = this.isReplaying ? 'Replaying...' : 'Start Replay';
        }

        if (playPauseBtn) {
            playPauseBtn.disabled = !this.isReplaying;
            playPauseBtn.textContent = this.isPaused ? 'Play' : 'Pause';
            playPauseBtn.className = this.isPaused ? 'btn btn-success' : 'btn btn-secondary';
        }

        if (stopBtn) {
            stopBtn.disabled = !this.isReplaying;
        }
    }

    /**
     * Update progress bar and text
     */
    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressFill && progressText) {
            const percentage = this.totalCandles > 0 ? (this.currentIndex / this.totalCandles) * 100 : 0;
            
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${this.currentIndex + 1} / ${this.totalCandles}`;
        }
    }

    /**
     * Get current replay state
     * @returns {Object} Current state information
     */
    getState() {
        return {
            isReplaying: this.isReplaying,
            isPaused: this.isPaused,
            currentIndex: this.currentIndex,
            totalCandles: this.totalCandles,
            speed: this.speed,
            progress: this.totalCandles > 0 ? (this.currentIndex / this.totalCandles) * 100 : 0
        };
    }

    /**
     * Add keyboard shortcuts for replay control
     */
    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when replay is active
            if (!this.isReplaying) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.stopReplay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.isPaused) {
                        this.previousCandle();
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.isPaused) {
                        this.nextCandle();
                    }
                    break;
                case 'Digit1':
                    e.preventDefault();
                    this.setSpeed(1);
                    document.querySelector('[data-speed="1"]').click();
                    break;
                case 'Digit2':
                    e.preventDefault();
                    this.setSpeed(2);
                    document.querySelector('[data-speed="2"]').click();
                    break;
                case 'Digit5':
                    e.preventDefault();
                    this.setSpeed(5);
                    document.querySelector('[data-speed="5"]').click();
                    break;
            }
        });

        console.log('Keyboard shortcuts added for replay control');
    }

    /**
     * Create progress slider for manual navigation
     */
    createProgressSlider() {
        const progressInfo = document.querySelector('.progress-info');
        if (!progressInfo) return;

        // Create slider element
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = 'replaySlider';
        slider.min = '0';
        slider.max = '100';
        slider.value = '0';
        slider.style.width = '100%';
        slider.style.marginTop = '10px';

        // Add event listener
        slider.addEventListener('input', (e) => {
            if (this.isReplaying && this.isPaused && this.totalCandles > 0) {
                const targetIndex = Math.floor((e.target.value / 100) * this.totalCandles);
                this.jumpToCandle(targetIndex);
            }
        });

        // Insert slider before progress text
        progressInfo.insertBefore(slider, document.getElementById('progressText'));

        console.log('Progress slider created');
    }

    /**
     * Update slider position
     */
    updateSlider() {
        const slider = document.getElementById('replaySlider');
        if (slider && this.totalCandles > 0) {
            const percentage = (this.currentIndex / this.totalCandles) * 100;
            slider.value = percentage;
        }
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            z-index: 1000;
            transition: opacity 0.3s ease;
            ${type === 'success' ? 'background: #00aa00; color: white;' : 'background: #333; color: white;'}
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    /**
     * Destroy replay manager and clean up
     */
    destroy() {
        this.stopReplay();
        
        // Remove event listeners
        const replayBtn = document.getElementById('replayBtn');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        if (replayBtn) replayBtn.replaceWith(replayBtn.cloneNode(true));
        if (playPauseBtn) playPauseBtn.replaceWith(playPauseBtn.cloneNode(true));
        if (stopBtn) stopBtn.replaceWith(stopBtn.cloneNode(true));

        console.log('Replay manager destroyed');
    }
}

// Export for use in other modules
window.ReplayManager = ReplayManager;
