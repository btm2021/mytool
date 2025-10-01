// Offline Version - Simple Regex-based Parser
class SimplePineScriptParser {
  parse(code) {
    const lines = code.trim().split('\n').map(line => line.trim()).filter(line => line);
    const statements = [];

    for (const line of lines) {
      const statement = this.parseLine(line);
      if (statement) {
        statements.push(statement);
      }
    }

    return { type: 'Program', body: statements };
  }

  parseLine(line) {
    // Remove comments
    line = line.replace(/\/\/.*$/, '').trim();
    if (!line) return null;

    // Indicator declaration (v5)
    if (line.startsWith('indicator(')) {
      return this.parseIndicator(line);
    }

    // Study declaration (v4 - same as indicator)
    if (line.startsWith('study(')) {
      return this.parseIndicator(line.replace('study(', 'indicator('));
    }

    // Plot statement
    if (line.startsWith('plot(')) {
      return this.parsePlot(line);
    }

    // Assignment
    if (line.includes('=') && !line.includes('==')) {
      return this.parseAssignment(line);
    }

    return null;
  }

  parseIndicator(line) {
    const match = line.match(/indicator\((.*)\)/);
    if (!match) return null;

    const argsStr = match[1];
    const args = this.parseArguments(argsStr);

    return {
      type: 'IndicatorDeclaration',
      name: args[0],
      arguments: args.slice(1)
    };
  }

  parsePlot(line) {
    const match = line.match(/plot\((.*)\)/);
    if (!match) return null;

    const argsStr = match[1];
    const args = this.parseArguments(argsStr);

    return {
      type: 'PlotStatement',
      arguments: args
    };
  }

  parseAssignment(line) {
    const parts = line.split('=').map(p => p.trim());
    if (parts.length < 2) return null;

    const name = parts[0];
    const value = parts.slice(1).join('=').trim();

    return {
      type: 'Assignment',
      name: { type: 'Identifier', name: name },
      value: this.parseExpression(value)
    };
  }

  parseExpression(expr) {
    expr = expr.trim();

    // Function call
    if (expr.includes('(') && expr.includes(')')) {
      return this.parseFunctionCall(expr);
    }

    // Number
    if (/^-?\d+\.?\d*$/.test(expr)) {
      return { type: 'NumberLiteral', value: parseFloat(expr) };
    }

    // String
    if ((expr.startsWith('"') && expr.endsWith('"')) || 
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return { type: 'StringLiteral', value: expr.slice(1, -1) };
    }

    // Boolean
    if (expr === 'true' || expr === 'false') {
      return { type: 'BooleanLiteral', value: expr === 'true' };
    }

    // Binary expression with logic operators
    if (expr.includes(' and ')) {
      const parts = expr.split(' and ');
      return {
        type: 'BinaryExpression',
        operator: 'and',
        left: this.parseExpression(parts[0]),
        right: this.parseExpression(parts.slice(1).join(' and '))
      };
    }

    if (expr.includes(' or ')) {
      const parts = expr.split(' or ');
      return {
        type: 'BinaryExpression',
        operator: 'or',
        left: this.parseExpression(parts[0]),
        right: this.parseExpression(parts.slice(1).join(' or '))
      };
    }

    // Binary expression with comparison
    const compOps = ['>=', '<=', '==', '!=', '>', '<'];
    for (const op of compOps) {
      if (expr.includes(op)) {
        const parts = expr.split(op).map(p => p.trim());
        if (parts.length === 2) {
          return {
            type: 'BinaryExpression',
            operator: op,
            left: this.parseExpression(parts[0]),
            right: this.parseExpression(parts[1])
          };
        }
      }
    }

    // Binary expression with math
    const mathOps = ['+', '-', '*', '/', '%'];
    for (const op of mathOps) {
      const parts = expr.split(op).map(p => p.trim());
      if (parts.length === 2) {
        return {
          type: 'BinaryExpression',
          operator: op,
          left: this.parseExpression(parts[0]),
          right: this.parseExpression(parts[1])
        };
      }
    }

    // Identifier
    return { type: 'Identifier', name: expr };
  }

