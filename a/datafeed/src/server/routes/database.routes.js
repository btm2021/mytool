export function setupDatabaseRoutes(app, db, log) {
    // Get all symbols from database grouped by exchange
    app.get('/databaseSymbols', (_req, res) => {
        try {
            log('Fetching symbols from database...', 'info');
            
            if (!db) {
                throw new Error('Database not initialized');
            }

            const symbolsByExchange = db.getAllSymbolsByExchange();
            
            log(`Found ${Object.keys(symbolsByExchange).length} exchanges in database`, 'info');
            
            res.json(symbolsByExchange);
        } catch (err) {
            log(`Failed to get DB symbols: ${err.message}`, 'error');
            res.status(500).json({ error: err.message });
        }
    });
}
