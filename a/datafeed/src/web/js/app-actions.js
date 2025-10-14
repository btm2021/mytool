// Application actions (restart, delete DB)
export function createAppActionsMixin() {
  return {
    methods: {
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
      }
    }
  };
}
