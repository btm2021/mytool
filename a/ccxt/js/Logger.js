class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
    }

    log(message, type = 'info') {
        const log = {
            time: dayjs().format('HH:mm:ss'),
            message: message,
            type: type
        };
        
        this.logs.unshift(log);
        
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }
        
        console.log(`[${log.time}] [${type.toUpperCase()}] ${message}`);
    }

    info(message) {
        this.log(message, 'info');
    }

    success(message) {
        this.log(message, 'success');
    }

    error(message) {
        this.log(message, 'error');
    }

    warning(message) {
        this.log(message, 'warning');
    }

    getLogs() {
        return this.logs;
    }

    clear() {
        this.logs = [];
    }
}
