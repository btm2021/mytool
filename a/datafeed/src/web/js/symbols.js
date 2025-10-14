// Symbols management
export function createSymbolsMixin() {
  return {
    data() {
      return {
        dbSymbols: {},
        currentSymbolsTab: 'all',
        symbolsFilter: '',
        showOHLCVModal: false,
        ohlcvIframeSrc: ''
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
      }
    },
    
    methods: {
      async loadDatabaseSymbols() {
        try {
          // Load from config (source of truth) instead of database
          const timestamp = Date.now();
          const response = await fetch(`/config?_=${timestamp}`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unknown error'}`);
          }
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
          }
          
          const config = await response.json();
          
          // Build dbSymbols from config.exchanges
          this.dbSymbols = {};
          for (const [exchangeName, exchangeConfig] of Object.entries(config.exchanges || {})) {
            if (exchangeConfig.enabled && exchangeConfig.symbols && exchangeConfig.symbols.length > 0) {
              this.dbSymbols[exchangeName] = [...exchangeConfig.symbols];
            }
          }
        } catch (err) {
          this.addLog(`Failed to load symbols: ${err.message}`, 'error');
        }
      },
      
      removeSymbolFromUI(exchange, symbol) {
        // Remove from dbSymbols (which is now from config)
        if (this.dbSymbols[exchange]) {
          this.dbSymbols[exchange] = this.dbSymbols[exchange].filter(s => s !== symbol);
          
          // If no symbols left, remove exchange
          if (this.dbSymbols[exchange].length === 0) {
            delete this.dbSymbols[exchange];
          }
        }
      },
      
      addSymbolToUI(exchange, symbol) {
        // Add to dbSymbols
        if (!this.dbSymbols[exchange]) {
          this.dbSymbols[exchange] = [];
        }
        
        if (!this.dbSymbols[exchange].includes(symbol)) {
          this.dbSymbols[exchange].push(symbol);
          this.dbSymbols[exchange].sort();
        }
      },
      
      openChart(symbol, timeframe, exchange) {
        const url = `chart.html?symbol=${symbol}&timeframe=${timeframe}&exchange=${exchange}`;
        window.open(url, '_blank');
      },

      openOHLCV(symbol, exchange) {
        this.ohlcvIframeSrc = `symbolcontent.html?symbol=${symbol}&exchange=${exchange}&timeframe=1m`;
        this.showOHLCVModal = true;
      }
    }
  };
}
