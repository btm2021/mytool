// PineScript Grammar for PEG.js
const PINESCRIPT_GRAMMAR = `
{
  function buildBinaryExpression(head, tail) {
    return tail.reduce((left, element) => ({
      type: 'BinaryExpression',
      operator: element[1],
      left: left,
      right: element[3]
    }), head);
  }
}

Start
  = _ statements:Statement* _ { return { type: 'Program', body: statements }; }

Statement
  = IndicatorDeclaration
  / Assignment
  / PlotStatement
  / ExpressionStatement

IndicatorDeclaration
  = "indicator" _ "(" _ name:StringLiteral _ args:("," _ NamedArgument)* _ ")" _ {
      return {
        type: 'IndicatorDeclaration',
        name: name,
        arguments: args.map(a => a[2])
      };
    }

Assignment
  = name:Identifier _ "=" _ value:Expression _ {
      return {
        type: 'Assignment',
        name: name,
        value: value
      };
    }

PlotStatement
  = "plot" _ "(" _ value:Expression _ args:("," _ (NamedArgument / Expression))* _ ")" _ {
      const allArgs = [value].concat(args.map(a => a[2]));
      return {
        type: 'PlotStatement',
        arguments: allArgs
      };
    }

ExpressionStatement
  = expr:Expression _ {
      return {
        type: 'ExpressionStatement',
        expression: expr
      };
    }

Expression
  = LogicalOrExpression

LogicalOrExpression
  = head:LogicalAndExpression tail:(_ ("or" / "||") _ LogicalAndExpression)* {
      return buildBinaryExpression(head, tail);
    }

LogicalAndExpression
  = head:ComparisonExpression tail:(_ ("and" / "&&") _ ComparisonExpression)* {
      return buildBinaryExpression(head, tail);
    }

ComparisonExpression
  = head:AdditiveExpression tail:(_ ComparisonOperator _ AdditiveExpression)* {
      return buildBinaryExpression(head, tail);
    }

ComparisonOperator
  = ">=" / "<=" / "==" / "!=" / ">" / "<"

AdditiveExpression
  = head:MultiplicativeExpression tail:(_ ("+" / "-") _ MultiplicativeExpression)* {
      return buildBinaryExpression(head, tail);
    }

MultiplicativeExpression
  = head:UnaryExpression tail:(_ ("*" / "/" / "%") _ UnaryExpression)* {
      return buildBinaryExpression(head, tail);
    }

UnaryExpression
  = "not" _ expr:UnaryExpression {
      return {
        type: 'UnaryExpression',
        operator: 'not',
        argument: expr
      };
    }
  / "!" _ expr:UnaryExpression {
      return {
        type: 'UnaryExpression',
        operator: '!',
        argument: expr
      };
    }
  / PrimaryExpression

PrimaryExpression
  = FunctionCall
  / Literal
  / Identifier
  / "(" _ expr:Expression _ ")" { return expr; }

FunctionCall
  = callee:MemberExpression _ "(" _ args:ArgumentList? _ ")" {
      return {
        type: 'FunctionCall',
        callee: callee,
        arguments: args || []
      };
    }

MemberExpression
  = head:Identifier tail:("." Identifier)* {
      if (tail.length === 0) return head;
      return {
        type: 'MemberExpression',
        object: head,
        properties: tail.map(t => t[1])
      };
    }

ArgumentList
  = head:(NamedArgument / Expression) tail:(_ "," _ (NamedArgument / Expression))* {
      return [head].concat(tail.map(t => t[3]));
    }

NamedArgument
  = name:Identifier _ "=" _ value:(StringLiteral / Literal / Identifier) {
      return {
        type: 'NamedArgument',
        name: name,
        value: value
      };
    }

Literal
  = NumberLiteral
  / BooleanLiteral
  / StringLiteral
  / ColorLiteral

NumberLiteral
  = value:([0-9]+ ("." [0-9]+)?) {
      return {
        type: 'NumberLiteral',
        value: parseFloat(text())
      };
    }

BooleanLiteral
  = value:("true" / "false") {
      return {
        type: 'BooleanLiteral',
        value: value === 'true'
      };
    }

StringLiteral
  = '"' chars:[^"]* '"' {
      return {
        type: 'StringLiteral',
        value: chars.join('')
      };
    }
  / "'" chars:[^']* "'" {
      return {
        type: 'StringLiteral',
        value: chars.join('')
      };
    }

ColorLiteral
  = "color" "." name:Identifier {
      return {
        type: 'ColorLiteral',
        value: name.name
      };
    }

Identifier
  = !ReservedWord name:([a-zA-Z_][a-zA-Z0-9_]*) {
      return {
        type: 'Identifier',
        name: text()
      };
    }

ReservedWord
  = ("indicator" / "plot" / "input" / "true" / "false" / "and" / "or" / "not") ![a-zA-Z0-9_]

_ "whitespace"
  = [ \\t\\n\\r]*
`;
