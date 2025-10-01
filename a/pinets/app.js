// Main Application Logic
class PineScriptConverter {
  constructor() {
    this.parser = null;
    this.generator = new PinetsGenerator();
    this.initializeParser();
  }

  initializeParser() {
    try {
      // Compile the PEG.js grammar
      this.parser = peg.generate(PINESCRIPT_GRAMMAR);
      this.showStatus('Parser initialized successfully', 'success');
    } catch (error) {
      this.showStatus('Failed to initialize parser: ' + error.message, 'error');
      console.error('Parser initialization error:', error);
    }
  }

  convert(pineScriptCode) {
    if (!this.parser) {
      return {
        success: false,
        error: 'Parser not initialized'
      };
    }

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
        error: error.message,
        location: error.location
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

  formatError(error, location) {
    let message = 'Parse Error: ' + error;
    if (location) {
      message += ` at line ${location.start.line}, column ${location.start.column}`;
    }
    return message;
  }
}

// Application initialization
let converter;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize converter
  converter = new PineScriptConverter();

  // Get DOM elements
  const pineInput = document.getElementById('pineInput');
  const convertBtn = document.getElementById('convertBtn');
  const output = document.getElementById('output');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const exampleBtn = document.getElementById('exampleBtn');

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
      const errorMessage = converter.formatError(result.error, result.location);
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

  // Allow Ctrl+Enter to convert
  pineInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      convertBtn.click();
    }
  });
});
