/**
 * Jakarta Language Interpreter - Browser Implementation
 * Full-featured interpreter for the web playground
 */

const JakartaInterpreter = (function() {

  // ============================================================
  // TOKEN TYPES
  // ============================================================

  const TokenType = {
    ANGKA: 'ANGKA', TEKS: 'TEKS', IDENTIFIER: 'IDENTIFIER',
    CETAK: 'cetak', VAR: 'var', KONSTAN: 'konstan', FUNGSI: 'fungsi', KEMBALI: 'kembali',
    JIKA: 'jika', LAIN: 'lain', SELAMA: 'selama', UNTUK: 'untuk', DALAM: 'dalam',
    BENAR: 'benar', SALAH: 'salah', KOSONG: 'kosong',
    DAN: 'dan', ATAU: 'atau', BUKAN: 'bukan',
    PUTUS: 'putus', LANJUT: 'lanjut',
    PLUS: '+', MINUS: '-', STAR: '*', SLASH: '/', PERCENT: '%', POWER: '**',
    ASSIGN: '=', PLUS_ASSIGN: '+=', MINUS_ASSIGN: '-=', STAR_ASSIGN: '*=', SLASH_ASSIGN: '/=',
    EQ: '==', NEQ: '!=', LT: '<', GT: '>', LTE: '<=', GTE: '>=',
    AND: '&&', OR: '||', NOT: '!',
    INCREMENT: '++', DECREMENT: '--', ARROW: '=>', DOT: '.', RANGE: '..',
    LPAREN: '(', RPAREN: ')', LBRACE: '{', RBRACE: '}', LBRACKET: '[', RBRACKET: ']',
    COMMA: ',', SEMICOLON: ';', COLON: ':', QUESTION: '?',
    EOF: 'EOF',
  };

  const KEYWORDS = {
    cetak: TokenType.CETAK, var: TokenType.VAR, konstan: TokenType.KONSTAN,
    fungsi: TokenType.FUNGSI, kembali: TokenType.KEMBALI, jika: TokenType.JIKA,
    lain: TokenType.LAIN, selama: TokenType.SELAMA, untuk: TokenType.UNTUK,
    dalam: TokenType.DALAM, benar: TokenType.BENAR, salah: TokenType.SALAH,
    kosong: TokenType.KOSONG, dan: TokenType.DAN, atau: TokenType.ATAU,
    bukan: TokenType.BUKAN, putus: TokenType.PUTUS, lanjut: TokenType.LANJUT,
  };

  // ============================================================
  // LEXER
  // ============================================================

  class LexerError extends Error { constructor(msg) { super(msg); this.name = 'LexerError'; } }

  class Lexer {
    constructor(source) {
      this.source = source;
      this.pos = 0;
      this.line = 1;
      this.tokens = [];
    }

    peek() { return this.pos < this.source.length ? this.source[this.pos] : '\0'; }
    peekNext() { return this.pos + 1 < this.source.length ? this.source[this.pos + 1] : '\0'; }

    advance() {
      const ch = this.source[this.pos++];
      if (ch === '\n') this.line++;
      return ch;
    }

    skipWhitespace() {
      while (this.pos < this.source.length && ' \t\r'.includes(this.source[this.pos])) this.advance();
    }

    skipComment() {
      if (this.peek() === '/' && this.peekNext() === '/') {
        while (this.pos < this.source.length && this.source[this.pos] !== '\n') this.advance();
        return true;
      }
      if (this.peek() === '/' && this.peekNext() === '*') {
        this.advance(); this.advance();
        while (this.pos < this.source.length) {
          if (this.peek() === '*' && this.peekNext() === '/') { this.advance(); this.advance(); break; }
          this.advance();
        }
        return true;
      }
      return false;
    }

    readString(quote) {
      this.advance();
      let result = '';
      while (this.pos < this.source.length && this.source[this.pos] !== quote) {
        if (this.source[this.pos] === '\\') {
          this.advance();
          const ch = this.advance();
          const escapes = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"' };
          result += escapes[ch] || ch;
        } else {
          result += this.advance();
        }
      }
      if (this.pos < this.source.length) this.advance();
      return result;
    }

    readNumber() {
      let s = '';
      while (this.pos < this.source.length && /\d/.test(this.source[this.pos])) s += this.advance();
      if (this.pos < this.source.length && this.source[this.pos] === '.' &&
          this.pos + 1 < this.source.length && /\d/.test(this.source[this.pos + 1])) {
        s += this.advance();
        while (this.pos < this.source.length && /\d/.test(this.source[this.pos])) s += this.advance();
        return { val: parseFloat(s), str: s };
      }
      return { val: parseInt(s), str: s };
    }

    readIdentifier() {
      let s = '';
      while (this.pos < this.source.length && /[\w]/.test(this.source[this.pos])) s += this.advance();
      return s;
    }

    tokenize() {
      const twoOps = {
        '**': TokenType.POWER, '==': TokenType.EQ, '!=': TokenType.NEQ,
        '<=': TokenType.LTE, '>=': TokenType.GTE, '&&': TokenType.AND,
        '||': TokenType.OR, '++': TokenType.INCREMENT, '--': TokenType.DECREMENT,
        '=>': TokenType.ARROW, '+=': TokenType.PLUS_ASSIGN, '-=': TokenType.MINUS_ASSIGN,
        '*=': TokenType.STAR_ASSIGN, '/=': TokenType.SLASH_ASSIGN, '..': TokenType.RANGE,
      };
      const singleOps = {
        '+': TokenType.PLUS, '-': TokenType.MINUS, '*': TokenType.STAR, '/': TokenType.SLASH,
        '%': TokenType.PERCENT, '=': TokenType.ASSIGN, '<': TokenType.LT, '>': TokenType.GT,
        '!': TokenType.NOT, '(': TokenType.LPAREN, ')': TokenType.RPAREN,
        '{': TokenType.LBRACE, '}': TokenType.RBRACE, '[': TokenType.LBRACKET, ']': TokenType.RBRACKET,
        ',': TokenType.COMMA, ';': TokenType.SEMICOLON, ':': TokenType.COLON,
        '.': TokenType.DOT, '?': TokenType.QUESTION,
      };

      while (this.pos < this.source.length) {
        this.skipWhitespace();
        if (this.pos >= this.source.length) break;
        if (this.skipComment()) continue;
        if (this.source[this.pos] === '\n') { this.advance(); continue; }

        const line = this.line;
        const ch = this.peek();

        if (ch === '"' || ch === "'") {
          this.tokens.push({ type: TokenType.TEKS, value: this.readString(ch), line });
          continue;
        }
        if (/\d/.test(ch)) {
          const { val, str } = this.readNumber();
          this.tokens.push({ type: TokenType.ANGKA, value: str, line, numVal: val });
          continue;
        }
        if (/[a-zA-Z_]/.test(ch) || ch.charCodeAt(0) > 127) {
          const val = this.readIdentifier();
          this.tokens.push({ type: KEYWORDS[val] || TokenType.IDENTIFIER, value: val, line });
          continue;
        }

        const two = this.pos + 1 < this.source.length ? this.source.substring(this.pos, this.pos + 2) : '';
        if (twoOps[two]) {
          this.advance(); this.advance();
          this.tokens.push({ type: twoOps[two], value: two, line });
          continue;
        }
        if (singleOps[ch]) {
          this.advance();
          this.tokens.push({ type: singleOps[ch], value: ch, line });
          continue;
        }
        throw new LexerError(`Karakter tidak dikenali: '${ch}' di baris ${line}`);
      }

      this.tokens.push({ type: TokenType.EOF, value: '', line: this.line });
      return this.tokens;
    }
  }

  // ============================================================
  // PARSER
  // ============================================================

  class ParseError extends Error { constructor(msg) { super(msg); this.name = 'ParseError'; } }

  class Parser {
    constructor(tokens) { this.tokens = tokens; this.pos = 0; }

    current() { return this.tokens[this.pos]; }
    advance() { return this.tokens[this.pos++]; }

    expect(tt) {
      if (this.current().type !== tt) {
        throw new ParseError(`Baris ${this.current().line}: Diharapkan ${tt}, ditemukan ${this.current().type} (${this.current().value})`);
      }
      return this.advance();
    }

    match(tt) { return this.current().type === tt ? this.advance() : null; }

    parse() {
      const stmts = [];
      while (this.current().type !== TokenType.EOF) stmts.push(this.parseStatement());
      return { kind: 'block', statements: stmts };
    }

    parseStatement() {
      switch (this.current().type) {
        case TokenType.CETAK: return this.parsePrint();
        case TokenType.VAR: return this.parseVarDecl(false);
        case TokenType.KONSTAN: return this.parseVarDecl(true);
        case TokenType.JIKA: return this.parseIf();
        case TokenType.SELAMA: return this.parseWhile();
        case TokenType.UNTUK: return this.parseFor();
        case TokenType.FUNGSI: return this.parseFunctionDef();
        case TokenType.KEMBALI: return this.parseReturn();
        case TokenType.PUTUS: this.advance(); this.match(TokenType.SEMICOLON); return { kind: 'break' };
        case TokenType.LANJUT: this.advance(); this.match(TokenType.SEMICOLON); return { kind: 'continue' };
        default: return this.parseExprStatement();
      }
    }

    parsePrint() {
      this.advance(); this.expect(TokenType.LPAREN);
      const val = this.parseExpression();
      this.expect(TokenType.RPAREN); this.match(TokenType.SEMICOLON);
      return { kind: 'print', value: val };
    }

    parseVarDecl(isConst) {
      this.advance();
      const name = this.expect(TokenType.IDENTIFIER).value;
      let val = { kind: 'null' };
      if (this.match(TokenType.ASSIGN)) val = this.parseExpression();
      this.match(TokenType.SEMICOLON);
      return { kind: 'varDecl', name, value: val, isConst };
    }

    parseIf() {
      this.advance(); this.expect(TokenType.LPAREN);
      const cond = this.parseExpression();
      this.expect(TokenType.RPAREN);
      const body = this.parseBlock();
      let elseBody = null;
      if (this.match(TokenType.LAIN)) {
        elseBody = this.current().type === TokenType.JIKA
          ? { kind: 'block', statements: [this.parseIf()] }
          : this.parseBlock();
      }
      return { kind: 'if', condition: cond, body, elseBody };
    }

    parseWhile() {
      this.advance(); this.expect(TokenType.LPAREN);
      const cond = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return { kind: 'while', condition: cond, body: this.parseBlock() };
    }

    parseFor() {
      this.advance(); this.expect(TokenType.LPAREN);
      const varName = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.DALAM);
      const iterable = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return { kind: 'for', varName, iterable, body: this.parseBlock() };
    }

    parseFunctionDef() {
      this.advance();
      const name = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.LPAREN);
      const params = [];
      if (this.current().type !== TokenType.RPAREN) {
        params.push(this.expect(TokenType.IDENTIFIER).value);
        while (this.match(TokenType.COMMA)) params.push(this.expect(TokenType.IDENTIFIER).value);
      }
      this.expect(TokenType.RPAREN);
      return { kind: 'functionDef', name, params, body: this.parseBlock() };
    }

    parseReturn() {
      this.advance();
      let val = { kind: 'null' };
      if (this.current().type !== TokenType.SEMICOLON && this.current().type !== TokenType.RBRACE)
        val = this.parseExpression();
      this.match(TokenType.SEMICOLON);
      return { kind: 'return', value: val };
    }

    parseBlock() {
      this.expect(TokenType.LBRACE);
      const stmts = [];
      while (this.current().type !== TokenType.RBRACE && this.current().type !== TokenType.EOF)
        stmts.push(this.parseStatement());
      this.expect(TokenType.RBRACE);
      return { kind: 'block', statements: stmts };
    }

    parseExprStatement() {
      const expr = this.parseExpression();
      if (expr.kind === 'identifier') {
        if (this.match(TokenType.ASSIGN)) {
          const val = this.parseExpression(); this.match(TokenType.SEMICOLON);
          return { kind: 'assign', name: expr.name, value: val };
        }
        const compoundOps = {
          [TokenType.PLUS_ASSIGN]: '+', [TokenType.MINUS_ASSIGN]: '-',
          [TokenType.STAR_ASSIGN]: '*', [TokenType.SLASH_ASSIGN]: '/',
        };
        for (const [tt, op] of Object.entries(compoundOps)) {
          if (this.current().type === tt) {
            this.advance();
            const val = this.parseExpression(); this.match(TokenType.SEMICOLON);
            return { kind: 'assign', name: expr.name, value: { kind: 'binaryOp', left: { kind: 'identifier', name: expr.name }, op, right: val } };
          }
        }
      }
      this.match(TokenType.SEMICOLON);
      return expr;
    }

    parseExpression() { return this.parseTernary(); }

    parseTernary() {
      const expr = this.parseOr();
      if (this.match(TokenType.QUESTION)) {
        const trueExpr = this.parseExpression();
        this.expect(TokenType.COLON);
        const falseExpr = this.parseExpression();
        return { kind: 'ternary', condition: expr, trueExpr, falseExpr };
      }
      return expr;
    }

    parseOr() {
      let left = this.parseAnd();
      while (this.current().type === TokenType.ATAU || this.current().type === TokenType.OR) {
        const op = this.advance().value;
        left = { kind: 'binaryOp', left, op, right: this.parseAnd() };
      }
      return left;
    }

    parseAnd() {
      let left = this.parseEquality();
      while (this.current().type === TokenType.DAN || this.current().type === TokenType.AND) {
        const op = this.advance().value;
        left = { kind: 'binaryOp', left, op, right: this.parseEquality() };
      }
      return left;
    }

    parseEquality() {
      let left = this.parseComparison();
      while (this.current().type === TokenType.EQ || this.current().type === TokenType.NEQ) {
        const op = this.advance().value;
        left = { kind: 'binaryOp', left, op, right: this.parseComparison() };
      }
      return left;
    }

    parseComparison() {
      let left = this.parseRange();
      while ([TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE].includes(this.current().type)) {
        const op = this.advance().value;
        left = { kind: 'binaryOp', left, op, right: this.parseRange() };
      }
      return left;
    }

    parseRange() {
      const left = this.parseAddition();
      if (this.current().type === TokenType.RANGE) {
        this.advance();
        return { kind: 'binaryOp', left, op: '..', right: this.parseAddition() };
      }
      return left;
    }

    parseAddition() {
      let left = this.parseMultiplication();
      while (this.current().type === TokenType.PLUS || this.current().type === TokenType.MINUS) {
        const op = this.advance().value;
        left = { kind: 'binaryOp', left, op, right: this.parseMultiplication() };
      }
      return left;
    }

    parseMultiplication() {
      let left = this.parsePower();
      while ([TokenType.STAR, TokenType.SLASH, TokenType.PERCENT].includes(this.current().type)) {
        const op = this.advance().value;
        left = { kind: 'binaryOp', left, op, right: this.parsePower() };
      }
      return left;
    }

    parsePower() {
      const left = this.parseUnary();
      if (this.current().type === TokenType.POWER) {
        this.advance();
        return { kind: 'binaryOp', left, op: '**', right: this.parsePower() };
      }
      return left;
    }

    parseUnary() {
      if ([TokenType.MINUS, TokenType.NOT, TokenType.BUKAN].includes(this.current().type)) {
        const op = this.advance().value;
        return { kind: 'unaryOp', op, operand: this.parseUnary() };
      }
      if ([TokenType.INCREMENT, TokenType.DECREMENT].includes(this.current().type)) {
        const op = this.advance().value;
        const operand = this.parsePrimary();
        if (operand.kind === 'identifier') {
          return { kind: 'assign', name: operand.name, value: { kind: 'binaryOp', left: { kind: 'identifier', name: operand.name }, op: op[0], right: { kind: 'number', value: 1 } } };
        }
        throw new ParseError('Increment/decrement hanya untuk variabel');
      }
      return this.parsePostfix();
    }

    parsePostfix() {
      const expr = this.parsePrimary();
      if (this.current().type === TokenType.LPAREN && expr.kind === 'identifier') {
        this.advance();
        const args = [];
        if (this.current().type !== TokenType.RPAREN) {
          args.push(this.parseExpression());
          while (this.match(TokenType.COMMA)) args.push(this.parseExpression());
        }
        this.expect(TokenType.RPAREN);
        return { kind: 'functionCall', name: expr.name, args };
      }
      if (this.current().type === TokenType.LBRACKET) {
        this.advance();
        const index = this.parseExpression();
        this.expect(TokenType.RBRACKET);
        return { kind: 'indexAccess', obj: expr, index };
      }
      if (this.current().type === TokenType.DOT) {
        this.advance();
        const attr = this.expect(TokenType.IDENTIFIER).value;
        return { kind: 'dotAccess', obj: expr, attr };
      }
      return expr;
    }

    parsePrimary() {
      const t = this.current();
      switch (t.type) {
        case TokenType.ANGKA: this.advance(); return { kind: 'number', value: t.numVal };
        case TokenType.TEKS: this.advance(); return { kind: 'string', value: t.value };
        case TokenType.BENAR: this.advance(); return { kind: 'boolean', value: true };
        case TokenType.SALAH: this.advance(); return { kind: 'boolean', value: false };
        case TokenType.KOSONG: this.advance(); return { kind: 'null' };
        case TokenType.IDENTIFIER: this.advance(); return { kind: 'identifier', name: t.value };
        case TokenType.LPAREN: this.advance(); const e = this.parseExpression(); this.expect(TokenType.RPAREN); return e;
        case TokenType.LBRACKET:
          this.advance();
          const elements = [];
          if (this.current().type !== TokenType.RBRACKET) {
            elements.push(this.parseExpression());
            while (this.match(TokenType.COMMA)) elements.push(this.parseExpression());
          }
          this.expect(TokenType.RBRACKET);
          return { kind: 'list', elements };
        default:
          throw new ParseError(`Ekspresi tidak valid di baris ${t.line}`);
      }
    }
  }

  // ============================================================
  // INTERPRETER
  // ============================================================

  class BreakSignal extends Error { constructor() { super('break'); } }
  class ContinueSignal extends Error { constructor() { super('continue'); } }
  class ReturnSignal extends Error { constructor(v) { super('return'); this.value = v; } }
  class RuntimeError extends Error { constructor(msg) { super(msg); this.name = 'RuntimeError'; } }

  class Environment {
    constructor(parent = null) {
      this.vars = new Map();
      this.consts = new Set();
      this.parent = parent;
    }

    get(name) {
      if (this.vars.has(name)) return this.vars.get(name);
      if (this.parent) return this.parent.get(name);
      throw new RuntimeError(`Variabel "${name}" tidak ditemukan`);
    }

    set(name, value) {
      if (this.consts.has(name)) throw new RuntimeError(`Tidak bisa mengubah konstan "${name}"`);
      if (this.vars.has(name)) { this.vars.set(name, value); return; }
      if (this.parent && this.parent.has(name)) { this.parent.set(name, value); return; }
      this.vars.set(name, value);
    }

    define(name, value, isConst = false) {
      this.vars.set(name, value);
      if (isConst) this.consts.add(name);
    }

    has(name) {
      if (this.vars.has(name)) return true;
      return this.parent ? this.parent.has(name) : false;
    }
  }

  class Interpreter {
    constructor(outputCallback) {
      this.output = outputCallback || console.log;
      this.globalEnv = new Environment();
      this.setupBuiltins();
    }

    setupBuiltins() {
      const env = this.globalEnv;
      env.define('panjang', (args) => {
        const v = args[0];
        return Array.isArray(v) ? v.length : typeof v === 'string' ? v.length : 0;
      });
      env.define('tipe', (args) => {
        const v = args[0];
        if (typeof v === 'number') return 'angka';
        if (typeof v === 'string') return 'teks';
        if (typeof v === 'boolean') return 'boolean';
        if (Array.isArray(v)) return 'daftar';
        if (v === null || v === undefined) return 'kosong';
        return 'tidak_diketahui';
      });
      env.define('angka', (args) => {
        const v = args[0];
        if (typeof v === 'string') return v.includes('.') ? parseFloat(v) : parseInt(v);
        return typeof v === 'number' ? v : 0;
      });
      env.define('teks', (args) => this.formatValue(args[0]));
      env.define('urut', (args) => [...args[0]].sort((a, b) => this.toNumber(a) - this.toNumber(b)));
      env.define('balik', (args) => {
        const v = args[0];
        return Array.isArray(v) ? [...v].reverse() : typeof v === 'string' ? v.split('').reverse().join('') : v;
      });
      env.define('rentang', (args) => {
        let start = 0, end = 0, step = 1;
        if (args.length === 1) { end = Math.floor(args[0]); }
        else if (args.length >= 2) {
          start = Math.floor(args[0]); end = Math.floor(args[1]);
          if (args.length > 2) step = Math.floor(args[2]);
        }
        const result = [];
        if (step > 0) for (let i = start; i < end; i += step) result.push(i);
        else if (step < 0) for (let i = start; i > end; i += step) result.push(i);
        return result;
      });
      env.define('bulat', (args) => Math.round(args[0]));
      env.define('lantai', (args) => Math.floor(args[0]));
      env.define('atap', (args) => Math.ceil(args[0]));
      env.define('akar', (args) => Math.sqrt(args[0]));
      env.define('abs', (args) => Math.abs(args[0]));
      env.define('besar', (args) => this.formatValue(args[0]).toUpperCase());
      env.define('kecil', (args) => this.formatValue(args[0]).toLowerCase());
      env.define('gabung', (args) => args[0].map(x => this.formatValue(x)).join(args[1]));
      env.define('belah', (args) => {
        const s = this.formatValue(args[0]);
        const sep = args.length > 1 ? this.formatValue(args[1]) : ' ';
        return s.split(sep);
      });
      env.define('ganti', (args) => this.formatValue(args[0]).replaceAll(this.formatValue(args[1]), this.formatValue(args[2])));
      env.define('PI', Math.PI, true);
      env.define('E', Math.E, true);
    }

    toNumber(v) {
      if (typeof v === 'number') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'string') return parseFloat(v) || 0;
      return 0;
    }

    isTruthy(v) {
      if (v === null || v === undefined) return false;
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v !== 0;
      if (typeof v === 'string') return v.length > 0;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }

    formatValue(v) {
      if (v === null || v === undefined) return 'kosong';
      if (typeof v === 'boolean') return v ? 'benar' : 'salah';
      if (typeof v === 'number') return Number.isInteger(v) ? v.toString() : v.toString();
      if (typeof v === 'string') return v;
      if (Array.isArray(v)) return '[' + v.map(x => this.formatValue(x)).join(', ') + ']';
      if (typeof v === 'object' && v.name) return `<fungsi ${v.name}>`;
      return String(v);
    }

    run(source) {
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      this.execute(ast, this.globalEnv);
    }

    execute(node, env) {
      switch (node.kind) {
        case 'block': {
          let result = null;
          for (const s of node.statements) result = this.execute(s, env);
          return result;
        }
        case 'number': return node.value;
        case 'string': return node.value;
        case 'boolean': return node.value;
        case 'null': return null;
        case 'identifier': return env.get(node.name);

        case 'binaryOp': {
          const left = this.execute(node.left, env);
          if (node.op === 'dan' || node.op === '&&') return !this.isTruthy(left) ? left : this.execute(node.right, env);
          if (node.op === 'atau' || node.op === '||') return this.isTruthy(left) ? left : this.execute(node.right, env);
          const right = this.execute(node.right, env);
          switch (node.op) {
            case '+':
              if (typeof left === 'string' || typeof right === 'string')
                return this.formatValue(left) + this.formatValue(right);
              if (Array.isArray(left)) return [...left, ...(Array.isArray(right) ? right : [right])];
              return this.toNumber(left) + this.toNumber(right);
            case '-': return this.toNumber(left) - this.toNumber(right);
            case '*': return this.toNumber(left) * this.toNumber(right);
            case '/': { const r = this.toNumber(right); if (r === 0) throw new RuntimeError('Pembagian dengan nol'); return this.toNumber(left) / r; }
            case '%': return this.toNumber(left) % this.toNumber(right);
            case '**': return Math.pow(this.toNumber(left), this.toNumber(right));
            case '==': return left === right;
            case '!=': return left !== right;
            case '<': return this.toNumber(left) < this.toNumber(right);
            case '>': return this.toNumber(left) > this.toNumber(right);
            case '<=': return this.toNumber(left) <= this.toNumber(right);
            case '>=': return this.toNumber(left) >= this.toNumber(right);
            case '..': {
              const result = [];
              for (let i = Math.floor(this.toNumber(left)); i <= Math.floor(this.toNumber(right)); i++) result.push(i);
              return result;
            }
          }
          break;
        }

        case 'unaryOp': {
          const operand = this.execute(node.operand, env);
          if (node.op === '-') return -this.toNumber(operand);
          if (node.op === '!' || node.op === 'bukan') return !this.isTruthy(operand);
          break;
        }

        case 'assign': {
          const val = this.execute(node.value, env);
          env.set(node.name, val);
          return val;
        }

        case 'varDecl': {
          const val = this.execute(node.value, env);
          env.define(node.name, val, node.isConst);
          return val;
        }

        case 'print': {
          const val = this.execute(node.value, env);
          this.output(this.formatValue(val));
          return val;
        }

        case 'if': {
          const cond = this.execute(node.condition, env);
          if (this.isTruthy(cond)) return this.execute(node.body, new Environment(env));
          else if (node.elseBody) return this.execute(node.elseBody, new Environment(env));
          return null;
        }

        case 'while': {
          let result = null;
          let iterations = 0;
          while (this.isTruthy(this.execute(node.condition, env))) {
            if (iterations++ > 100000) throw new RuntimeError('Perulangan terlalu banyak (maks 100.000)');
            try { result = this.execute(node.body, new Environment(env)); }
            catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
          }
          return result;
        }

        case 'for': {
          const iterable = this.execute(node.iterable, env);
          let result = null;
          if (Array.isArray(iterable)) {
            for (const item of iterable) {
              try {
                const loopEnv = new Environment(env);
                loopEnv.define(node.varName, item);
                result = this.execute(node.body, loopEnv);
              } catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
            }
          }
          return result;
        }

        case 'functionDef': {
          const fn = { name: node.name, params: node.params, body: node.body, closure: env };
          env.define(node.name, fn);
          return fn;
        }

        case 'return': {
          const val = this.execute(node.value, env);
          throw new ReturnSignal(val);
        }

        case 'functionCall': return this.execCall(node.name, node.args, env);

        case 'list': return node.elements.map(el => this.execute(el, env));

        case 'indexAccess': {
          const obj = this.execute(node.obj, env);
          const index = this.execute(node.index, env);
          return obj[Math.floor(this.toNumber(index))];
        }

        case 'dotAccess': {
          const obj = this.execute(node.obj, env);
          if (node.attr === 'panjang') return Array.isArray(obj) ? obj.length : typeof obj === 'string' ? obj.length : 0;
          return null;
        }

        case 'break': throw new BreakSignal();
        case 'continue': throw new ContinueSignal();

        case 'ternary': {
          const cond = this.execute(node.condition, env);
          return this.isTruthy(cond) ? this.execute(node.trueExpr, env) : this.execute(node.falseExpr, env);
        }
      }
      return null;
    }

    execCall(name, argNodes, env) {
      const fn = env.get(name);
      const args = argNodes.map(a => this.execute(a, env));

      if (typeof fn === 'function') return fn(args);

      if (typeof fn === 'object' && fn.body) {
        const funcEnv = new Environment(fn.closure);
        for (let i = 0; i < fn.params.length; i++) {
          funcEnv.define(fn.params[i], i < args.length ? args[i] : null);
        }
        try { return this.execute(fn.body, funcEnv); }
        catch (e) { if (e instanceof ReturnSignal) return e.value; throw e; }
      }

      throw new RuntimeError(`"${name}" bukan fungsi`);
    }
  }

  return { Interpreter, Lexer, Parser, TokenType };
})();