  parseFunctionCall(expr) {
    const match = expr.match(/^([a-zA-Z_][a-zA-Z0-9_.]*)\((.*)\)$/);
    if (!match) return { type: 'Identifier', name: expr };

    const calleeName = match[1];
    const argsStr = match[2];
    const args = this.parseArguments(argsStr);

    // Parse member expression (e.g., ta.ema, input.int)
    let callee;
    if (calleeName.includes('.')) {
      const parts = calleeName.split('.');
      callee = {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: parts[0] },
        properties: parts.slice(1).map(p => ({ type: 'Identifier', name: p }))
      };
    } else {
      callee = { type: 'Identifier', name: calleeName };
    }

    return {
      type: 'FunctionCall',
      callee: callee,
      arguments: args
    };
  }

  parseArguments(argsStr) {
    if (!argsStr || !argsStr.trim()) return [];

    const args = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];

      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === stringChar && inString) {
        inString = false;
        current += char;
      } else if (char === '(' && !inString) {
        depth++;
        current += char;
      } else if (char === ')' && !inString) {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0 && !inString) {
        args.push(this.parseArgument(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(this.parseArgument(current.trim()));
    }

    return args;
  }

  parseArgument(arg) {
    // Named argument
    if (arg.includes('=') && !arg.includes('==')) {
      const parts = arg.split('=').map(p => p.trim());
      if (parts.length === 2) {
        return {
          type: 'NamedArgument',
          name: { type: 'Identifier', name: parts[0] },
          value: this.parseArgumentValue(parts[1])
        };
      }
    }

    // Regular expression argument
    return this.parseExpression(arg);
  }

  parseArgumentValue(value) {
    value = value.trim();

    // String
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return { type: 'StringLiteral', value: value.slice(1, -1) };
    }

    // Number
    if (/^-?\d+\.?\d*$/.test(value)) {
      return { type: 'NumberLiteral', value: parseFloat(value) };
    }

    // Boolean
    if (value === 'true' || value === 'false') {
      return { type: 'BooleanLiteral', value: value === 'true' };
    }

    // Color literal
    if (value.startsWith('color.')) {
      const colorName = value.substring(6);
      return { type: 'ColorLiteral', value: colorName };
    }

    // Identifier
    return { type: 'Identifier', name: value };
  }
}

// Main Application Logic (Offline Version)
class PineScriptConverter {
  constructor() {
    this.parser = new SimplePineScriptParser();
    this.generator = new PinetsGenerator();
    this.showStatus('Parser initialized successfully (Offline Mode)', 'success');
  }

  convert(pineScriptCode) {
    try {
      // Parse PineScript to AST
      const ast = this.parser.parse(pineScriptCode);
      console.log('AST:', ast);

      // Generate Pinets code from AST
      const pinetsCode = this.generator.generate(ast);

      return {
        success: true,
        code: pinetsCode,
        ast: ast
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = 'status ' + type;
      
      // Auto-hide success messages after 3 seconds
      if (type === 'success') {
        setTimeout(() => {
          statusElement.textContent = '';
          statusElement.className = 'status';
        }, 3000);
      }
    }
  }

  formatError(error) {
    return 'Parse Error: ' + error;
  }
}

// Application initialization
let converter;
let pinetsEngine;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize converter and engine
  converter = new PineScriptConverter();
  pinetsEngine = new PinetsEngine();
  
  // Load initial market data
  converter.showStatus('Loading market data from Binance...', 'info');
  const loadResult = await pinetsEngine.initializeMarketData('BTCUSDT', '1h');
  
  if (loadResult.success) {
    converter.showStatus(`✅ Loaded ${loadResult.bars} bars for ${loadResult.symbol} ${loadResult.interval}`, 'success');
  } else if (loadResult.usingMockData) {
    converter.showStatus('⚠️ Using mock data (Binance API failed)', 'error');
  }

