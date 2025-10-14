// Symbols Manager Modal
export function createSymbolsManagerMixin() {
  return {
    data() {
      return {
        showSymbolsModal: false,
        currentExchange: 'binance_futures',
        exchangesConfig: {},
        whitelistSymbols: [],
        availableSymbols: [],
        whitelistSearch: '',
        availableSearch: '',
        isLoadingExchange: false
      };
    },
    
    computed: {
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
      async loadSymbolsManager() {
        this.isLoadingExchange = true;
        
        try {
          this.addLog('Loading symbols manager...', 'info');
          
          // Add cache buster to force fresh data
          const timestamp = Date.now();
          const response = await fetch(`/config?_=${timestamp}`);
          const config = await response.json();
          
          this.exchangesConfig = config.exchanges || {};
          
          // Load whitelist for current exchange
          const currentSymbols = this.exchangesConfig[this.currentExchange]?.symbols || [];
          this.whitelistSymbols = [...currentSymbols];
          
          this.addLog(`Loaded ${currentSymbols.length} symbols for ${this.currentExchange}`, 'info');
          
          // Load available symbols (this will set isLoadingExchange = false)
          await this.loadAvailableSymbols();
        } catch (err) {
          this.addLog(`Failed to load symbols: ${err.message}`, 'error');
          this.isLoadingExchange = false;
        }
      },
      
      async loadAvailableSymbols() {
        try {
          this.isLoadingExchange = true;
          const response = await fetch(`/exchangeSymbols/${this.currentExchange}`);
          const data = await response.json();
          this.availableSymbols = data.symbols || [];
        } catch (err) {
          this.addLog(`Failed to load available symbols: ${err.message}`, 'error');
        } finally {
          this.isLoadingExchange = false;
        }
      },
      
      async switchExchange(exchange) {
        this.isLoadingExchange = true;
        this.currentExchange = exchange;
        
        try {
          // Fetch fresh config to ensure sync
          const timestamp = Date.now();
          const response = await fetch(`/config?_=${timestamp}`);
          const config = await response.json();
          this.exchangesConfig = config.exchanges || {};
          
          // Load whitelist for new exchange
          this.whitelistSymbols = [...(this.exchangesConfig[exchange]?.symbols || [])];
          this.whitelistSearch = '';
          this.availableSearch = '';
          
          // Load available symbols (this will set isLoadingExchange = false)
          await this.loadAvailableSymbols();
        } catch (err) {
          this.addLog(`Failed to switch exchange: ${err.message}`, 'error');
          this.isLoadingExchange = false;
        }
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
          // Get old symbols to compare
          const oldSymbols = this.exchangesConfig[this.currentExchange]?.symbols || [];
          const newSymbols = this.whitelistSymbols;
          
          // Find changes
          const removedSymbols = oldSymbols.filter(s => !newSymbols.includes(s));
          const addedSymbols = newSymbols.filter(s => !oldSymbols.includes(s));
          
          this.addLog(`Saving ${newSymbols.length} symbols for ${this.currentExchange}...`, 'info');
          
          const response = await fetch('/exchangeSymbols', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              exchange: this.currentExchange,
              symbols: newSymbols
            })
          });
          
          const result = await response.json();
          if (result.success) {
            this.addLog('✅ Configuration saved successfully!', 'validated');
            
            // Immediately sync UI
            if (removedSymbols.length > 0) {
              this.addLog(`Removing ${removedSymbols.length} symbols from UI...`, 'info');
              
              removedSymbols.forEach(symbol => {
                // Remove from SYMBOLS table
                this.removeSymbolFromUI(this.currentExchange, symbol);
                
                // Remove from REALTIME DATA table
                this.removeRealtimeData(this.currentExchange, symbol);
              });
            }
            
            if (addedSymbols.length > 0) {
              this.addLog(`Adding ${addedSymbols.length} symbols to UI...`, 'info');
              
              addedSymbols.forEach(symbol => {
                // Add to SYMBOLS table
                this.addSymbolToUI(this.currentExchange, symbol);
              });
            }
            
            // Refresh config immediately to show updated data
            await this.loadSymbolsManager();
            
            // Reload symbols from config after worker restarts
            setTimeout(() => {
              this.loadDatabaseSymbols();
            }, 3000);
            
            // Keep modal open to show progress
            // User can close manually or it will auto-close after progress completes
          } else {
            throw new Error(result.error || 'Failed to save');
          }
        } catch (err) {
          this.addLog(`❌ Failed to save whitelist: ${err.message}`, 'error');
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
            
            // Immediately sync UI
            if (!newStatus) {
              // Disabling - clear UI
              this.addLog(`Clearing ${this.currentExchange} data from UI...`, 'info');
              
              // Clear all realtime data for this exchange
              this.clearRealtimeDataForExchange(this.currentExchange);
              
              // Clear symbols from SYMBOLS table
              if (this.dbSymbols[this.currentExchange]) {
                delete this.dbSymbols[this.currentExchange];
              }
            } else {
              // Enabling - add symbols to UI
              const symbols = this.exchangesConfig[this.currentExchange].symbols || [];
              if (symbols.length > 0) {
                this.addLog(`Adding ${symbols.length} symbols to UI...`, 'info');
                this.dbSymbols[this.currentExchange] = [...symbols];
              }
            }
            
            // Reload symbols from config after worker starts/stops
            setTimeout(() => {
              this.loadDatabaseSymbols();
            }, 2000);
          } else {
            throw new Error(result.error || 'Failed to toggle exchange');
          }
        } catch (err) {
          this.addLog(`Failed to toggle exchange: ${err.message}`, 'error');
        }
      }
    },
    
    watch: {
      showSymbolsModal(newVal) {
        if (newVal) {
          // Modal opened - load fresh data
          console.log('[Symbols Manager] Modal opened, loading fresh data...');
          
          // Clear search filters
          this.whitelistSearch = '';
          this.availableSearch = '';
          
          // Load fresh data from server
          this.loadSymbolsManager();
        } else {
          // Modal closed
          console.log('[Symbols Manager] Modal closed');
        }
      }
    }
  };
}
