#!/usr/bin/env ruby
# ============================================================
# Jakarta Language Interpreter (.jkt) - Ruby Implementation
# ============================================================

require 'strscan'

# ============================================================
# TOKEN TYPES
# ============================================================

module TokenType
  ANGKA = 'ANGKA'
  TEKS = 'TEKS'
  IDENTIFIER = 'IDENTIFIER'
  CETAK = 'cetak'
  VAR = 'var'
  KONSTAN = 'konstan'
  FUNGSI = 'fungsi'
  KEMBALI = 'kembali'
  JIKA = 'jika'
  LAIN = 'lain'
  SELAMA = 'selama'
  UNTUK = 'untuk'
  DALAM = 'dalam'
  BENAR = 'benar'
  SALAH = 'salah'
  KOSONG = 'kosong'
  DAN = 'dan'
  ATAU = 'atau'
  BUKAN = 'bukan'
  PUTUS = 'putus'
  LANJUT = 'lanjut'
  PLUS = '+'
  MINUS = '-'
  STAR = '*'
  SLASH = '/'
  PERCENT = '%'
  POWER = '**'
  ASSIGN = '='
  PLUS_ASSIGN = '+='
  MINUS_ASSIGN = '-='
  STAR_ASSIGN = '*='
  SLASH_ASSIGN = '/='
  EQ = '=='
  NEQ = '!='
  LT = '<'
  GT = '>'
  LTE = '<='
  GTE = '>='
  AND = '&&'
  OR = '||'
  NOT = '!'
  INCREMENT = '++'
  DECREMENT = '--'
  ARROW = '=>'
  DOT = '.'
  RANGE = '..'
  LPAREN = '('
  RPAREN = ')'
  LBRACE = '{'
  RBRACE = '}'
  LBRACKET = '['
  RBRACKET = ']'
  COMMA = ','
  SEMICOLON = ';'
  COLON = ':'
  QUESTION = '?'
  EOF = 'EOF'
end

KEYWORDS = {
  'cetak' => TokenType::CETAK, 'var' => TokenType::VAR, 'konstan' => TokenType::KONSTAN,
  'fungsi' => TokenType::FUNGSI, 'kembali' => TokenType::KEMBALI, 'jika' => TokenType::JIKA,
  'lain' => TokenType::LAIN, 'selama' => TokenType::SELAMA, 'untuk' => TokenType::UNTUK,
  'dalam' => TokenType::DALAM, 'benar' => TokenType::BENAR, 'salah' => TokenType::SALAH,
  'kosong' => TokenType::KOSONG, 'dan' => TokenType::DAN, 'atau' => TokenType::ATAU,
  'bukan' => TokenType::BUKAN, 'putus' => TokenType::PUTUS, 'lanjut' => TokenType::LANJUT,
}

# ============================================================
# TOKEN
# ============================================================

Token = Struct.new(:type, :value, :line, :column)

# ============================================================
# LEXER
# ============================================================

class LexerError < StandardError; end

