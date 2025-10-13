export class DataSourceBase {
  connect() {
    throw new Error('connect() must be implemented');
  }

  subscribe(symbols, interval) {
    throw new Error('subscribe() must be implemented');
  }

  onMessage(callback) {
    throw new Error('onMessage() must be implemented');
  }

  reconnect() {
    throw new Error('reconnect() must be implemented');
  }

  async backfill(symbol, fromTs, toTs) {
    throw new Error('backfill() must be implemented');
  }

  normalize(raw) {
    throw new Error('normalize() must be implemented');
  }
}
