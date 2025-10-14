import { fetchBinanceSymbols, fetchBybitSymbols, fetchOKXSymbols } from '../services/exchange.service.js';
import { config } from '../../config/config.js';

export function setupExchangeRoutes(app, parentPort, log) {
    // Get exchanges
    app.get('/exchanges', (_req, res) => {
        res.json(config.exchanges);
    });

    // Get exchange symbols
    app.get('/exchangeSymbols/:exchange', async (req, res) => {
        const { exchange } = req.params;
        
        try {
            let symbols = [];
            
            if (exchange === 'binance_futures') {
                symbols = await fetchBinanceSymbols();
            } else if (exchange === 'bybit_futures') {
                symbols = await fetchBybitSymbols();
            } else if (exchange === 'okx_futures') {
                symbols = await fetchOKXSymbols();
            } else {
                return res.status(404).json({ error: 'Exchange not supported' });
            }
            
            res.json({ symbols });
        } catch (err) {
            log(`Failed to fetch symbols: ${err.message}`, 'error');
            res.status(500).json({ error: err.message });
        }
    });

    // Update exchange symbols
    app.post('/exchangeSymbols', (req, res) => {
        const { exchange, symbols } = req.body;
        
        if (!exchange || !Array.isArray(symbols)) {
            return res.status(400).json({ error: 'exchange and symbols array required' });
        }
        
        parentPort.postMessage({
            type: 'update_exchange_symbols',
            exchange,
            symbols
        });
        
        res.json({ success: true, message: 'Configuration saved. Restarting...' });
    });

    // Toggle exchange enabled/disabled
    app.post('/toggleExchange', (req, res) => {
        const { exchange, enabled } = req.body;
        
        if (!exchange || typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'exchange and enabled (boolean) required' });
        }
        
        parentPort.postMessage({
            type: 'toggle_exchange',
            exchange,
            enabled
        });
        
        res.json({ success: true, message: `Exchange ${enabled ? 'enabled' : 'disabled'}. Restarting...` });
    });
}