  // Get DOM elements
  const pineInput = document.getElementById('pineInput');
  const convertBtn = document.getElementById('convertBtn');
  const output = document.getElementById('output');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const exampleBtn = document.getElementById('exampleBtn');
  const runBtn = document.getElementById('runBtn');
  const resultsPanel = document.getElementById('resultsPanel');
  const closeResultsBtn = document.getElementById('closeResultsBtn');
  const resultsContainer = document.getElementById('resultsContainer');
  const symbolInput = document.getElementById('symbolInput');
  const intervalSelect = document.getElementById('intervalSelect');
  const loadDataBtn = document.getElementById('loadDataBtn');
  const dataInfo = document.getElementById('dataInfo');
  
  // Update data info display
  function updateDataInfo() {
    if (pinetsEngine.dataLoaded) {
      const lastBar = pinetsEngine.data[pinetsEngine.data.length - 1];
      dataInfo.textContent = `📊 ${pinetsEngine.bars} bars | Last: ${lastBar.close.toFixed(2)} | ${lastBar.time}`;
    }
  }
  
  updateDataInfo();

  // Convert button handler
  convertBtn.addEventListener('click', () => {
    const pineCode = pineInput.value.trim();
    
    if (!pineCode) {
      converter.showStatus('Please enter PineScript code', 'error');
      return;
    }

    const result = converter.convert(pineCode);

    if (result.success) {
      output.textContent = result.code;
      converter.showStatus('Conversion successful!', 'success');
    } else {
      const errorMessage = converter.formatError(result.error);
      output.textContent = errorMessage;
      converter.showStatus(errorMessage, 'error');
    }
  });

  // Copy button handler
  copyBtn.addEventListener('click', () => {
    const outputText = output.textContent;
    if (!outputText || outputText.startsWith('Parse Error:')) {
      converter.showStatus('No valid code to copy', 'error');
      return;
    }

    navigator.clipboard.writeText(outputText).then(() => {
      converter.showStatus('Code copied to clipboard!', 'success');
    }).catch(err => {
      converter.showStatus('Failed to copy: ' + err.message, 'error');
    });
  });

  // Clear button handler
  clearBtn.addEventListener('click', () => {
    pineInput.value = '';
    output.textContent = '';
    converter.showStatus('Cleared', 'success');
  });

  // Example button handler
  exampleBtn.addEventListener('click', () => {
    const exampleCode = `indicator("EMA Cross", overlay=true)
len = input.int(9, "EMA Length")
emaFast = ta.ema(close, len)
emaSlow = ta.ema(close, 21)
bull = emaFast > emaSlow
plot(emaFast, "Fast EMA", color=color.green)
plot(emaSlow, "Slow EMA", color=color.red)`;
    
    pineInput.value = exampleCode;
    converter.showStatus('Example loaded', 'success');
  });

  // Load Data button handler
  loadDataBtn.addEventListener('click', async () => {
    const symbol = symbolInput.value.trim().toUpperCase();
    const interval = intervalSelect.value;
    
    if (!symbol) {
      converter.showStatus('Please enter a symbol', 'error');
      return;
    }
    
    converter.showStatus(`Loading ${symbol} ${interval} data from Binance...`, 'info');
    loadDataBtn.disabled = true;
    loadDataBtn.textContent = '⏳ Loading...';
    
    const result = await pinetsEngine.initializeMarketData(symbol, interval);
    
    loadDataBtn.disabled = false;
    loadDataBtn.textContent = '🔄 Load Data';
    
    if (result.success) {
      converter.showStatus(`✅ Loaded ${result.bars} bars for ${result.symbol} ${result.interval}`, 'success');
      updateDataInfo();
    } else if (result.usingMockData) {
      converter.showStatus(`⚠️ Failed to load ${symbol}: ${result.error}. Using mock data.`, 'error');
      updateDataInfo();
    } else {
      converter.showStatus(`❌ Failed to load data: ${result.error}`, 'error');
    }
  });

