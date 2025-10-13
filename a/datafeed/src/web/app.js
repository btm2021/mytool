let ws = null;
const dataMap = new Map();

function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    updateStatus('Connected', true);
    addLog('Connected to server', 'connected');
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'log') {
        const logType = message.data.type;
        if (logType !== 'receiving') {
          addLog(message.data.message, logType);
        }
      } else if (message.type === 'candle') {
      //  console.log('Received candle:', message.data);
        updateTable(message.data);
      } else if (message.type === 'status') {
        updateStatusBar(message.data);
      } else if (message.type === 'command_response') {
        handleCommandResponse(message.data);
      } else if (message.type === 'system_info') {
        updateSystemInfo(message.data);
      }
    } catch (err) {
      addLog(`Parse error: ${err.message}`, 'error');
      console.error('Parse error:', err);
    }
  };

  ws.onerror = () => {
    addLog('WebSocket error', 'error');
  };

  ws.onclose = () => {
    updateStatus('Disconnected', false);
    addLog('Disconnected from server', 'error');
    setTimeout(connect, 3000);
  };
}

function updateStatus(text, connected) {
  const status = document.getElementById('connection-status');
  status.textContent = text;
  status.className = `status-badge ${connected ? 'connected' : 'disconnected'}`;
}

function updateStatusBar(data) {
  if (data.exchange) {
    // Store symbols for this exchange
    if (data.symbols) {
      allExchangeSymbols.set(data.exchange, data.symbols);
    }
    
    // Update display
    updateSymbolsTableFromAll();
    updateExchangeStatus();
  }
}

function updateExchangeStatus() {
  const exchanges = Array.from(allExchangeSymbols.keys());
  // Count total symbol entries (not unique symbols)
  let totalSymbols = 0;
  for (const symbols of allExchangeSymbols.values()) {
    totalSymbols += symbols.length;
  }
  
  document.getElementById('exchange-name').textContent = exchanges.join(', ') || '-';
  document.getElementById('symbol-count').textContent = totalSymbols;
}

function updateSymbolsTableFromAll() {
  const tbody = document.getElementById('symbols-body');
  tbody.innerHTML = '';
  
  if (allExchangeSymbols.size === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="no-data">No symbols configured</td></tr>';
    return;
  }

  // Create array of [exchange, symbol] pairs
  const symbolEntries = [];
  
  for (const [exchange, symbols] of allExchangeSymbols) {
    symbols.forEach(symbol => {
      symbolEntries.push({ exchange, symbol });
    });
  }

  // Sort by exchange first, then by symbol
  symbolEntries.sort((a, b) => {
    if (a.exchange !== b.exchange) {
      return a.exchange.localeCompare(b.exchange);
    }
    return a.symbol.localeCompare(b.symbol);
  });

  // Render each symbol with its exchange
  symbolEntries.forEach(({ exchange, symbol }) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td><strong>${symbol}</strong></td>
      <td>${exchange}</td>
      <td><span class="status-active">● Active</span></td>
      <td>
        <div class="timeframe-buttons">
          <button class="btn-timeframe" onclick="openChart('${symbol}', '1m', '${exchange}')">1m</button>
          <button class="btn-timeframe" onclick="openChart('${symbol}', '5m', '${exchange}')">5m</button>
          <button class="btn-timeframe" onclick="openChart('${symbol}', '15m', '${exchange}')">15m</button>
          <button class="btn-timeframe" onclick="openChart('${symbol}', '1h', '${exchange}')">1h</button>
          <button class="btn-timeframe" onclick="openChart('${symbol}', '4h', '${exchange}')">4h</button>
        </div>
      </td>
    `;
  });
}

// Legacy function - kept for compatibility
function updateSymbolsTable(symbols, exchange) {
  if (symbols && exchange) {
    allExchangeSymbols.set(exchange, symbols);
    updateSymbolsTableFromAll();
  }
}

function openChart(symbol, timeframe, exchange) {
  const url = exchange 
    ? `chart.html?symbol=${symbol}&timeframe=${timeframe}&exchange=${exchange}`
    : `chart.html?symbol=${symbol}&timeframe=${timeframe}`;
  window.open(url, '_blank');
}

function updateTable(data) {
  const exchange = data.exchange || window.currentExchange || 'binance_futures';
  const key = `${exchange}_${data.symbol}_${data.interval}`;
  
  const now = new Date();
  dataMap.set(key, { 
    ...data, 
    exchange,
    lastUpdate: now.toLocaleTimeString(),
    status: data.closed ? '🟢' : '🔵'
  });

  const tbody = document.getElementById('data-body');
  tbody.innerHTML = '';

  if (dataMap.size === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="no-data">Waiting for data...</td></tr>';
    return;
  }

  for (const [, item] of dataMap) {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${item.exchange}</td>
      <td><strong>${item.symbol}</strong></td>
      <td>${item.interval}</td>
      <td class="price-close">${item.status} ${item.c?.toFixed(2) || '-'}</td>
      <td>${item.v?.toFixed(2) || '-'}</td>
      <td>${item.lastUpdate}</td>
    `;
  }
}

