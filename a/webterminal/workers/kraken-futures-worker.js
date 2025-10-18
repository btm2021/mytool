importScripts('base-worker.js');

class KrakenFuturesWorker extends BaseExchangeWorker {
    constructor(config) {
        super('krakenfutures', config);
        this.acceptedQuotes = config?.acceptedQuotes || ['USD', 'USDT'];
        this.dropRunningCandle = true;
    }

    createExchange() {
        const baseOptions = this.getExchangeOptions();
        
        return new ccxt.krakenfutures({
            ...baseOptions,
            options: {
                defaultType: 'swap'
            }
        });
    }

    filterSymbols() {
        return Object.keys(this.exchange.markets).filter((symbol) => {
            const market = this.exchange.markets[symbol];
            // Filter for perpetual inverse futures (PI_) and linear futures (PF_)
            return (
                market?.active &&
                market.tradeable !== false &&
                (market.swap === true || market.type === 'swap' || market.type === 'future') &&
                (symbol.startsWith('PI_') || symbol.startsWith('PF_')) &&
                this.acceptedQuotes.includes(market.settle || market.quote)
            );
        });
    }

    normalizeSymbol(symbol) {
        // Kraken Futures uses format like PI_XBTUSD, PF_ETHUSD
        // Get the market info to extract base/quote
        const market = this.exchange.markets[symbol];
        if (market && market.base && market.quote) {
            // Convert to standard format: BTC/USD, ETH/USD
            return `${market.base}/${market.quote}`;
        }
        
        // Fallback: try to parse from symbol name
        // PI_XBTUSD -> BTC/USD, PF_ETHUSD -> ETH/USD
        if (symbol.startsWith('PI_') || symbol.startsWith('PF_')) {
            const pair = symbol.substring(3); // Remove PI_ or PF_
            // Common Kraken mappings
            const baseMap = {
                'XBT': 'BTC',
                'ETH': 'ETH',
                'LTC': 'LTC',
                'XRP': 'XRP',
                'BCH': 'BCH',
                'ADA': 'ADA',
                'DOT': 'DOT',
                'SOL': 'SOL'
            };
            
            // Try to split base and quote
            for (const [krakenBase, standardBase] of Object.entries(baseMap)) {
                if (pair.startsWith(krakenBase)) {
                    const quote = pair.substring(krakenBase.length);
                    return `${standardBase}/${quote}`;
                }
            }
        }
        
        return symbol;
    }

    async processSymbol(symbol) {
        if (this.weight >= this.maxWeight * this.weightThreshold) {
            throw new Error('Weight limit reached');
        }

        try {
            // Use original symbol for API call
            const originalSymbol = this.symbolMap[symbol] || symbol;
            const tf = this.timeframe;
            const tfMs = this.exchange.parseTimeframe(tf) * 1000;
            const rawOhlcv = await this.exchange.fetchOHLCV(originalSymbol, tf, undefined, this.klineLimit);

            this.weight += this.weightCost;
            this.postWeight();

            if (!rawOhlcv || rawOhlcv.length === 0) {
                this.postLog('warn', `${symbol}: No data`);
                return;
            }

            // Drop running candle if needed
            let trimmed = rawOhlcv;
            const last = trimmed[trimmed.length - 1];
            if (this.dropRunningCandle && last[0] + tfMs > Date.now()) {
                trimmed = trimmed.slice(0, -1);
            }

            // Normalize OHLCV data
            const ohlcv = this.normalizeOHLCV(trimmed);

            if (ohlcv.length === 0) {
                this.postLog('warn', `${symbol}: Invalid data after normalization`);
                return;
            }

            if (ohlcv.length < 50) {
                this.postLog('warn', `${symbol}: Only ${ohlcv.length} candles`);
                return;
            }

            this.postOHLCV({
                symbol: symbol,
                ohlcv: ohlcv
            });

        } catch (error) {
            this.postLog('error', `${symbol}: ${error.message}`);
            throw error;
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
