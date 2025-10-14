// Utility functions
export function formatBytes(bytes) {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + sizes[i];
}

export function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export function isWorkerAlive(worker) {
  if (!worker || !worker.timestamp) return false;
  const age = Date.now() - worker.timestamp;
  // Consider alive if heartbeat within last 10 seconds
  return age < 10000;
}
