// Configuration management
export function createConfigMixin() {
  return {
    data() {
      return {
        showConfigModal: false,
        configTab: 'client',
        isSavingConfig: false,
        config: {
          // Server settings
          batch_interval: 60000,
          max_records: 200000,
          bootstrap_load: 50000,
          cleanup_hour: 3,
          port: 3000,
          // Client settings
          realtime_update: true,
          debug_log: false,
          max_log_lines: 200
        }
      };
    },
    
    methods: {
      async loadConfig() {
        try {
          const response = await fetch('/config');
          const data = await response.json();
          
          // Map server config to local state
          this.config = {
            // Server settings
            batch_interval: data.batch_interval || 60000,
            max_records: data.max_records || 200000,
            bootstrap_load: data.bootstrap_load || 50000,
            cleanup_hour: data.cleanup_hour || 3,
            port: data.port || 3000,
            // Client settings
            realtime_update: data.client?.realtime_update ?? true,
            debug_log: data.client?.debug_log ?? false,
            max_log_lines: data.client?.max_log_lines ?? 200
          };
          
          // Apply client settings immediately
          this.applyClientConfig();
        } catch (err) {
          this.addLog(`Failed to load config: ${err.message}`, 'error');
        }
      },
      
      applyClientConfig() {
        // Apply realtime update setting
        if (this.config.realtime_update !== undefined) {
          this.realtimeEnabled = this.config.realtime_update;
        }
        
        // Apply debug log setting
        if (this.config.debug_log !== undefined) {
          this.debugLogEnabled = this.config.debug_log;
        }
        
        // Apply max log lines
        if (this.config.max_log_lines !== undefined) {
          this.maxLogLines = this.config.max_log_lines;
          // Trim logs if needed
          if (this.logs.length > this.maxLogLines) {
            this.logs = this.logs.slice(-this.maxLogLines);
          }
        }
      },
      
      async saveClientConfig() {
        this.isSavingConfig = true;
        try {
          const clientConfig = {
            realtime_update: this.config.realtime_update,
            debug_log: this.config.debug_log,
            max_log_lines: this.config.max_log_lines
          };
          
          const response = await fetch('/config/client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientConfig)
          });
          
          const result = await response.json();
          if (result.success) {
            this.addLog('Client settings saved successfully', 'validated');
            // Apply settings immediately without reload
            this.applyClientConfig();
            
            // Close modal after short delay
            setTimeout(() => {
              this.isSavingConfig = false;
              this.showConfigModal = false;
            }, 500);
          } else {
            throw new Error(result.error || 'Failed to save client config');
          }
        } catch (err) {
          this.isSavingConfig = false;
          this.addLog(`Failed to save client config: ${err.message}`, 'error');
        }
      },
      
      async saveConfig() {
        this.isSavingConfig = true;
        try {
          const serverConfig = {
            batch_interval: this.config.batch_interval,
            max_records: this.config.max_records,
            bootstrap_load: this.config.bootstrap_load,
            cleanup_hour: this.config.cleanup_hour,
            port: this.config.port
          };
          
          const response = await fetch('/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverConfig)
          });
          
          const result = await response.json();
          if (result.success) {
            this.addLog('Server configuration saved. System is restarting...', 'validated');
            // Keep overlay showing during restart
            setTimeout(() => {
              this.showConfigModal = false;
            }, 1000);
          } else {
            throw new Error(result.error || 'Failed to save config');
          }
        } catch (err) {
          this.isSavingConfig = false;
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
