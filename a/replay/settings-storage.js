// Settings Storage Manager
// Handles saving and loading indicator settings from localStorage

class SettingsStorage {
    constructor() {
        this.storageKey = 'indicatorSettings';
    }

    // Get default settings
    getDefaultSettings() {
        return {
            botATR1: {
                enabled: true,
                emaLength: 30,
                atrLength: 14,
                atrMultiplier: 2.0,
                trail1Color: '#00ff00',
                trail1Width: 1,
                trail2Color: '#ff0000',
                trail2Width: 1,
                fillColor: '#808000',
                fillOpacity: 0.2
            },
            botATR2: {
                enabled: true,
                emaLength: 55,
                atrLength: 14,
                atrMultiplier: 2.0,
                trail1Color: '#0096ff',
                trail1Width: 1,
                trail2Color: '#ff9600',
                trail2Width: 1,
                fillColor: '#80c8ff',
                fillOpacity: 0.15
            },
            vsr1: {
                enabled: true,
                length: 10,
                threshold: 10,
                fillColor: 'rgba(255, 251, 0, 0.5)'
            },
            vsr2: {
                enabled: true,
                length: 20,
                threshold: 20,
                fillColor: 'rgba(255, 100, 200, 0.4)'
            },
            volume: {
                enabled: true,
                upColor: 'rgba(0, 255, 0, 0.5)',
                downColor: 'rgba(255, 0, 0, 0.5)'
            },
            donchian: {
                enabled: true,
                length: 50,
                colors: {
                    upper: 'rgba(0, 0, 255, 0.8)',
                    lower: 'rgba(0, 0, 255, 0.8)',
                    middle: 'rgba(0, 0, 255, 0.5)'
                }
            },
            tenkansen: {
                enabled: false,
                length: 50,
                color: 'rgba(255, 165, 0, 0.8)'
            },
            smc: {
                enabled: false,
                leftBars: 8,
                rightBars: 8,
                useBos: false,
                sweepX: false,
                colors: {
                    chochBullish: '#0ecb81',
                    chochBearish: '#f6465d',
                    bosBullish: 'rgba(14, 203, 129, 0.7)',
                    bosBearish: 'rgba(246, 70, 93, 0.7)',
                    strongHigh: '#e53935',
                    strongLow: '#00897b',
                    weakHigh: '#f57f17',
                    weakLow: '#43a047'
                }
            },
            tradeMarkers: {
                enabled: true,
                buyColor: '#00ff00',
                sellColor: '#ff0000'
            }
        };
    }

    // Load settings from localStorage
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure all properties exist
                return this.mergeWithDefaults(parsed);
            }
        } catch (error) {
            console.error('Error loading settings from localStorage:', error);
        }
        return this.getDefaultSettings();
    }

    // Save settings to localStorage
    save(settings) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(settings));
            console.log('Settings saved to localStorage');
            return true;
        } catch (error) {
            console.error('Error saving settings to localStorage:', error);
            return false;
        }
    }

    // Clear settings from localStorage
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('Settings cleared from localStorage');
            return true;
        } catch (error) {
            console.error('Error clearing settings from localStorage:', error);
            return false;
        }
    }

    // Merge saved settings with defaults
    mergeWithDefaults(saved) {
        const defaults = this.getDefaultSettings();
        const merged = {};

        // Merge each indicator
        for (const key in defaults) {
            if (saved[key]) {
                merged[key] = { ...defaults[key], ...saved[key] };
                
                // Handle nested objects (like colors)
                for (const subKey in defaults[key]) {
                    if (typeof defaults[key][subKey] === 'object' && 
                        !Array.isArray(defaults[key][subKey]) && 
                        defaults[key][subKey] !== null) {
                        merged[key][subKey] = { 
                            ...defaults[key][subKey], 
                            ...(saved[key][subKey] || {}) 
                        };
                    }
                }
            } else {
                merged[key] = defaults[key];
            }
        }

        return merged;
    }
}