function addLog(message, type = 'info') {
  const container = document.getElementById('terminal-container');
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  
  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `<span class="log-time">[${time}]</span><span class="log-message">${message}</span>`;
  
  container.insertBefore(entry, container.firstChild);
  
  if (container.children.length > 500) {
    container.removeChild(container.lastChild);
  }
}

function sendCommand(command) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addLog('Cannot send command: Not connected', 'error');
    return;
  }

  addLog(`> ${command}`, 'info');
  ws.send(JSON.stringify({ type: 'command', data: command }));
}

function handleCommandResponse(response) {
  if (response.error) {
    addLog(`Error: ${response.error}`, 'error');
  } else if (response.message) {
    addLog(response.message, 'validated');
  } else if (response.data) {
    addLog(JSON.stringify(response.data, null, 2), 'info');
  }
}

function updateSystemInfo(data) {
  const elements = {
    'cpu-usage': `${data.cpu.usage}%`,
    'cpu-cores': data.cpu.cores,
    'mem-used': formatBytes(data.memory.used),
    'mem-total': formatBytes(data.memory.total),
    'mem-percent': `${data.memory.usagePercent}%`,
    'heap-used': formatBytes(data.process.heapUsed),
    'db-size': formatBytes(data.database?.total || 0),
    'disk-free': formatBytes(data.disk.free),
    'uptime': formatUptime(data.uptime),
    'platform': `${data.platform}/${data.arch}`
  };

  for (const [id, value] of Object.entries(elements)) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + sizes[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

let currentExchange = 'binance_futures';
let whitelistSymbols = [];
let availableSymbols = [];
let allExchangeSymbols = new Map(); // Map<exchange, symbols[]>

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('config-modal');
  const configBtn = document.getElementById('config-btn');
  const modalClose = document.getElementById('modal-close');

  if (configBtn && modal && modalClose) {
    configBtn.addEventListener('click', () => {
      modal.classList.add('show');
    });

    modalClose.addEventListener('click', () => {
      modal.classList.remove('show');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  }

  // Symbols Manager Modal
  const symbolsModal = document.getElementById('symbols-modal');
  const symbolsManagerBtn = document.getElementById('symbols-manager-btn');
  const symbolsModalClose = document.getElementById('symbols-modal-close');

  if (symbolsManagerBtn && symbolsModal && symbolsModalClose) {
    symbolsManagerBtn.addEventListener('click', () => {
      symbolsModal.classList.add('show');
      loadSymbolsManager();
    });

    symbolsModalClose.addEventListener('click', () => {
      symbolsModal.classList.remove('show');
    });

    symbolsModal.addEventListener('click', (e) => {
      if (e.target === symbolsModal) {
        symbolsModal.classList.remove('show');
      }
    });
  }

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentExchange = btn.dataset.exchange;
      loadSymbolsManager();
    });
  });

  // Search functionality
  document.getElementById('whitelist-search')?.addEventListener('input', (e) => {
    filterSymbols('whitelist', e.target.value);
  });

  document.getElementById('available-search')?.addEventListener('input', (e) => {
    filterSymbols('available', e.target.value);
  });

  // Refresh symbols
  document.getElementById('refresh-symbols')?.addEventListener('click', () => {
    loadAvailableSymbols();
  });

  // Save whitelist
  document.getElementById('save-whitelist')?.addEventListener('click', () => {
    saveWhitelist();
  });

  // Restart button
  document.getElementById('restart-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to restart the application?')) {
      restartApplication();
    }
  });

  // Delete database button
  document.getElementById('delete-db-btn')?.addEventListener('click', () => {
    if (confirm('⚠️ WARNING: This will DELETE ALL DATA!\n\nAre you absolutely sure?')) {
      if (confirm('This action CANNOT be undone. Continue?')) {
        deleteDatabase();
      }
    }
  });

  // Load current config when modal opens
  configBtn?.addEventListener('click', async () => {
    modal.classList.add('show');
    try {
      const response = await fetch('/config');
      const config = await response.json();
      
      document.getElementById('batch-interval').value = config.batch_interval || 60000;
      document.getElementById('max-records').value = config.max_records || 100000;
      document.getElementById('bootstrap-load').value = config.bootstrap_load || 10000;
      document.getElementById('port').value = config.port || 3000;
    } catch (err) {
      addLog(`Failed to load config: ${err.message}`, 'error');
    }
  });

  document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const batchInterval = document.getElementById('batch-interval').value;
    const maxRecords = document.getElementById('max-records').value;
    const bootstrapLoad = document.getElementById('bootstrap-load').value;
    const port = document.getElementById('port').value;

    try {
      const response = await fetch('/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_interval: parseInt(batchInterval),
          max_records: parseInt(maxRecords),
          bootstrap_load: parseInt(bootstrapLoad),
          port: parseInt(port)
        })
      });

      const result = await response.json();
      if (result.success) {
        addLog('Configuration saved. System is restarting...', 'validated');
        modal.classList.remove('show');
      } else {
        addLog(`Config error: ${result.error}`, 'error');
      }
    } catch (err) {
      addLog(`Request failed: ${err.message}`, 'error');
    }
  });

  document.getElementById('send-command').addEventListener('click', () => {
    const input = document.getElementById('command-input');
    const command = input.value.trim();
    
    if (command) {
      sendCommand(command);
      input.value = '';
    }
  });

  document.getElementById('command-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('send-command').click();
    }
  });

  document.getElementById('clear-logs').addEventListener('click', () => {
    document.getElementById('terminal-container').innerHTML = '';
    addLog('Terminal cleared', 'info');
  });

  connect();
});

