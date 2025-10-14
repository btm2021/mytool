import { readFileSync, writeFileSync } from 'fs';

class Config {
    constructor() {
        this.data = null;
        this.configPath = './config.json';
        this.load();
    }

    load() {
        try {
            this.data = JSON.parse(readFileSync(this.configPath, 'utf-8'));
        } catch (err) {
            console.error('[Config] Failed to load config.json:', err.message);
            process.exit(1);
        }
    }

    reload() {
        console.log('[Config] Reloading configuration...');
        this.load();
        return this.data;
    }

    save() {
        try {
            writeFileSync(this.configPath, JSON.stringify(this.data, null, 2), 'utf-8');
            console.log('[Config] Configuration saved to file');
            return true;
        } catch (err) {
            console.error('[Config] Failed to save config.json:', err.message);
            return false;
        }
    }

    get exchanges() {
        return this.data.exchanges || {};
    }

    getExchangeSymbols(exchangeName) {
        return this.exchanges[exchangeName]?.symbols || [];
    }

    isExchangeEnabled(exchangeName) {
        return this.exchanges[exchangeName]?.enabled !== false;
    }

    get allSymbols() {
        const symbols = [];
        for (const [, config] of Object.entries(this.exchanges)) {
            if (config.enabled !== false) {
                symbols.push(...config.symbols);
            }
        }
        return symbols;
    }

    get intervals() {
        return this.data.intervals || ['1m'];
    }

    get databasePath() {
        return this.data.database_path || './data/ohlcv.db';
    }

    get batchInterval() {
        return this.data.batch_interval || 60000;
    }

    get maxRecords() {
        return this.data.max_records || 100000;
    }

    get bootstrapLoad() {
        return this.data.bootstrap_load || 10000;
    }

    get port() {
        return this.data.port || 3000;
    }

    getAll() {
        return { ...this.data };
    }

    update(newConfig) {
        this.data = { ...this.data, ...newConfig };
        this.save();
        return this.data;
    }

    updateExchangeSymbols(exchangeName, symbols) {
        if (this.data.exchanges[exchangeName]) {
            console.log(`[Config] Updating ${exchangeName} symbols:`, symbols);
            this.data.exchanges[exchangeName].symbols = symbols;
            const saved = this.save();
            console.log(`[Config] Save result:`, saved);
        } else {
            console.error(`[Config] Exchange ${exchangeName} not found in config`);
        }
    }

    updateExchangeEnabled(exchangeName, enabled) {
        if (this.data.exchanges[exchangeName]) {
            this.data.exchanges[exchangeName].enabled = enabled;
            this.save();
        }
    }
}

export const config = new Config();
