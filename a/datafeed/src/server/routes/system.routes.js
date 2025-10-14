export function setupSystemRoutes(app, parentPort, workerStatus) {
    // Status endpoints
    app.get('/status', (_req, res) => {
        res.json({
            status: 'running',
            timestamp: Date.now()
        });
    });

    app.get('/api/status', (_req, res) => {
        res.json({ 
            success: true, 
            workers: workerStatus,
            timestamp: Date.now()
        });
    });

    // Restart endpoint
    app.post('/restart', (_req, res) => {
        res.json({ success: true, message: 'Restarting application...' });
        parentPort.postMessage({ type: 'restart' });
    });

    app.post('/api/restart', (_req, res) => {
        res.json({ success: true, message: 'Restart initiated' });
        parentPort.postMessage({ type: 'restart' });
    });

    // Delete database endpoint
    app.post('/deleteDatabase', (_req, res) => {
        res.json({ success: true, message: 'Database deletion initiated' });
        parentPort.postMessage({ type: 'delete-database' });
    });

    // Reload symbols endpoint
    app.post('/api/reload_symbols', (req, res) => {
        const { exchange, symbols } = req.body;
        
        if (!exchange || !symbols) {
            return res.status(400).json({ error: 'Missing exchange or symbols' });
        }
        
        res.json({ success: true, message: 'Reload initiated' });
        parentPort.postMessage({ 
            type: 'reload_symbols', 
            exchange,
            symbols 
        });
    });
}
