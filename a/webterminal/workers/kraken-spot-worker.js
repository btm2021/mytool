/* global importScripts, ccxt */
importScripts('base-worker.js');

class KrakenSpotWorker extends BaseExchangeWorker {
  constructor(config) {
    super('kraken', config);
    this.acceptedQuotes = config?.acceptedQuotes || ['USDT', 'USD'];
    this.dropRunningCandle = true; // Kraken trả nến đang chạy ở cuối
  }

  createExchange() {
    return new ccxt.kraken({
      enableRateLimit: true,
      timeout: 30000
    });
  }

  filterSymbols() {
    return Object.keys(this.exchange.markets).filter((s) => {
      const m = this.exchange.markets[s];
      return (
        m?.active &&
        (m.spot === true || m.type === 'spot' || m.type === undefined) &&
        this.acceptedQuotes.includes(m.quote)
      );
    });
  }

  async processSymbol(symbol) {
    try {
      const tf = this.timeframe;
      const tfMs = this.exchange.parseTimeframe(tf) * 1000;
      const raw = await this.exchange.fetchOHLCV(symbol, tf, undefined, this.klineLimit);

      if (!raw?.length) return;
      let trimmed = raw;

      const last = trimmed[trimmed.length - 1];
      if (this.dropRunningCandle && last[0] + tfMs > Date.now()) {
        trimmed = trimmed.slice(0, -1);
      }

      const ohlcv = this.normalizeOHLCV(trimmed);
      if (ohlcv.length > 0) this.postOHLCV({ symbol, ohlcv });
    } catch (err) {
      this.postLog('error', `${symbol}: ${err.message}`);
    }
  }
}

let worker = null;
self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    worker = new KrakenSpotWorker(data.config || {});
    await worker.init();
  } else if (data.type === 'pause') worker?.pause();
  else if (data.type === 'resume') worker?.resume();
  else if (data.type === 'stop') worker?.stop();
  else if (data.type === 'set_processed') worker?.setProcessedSymbols(data.data);
};
