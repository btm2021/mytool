/* global importScripts, ccxt */
importScripts('base-worker.js');

class KrakenFuturesWorker extends BaseExchangeWorker {
  constructor(config) {
    super('krakenfutures', config);
    this.acceptedQuotes = config?.acceptedQuotes || ['USD', 'USDT'];
    this.dropRunningCandle = true;
  }

  createExchange() {
    return new ccxt.krakenfutures({
      enableRateLimit: true,
      timeout: 30000,
      options: {
        defaultType: 'swap',
        fetch: (url, params) => {
          return fetch(
            'https://autumn-heart-5bf8.trinhminhbao.workers.dev/' + url,
            params
          );
        }
      }
    });
  }

  filterSymbols() {
    return Object.keys(this.exchange.markets).filter((s) => {
      const m = this.exchange.markets[s];
      return (
        m?.active &&
        (m.swap === true || m.type === 'swap') &&
        this.acceptedQuotes.includes(m.settle || m.quote)
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
    worker = new KrakenFuturesWorker(data.config || {});
    await worker.init();
  } else if (data.type === 'pause') worker?.pause();
  else if (data.type === 'resume') worker?.resume();
  else if (data.type === 'stop') worker?.stop();
  else if (data.type === 'set_processed') worker?.setProcessedSymbols(data.data);
};
