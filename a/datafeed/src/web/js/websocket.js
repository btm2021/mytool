// WebSocket management
export function createWebSocketMixin() {
  return {
    data() {
      return {
        ws: null,
        wsConnected: false
      };
    },
    
    methods: {
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
              this.addLog(message.data.message, message.data.type);
            }
            break;
          case 'candle':
            this.updateRealtimeData(message.data);
            break;
          case 'worker_metrics':
            // Merge instead of replace to keep all workers
            this.workerMetrics = { ...this.workerMetrics, ...message.data };
            break;
          case 'system_info':
            this.updateSystemInfo(message.data);
            break;
          case 'command_response':
            this.handleCommandResponse(message.data);
            break;
          case 'reload_progress':
            this.handleReloadProgress(message.data);
            break;
        }
      }
    }
  };
}
