// Configuration management
export function createConfigMixin() {
  return {
    data() {
      return {
        showConfigModal: false,
        config: {
          batch_interval: 60000,
          max_records: 100000,
          bootstrap_load: 10000,
          port: 3000
        }
      };
    },
    
    methods: {
      async loadConfig() {
        try {
          const response = await fetch('/config');
          const data = await response.json();
          this.config = {
            batch_interval: data.batch_interval || 60000,
            max_records: data.max_records || 100000,
            bootstrap_load: data.bootstrap_load || 10000,
            port: data.port || 3000
          };
        } catch (err) {
          this.addLog(`Failed to load config: ${err.message}`, 'error');
        }
      },
      
      async saveConfig() {
        try {
          const response = await fetch('/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.config)
          });
          
          const result = await response.json();
          if (result.success) {
            this.addLog('Configuration saved. System is restarting...', 'validated');
            this.showConfigModal = false;
          } else {
            throw new Error(result.error || 'Failed to save config');
          }
        } catch (err) {
          this.addLog(`Failed to save config: ${err.message}`, 'error');
        }
      }
    },
    
    watch: {
      showConfigModal(newVal) {
        if (newVal) {
          this.loadConfig();
        }
      }
    }
  };
}
