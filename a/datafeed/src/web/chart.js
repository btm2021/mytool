const urlParams = new URLSearchParams(window.location.search);
const symbol = urlParams.get('symbol') || 'BTCUSDT';
const timeframe = urlParams.get('timeframe') || '1m';

document.getElementById('chart-title').textContent = `${symbol} Chart`;
document.getElementById('symbol-name').textContent = symbol;
document.getElementById('timeframe').textContent = timeframe;

const chartContainer = document.getElementById('chart');
const chart = LightweightCharts.createChart(chartContainer, {
  layout: {
    background: { color: '#000' },
    textColor: '#fff',
  },
  grid: {
    vertLines: { color: '#1a1a1a' },
    horzLines: { color: '#1a1a1a' },
  },
  crosshair: {
    mode: LightweightCharts.CrosshairMode.Normal,
  },
  rightPriceScale: {
    borderColor: '#333',
  },
  timeScale: {
    borderColor: '#333',
    timeVisible: true,
    secondsVisible: false,
  },
});

const candlestickSeries = chart.addCandlestickSeries({
  upColor: '#fff',
  downColor: '#000',
  borderVisible: true,
  wickUpColor: '#fff',
  wickDownColor: '#666',
  borderUpColor: '#fff',
  borderDownColor: '#666',
});

let currentCandle = null;

async function loadChartData() {
  const limit = urlParams.get('limit') || '1500';

  try {
    const response = await fetch(`/ohlcv?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`);
    const data = await response.json();

    if (data.length === 0) {
      chartContainer.innerHTML = '<div class="loading">No data available</div>';
      return;
    }

    const candleData = data.map(candle => ({
      time: Math.floor(candle[0] / 1000),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
    }));

    candlestickSeries.setData(candleData);
    chart.timeScale().fitContent();

    document.getElementById('candle-count').textContent = data.length;
    document.getElementById('last-price').textContent = data[data.length - 1][4].toFixed(2);

    connectWebSocket();
  } catch (err) {
    console.error('Failed to load chart data:', err);
    chartContainer.innerHTML = '<div class="loading">Failed to load data</div>';
  }
}

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    console.log('WebSocket connected for realtime updates');
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.type === 'candle' && message.data.symbol === symbol) {
        const candle = message.data;

        const candleTime = Math.floor(candle.ts ? candle.ts / 1000 : Date.now() / 1000);
        const timeframeSeconds = getTimeframeSeconds(timeframe);
        const bucketTime = Math.floor(candleTime / timeframeSeconds) * timeframeSeconds;

        if (!currentCandle || currentCandle.time !== bucketTime) {
          currentCandle = {
            time: bucketTime,
            open: candle.o,
            high: candle.h,
            low: candle.l,
            close: candle.c,
          };
        } else {
          currentCandle.high = Math.max(currentCandle.high, candle.h);
          currentCandle.low = Math.min(currentCandle.low, candle.l);
          currentCandle.close = candle.c;
        }

        candlestickSeries.update(currentCandle);
        document.getElementById('last-price').textContent = candle.c.toFixed(2);
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  };

  ws.onerror = () => {
    console.error('WebSocket error');
  };

  ws.onclose = () => {
    console.log('WebSocket closed, reconnecting...');
    setTimeout(connectWebSocket, 3000);
  };
}

function getTimeframeSeconds(tf) {
  const match = tf.match(/^(\d+)([mhd])$/);
  if (!match) return 60;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 60;
  }
}

window.addEventListener('resize', () => {
  chart.applyOptions({
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
  });
});

loadChartData();

document.getElementById('symbol-name').textContent += ` (${urlParams.get('limit') || '1500'})`;