async function loadSymbolsManager() {
  try {
    const response = await fetch('/exchanges');
    const exchanges = await response.json();
    
    if (exchanges[currentExchange]) {
      whitelistSymbols = [...exchanges[currentExchange].symbols];
      renderWhitelist();
    }
    
    await loadAvailableSymbols();
  } catch (err) {
    addLog(`Failed to load symbols: ${err.message}`, 'error');
  }
}

async function loadAvailableSymbols() {
  const container = document.getElementById('available-container');
  container.innerHTML = '<div class="loading-symbols">Loading symbols...</div>';
  
  try {
    const response = await fetch(`/exchange-symbols/${currentExchange}`);
    const data = await response.json();
    
    if (data.symbols) {
      availableSymbols = data.symbols;
      renderAvailableSymbols();
    }
  } catch (err) {
    container.innerHTML = '<div class="loading-symbols">Failed to load symbols</div>';
    addLog(`Failed to load available symbols: ${err.message}`, 'error');
  }
}

function renderWhitelist() {
  const container = document.getElementById('whitelist-container');
  const count = document.getElementById('whitelist-count');
  
  count.textContent = whitelistSymbols.length;
  
  if (whitelistSymbols.length === 0) {
    container.innerHTML = '<div class="loading-symbols">No symbols in whitelist</div>';
    return;
  }
  
  container.innerHTML = whitelistSymbols.map(symbol => `
    <div class="symbol-item" data-symbol="${symbol}">
      <span class="symbol-name">${symbol}</span>
      <button class="symbol-action remove" onclick="removeFromWhitelist('${symbol}')">REMOVE</button>
    </div>
  `).join('');
}

