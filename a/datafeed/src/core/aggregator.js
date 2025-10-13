export class Aggregator {
  static resample(candles1m, targetTimeframe) {
    if (targetTimeframe === '1m') return candles1m;

    const minutes = this.parseTimeframe(targetTimeframe);
    if (!minutes) return candles1m;

    const resampled = [];
    const grouped = new Map();

    for (const [ts, o, h, l, c, v] of candles1m) {
      const bucketTs = Math.floor(ts / (minutes * 60000)) * (minutes * 60000);
      
      if (!grouped.has(bucketTs)) {
        grouped.set(bucketTs, { ts: bucketTs, open: o, high: h, low: l, close: c, volume: v });
      } else {
        const bucket = grouped.get(bucketTs);
        bucket.high = Math.max(bucket.high, h);
        bucket.low = Math.min(bucket.low, l);
        bucket.close = c;
        bucket.volume += v;
      }
    }

    for (const [ts, data] of grouped) {
      resampled.push([data.ts, data.open, data.high, data.low, data.close, data.volume]);
    }

    return resampled.sort((a, b) => a[0] - b[0]);
  }

  static parseTimeframe(tf) {
    const match = tf.match(/^(\d+)([mhd])$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value;
      case 'h': return value * 60;
      case 'd': return value * 1440;
      default: return null;
    }
  }
}
