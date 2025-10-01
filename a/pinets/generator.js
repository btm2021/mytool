// Code Generator: AST to Pinets converter
class PinetsGenerator {
  constructor() {
    this.output = [];
  }

  generate(ast) {
    this.output = [];
    if (ast.type === 'Program') {
      ast.body.forEach(statement => {
        const code = this.generateStatement(statement);
        if (code) {
          this.output.push(code);
        }
      });
    }
    return this.output.join('\n');
  }

  generateStatement(node) {
    switch (node.type) {
      case 'IndicatorDeclaration':
        return this.generateIndicator(node);
      case 'Assignment':
        return this.generateAssignment(node);
      case 'PlotStatement':
        return this.generatePlot(node);
      case 'ExpressionStatement':
        return this.generateExpression(node.expression);
      default:
        return '';
    }
  }

  generateIndicator(node) {
    const name = this.generateExpression(node.name);
    const args = node.arguments.map(arg => this.generateNamedArgument(arg));
    
    if (args.length > 0) {
      const options = '{' + args.join(', ') + '}';
      return `context.indicator(${name}, ${options})`;
    }
    return `context.indicator(${name})`;
  }

  generateAssignment(node) {
    const name = node.name.name;
    
    // Check if value is valid before generating
    if (!node.value || !node.value.type) {
      console.warn(`Skipping invalid assignment for ${name}`);
      return '';
    }
    
    // Skip assignments that are just comparisons or binary expressions without function calls
    // These are typically intermediate variables not needed for plotting
    if (node.value.type === 'BinaryExpression') {
      const hasFunc = this.containsFunctionCall(node.value);
      if (!hasFunc) {
        console.log(`Skipping comparison assignment: ${name}`);
        return ''; // Skip pure comparisons
      }
    }
    
    // Skip unary expressions (like 'not bullish')
    if (node.value.type === 'UnaryExpression') {
      console.log(`Skipping unary expression assignment: ${name}`);
      return '';
    }
    
    const value = this.generateExpression(node.value);
    
    // Safety check: if value is empty or invalid, skip
    if (!value || value.trim() === '') {
      console.warn(`Skipping assignment with empty value: ${name}`);
      return '';
    }
    
    return `const ${name} = ${value}`;
  }

  // Helper to check if expression contains a function call
  containsFunctionCall(node) {
    if (!node) return false;
    
    if (node.type === 'FunctionCall') return true;
    
    if (node.type === 'BinaryExpression') {
      return this.containsFunctionCall(node.left) || this.containsFunctionCall(node.right);
    }
    
    return false;
  }

  generatePlot(node) {
    const args = node.arguments;
    if (args.length === 0) return '';

    const value = this.generateExpression(args[0]);
    const namedArgs = args.slice(1)
      .filter(arg => arg.type === 'NamedArgument' || arg.type === 'StringLiteral')
      .map((arg, index) => {
        if (arg.type === 'StringLiteral' && index === 0) {
          return `title: ${this.generateExpression(arg)}`;
        }
        return this.generateNamedArgument(arg);
      });

    if (namedArgs.length > 0) {
      const options = '{' + namedArgs.join(', ') + '}';
      return `context.plot(${value}, ${options})`;
    }
    return `context.plot(${value})`;
  }

  generateExpression(node) {
    if (!node) return '';

    switch (node.type) {
      case 'BinaryExpression':
        return this.generateBinaryExpression(node);
      case 'UnaryExpression':
        return this.generateUnaryExpression(node);
      case 'FunctionCall':
        return this.generateFunctionCall(node);
      case 'MemberExpression':
        return this.generateMemberExpression(node);
      case 'Identifier':
        return node.name;
      case 'NumberLiteral':
        return String(node.value);
      case 'BooleanLiteral':
        return String(node.value);
      case 'StringLiteral':
        return `"${node.value}"`;
      case 'ColorLiteral':
        return `"${node.value}"`;
      default:
        return '';
    }
  }

  generateBinaryExpression(node) {
    const left = this.generateExpression(node.left);
    const right = this.generateExpression(node.right);
    let operator = node.operator;

    // Convert PineScript operators to JavaScript
    if (operator === 'and') operator = '&&';
    if (operator === 'or') operator = '||';

    return `${left} ${operator} ${right}`;
  }

  generateUnaryExpression(node) {
    const argument = this.generateExpression(node.argument);
    const operator = node.operator === 'not' ? '!' : node.operator;
    return `${operator}${argument}`;
  }

  generateFunctionCall(node) {
    const callee = this.generateExpression(node.callee);
    const args = node.arguments.map(arg => {
      if (arg.type === 'NamedArgument') {
        return this.generateNamedArgument(arg);
      }
      return this.generateExpression(arg);
    });

    // Transform input.xxx to Input.xxx
    let transformedCallee = callee.replace(/^input\./, 'Input.');
    
    // Add ta. prefix for common TA functions if not already present
    const taFunctions = [
      'ema', 'sma', 'rma', 'wma', 'vwma', 'hma',
      'rsi', 'macd', 'stoch', 'cci', 'mfi',
      'atr', 'tr', 'obv', 'sar', 'bb', 'bbw',
      'stdev', 'variance', 'correlation', 'covariance',
      'highest', 'lowest', 'change', 'mom', 'roc',
      'crossover', 'crossunder', 'cross'
    ];
    
    // Check if it's a TA function without prefix
    if (!transformedCallee.includes('.') && taFunctions.includes(transformedCallee.toLowerCase())) {
      transformedCallee = 'ta.' + transformedCallee;
    }

    // Check if there are named arguments
    const hasNamedArgs = node.arguments.some(arg => arg.type === 'NamedArgument');
    
    if (hasNamedArgs && transformedCallee.startsWith('Input.')) {
      // Separate positional and named arguments
      const positionalArgs = [];
      const namedArgs = [];
      
      node.arguments.forEach(arg => {
        if (arg.type === 'NamedArgument') {
          namedArgs.push(this.generateNamedArgument(arg));
        } else {
          positionalArgs.push(this.generateExpression(arg));
        }
      });

      if (namedArgs.length > 0) {
        const options = '{' + namedArgs.join(', ') + '}';
        return `${transformedCallee}(${positionalArgs.join(', ')}, ${options})`;
      }
    }

    return `${transformedCallee}(${args.join(', ')})`;
  }

  generateMemberExpression(node) {
    let result = node.object.name;
    if (node.properties) {
      node.properties.forEach(prop => {
        result += '.' + prop.name;
      });
    }
    return result;
  }

  generateNamedArgument(arg) {
    if (arg.type !== 'NamedArgument') {
      return this.generateExpression(arg);
    }

    const name = arg.name.name;
    const value = this.generateExpression(arg.value);

    // Map common PineScript argument names to Pinets
    const nameMap = {
      'overlay': 'overlay',
      'color': 'color',
      'title': 'title',
      'linewidth': 'linewidth',
      'style': 'style'
    };

    const mappedName = nameMap[name] || name;
    return `${mappedName}: ${value}`;
  }
}
