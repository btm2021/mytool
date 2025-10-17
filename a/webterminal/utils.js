// Utility functions for the application
const Utils = {
    // LocalStorage management
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Error reading from localStorage:', e);
                return defaultValue;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Error writing to localStorage:', e);
                return false;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Error removing from localStorage:', e);
                return false;
            }
        }
    },
    
    // Time formatting
    formatTime(date = new Date()) {
        return date.toLocaleTimeString('en-US', { hour12: false });
    },
    
    // Number formatting
    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        return parseFloat(num).toFixed(decimals);
    },
    
    // Deep clone object
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Merge objects
    merge(target, source) {
        return Object.assign({}, target, source);
    }
};
