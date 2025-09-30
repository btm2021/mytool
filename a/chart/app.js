/**
 * Main Application - TradingView Chart Initialization
 */

// Wait for DOM to be fully loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing TradingView Chart...');
    
    // Create Binance Futures Datafeed instance
    const datafeed = new BinanceFuturesDatafeed();
    
    // Load saved settings from localStorage
    const savedSymbol = localStorage.getItem('tv_symbol') || 'BTCUSDT';
    const savedInterval = localStorage.getItem('tv_interval') || '15';
    
    // TradingView Widget Configuration
    const widgetOptions = {
        symbol: savedSymbol,             // Default symbol from localStorage
        datafeed: datafeed,              // Custom datafeed
        interval: savedInterval,         // Default interval from localStorage
        container: 'tv_chart_container', // Container ID
        library_path: 'charting_library/', // Path to charting library
        locale: 'en',                    // Language
        
        disabled_features: [
            'study_templates',
            'use_localstorage_for_settings',
            'save_chart_properties_to_local_storage'
        ],
        
        fullscreen: false,
        autosize: true,
        theme: 'Dark',                   // Dark theme
        timezone: 'Etc/UTC',
        
        // Disable auto-save to prevent loading old state
        auto_save_delay: 0,
        load_last_chart: false,
        
        // Add favorite intervals
        time_frames: [
            { text: "5m", resolution: "5", description: "5 Minutes" },
            { text: "15m", resolution: "15", description: "15 Minutes" },
            { text: "1h", resolution: "60", description: "1 Hour" },
            { text: "4h", resolution: "240", description: "4 Hours" },
            { text: "D", resolution: "1D", description: "1 Day" }
        ],
        
        // Overrides for chart appearance

    };

    // Create TradingView Widget
    const tvWidget = new TradingView.widget(widgetOptions);

    // Widget is ready
    tvWidget.onChartReady(() => {
        console.log('Chart has loaded!');
        
        // Get active chart
        const chart = tvWidget.activeChart();
        
        // Load saved chart from localStorage
        // const savedCharts = localStorage.getItem('tv_charts');
        // if (savedCharts) {
        //     try {
        //         const charts = JSON.parse(savedCharts);
        //         if (charts.length > 0) {
        //             widgetOptions.save_load_adapter.charts = charts;
        //         }
        //     } catch (e) {
        //         console.error('Error loading saved charts:', e);
        //     }
        // }
        
        // Add custom indicators programmatically
    //    chart.createStudy('ATR Trailing Stop', false, false);
      //  chart.createStudy('VSR - Volume Support Resistance', false, false);
        
        // // Save symbol and interval when changed
        // chart.onSymbolChanged().subscribe(null, (symbolData) => {
        //     localStorage.setItem('tv_symbol', symbolData.name);
        //     console.log('Symbol changed to:', symbolData.name);
        // });
        
        // chart.onIntervalChanged().subscribe(null, (interval) => {
        //     localStorage.setItem('tv_interval', interval);
        //     console.log('Interval changed to:', interval);
        // });
        
        console.log('Chart is ready and configured!');
    });

    // Make widget globally accessible for debugging
    window.tvWidget = tvWidget;
});