class Lexer
  def initialize(source)
    @source = source
    @pos = 0
    @line = 1
    @column = 1
    @tokens = []
  end

  def error(msg)
    raise LexerError, "Error di baris #{@line}, kolom #{@column}: #{msg}"
  end

  def peek
    @pos < @source.length ? @source[@pos] : "\0"
  end

  def peek_next
    @pos + 1 < @source.length ? @source[@pos + 1] : "\0"
  end

  def advance
    ch = @source[@pos]
    @pos += 1
    if ch == "\n"
      @line += 1
      @column = 1
    else
      @column += 1
    end
    ch
  end

  def skip_whitespace
    while @pos < @source.length && ' 	\r'.include?(@source[@pos])
      advance
    end
  end

  def skip_comment
    if peek == '/' && peek_next == '/'
      while @pos < @source.length && @source[@pos] != "\n"
        advance
      end
      return true
    end
    if peek == '/' && peek_next == '*'
      advance; advance
      while @pos < @source.length
        if peek == '*' && peek_next == '/'
          advance; advance; break
        end
        advance
      end
      return true
    end
    false
  end

  def read_string(quote)
    advance
    result = ''
    while @pos < @source.length && @source[@pos] != quote
      if @source[@pos] == '\\'
        advance
        ch = advance
        case ch
        when 'n' then result += "\n"
        when 't' then result += "\t"
        when 'r' then result += "\r"
        when '\\' then result += '\\'
        when "'" then result += "'"
        when '"' then result += '"'
        else result += ch
        end
      else
        result += advance
      end
    end
    advance if @pos < @source.length
    result
  end

  def read_number
    result = ''
    while @pos < @source.length && @source[@pos] =~ /\d/
      result += advance
    end
    if @pos < @source.length && @source[@pos] == '.' && @pos + 1 < @source.length && @source[@pos + 1] =~ /\d/
      result += advance
      while @pos < @source.length && @source[@pos] =~ /\d/
        result += advance
      end
      return result.to_f
    end
    result.to_i
  end

  def read_identifier
    result = ''
    while @pos < @source.length && (@source[@pos] =~ /[\w]/)
      result += advance
    end
    result
  end

  def tokenize
    while @pos < @source.length
      skip_whitespace
      break if @pos >= @source.length

      if skip_comment
        next
      end

      if @source[@pos] == "\n"
        advance; next
      end

      line, col = @line, @column
      ch = peek

      if ch == '"' || ch == "'"
        val = read_string(ch)
        @tokens << Token.new(TokenType::TEKS, val, line, col)
        next
      end

      if ch =~ /\d/
        val = read_number
        @tokens << Token.new(TokenType::ANGKA, val, line, col)
        next
      end

      if ch =~ /[a-zA-Z_]/ || ch.ord > 127
        val = read_identifier
        tt = KEYWORDS[val] || TokenType::IDENTIFIER
        @tokens << Token.new(tt, val, line, col)
        next
      end

      two_char = @pos + 1 < @source.length ? @source[@pos, 2] : ''
      two_char_ops = {
        '**' => TokenType::POWER, '==' => TokenType::EQ, '!=' => TokenType::NEQ,
        '<=' => TokenType::LTE, '>=' => TokenType::GTE, '&&' => TokenType::AND,
        '||' => TokenType::OR, '++' => TokenType::INCREMENT, '--' => TokenType::DECREMENT,
        '=>' => TokenType::ARROW, '+=' => TokenType::PLUS_ASSIGN, '-=' => TokenType::MINUS_ASSIGN,
        '*=' => TokenType::STAR_ASSIGN, '/=' => TokenType::SLASH_ASSIGN, '..' => TokenType::RANGE,
      }
      if two_char_ops[two_char]
        advance; advance
        @tokens << Token.new(two_char_ops[two_char], two_char, line, col)
        next
      end

      single_ops = {
        '+' => TokenType::PLUS, '-' => TokenType::MINUS, '*' => TokenType::STAR,
        '/' => TokenType::SLASH, '%' => TokenType::PERCENT, '=' => TokenType::ASSIGN,
        '<' => TokenType::LT, '>' => TokenType::GT, '!' => TokenType::NOT,
        '(' => TokenType::LPAREN, ')' => TokenType::RPAREN,
        '{' => TokenType::LBRACE, '}' => TokenType::RBRACE,
        '[' => TokenType::LBRACKET, ']' => TokenType::RBRACKET,
        ',' => TokenType::COMMA, ';' => TokenType::SEMICOLON,
        ':' => TokenType::COLON, '.' => TokenType::DOT, '?' => TokenType::QUESTION,
      }
      if single_ops[ch]
        advance
        @tokens << Token.new(single_ops[ch], ch, line, col)
        next
      end

      error("Karakter tidak dikenali: #{ch.inspect}")
    end

    @tokens << Token.new(TokenType::EOF, nil, @line, @column)
    @tokens
  end
end

# ============================================================
# AST NODES
# ============================================================

