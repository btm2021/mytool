import { config } from '../../config/config.js';

export function setupConfigRoutes(app, parentPort) {
    // Get config
    app.get('/config', (_req, res) => {
        // Prevent caching to ensure fresh data
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        // Reload config from file to ensure latest data
        config.reload();
        
        res.json(config.getAll());
    });

    // Update config
    app.post('/config', (req, res) => {
        const { batch_interval, max_records, bootstrap_load, port: newPort } = req.body;
        
        parentPort.postMessage({
            type: 'update_config',
            data: { batch_interval, max_records, bootstrap_load, port: newPort }
        });
        
        res.json({ success: true, message: 'Configuration updated. Restarting...' });
    });
}
