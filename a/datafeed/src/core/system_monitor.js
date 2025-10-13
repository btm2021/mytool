import os from 'os';
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';

export class SystemMonitor {
  constructor(config = null) {
    this.interval = null;
    this.config = config;
  }

  getDatabaseSize() {
    if (!this.config) {
      return { total: 0, main: 0, wal: 0, shm: 0 };
    }

    const dbPath = this.config.databasePath || './data/ohlcv.db';
    let total = 0;
    let main = 0;
    let wal = 0;
    let shm = 0;

    try {
      if (existsSync(dbPath)) {
        main = statSync(dbPath).size;
        total += main;
      }

      const walPath = `${dbPath}-wal`;
      if (existsSync(walPath)) {
        wal = statSync(walPath).size;
        total += wal;
      }

      const shmPath = `${dbPath}-shm`;
      if (existsSync(shmPath)) {
        shm = statSync(shmPath).size;
        total += shm;
      }
    } catch (err) {
      // Ignore errors
    }

    return { total, main, wal, shm };
  }

  getSystemInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const cpus = os.cpus();
    const cpuUsage = this.getCPUUsage(cpus);
    
    const memUsage = process.memoryUsage();
    
    let diskInfo = { total: 0, free: 0, used: 0 };
    try {
      if (process.platform === 'darwin' || process.platform === 'linux') {
        const df = execSync('df -k /').toString().split('\n')[1].split(/\s+/);
        diskInfo = {
          total: parseInt(df[1]) * 1024,
          used: parseInt(df[2]) * 1024,
          free: parseInt(df[3]) * 1024
        };
      }
    } catch (err) {
      // Ignore disk info errors
    }

    const dbSize = this.getDatabaseSize();

    return {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown'
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: ((usedMem / totalMem) * 100).toFixed(1)
      },
      process: {
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        rss: memUsage.rss
      },
      disk: diskInfo,
      database: dbSize,
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch()
    };
  }

  getCPUUsage(cpus) {
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return usage;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  start(broadcastCallback, intervalMs = 2000) {
    if (this.interval) clearInterval(this.interval);
    
    // Send initial data immediately
    try {
      const info = this.getSystemInfo();
      broadcastCallback({
        type: 'system_info',
        data: info
      });
    } catch (err) {
      console.error('[SystemMonitor] Initial broadcast error:', err.message);
    }
    
    // Then start interval
    this.interval = setInterval(() => {
      try {
        const info = this.getSystemInfo();
        broadcastCallback({
          type: 'system_info',
          data: info
        });
      } catch (err) {
        console.error('[SystemMonitor] Broadcast error:', err.message);
      }
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