class ASTNode; end
class NumberNode < ASTNode; attr_accessor :value; def initialize(v); @value = v; end; end
class StringNode < ASTNode; attr_accessor :value; def initialize(v); @value = v; end; end
class BooleanNode < ASTNode; attr_accessor :value; def initialize(v); @value = v; end; end
class NullNode < ASTNode; end
class IdentifierNode < ASTNode; attr_accessor :name; def initialize(n); @name = n; end; end
class BinaryOpNode < ASTNode; attr_accessor :left, :op, :right; def initialize(l, o, r); @left = l; @op = o; @right = r; end; end
class UnaryOpNode < ASTNode; attr_accessor :op, :operand; def initialize(o, e); @op = o; @operand = e; end; end
class AssignNode < ASTNode; attr_accessor :name, :value; def initialize(n, v); @name = n; @value = v; end; end
class VarDeclNode < ASTNode; attr_accessor :name, :value, :is_const; def initialize(n, v, c = false); @name = n; @value = v; @is_const = c; end; end
class PrintNode < ASTNode; attr_accessor :value; def initialize(v); @value = v; end; end
class IfNode < ASTNode; attr_accessor :condition, :body, :else_body; def initialize(c, b, e = nil); @condition = c; @body = b; @else_body = e; end; end
class WhileNode < ASTNode; attr_accessor :condition, :body; def initialize(c, b); @condition = c; @body = b; end; end
class ForNode < ASTNode; attr_accessor :var_name, :iterable, :body; def initialize(v, i, b); @var_name = v; @iterable = i; @body = b; end; end
class FunctionDefNode < ASTNode; attr_accessor :name, :params, :body; def initialize(n, p, b); @name = n; @params = p; @body = b; end; end
class ReturnNode < ASTNode; attr_accessor :value; def initialize(v); @value = v; end; end
class FunctionCallNode < ASTNode; attr_accessor :name, :args; def initialize(n, a); @name = n; @args = a; end; end
class BlockNode < ASTNode; attr_accessor :statements; def initialize(s); @statements = s; end; end
class ListNode < ASTNode; attr_accessor :elements; def initialize(e); @elements = e; end; end
class IndexAccessNode < ASTNode; attr_accessor :obj, :index; def initialize(o, i); @obj = o; @index = i; end; end
class DotAccessNode < ASTNode; attr_accessor :obj, :attr; def initialize(o, a); @obj = o; @attr = a; end; end
class BreakNode < ASTNode; end
class ContinueNode < ASTNode; end
class TernaryNode < ASTNode; attr_accessor :condition, :true_expr, :false_expr; def initialize(c, t, f); @condition = c; @true_expr = t; @false_expr = f; end; end

# ============================================================
# PARSER
# ============================================================

class ParseError < StandardError; end

