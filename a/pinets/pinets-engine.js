// Pinets Engine - With Binance Futures API Integration
class PinetsEngine {
  constructor() {
    this.bars = 500; // Number of bars from Binance
    this.indicatorName = '';
    this.plots = [];
    this.inputs = {};
    this.series = {};
    this.data = [];
    this.symbol = 'BTCUSDT'; // Default symbol
    this.interval = '1h'; // Default interval
    this.dataLoaded = false;
  }

  async initializeMarketData(symbol = 'BTCUSDT', interval = '1h') {
    try {
      this.symbol = symbol;
      this.interval = interval;
      
      // Binance Futures API endpoint
      const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=500`;
      
      console.log(`Fetching data from Binance: ${symbol} ${interval}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }
      
      const klines = await response.json();
      
      // Transform Binance data to our format
      this.data = klines.map((kline, index) => {
        const [
          openTime,
          open,
          high,
          low,
          close,
          volume,
          closeTime,
          quoteVolume,
          trades,
          takerBuyBaseVolume,
          takerBuyQuoteVolume,
          ignore
        ] = kline;
        
        return {
          index: index,
          time: new Date(openTime).toISOString().replace('T', ' ').substring(0, 19),
          timestamp: openTime,
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
          volume: parseFloat(volume)
        };
      });
      
      this.bars = this.data.length;
      this.dataLoaded = true;
      
      console.log(`✅ Loaded ${this.bars} bars for ${symbol} ${interval}`);
      console.log(`📊 Price range: ${Math.min(...this.data.map(d => d.low)).toFixed(2)} - ${Math.max(...this.data.map(d => d.high)).toFixed(2)}`);
      
      return {
        success: true,
        bars: this.bars,
        symbol: this.symbol,
        interval: this.interval
      };
      
    } catch (error) {
      console.error('❌ Failed to load market data:', error);
      
      // Fallback to mock data if API fails
      console.log('⚠️ Using mock data as fallback');
      this.generateMockData();
      
      return {
        success: false,
        error: error.message,
        usingMockData: true
      };
    }
  }

  // Fallback mock data generator
  generateMockData() {
    this.data = [];
    let basePrice = 100;
    
    for (let i = 0; i < this.bars; i++) {
      const volatility = 2;
      const trend = Math.sin(i / 10) * 5;
      const random = (Math.random() - 0.5) * volatility;
      
      basePrice += trend + random;
      
      const open = basePrice;
      const high = basePrice + Math.random() * volatility;
      const low = basePrice - Math.random() * volatility;
      const close = low + Math.random() * (high - low);
      const volume = Math.floor(1000000 + Math.random() * 500000);
      
      this.data.push({
        index: i,
        time: new Date(Date.now() - (this.bars - i) * 86400000).toISOString().split('T')[0],
        timestamp: Date.now() - (this.bars - i) * 86400000,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: volume
      });
    }
    
    this.dataLoaded = true;
  }

  // Context methods
  createContext() {
    const self = this;
    return {
      indicator: (name, options = {}) => {
        self.indicatorName = name;
        console.log(`Indicator: ${name}`, options);
      },
      plot: (series, options = {}) => {
        self.plots.push({
          title: options.title || 'Plot',
          color: options.color || 'blue',
          series: series
        });
        console.log(`Plot: ${options.title}`, series);
      }
    };
  }

  // Input methods
  createInput() {
    const self = this;
    return {
      int: (defaultValue, options = {}) => {
        const title = options.title || 'Input';
        self.inputs[title] = defaultValue;
        return defaultValue;
      },
      float: (defaultValue, options = {}) => {
        const title = options.title || 'Input';
        self.inputs[title] = defaultValue;
        return defaultValue;
      },
      bool: (defaultValue, options = {}) => {
        const title = options.title || 'Input';
        self.inputs[title] = defaultValue;
        return defaultValue;
      }
    };
  }

  // Technical Analysis functions
  createTA() {
    const self = this;
    return {
      ema: (source, length) => {
        const result = [];
        const multiplier = 2 / (length + 1);
        
        for (let i = 0; i < source.length; i++) {
          if (i === 0) {
            result.push(source[i]);
          } else {
            const ema = (source[i] - result[i - 1]) * multiplier + result[i - 1];
            result.push(parseFloat(ema.toFixed(2)));
          }
        }
        
        return result;
      },
      
      sma: (source, length) => {
        const result = [];
        
        for (let i = 0; i < source.length; i++) {
          if (i < length - 1) {
            result.push(null);
          } else {
            let sum = 0;
            for (let j = 0; j < length; j++) {
              sum += source[i - j];
            }
            result.push(parseFloat((sum / length).toFixed(2)));
          }
        }
        
        return result;
      },
      
      rsi: (source, length) => {
        const result = [];
        
        for (let i = 0; i < source.length; i++) {
          if (i < length) {
            result.push(null);
          } else {
            let gains = 0;
            let losses = 0;
            
            for (let j = 1; j <= length; j++) {
              const change = source[i - j + 1] - source[i - j];
              if (change > 0) gains += change;
              else losses -= change;
            }
            
            const avgGain = gains / length;
            const avgLoss = losses / length;
            const rs = avgGain / (avgLoss || 1);
            const rsi = 100 - (100 / (1 + rs));
            
            result.push(parseFloat(rsi.toFixed(2)));
          }
        }
        
        return result;
      },
      
      atr: (length) => {
        const result = [];
        
        for (let i = 0; i < self.data.length; i++) {
          if (i < length - 1) {
            result.push(null);
          } else {
            let sum = 0;
            for (let j = 0; j < length; j++) {
              const bar = self.data[i - j];
              const tr = bar.high - bar.low;
              sum += tr;
            }
            result.push(parseFloat((sum / length).toFixed(2)));
          }
        }
        
        return result;
      },
      
      stdev: (source, length) => {
        const result = [];
        
        for (let i = 0; i < source.length; i++) {
          if (i < length - 1) {
            result.push(null);
          } else {
            let sum = 0;
            for (let j = 0; j < length; j++) {
              sum += source[i - j];
            }
            const mean = sum / length;
            
            let variance = 0;
            for (let j = 0; j < length; j++) {
              variance += Math.pow(source[i - j] - mean, 2);
            }
            
            const stdev = Math.sqrt(variance / length);
            result.push(parseFloat(stdev.toFixed(2)));
          }
        }
        
        return result;
      }
    };
  }

  // Execute the generated Pinets code
  execute(pinetsCode) {
    try {
      console.log('=== Executing Pinets Code ===');
      console.log(pinetsCode);
      console.log('============================');
      
      // Split code into lines for better error reporting
      const lines = pinetsCode.split('\n');
      console.log('Code lines:');
      lines.forEach((line, i) => {
        console.log(`${i + 1}: ${line}`);
      });
      
      // Create series from market data
      const open = this.data.map(d => d.open);
      const high = this.data.map(d => d.high);
      const low = this.data.map(d => d.low);
      const close = this.data.map(d => d.close);
      const volume = this.data.map(d => d.volume);
      
      // Create context and helpers
      const context = this.createContext();
      const Input = this.createInput();
      const ta = this.createTA();
      
      // Execute the code
      eval(pinetsCode);
      
      // Return results
      return {
        success: true,
        indicatorName: this.indicatorName,
        inputs: this.inputs,
        plots: this.plots,
        data: this.data,
        series: this.series
      };
      
    } catch (error) {
      console.error('❌ Execution Error:', error);
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
      
      // Try to identify problematic line
      const lines = pinetsCode.split('\n');
      console.error('Generated code lines:');
      lines.forEach((line, i) => {
        const lineNum = i + 1;
        const hasIssue = line.includes('const') && !line.includes('=') || 
                        (line.includes('const') && line.trim().endsWith('='));
        console.error(`${hasIssue ? '❌' : '  '} Line ${lineNum}: ${line}`);
      });
      
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        code: pinetsCode
      };
    }
  }

  // Format results as table data
  formatResults(results) {
    if (!results.success) {
      return {
        error: results.error
      };
    }

    const tableData = [];
    
    for (let i = 0; i < results.data.length; i++) {
      const row = {
        index: i,
        time: results.data[i].time,
        open: results.data[i].open,
        high: results.data[i].high,
        low: results.data[i].low,
        close: results.data[i].close,
        volume: results.data[i].volume
      };
      
      // Add plot values
      results.plots.forEach(plot => {
        if (plot.series && plot.series[i] !== undefined) {
          row[plot.title] = plot.series[i];
        }
      });
      
      tableData.push(row);
    }
    
    return {
      indicatorName: results.indicatorName,
      inputs: results.inputs,
      plots: results.plots,
      tableData: tableData
    };
  }
}
