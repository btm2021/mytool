// Command input management
export function createCommandMixin() {
  return {
    data() {
      return {
        commandInput: ''
      };
    },
    
    methods: {
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
      }
    }
  };
}
