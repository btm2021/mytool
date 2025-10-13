export class Logger {
  constructor() {
    this.broadcasts = [];
  }

  addBroadcaster(fn) {
    this.broadcasts.push(fn);
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    console.log(logMessage);
    
    this.broadcasts.forEach(fn => {
      fn({ message, type, timestamp });
    });
  }

  info(message) {
    this.log(message, 'info');
  }

  success(message) {
    this.log(message, 'connected');
  }

  warn(message) {
    this.log(message, 'backfilling');
  }

  error(message) {
    this.log(message, 'error');
  }

  receiving(message) {
    this.log(message, 'receiving');
  }

  validated(message) {
    this.log(message, 'validated');
  }
}

export const logger = new Logger();
