const { createApp } = Vue;

createApp({
  data() {
    return {
      // WebSocket
      ws: null,
      wsConnected: false,
      
      // System Info
      systemInfo: {
        'CPU USAGE': '0%',
        'CPU CORES': '0',
        'MEMORY': '0%',
        'HEAP': '0MB',
        'DATABASE': '0MB',
        'DISK FREE': '0GB',
        'UPTIME': '0d 0h',
        'PLATFORM': '-'
      },
      
      // Workers
      workerMetrics: {},
      
      // Symbols
      dbSymbols: {},
      currentSymbolsTab: 'all',
      symbolsFilter: '',
      
      // Realtime Data
      realtimeDataMap: new Map(),
      
      // Logs
      logs: [],
      
      // Command
      commandInput: '',
      
      // Modals
      showConfigModal: false,
      showSymbolsModal: false,
      showOHLCVModal: false,
      ohlcvIframeSrc: '',
      showTasksModal: false,
      workerProgress: {},
      isLoadingExchange: false,
      configTab: 'client',
      isSaving: false,
      
      // Config
      config: {
        batch_interval: 60000,
        max_records: 200000,
        bootstrap_load: 50000,
        cleanup_hour: 3,
        port: 3000,
        realtime_update: true,
        debug_log: false,
        max_log_lines: 200
      },
      
      // Symbols Manager
      currentExchange: 'binance_futures',
      exchangesConfig: {},
      whitelistSymbols: [],
      availableSymbols: [],
      whitelistSearch: '',
      availableSearch: ''
    };
  },
  
  computed: {
    activeExchanges() {
      const exchanges = Object.keys(this.dbSymbols);
      return exchanges.length > 0 ? exchanges.join(', ') : '-';
    },
    
    totalSymbols() {
      let total = 0;
      for (const symbols of Object.values(this.dbSymbols)) {
        total += symbols.length;
      }
      return total;
    },
    
    filteredSymbols() {
      let symbols = [];
      
      if (this.currentSymbolsTab === 'all') {
        for (const [exchange, exchangeSymbols] of Object.entries(this.dbSymbols)) {
          exchangeSymbols.forEach(symbol => {
            symbols.push({ exchange, symbol });
          });
        }
      } else {
        const exchangeSymbols = this.dbSymbols[this.currentSymbolsTab] || [];
        exchangeSymbols.forEach(symbol => {
          symbols.push({ exchange: this.currentSymbolsTab, symbol });
        });
      }
      
      if (this.symbolsFilter) {
        const filter = this.symbolsFilter.toLowerCase();
        symbols = symbols.filter(item => item.symbol.toLowerCase().includes(filter));
      }
      
      return symbols.sort((a, b) => {
        if (a.exchange !== b.exchange) {
          return a.exchange.localeCompare(b.exchange);
        }
        return a.symbol.localeCompare(b.symbol);
      });
    },
    
    realtimeData() {
      return Array.from(this.realtimeDataMap.values())
        .sort((a, b) => b.timestamp - a.timestamp);
    },
    
    filteredWhitelist() {
      if (!this.whitelistSearch) return this.whitelistSymbols;
      const search = this.whitelistSearch.toLowerCase();
      return this.whitelistSymbols.filter(s => s.toLowerCase().includes(search));
    },
    
    filteredAvailable() {
      let available = this.availableSymbols.filter(item => {
        const symbol = item.symbol || item;
        return !this.whitelistSymbols.includes(symbol);
      });
      
      if (this.availableSearch) {
        const search = this.availableSearch.toLowerCase();
        available = available.filter(item => {
          const symbol = item.symbol || item;
          return symbol.toLowerCase().includes(search);
        });
      }
      
      return available;
    }
  },
  
  methods: {
    // WebSocket
    connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.ws = new WebSocket(`${protocol}//${window.location.host}`);
      
      this.ws.onopen = () => {
        this.wsConnected = true;
        this.addLog('Connected to server', 'connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          this.addLog(`Parse error: ${err.message}`, 'error');
        }
      };
      
      this.ws.onerror = () => {
        this.addLog('WebSocket error', 'error');
      };
      
      this.ws.onclose = () => {
        this.wsConnected = false;
        this.addLog('Disconnected from server', 'error');
        setTimeout(() => this.connect(), 3000);
      };
    },
    
    handleMessage(message) {
      switch (message.type) {
        case 'log':
          if (message.data.type !== 'receiving') {
            this.addLog(message.data.message, message.data.type, message.data.isDebug);
          }
          break;
        case 'candle':
          if (this.config.realtime_update) {
            this.updateRealtimeData(message.data);
          }
          break;
        case 'status':
          // Handle status updates
          break;
        case 'worker_metrics':
          this.workerMetrics = message.data;
          break;
        case 'system_info':
          this.updateSystemInfo(message.data);
          break;
        case 'command_response':
          this.handleCommandResponse(message.data);
          break;
      }
    },
    
    // System Info
    updateSystemInfo(data) {
      this.systemInfo = {
        'CPU USAGE': data.cpu?.usage !== undefined ? `${data.cpu.usage}%` : '0%',
        'CPU CORES': data.cpu?.cores || 0,
        'MEMORY': data.memory?.usagePercent !== undefined ? `${data.memory.usagePercent}%` : '0%',
        'HEAP': data.process?.heapUsed ? this.formatBytes(data.process.heapUsed) : '0MB',
        'DATABASE': data.database?.total ? this.formatBytes(data.database.total) : '0MB',
        'DISK FREE': data.disk?.free ? this.formatBytes(data.disk.free) : '0GB',
        'UPTIME': data.uptime !== undefined ? this.formatUptime(data.uptime) : '0d 0h',
        'PLATFORM': data.platform && data.arch ? `${data.platform}/${data.arch}` : '-'
      };
    },
    
    // Workers
    isWorkerAlive(worker) {
      return (Date.now() - worker.timestamp) < 10000;
    },
    
    // Realtime Data
    updateRealtimeData(data) {
      const key = `${data.exchange}_${data.symbol}_${data.interval}`;
      const oldData = this.realtimeDataMap.get(key);
      const oldPrice = oldData?.close;
      const newPrice = data.c;
      
      let flashClass = '';
      if (oldPrice !== undefined && newPrice !== undefined && oldPrice !== newPrice) {
        flashClass = newPrice > oldPrice ? 'price-flash-green' : 'price-flash-red';
      }
      
      this.realtimeDataMap.set(key, {
        key,
        exchange: data.exchange,
        symbol: data.symbol,
        interval: data.interval,
        close: data.c || '-',
        volume: data.v?.toFixed(2) || '-',
        time: new Date().toLocaleTimeString(),
        status: data.closed ? '🟢' : '🔵',
        flashClass,
        timestamp: Date.now()
      });
      
      // Clear flash after animation
      if (flashClass) {
        setTimeout(() => {
          const item = this.realtimeDataMap.get(key);
          if (item) {
            item.flashClass = '';
          }
        }, 500);
      }
    },
    
    // Logs
    addLog(message, type = 'info', isDebug = false) {
      // Skip debug logs if debug mode is disabled
      if (isDebug && !this.config.debug_log) {
        return;
      }
      
      const time = new Date().toLocaleTimeString();
      this.logs.unshift({ time, message, type });
      
      const maxLines = this.config.max_log_lines || 200;
      if (this.logs.length > maxLines) {
        this.logs = this.logs.slice(0, maxLines);
      }
    },
    
    clearLogs() {
      this.logs = [];
      this.addLog('Terminal cleared', 'info');
    },
    
    // Command
    sendCommand() {
      if (!this.commandInput.trim()) return;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.addLog('Cannot send command: Not connected', 'error');
        return;
      }
      
      this.addLog(`> ${this.commandInput}`, 'info');
      this.ws.send(JSON.stringify({ 
        type: 'command', 
        data: this.commandInput 
      }));
      this.commandInput = '';
    },
    
    handleCommandResponse(response) {
      if (response.error) {
        this.addLog(`Error: ${response.error}`, 'error');
      } else if (response.message) {
        this.addLog(response.message, 'validated');
      } else if (response.data) {
        this.addLog(JSON.stringify(response.data, null, 2), 'info');
      }
    },
    
    // Config
    async loadConfig() {
      try {
        const response = await fetch('/config');
        const data = await response.json();
        
        this.config = {
          batch_interval: data.batch_interval || 60000,
          max_records: data.max_records || 200000,
          bootstrap_load: data.bootstrap_load || 50000,
          cleanup_hour: data.cleanup_hour || 3,
          port: data.port || 3000,
          realtime_update: data.client?.realtime_update !== false,
          debug_log: data.client?.debug_log || false,
          max_log_lines: data.client?.max_log_lines || 200
        };
      } catch (err) {
        this.addLog(`Failed to load config: ${err.message}`, 'error');
      }
    },
    
    async saveClientConfig() {
      this.isSaving = true;
      
      try {
        const payload = {
          batch_interval: this.config.batch_interval,
          max_records: this.config.max_records,
          bootstrap_load: this.config.bootstrap_load,
          cleanup_hour: this.config.cleanup_hour,
          port: this.config.port,
          client: {
            realtime_update: this.config.realtime_update,
            debug_log: this.config.debug_log,
            max_log_lines: this.config.max_log_lines
          }
        };
        
        const response = await fetch('/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (result.success) {
          this.addLog('Client settings saved. Reloading page...', 'success');
          
          // Wait 1 second then reload
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          throw new Error(result.error || 'Failed to save client config');
        }
      } catch (err) {
        this.addLog(`Failed to save client config: ${err.message}`, 'error');
        this.isSaving = false;
      }
    },
    
    async saveConfig() {
      this.isSaving = true;
      
      try {
        const payload = {
          batch_interval: this.config.batch_interval,
          max_records: this.config.max_records,
          bootstrap_load: this.config.bootstrap_load,
          cleanup_hour: this.config.cleanup_hour,
          port: this.config.port,
          client: {
            realtime_update: this.config.realtime_update,
            debug_log: this.config.debug_log,
            max_log_lines: this.config.max_log_lines
          }
        };
        
        const response = await fetch('/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (result.success) {
          this.addLog('Configuration saved. System is restarting...', 'validated');
          this.showConfigModal = false;
          
          // Wait 2 seconds then reload
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          throw new Error(result.error || 'Failed to save config');
        }
      } catch (err) {
        this.addLog(`Failed to save config: ${err.message}`, 'error');
        this.isSaving = false;
      }
    },
    
    // Database Symbols
    async loadDatabaseSymbols() {
      try {
        const response = await fetch('/databaseSymbols');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unknown error'}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server returned non-JSON response');
        }
        
        this.dbSymbols = await response.json();
      } catch (err) {
        this.addLog(`Failed to load database symbols: ${err.message}`, 'error');
      }
    },
    
    // Chart
    openChart(symbol, timeframe, exchange, limit) {
      let url = `chart.html?symbol=${symbol}&timeframe=${timeframe}&exchange=${exchange}`;
      if (limit) {
        url += `&limit=${limit}`;
      }
      window.open(url, '_blank');
    },
    
    // Symbols Manager
    async loadSymbolsManager() {
      try {
        const response = await fetch('/config');
        const config = await response.json();
        
        this.exchangesConfig = config.exchanges || {};
        this.whitelistSymbols = [...(this.exchangesConfig[this.currentExchange]?.symbols || [])];
        
        await this.loadAvailableSymbols();
      } catch (err) {
        this.addLog(`Failed to load symbols: ${err.message}`, 'error');
      }
    },
    
    async loadAvailableSymbols() {
      try {
        const response = await fetch(`/exchangeSymbols/${this.currentExchange}`);
        const data = await response.json();
        this.availableSymbols = data.symbols || [];
      } catch (err) {
        this.addLog(`Failed to load available symbols: ${err.message}`, 'error');
      }
    },
    
    switchExchange(exchange) {
      this.currentExchange = exchange;
      this.whitelistSymbols = [...(this.exchangesConfig[exchange]?.symbols || [])];
      this.whitelistSearch = '';
      this.availableSearch = '';
      this.loadAvailableSymbols();
    },
    
    addToWhitelist(symbol) {
      if (!this.whitelistSymbols.includes(symbol)) {
        this.whitelistSymbols.push(symbol);
        this.whitelistSymbols.sort();
        this.addLog(`Added ${symbol} to whitelist`, 'info');
      }
    },
    
    removeFromWhitelist(symbol) {
      this.whitelistSymbols = this.whitelistSymbols.filter(s => s !== symbol);
      this.addLog(`Removed ${symbol} from whitelist`, 'info');
    },
    
    async saveWhitelist() {
      try {
        const response = await fetch('/exchangeSymbols', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exchange: this.currentExchange,
            symbols: this.whitelistSymbols
          })
        });
        
        const result = await response.json();
        if (result.success) {
          this.addLog('Configuration saved. System is restarting...', 'validated');
          setTimeout(() => {
            this.showSymbolsModal = false;
            this.loadDatabaseSymbols();
          }, 2000);
        } else {
          throw new Error(result.error || 'Failed to save');
        }
      } catch (err) {
        this.addLog(`Failed to save whitelist: ${err.message}`, 'error');
      }
    },
    
    async toggleExchange() {
      if (!this.exchangesConfig[this.currentExchange]) {
        this.addLog('Exchange config not found', 'error');
        return;
      }
      
      const currentStatus = this.exchangesConfig[this.currentExchange].enabled;
      const newStatus = !currentStatus;
      
      try {
        const response = await fetch('/toggleExchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exchange: this.currentExchange,
            enabled: newStatus
          })
        });
        
        const result = await response.json();
        if (result.success) {
          this.exchangesConfig[this.currentExchange].enabled = newStatus;
          this.addLog(`${this.currentExchange} ${newStatus ? 'enabled' : 'disabled'} successfully`, 'validated');
          
          setTimeout(() => {
            this.loadDatabaseSymbols();
          }, 2000);
        } else {
          throw new Error(result.error || 'Failed to toggle exchange');
        }
      } catch (err) {
        this.addLog(`Failed to toggle exchange: ${err.message}`, 'error');
      }
    },
    
    // App Actions
    async restartApp() {
      if (!confirm('Are you sure you want to restart the application?')) return;
      
      try {
        const response = await fetch('/restart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        if (result.success) {
          this.addLog('Application is restarting...', 'validated');
        } else {
          throw new Error(result.error || 'Failed to restart');
        }
      } catch (err) {
        this.addLog(`Failed to restart: ${err.message}`, 'error');
      }
    },
    
    async deleteDatabase() {
      if (!confirm('⚠️ WARNING: This will DELETE ALL DATA!\n\nAre you absolutely sure?')) return;
      if (!confirm('This action CANNOT be undone. Continue?')) return;
      
      try {
        const response = await fetch('/deleteDatabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        if (result.success) {
          this.addLog('⚠️ Deleting database and restarting...', 'error');
        } else {
          throw new Error(result.error || 'Failed to delete database');
        }
      } catch (err) {
        this.addLog(`Failed to delete database: ${err.message}`, 'error');
      }
    },
    
    // Utilities
    formatBytes(bytes) {
      if (bytes === 0) return '0B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(1) + sizes[i];
    },
    
    formatUptime(seconds) {
      const d = Math.floor(seconds / 86400);
      const h = Math.floor((seconds % 86400) / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${d}d ${h}h ${m}m`;
    }
  },
  
  watch: {
    showSymbolsModal(newVal) {
      if (newVal) {
        this.loadSymbolsManager();
      }
    },
    
    showConfigModal(newVal) {
      if (newVal) {
        this.configTab = 'client'; // Reset to client tab
        this.loadConfig();
      }
    }
  },
  
  mounted() {
    this.connect();
    this.loadDatabaseSymbols();
  }
}).mount('#app');
