// Terminal logs management
export function createLogsMixin() {
  return {
    data() {
      return {
        logs: []
      };
    },
    
    methods: {
      addLog(message, type = 'info') {
        const time = new Date().toLocaleTimeString();
        this.logs.unshift({ time, message, type });
        if (this.logs.length > 500) {
          this.logs.pop();
        }
      },
      
      clearLogs() {
        this.logs = [];
        this.addLog('Terminal cleared', 'info');
      }
    }
  };
}