  // Run & Calculate button handler
  runBtn.addEventListener('click', () => {
    const pinetsCode = output.textContent;
    
    if (!pinetsCode || pinetsCode.startsWith('Parse Error:') || pinetsCode.startsWith('//')) {
      converter.showStatus('Please convert PineScript code first', 'error');
      return;
    }

    converter.showStatus('Running calculations...', 'info');
    
    // Execute Pinets code
    const executionResult = pinetsEngine.execute(pinetsCode);
    
    if (!executionResult.success) {
      converter.showStatus('Execution error: ' + executionResult.error, 'error');
      resultsContainer.innerHTML = `
        <div class="indicator-info" style="border-left-color: var(--error-color);">
          <h3>❌ Execution Error</h3>
          <p><strong>Error:</strong> ${executionResult.error}</p>
          <pre style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--error-color);">${executionResult.stack || ''}</pre>
        </div>
      `;
      resultsPanel.style.display = 'block';
      return;
    }

    // Format and display results
    const formattedResults = pinetsEngine.formatResults(executionResult);
    displayResults(formattedResults);
    
    resultsPanel.style.display = 'block';
    converter.showStatus('Calculation completed!', 'success');
    
    // Scroll to results
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Close results panel
  closeResultsBtn.addEventListener('click', () => {
    resultsPanel.style.display = 'none';
  });

  // Allow Ctrl+Enter to convert
  pineInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      convertBtn.click();
    }
  });

  // Function to display results in table format
  function displayResults(results) {
    if (results.error) {
      resultsContainer.innerHTML = `
        <div class="indicator-info" style="border-left-color: var(--error-color);">
          <h3>❌ Error</h3>
          <p>${results.error}</p>
        </div>
      `;
      return;
    }

    // Build indicator info
    let html = `
      <div class="indicator-info">
        <h3>📊 ${results.indicatorName || 'Indicator'}</h3>
        <p><strong>Bars:</strong> ${results.tableData.length}</p>
    `;

    // Show inputs
    if (Object.keys(results.inputs).length > 0) {
      html += '<p><strong>Inputs:</strong></p><ul style="margin-left: 1.5rem;">';
      for (const [key, value] of Object.entries(results.inputs)) {
        html += `<li>${key}: ${value}</li>`;
      }
      html += '</ul>';
    }

    // Show plots
    if (results.plots.length > 0) {
      html += '<p><strong>Plots:</strong></p><ul style="margin-left: 1.5rem;">';
      results.plots.forEach(plot => {
        html += `<li><span style="color: ${plot.color};">●</span> ${plot.title}</li>`;
      });
      html += '</ul>';
    }

    html += '</div>';

    // Build table
    if (results.tableData.length > 0) {
      const columns = Object.keys(results.tableData[0]);
      
      html += '<div class="table-container">';
      html += '<table class="results-table">';
      html += '<thead><tr>';
      
      columns.forEach(col => {
        html += `<th>${col}</th>`;
      });
      
      html += '</tr></thead><tbody>';
      
      // Show last 50 rows for performance
      const startIndex = Math.max(0, results.tableData.length - 50);
      
      for (let i = startIndex; i < results.tableData.length; i++) {
        const row = results.tableData[i];
        html += '<tr>';
        
        columns.forEach(col => {
          const value = row[col];
          const isNumber = typeof value === 'number';
          const cellClass = isNumber ? 'number' : '';
          const displayValue = value === null || value === undefined ? '-' : 
                              isNumber ? value.toFixed(2) : value;
          html += `<td class="${cellClass}">${displayValue}</td>`;
        });
        
        html += '</tr>';
      }
      
      html += '</tbody></table></div>';
      
      if (results.tableData.length > 50) {
        html += `<p style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
          Showing last 50 of ${results.tableData.length} bars
        </p>`;
      }
    }

    resultsContainer.innerHTML = html;
  }
});