function renderAvailableSymbols() {
  const container = document.getElementById('available-container');
  const count = document.getElementById('available-count');
  
  const filtered = availableSymbols.filter(s => !whitelistSymbols.includes(s.symbol || s));
  count.textContent = filtered.length;
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="loading-symbols">All symbols added to whitelist</div>';
    return;
  }
  
  container.innerHTML = filtered.map(item => {
    const symbol = item.symbol || item;
    const volume = item.volumeFormatted || '';
    return `
      <div class="symbol-item" data-symbol="${symbol}">
        <div class="symbol-info">
          <span class="symbol-name">${symbol}</span>
          ${volume ? `<span class="symbol-volume">Vol: ${volume}</span>` : ''}
        </div>
        <button class="symbol-action" onclick="addToWhitelist('${symbol}')">ADD</button>
      </div>
    `;
  }).join('');
}

function addToWhitelist(symbol) {
  const symbolName = typeof symbol === 'string' ? symbol : symbol.symbol;
  if (!whitelistSymbols.includes(symbolName)) {
    whitelistSymbols.push(symbolName);
    whitelistSymbols.sort();
    renderWhitelist();
    renderAvailableSymbols();
    addLog(`Added ${symbolName} to whitelist`, 'info');
  }
}

function removeFromWhitelist(symbol) {
  whitelistSymbols = whitelistSymbols.filter(s => s !== symbol);
  renderWhitelist();
  renderAvailableSymbols();
  addLog(`Removed ${symbol} from whitelist`, 'info');
}

function filterSymbols(type, query) {
  const container = document.getElementById(`${type}-container`);
  const items = container.querySelectorAll('.symbol-item');
  const lowerQuery = query.toLowerCase();
  
  let visibleCount = 0;
  items.forEach(item => {
    const symbol = item.dataset.symbol;
    if (symbol.toLowerCase().includes(lowerQuery)) {
      item.style.display = 'flex';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  
  // Update count if searching available symbols
  if (type === 'available') {
    const countEl = document.getElementById('available-count');
    if (query) {
      countEl.textContent = `${visibleCount}/${availableSymbols.length}`;
    } else {
      countEl.textContent = availableSymbols.filter(s => !whitelistSymbols.includes(s.symbol || s)).length;
    }
  }
}

async function saveWhitelist() {
  const saveBtn = document.getElementById('save-whitelist');
  const originalText = saveBtn.textContent;
  
  saveBtn.textContent = 'SAVING...';
  saveBtn.disabled = true;
  
  try {
    const response = await fetch('/exchange-symbols', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exchange: currentExchange,
        symbols: whitelistSymbols
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      addLog('Configuration saved. System is restarting...', 'validated');
      saveBtn.textContent = 'RESTARTING...';
      
      // Close modal after restart
      setTimeout(() => {
        const modal = document.getElementById('symbols-modal');
        if (modal) {
          modal.classList.remove('show');
        }
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }, 5000);
    } else {
      throw new Error(result.error || 'Failed to save');
    }
  } catch (err) {
    addLog(`Failed to save whitelist: ${err.message}`, 'error');
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

async function restartApplication() {
  const restartBtn = document.getElementById('restart-btn');
  const originalText = restartBtn.textContent;
  
  restartBtn.textContent = 'RESTARTING...';
  restartBtn.disabled = true;
  
  try {
    const response = await fetch('/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (result.success) {
      addLog('Application is restarting...', 'validated');
      
      setTimeout(() => {
        restartBtn.textContent = originalText;
        restartBtn.disabled = false;
      }, 5000);
    } else {
      throw new Error(result.error || 'Failed to restart');
    }
  } catch (err) {
    addLog(`Failed to restart: ${err.message}`, 'error');
    restartBtn.textContent = originalText;
    restartBtn.disabled = false;
  }
}

async function deleteDatabase() {
  const deleteBtn = document.getElementById('delete-db-btn');
  const originalText = deleteBtn.textContent;
  
  deleteBtn.textContent = 'DELETING...';
  deleteBtn.disabled = true;
  
  try {
    const response = await fetch('/delete-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (result.success) {
      addLog('⚠️ Deleting database and restarting...', 'error');
      
      setTimeout(() => {
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
      }, 10000);
    } else {
      throw new Error(result.error || 'Failed to delete database');
    }
  } catch (err) {
    addLog(`Failed to delete database: ${err.message}`, 'error');
    deleteBtn.textContent = originalText;
    deleteBtn.disabled = false;
  }
}
