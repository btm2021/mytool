// System monitoring
import { formatBytes, formatUptime } from './utils.js';

export function createSystemMixin() {
  return {
    data() {
      return {
        systemInfo: {
          'CPU USAGE': '0%',
          'CPU CORES': '0',
          'MEMORY': '0%',
          'HEAP': '0MB',
          'DATABASE': '0MB',
          'DISK FREE': '0GB',
          'UPTIME': '0d 0h',
          'PLATFORM': '-'
        },
        workerMetrics: {}
      };
    },
    
    methods: {
      updateSystemInfo(data) {
        this.systemInfo = {
          'CPU USAGE': data.cpu?.usage !== undefined ? `${data.cpu.usage}%` : '0%',
          'CPU CORES': data.cpu?.cores || 0,
          'MEMORY': data.memory?.usagePercent !== undefined ? `${data.memory.usagePercent}%` : '0%',
          'HEAP': data.process?.heapUsed ? formatBytes(data.process.heapUsed) : '0MB',
          'DATABASE': data.database?.total ? formatBytes(data.database.total) : '0MB',
          'DISK FREE': data.disk?.free ? formatBytes(data.disk.free) : '0GB',
          'UPTIME': data.uptime !== undefined ? formatUptime(data.uptime) : '0d 0h',
          'PLATFORM': data.platform && data.arch ? `${data.platform}/${data.arch}` : '-'
        };
      }
    }
  };
}
