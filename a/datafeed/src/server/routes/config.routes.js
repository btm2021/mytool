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

    // Update server config (requires restart)
    app.post('/config', (req, res) => {
        const { batch_interval, max_records, bootstrap_load, cleanup_hour, port: newPort } = req.body;
        
        parentPort.postMessage({
            type: 'update_config',
            data: { batch_interval, max_records, bootstrap_load, cleanup_hour, port: newPort }
        });
        
        res.json({ success: true, message: 'Configuration updated. Restarting...' });
    });

    // Update client config (no restart needed)
    app.post('/config/client', (req, res) => {
        try {
            const { realtime_update, debug_log, max_log_lines } = req.body;
            
            // Update client config in memory and file
            const currentConfig = config.getAll();
            currentConfig.client = {
                realtime_update: realtime_update ?? true,
                debug_log: debug_log ?? false,
                max_log_lines: max_log_lines ?? 200
            };
            
            // Save to file
            config.update(currentConfig);
            
            res.json({ success: true, message: 'Client configuration updated' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
}
