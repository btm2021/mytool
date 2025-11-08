class Analyzer {
    static analyze(ohlcvData) {
        if (!ohlcvData || ohlcvData.length === 0) return null;

        const latest = ohlcvData[ohlcvData.length - 1];
        const previous = ohlcvData.length > 1 ? ohlcvData[ohlcvData.length - 2] : latest;

        // Basic calculations
        const change = ((latest.close - latest.open) / latest.open * 100).toFixed(2);
        const volatility = ((latest.high - latest.low) / latest.low * 100).toFixed(2);
        const volume = latest.volume;
        
        // Trend detection
        let trend = 'Sideways';
        if (change > 1) trend = 'Uptrend';
        else if (change < -1) trend = 'Downtrend';

        // Signal generation
        let signal = 'Neutral';
        if (change > 2) signal = 'Strong Buy';
        else if (change > 0.5) signal = 'Buy';
        else if (change < -2) signal = 'Strong Sell';
        else if (change < -0.5) signal = 'Sell';

        // Momentum
        const momentum = latest.close > previous.close ? '↑' : '↓';

        return {
            change: parseFloat(change),
            volatility: parseFloat(volatility),
            volume: volume,
            trend: trend,
            signal: signal,
            momentum: momentum,
            summary: `${signal} ${momentum} | Δ${change}% | Vol${volatility}%`
        };
    }

    static analyzeMultiple(ohlcvData) {
        if (!ohlcvData || ohlcvData.length < 20) return this.analyze(ohlcvData);

        // Advanced analysis with more data
        const closes = ohlcvData.map(d => d.close);
        const volumes = ohlcvData.map(d => d.volume);

        // Simple Moving Average
        const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const latest = ohlcvData[ohlcvData.length - 1];

        const basic = this.analyze(ohlcvData);
        
        // Add SMA analysis
        if (latest.close > sma20) {
            basic.smaSignal = 'Above SMA20';
        } else {
            basic.smaSignal = 'Below SMA20';
        }

        return basic;
    }
}
