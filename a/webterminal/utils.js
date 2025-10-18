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
    },

    // Crypto icon utilities
    crypto: {
        apiKey: 'pk_fr3913faea87c0324fc626',
        placeholderUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMWExYTFhIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMjAiIGZpbGw9IiMzMzMiIHN0cm9rZT0iIzU1NSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iMzIiIHk9IjM4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPj88L3RleHQ+PC9zdmc+',

        getIconUrl(symbol) {
            return `https://img.logokit.com/crypto/${symbol}?token=${this.apiKey}`;
        },

        extractSymbol(pair) {
            // Extract base symbol from pair like "BTC/USDT" or "JOE/USDT:USDT"
            const parts = pair.split('/');
            if (parts.length > 0) {
                return parts[0].trim();
            }
            return pair;
        },

        extractQuote(pair) {
            // Extract quote symbol from pair
            const parts = pair.split('/');
            if (parts.length > 1) {
                // Remove :USDT suffix if exists
                const quote = parts[1].split(':')[0];
                return quote.trim();
            }
            return 'USDT';
        }
    }
}

