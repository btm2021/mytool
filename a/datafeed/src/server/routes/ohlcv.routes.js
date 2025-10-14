import { Aggregator } from '../../core/aggregator.js';

export function setupOHLCVRoutes(app, db) {
    // OHLCV endpoint
    app.get('/ohlcv', (req, res) => {
        const { exchange, symbol, timeframe = '1m', limit = 500 } = req.query;
        
        if (!symbol) {
            return res.status(400).json({ error: 'symbol is required' });
        }

        const requestLimit = parseInt(limit);
        const candles1m = db.getOHLCV(exchange, symbol.toUpperCase(), '1m', requestLimit * 100);

        if (timeframe === '1m') {
            return res.json(candles1m.slice(-requestLimit));
        }

        const resampled = Aggregator.resample(candles1m, timeframe);
        res.json(resampled.slice(-requestLimit));
    });

    // Legacy API endpoints
    app.get('/api/candles', (req, res) => {
        const { exchange, symbol, interval, limit = 1000 } = req.query;
        
        if (!exchange || !symbol || !interval) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const candles = db.getCandles(exchange, symbol, interval, parseInt(limit));
        res.json(candles);
    });

    app.get('/api/aggregated', (req, res) => {
        const { exchange, symbol, from_interval, to_interval, limit = 1000 } = req.query;
        
        if (!exchange || !symbol || !from_interval || !to_interval) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const candles = db.getCandles(exchange, symbol, from_interval, parseInt(limit) * 100);
        const aggregated = Aggregator.aggregate(candles, to_interval);
        res.json(aggregated);
    });

    app.get('/api/stats', (req, res) => {
        const { exchange, symbol, interval } = req.query;
        
        if (!exchange || !symbol || !interval) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const count = db.getCount(exchange, symbol, interval);
        const lastTs = db.getLastTimestamp(exchange, symbol, interval);
        
        res.json({ count, lastTimestamp: lastTs });
    });
}
