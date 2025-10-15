// Terminal logs management
export function createLogsMixin() {
  return {
    data() {
      return {
        logs: [],
        debugLogEnabled: false,
        maxLogLines: 200
      };
    },
    
    methods: {
      addLog(message, type = 'info') {
        // Skip debug logs if debug is disabled
        if (type === 'debug' && !this.debugLogEnabled) {
          return;
        }
        
        const time = new Date().toLocaleTimeString();
        this.logs.unshift({ time, message, type });
        
        // Use configurable max log lines
        if (this.logs.length > this.maxLogLines) {
          this.logs = this.logs.slice(0, this.maxLogLines);
        }
      },
      
      clearLogs() {
        this.logs = [];
        this.addLog('Terminal cleared', 'info');
      }
    }
  };
}