class Parser
  def initialize(tokens)
    @tokens = tokens
    @pos = 0
  end

  def current
    @tokens[@pos]
  end

  def advance
    t = @tokens[@pos]
    @pos += 1
    t
  end

  def expect(tt)
    if current.type != tt
      raise ParseError, "Error di baris #{current.line}: Diharapkan #{tt}, ditemukan #{current.type} (#{current.value.inspect})"
    end
    advance
  end

  def match(tt)
    if current.type == tt
      advance
    else
      nil
    end
  end

  def parse
    stmts = []
    while current.type != TokenType::EOF
      stmts << parse_statement
    end
    BlockNode.new(stmts)
  end

  def parse_statement
    case current.type
    when TokenType::CETAK then parse_print
    when TokenType::VAR then parse_var_decl(false)
    when TokenType::KONSTAN then parse_var_decl(true)
    when TokenType::JIKA then parse_if
    when TokenType::SELAMA then parse_while
    when TokenType::UNTUK then parse_for
    when TokenType::FUNGSI then parse_function_def
    when TokenType::KEMBALI then parse_return
    when TokenType::PUTUS then advance; match(TokenType::SEMICOLON); BreakNode.new
    when TokenType::LANJUT then advance; match(TokenType::SEMICOLON); ContinueNode.new
    else parse_expr_statement
    end
  end

  def parse_print
    advance; expect(TokenType::LPAREN)
    val = parse_expression
    expect(TokenType::RPAREN); match(TokenType::SEMICOLON)
    PrintNode.new(val)
  end

  def parse_var_decl(is_const)
    advance; name = expect(TokenType::IDENTIFIER).value
    val = nil
    if match(TokenType::ASSIGN)
      val = parse_expression
    end
    match(TokenType::SEMICOLON)
    VarDeclNode.new(name, val, is_const)
  end

  def parse_if
    advance; expect(TokenType::LPAREN)
    cond = parse_expression
    expect(TokenType::RPAREN)
    body = parse_block
    else_body = nil
    if match(TokenType::LAIN)
      if current.type == TokenType::JIKA
        else_body = BlockNode.new([parse_if])
      else
        else_body = parse_block
      end
    end
    IfNode.new(cond, body, else_body)
  end

  def parse_while
    advance; expect(TokenType::LPAREN)
    cond = parse_expression
    expect(TokenType::RPAREN)
    WhileNode.new(cond, parse_block)
  end

  def parse_for
    advance; expect(TokenType::LPAREN)
    var_name = expect(TokenType::IDENTIFIER).value
    expect(TokenType::DALAM)
    iterable = parse_expression
    expect(TokenType::RPAREN)
    ForNode.new(var_name, iterable, parse_block)
  end

  def parse_function_def
    advance; name = expect(TokenType::IDENTIFIER).value
    expect(TokenType::LPAREN)
    params = []
    if current.type != TokenType::RPAREN
      params << expect(TokenType::IDENTIFIER).value
      while match(TokenType::COMMA)
        params << expect(TokenType::IDENTIFIER).value
      end
    end
    expect(TokenType::RPAREN)
    FunctionDefNode.new(name, params, parse_block)
  end

  def parse_return
    advance
    val = nil
    if current.type != TokenType::SEMICOLON && current.type != TokenType::RBRACE
      val = parse_expression
    end
    match(TokenType::SEMICOLON)
    ReturnNode.new(val)
  end

  def parse_block
    expect(TokenType::LBRACE)
    stmts = []
    while current.type != TokenType::RBRACE && current.type != TokenType::EOF
      stmts << parse_statement
    end
    expect(TokenType::RBRACE)
    BlockNode.new(stmts)
  end

  def parse_expr_statement
    expr = parse_expression
    if expr.is_a?(IdentifierNode) && match(TokenType::ASSIGN)
      val = parse_expression; match(TokenType::SEMICOLON)
      return AssignNode.new(expr.name, val)
    end
    if expr.is_a?(IdentifierNode)
      compound = {TokenType::PLUS_ASSIGN => '+', TokenType::MINUS_ASSIGN => '-', TokenType::STAR_ASSIGN => '*', TokenType::SLASH_ASSIGN => '/'}
      if compound[current.type]
        op = compound[current.type]; advance
        val = parse_expression; match(TokenType::SEMICOLON)
        return AssignNode.new(expr.name, BinaryOpNode.new(IdentifierNode.new(expr.name), op, val))
      end
    end
    match(TokenType::SEMICOLON)
    expr
  end

  def parse_expression
    parse_ternary
  end

  def parse_ternary
    expr = parse_or
    if match(TokenType::QUESTION)
      true_expr = parse_expression
      expect(TokenType::COLON)
      false_expr = parse_expression
      return TernaryNode.new(expr, true_expr, false_expr)
    end
    expr
  end

  def parse_or
    left = parse_and
    while [TokenType::ATAU, TokenType::OR].include?(current.type)
      op = advance.value; right = parse_and
      left = BinaryOpNode.new(left, op, right)
    end
    left
  end

  def parse_and
    left = parse_equality
    while [TokenType::DAN, TokenType::AND].include?(current.type)
      op = advance.value; right = parse_equality
      left = BinaryOpNode.new(left, op, right)
    end
    left
  end

  def parse_equality
    left = parse_comparison
    while [TokenType::EQ, TokenType::NEQ].include?(current.type)
      op = advance.value; right = parse_comparison
      left = BinaryOpNode.new(left, op, right)
    end
    left
  end

  def parse_comparison
    left = parse_range_expr
    while [TokenType::LT, TokenType::GT, TokenType::LTE, TokenType::GTE].include?(current.type)
      op = advance.value; right = parse_range_expr
      left = BinaryOpNode.new(left, op, right)
    end
    left
  end

  def parse_range_expr
    left = parse_addition
    if current.type == TokenType::RANGE
      advance; right = parse_addition
      left = BinaryOpNode.new(left, '..', right)
    end
    left
  end

  def parse_addition
    left = parse_multiplication
    while [TokenType::PLUS, TokenType::MINUS].include?(current.type)
      op = advance.value; right = parse_multiplication
      left = BinaryOpNode.new(left, op, right)
    end
    left
  end

  def parse_multiplication
    left = parse_power
    while [TokenType::STAR, TokenType::SLASH, TokenType::PERCENT].include?(current.type)
      op = advance.value; right = parse_power
      left = BinaryOpNode.new(left, op, right)
    end
    left
  end

  def parse_power
    left = parse_unary
    if current.type == TokenType::POWER
      advance; right = parse_power
      left = BinaryOpNode.new(left, '**', right)
    end
    left
  end

  def parse_unary
    if [TokenType::MINUS, TokenType::NOT, TokenType::BUKAN].include?(current.type)
      op = advance.value; UnaryOpNode.new(op, parse_unary)
    elsif [TokenType::INCREMENT, TokenType::DECREMENT].include?(current.type)
      op = advance.value; operand = parse_primary
      if operand.is_a?(IdentifierNode)
        AssignNode.new(operand.name, BinaryOpNode.new(IdentifierNode.new(operand.name), op[0], NumberNode.new(1)))
      else
        raise ParseError, "Increment/decrement hanya untuk variabel"
      end
    else
      parse_postfix
    end
  end

  def parse_postfix
    expr = parse_primary
    if current.type == TokenType::LPAREN && expr.is_a?(IdentifierNode)
      advance; args = []
      if current.type != TokenType::RPAREN
        args << parse_expression
        while match(TokenType::COMMA)
          args << parse_expression
        end
      end
      expect(TokenType::RPAREN)
      return FunctionCallNode.new(expr.name, args)
    end
    if current.type == TokenType::LBRACKET
      advance; index = parse_expression
      expect(TokenType::RBRACKET)
      return IndexAccessNode.new(expr, index)
    end
    if current.type == TokenType::DOT
      advance; attr = expect(TokenType::IDENTIFIER).value
      return DotAccessNode.new(expr, attr)
    end
    expr
  end

  def parse_primary
    t = current
    case t.type
    when TokenType::ANGKA then advance; NumberNode.new(t.value)
    when TokenType::TEKS then advance; StringNode.new(t.value)
    when TokenType::BENAR then advance; BooleanNode.new(true)
    when TokenType::SALAH then advance; BooleanNode.new(false)
    when TokenType::KOSONG then advance; NullNode.new
    when TokenType::IDENTIFIER then advance; IdentifierNode.new(t.value)
    when TokenType::LPAREN
      advance; expr = parse_expression; expect(TokenType::RPAREN); expr
    when TokenType::LBRACKET
      advance; elements = []
      if current.type != TokenType::RBRACKET
        elements << parse_expression
        while match(TokenType::COMMA)
          elements << parse_expression
        end
      end
      expect(TokenType::RBRACKET)
      ListNode.new(elements)
    else
      raise ParseError, "Ekspresi tidak valid di baris #{t.line}"
    end
  end
