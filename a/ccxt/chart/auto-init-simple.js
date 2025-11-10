/**
 * Auto-initialization script for simple chart
 * Handles URL params and auto-loads data using CCXT
 */

(function() {
    'use strict';

    // Wait for DOM and all dependencies to load
    window.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 Auto-init: Checking URL parameters...');

        // Initialize URL params handler
        const urlHandler = new URLParamsHandler();
        const params = urlHandler.getParams();

        console.log('📋 URL Params:', params);

        // Apply params to UI
        urlHandler.applyToUI();

        // Check if should auto-load
        if (!urlHandler.shouldAutoLoad()) {
            console.log('⏸️  Auto-load not enabled or missing params');
            return;
        }

        console.log('✓ Auto-load enabled, waiting for app initialization...');

        // Wait for SimpleTradingApp to be initialized
        let attempts = 0;
        const maxAttempts = 200; // 20 seconds
        
        const waitForApp = setInterval(async () => {
            attempts++;
            
            if (attempts % 10 === 0) {
                console.log(`⏳ Waiting for app... ${attempts}/${maxAttempts}`);
            }
            
            if (window.app && window.app.chartManager && window.app.ccxtLoader) {
                clearInterval(waitForApp);
                
                try {
                    console.log('✓ App ready, starting auto-load...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await autoLoadData(urlHandler, params);
                } catch (error) {
                    console.error('✗ Auto-load failed:', error);
                    alert(`Failed to load chart data: ${error.message}`);
                }
            } else if (attempts >= maxAttempts) {
                clearInterval(waitForApp);
                console.error('✗ Timeout waiting for app initialization');
                alert('Chart initialization timeout. Please refresh the page.');
            }
        }, 100);
    });

    /**
     * Auto-load data using CCXT
     */
    async function autoLoadData(urlHandler, params) {
        const statusEl = document.getElementById('status');
        
        try {
            console.log('═══════════════════════════════════════');
            console.log('🔄 Starting Auto-Load');
            console.log('═══════════════════════════════════════');
            
            if (statusEl) {
                statusEl.textContent = 'Loading data...';
                statusEl.className = 'status-loading';
            }

            // Get exchange and symbol
            const exchangeId = urlHandler.getExchangeName();
            const symbol = urlHandler.getSymbolForCCXT();

            console.log(`   Exchange: ${exchangeId}`);
            console.log(`   Symbol: ${symbol}`);
            console.log(`   Timeframe: ${params.timeframe}`);
            console.log(`   Limit: ${params.limit} candles`);

            // Set current exchange in app
            window.app.setExchange(exchangeId);

            // Fetch data from CCXT
            console.log('📊 Fetching OHLCV data...');
            const data = await window.app.ccxtLoader.fetchOHLCV(
                exchangeId,
                symbol,
                params.timeframe,
                params.limit
            );

            console.log(`✓ Loaded ${data.length} candles`);

            // Store and display data
            window.app.currentData = data;
            window.app.displayData(data);

            // Set watermark
            const exchangeDisplayName = urlHandler.getExchangeDisplayName();
            window.app.chartManager.setWatermark(exchangeDisplayName, params.symbol, params.timeframe);

            console.log('═══════════════════════════════════════');
            console.log('✅ Auto-Load Complete!');
            console.log('═══════════════════════════════════════');
            
            if (statusEl) {
                statusEl.textContent = `${params.symbol} ${params.timeframe} - ${data.length} candles`;
                statusEl.className = 'status-success';
            }

        } catch (error) {
            console.log('═══════════════════════════════════════');
            console.error('❌ Auto-Load Error');
            console.log('═══════════════════════════════════════');
            console.error(error);
            
            if (statusEl) {
                statusEl.textContent = 'Error: ' + error.message;
                statusEl.className = 'status-error';
            }
            
            alert(`Failed to load chart data:\n${error.message}`);
            throw error;
        }
    }
})();