end

# ============================================================
# INTERPRETER
# ============================================================

class BreakSignal < StandardError; end
class ContinueSignal < StandardError; end
class ReturnSignal < StandardError; attr_accessor :value; def initialize(v); @value = v; end; end
class JakartaRuntimeError < StandardError; end

class Environment
  attr_accessor :vars, :consts, :parent

  def initialize(parent = nil)
    @vars = {}
    @consts = {}
    @parent = parent
  end

  def get(name)
    return @vars[name] if @vars.key?(name)
    return @parent.get(name) if @parent
    raise JakartaRuntimeError, "Variabel \"#{name}\" tidak ditemukan"
  end

  def set(name, value)
    raise JakartaRuntimeError, "Tidak bisa mengubah konstan \"#{name}\"" if @consts[name]
    if @vars.key?(name)
      @vars[name] = value; return
    end
    if @parent && @parent.has?(name)
      @parent.set(name, value); return
    end
    @vars[name] = value
  end

  def define(name, value, is_const = false)
    @vars[name] = value
    @consts[name] = true if is_const
  end

  def has(name)
    return true if @vars.key?(name)
    @parent && @parent.has(name)
  end
end

class JakartaInterpreter
  def initialize
    @global_env = Environment.new
    setup_builtins
  end

  def setup_builtins
    @global_env.define('panjang', ->(args) { args[0].is_a?(Array) ? args[0].length : args[0].length })
    @global_env.define('tipe', ->(args) {
      case args[0]
      when Integer, Float then 'angka'
      when String then 'teks'
      when TrueClass, FalseClass then 'boolean'
      when Array then 'daftar'
      when NilClass then 'kosong'
      else 'tidak_diketahui'
      end
    })
    @global_env.define('angka', ->(args) {
      args[0].is_a?(String) ? (args[0].include?('.') ? args[0].to_f : args[0].to_i) : args[0]
    })
    @global_env.define('teks', ->(args) { format_value(args[0]) })
    @global_env.define('urut', ->(args) { args[0].sort { |a, b| to_f(a) <=> to_f(b) } })
    @global_env.define('balik', ->(args) { args[0].is_a?(Array) ? args[0].reverse : args[0].reverse })
    @global_env.define('rentang', ->(args) {
      if args.length == 1
        (0...args[0].to_i).to_a
      else
        step = args.length > 2 ? args[2].to_i : 1
        (args[0].to_i...args[1].to_i).step(step).to_a
      end
    })
    @global_env.define('bulat', ->(args) { args[0].round })
    @global_env.define('lantai', ->(args) { args[0].floor })
    @global_env.define('atap', ->(args) { args[0].ceil })
    @global_env.define('akar', ->(args) { Math.sqrt(args[0]) })
    @global_env.define('abs', ->(args) { args[0].abs })
    @global_env.define('besar', ->(args) { args[0].to_s.upcase })
    @global_env.define('kecil', ->(args) { args[0].to_s.downcase })
    @global_env.define('gabung', ->(args) { args[0].map { |x| format_value(x) }.join(args[1]) })
    @global_env.define('belah', ->(args) {
      sep = args.length > 1 ? args[1] : ' '
      args[0].split(sep)
    })
    @global_env.define('ganti', ->(args) { args[0].gsub(args[1], args[2]) })
    @global_env.define('PI', Math::PI, true)
    @global_env.define('E', Math::E, true)
  end

  def to_f(v)
    case v
    when Integer, Float then v.to_f
    when TrueClass then 1.0
    when FalseClass then 0.0
    else v.to_s.to_f
    end
  end

  def is_truthy(v)
    case v
    when NilClass then false
    when FalseClass then false
    when Integer, Float then v != 0
    when String then v.length > 0
    when Array then v.length > 0
    else true
    end
  end

  def format_value(v)
    case v
    when NilClass then 'kosong'
    when TrueClass then 'benar'
    when FalseClass then 'salah'
    when Float then v == v.to_i ? v.to_i.to_s : v.to_s
    when Integer then v.to_s
    when Array then '[' + v.map { |x| format_value(x) }.join(', ') + ']'
    when Hash then "<fungsi #{v[:name]}>"
    when Proc then '<fungsi bawaan>'
    else v.to_s
    end
  end

  def run(source)
    lexer = Lexer.new(source)
    tokens = lexer.tokenize
    parser = Parser.new(tokens)
    ast = parser.parse
    execute(ast, @global_env)
  rescue BreakSignal, ContinueSignal
  end

  def execute(node, env)
    case node
    when BlockNode
      result = nil
      node.statements.each { |s| result = execute(s, env) }
      result
    when NumberNode then node.value
    when StringNode then node.value
    when BooleanNode then node.value
    when NullNode then nil
    when IdentifierNode then env.get(node.name)
    when BinaryOpNode then exec_binary(node, env)
    when UnaryOpNode
      operand = execute(node.operand, env)
      if node.op == '-'
        -to_f(operand)
      elsif ['!', 'bukan'].include?(node.op)
        !is_truthy(operand)
      end
    when AssignNode
      val = execute(node.value, env)
      env.set(node.name, val)
      val
    when VarDeclNode
      val = node.value ? execute(node.value, env) : nil
      env.define(node.name, val, node.is_const)
      val
    when PrintNode
      val = execute(node.value, env)
      puts format_value(val)
      val
    when IfNode
      cond = execute(node.condition, env)
      if is_truthy(cond)
        execute(node.body, Environment.new(env))
      elsif node.else_body
        execute(node.else_body, Environment.new(env))
      end
    when WhileNode
      result = nil
      while is_truthy(execute(node.condition, env))
        begin
          result = execute(node.body, Environment.new(env))
        rescue BreakSignal
          break
        rescue ContinueSignal
          next
        end
      end
      result
    when ForNode
      iterable = execute(node.iterable, env)
      result = nil
      iterable.each do |item|
        begin
          loop_env = Environment.new(env)
          loop_env.define(node.var_name, item)
          result = execute(node.body, loop_env)
        rescue BreakSignal
          break
        rescue ContinueSignal
          next
        end
      end
      result
    when FunctionDefNode
      fn = { name: node.name, params: node.params, body: node.body, closure: env }
      env.define(node.name, fn)
      fn
    when ReturnNode
      val = node.value ? execute(node.value, env) : nil
      raise ReturnSignal.new(val)
    when FunctionCallNode
      exec_call(node, env)
    when ListNode
      node.elements.map { |el| execute(el, env) }
    when IndexAccessNode
      obj = execute(node.obj, env)
      index = execute(node.index, env)
      obj[to_f(index).to_i]
    when DotAccessNode
      obj = execute(node.obj, env)
      if node.attr == 'panjang'
        obj.is_a?(Array) ? obj.length : obj.length
      elsif obj.is_a?(Hash) && obj[node.attr.to_sym]
        obj[node.attr.to_sym]
      end
    when BreakNode then raise BreakSignal
    when ContinueNode then raise ContinueSignal
    when TernaryNode
      cond = execute(node.condition, env)
      is_truthy(cond) ? execute(node.true_expr, env) : execute(node.false_expr, env)
    end
  end

  def exec_binary(node, env)
    left = execute(node.left, env)

    if ['dan', '&&'].include?(node.op)
      return left unless is_truthy(left)
      return execute(node.right, env)
    end
    if ['atau', '||'].include?(node.op)
      return left if is_truthy(left)
      return execute(node.right, env)
    end

    right = execute(node.right, env)

    case node.op
    when '+'
      if left.is_a?(String) || right.is_a?(String)
        format_value(left) + format_value(right)
      elsif left.is_a?(Array)
        left + (right.is_a?(Array) ? right : [right])
      else
        to_f(left) + to_f(right)
      end
    when '-' then to_f(left) - to_f(right)
    when '*' then to_f(left) * to_f(right)
    when '/'
      r = to_f(right)
      raise JakartaRuntimeError, 'Pembagian dengan nol' if r == 0
      to_f(left) / r
    when '%' then to_f(left).to_i % to_f(right).to_i
    when '**' then to_f(left) ** to_f(right)
    when '==' then left == right
    when '!=' then left != right
    when '<' then to_f(left) < to_f(right)
    when '>' then to_f(left) > to_f(right)
    when '<=' then to_f(left) <= to_f(right)
    when '>=' then to_f(left) >= to_f(right)
    when '..'
      (to_f(left).to_i..to_f(right).to_i).to_a
    end
  end

  def exec_call(node, env)
    fn = env.get(node.name)
    args = node.args.map { |a| execute(a, env) }

    if fn.is_a?(Proc)
      return fn.call(args)
    end

    if fn.is_a?(Hash) && fn[:body]
      func_env = Environment.new(fn[:closure])
      fn[:params].each_with_index do |param, i|
        func_env.define(param, i < args.length ? args[i] : nil)
      end
      result = nil
      begin
        result = execute(fn[:body], func_env)
      rescue ReturnSignal => e
        result = e.value
      end
      return result
    end

    raise JakartaRuntimeError, "\"#{node.name}\" bukan fungsi"
  end
end

# ============================================================
# MAIN
# ============================================================

if __FILE__ == $0
  if ARGV.length < 1
    puts '🇮🇩 Jakarta Language Interpreter (Ruby) v0.1.0'
    puts 'Cara pakai: ruby interpreter.rb <file.jkt>'
    exit
  end

  file_path = ARGV[0]
  unless file_path.end_with?('.jkt')
    puts '❌ File harus berekstensi .jkt'
    exit 1
  end

  unless File.exist?(file_path)
    puts "❌ File \"#{file_path}\" tidak ditemukan"
    exit 1
  end

  source = File.read(file_path, encoding: 'utf-8')
  interp = JakartaInterpreter.new

  begin
    interp.run(source)
  rescue LexerError => e
    puts "❌ Kesalahan Lexer: #{e}"
    exit 1
  rescue ParseError => e
    puts "❌ Kesalahan Parser: #{e}"
    exit 1
  rescue JakartaRuntimeError => e
    puts "❌ Kesalahan Runtime: #{e}"
    exit 1
  rescue ReturnSignal
  end
end