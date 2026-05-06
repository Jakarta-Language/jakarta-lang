/**
 * Jakarta Language Interpreter (.jkt) - TypeScript Implementation
 * Full-featured interpreter with lexer, parser, and tree-walking interpreter
 */

// ============================================================
// TOKEN TYPES
// ============================================================

enum TokenType {
  ANGKA = 'ANGKA', TEKS = 'TEKS', IDENTIFIER = 'IDENTIFIER',
  CETAK = 'cetak', VAR = 'var', KONSTAN = 'konstan', FUNGSI = 'fungsi', KEMBALI = 'kembali',
  JIKA = 'jika', LAIN = 'lain', SELAMA = 'selama', UNTUK = 'untuk', DALAM = 'dalam',
  BENAR = 'benar', SALAH = 'salah', KOSONG = 'kosong',
  DAN = 'dan', ATAU = 'atau', BUKAN = 'bukan',
  PUTUS = 'putus', LANJUT = 'lanjut',
  PLUS = '+', MINUS = '-', STAR = '*', SLASH = '/', PERCENT = '%', POWER = '**',
  ASSIGN = '=', PLUS_ASSIGN = '+=', MINUS_ASSIGN = '-=', STAR_ASSIGN = '*=', SLASH_ASSIGN = '/=',
  EQ = '==', NEQ = '!=', LT = '<', GT = '>', LTE = '<=', GTE = '>=',
  AND = '&&', OR = '||', NOT = '!',
  INCREMENT = '++', DECREMENT = '--', ARROW = '=>', DOT = '.', RANGE = '..',
  LPAREN = '(', RPAREN = ')', LBRACE = '{', RBRACE = '}', LBRACKET = '[', RBRACKET = ']',
  COMMA = ',', SEMICOLON = ';', COLON = ':', QUESTION = '?',
  EOF = 'EOF',
}

const KEYWORDS: Record<string, TokenType> = {
  cetak: TokenType.CETAK, var: TokenType.VAR, konstan: TokenType.KONSTAN,
  fungsi: TokenType.FUNGSI, kembali: TokenType.KEMBALI, jika: TokenType.JIKA,
  lain: TokenType.LAIN, selama: TokenType.SELAMA, untuk: TokenType.UNTUK,
  dalam: TokenType.DALAM, benar: TokenType.BENAR, salah: TokenType.SALAH,
  kosong: TokenType.KOSONG, dan: TokenType.DAN, atau: TokenType.ATAU,
  bukan: TokenType.BUKAN, putus: TokenType.PUTUS, lanjut: TokenType.LANJUT,
};

// ============================================================
// TOKEN
// ============================================================

interface Token {
  type: TokenType;
  value: string;
  line: number;
  numVal?: number;
}

// ============================================================
// LEXER
// ============================================================

class LexerError extends Error { constructor(msg: string) { super(msg); } }

class Lexer {
  private source: string;
  private pos = 0;
  private line = 1;
  private tokens: Token[] = [];

  constructor(source: string) { this.source = source; }

  private peek(): string { return this.pos < this.source.length ? this.source[this.pos] : '\0'; }
  private peekNext(): string { return this.pos + 1 < this.source.length ? this.source[this.pos + 1] : '\0'; }

  private advance(): string {
    const ch = this.source[this.pos++];
    if (ch === '\n') this.line++;
    return ch;
  }

  private skipWhitespace(): void {
    while (this.pos < this.source.length && ' \t\r'.includes(this.source[this.pos])) this.advance();
  }

  private skipComment(): boolean {
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

  private readString(quote: string): string {
    this.advance();
    let result = '';
    while (this.pos < this.source.length && this.source[this.pos] !== quote) {
      if (this.source[this.pos] === '\\') {
        this.advance();
        const ch = this.advance();
        const escapes: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"' };
        result += escapes[ch] || ch;
      } else {
        result += this.advance();
      }
    }
    if (this.pos < this.source.length) this.advance();
    return result;
  }

  private readNumber(): { val: number; str: string } {
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

  private readIdentifier(): string {
    let s = '';
    while (this.pos < this.source.length && /[\w]/.test(this.source[this.pos])) s += this.advance();
    return s;
  }

  tokenize(): Token[] {
    const twoOps: Record<string, TokenType> = {
      '**': TokenType.POWER, '==': TokenType.EQ, '!=': TokenType.NEQ,
      '<=': TokenType.LTE, '>=': TokenType.GTE, '&&': TokenType.AND,
      '||': TokenType.OR, '++': TokenType.INCREMENT, '--': TokenType.DECREMENT,
      '=>': TokenType.ARROW, '+=': TokenType.PLUS_ASSIGN, '-=': TokenType.MINUS_ASSIGN,
      '*=': TokenType.STAR_ASSIGN, '/=': TokenType.SLASH_ASSIGN, '..': TokenType.RANGE,
    };
    const singleOps: Record<string, TokenType> = {
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
// AST NODES
// ============================================================

type ASTNode =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'null' }
  | { kind: 'identifier'; name: string }
  | { kind: 'binaryOp'; left: ASTNode; op: string; right: ASTNode }
  | { kind: 'unaryOp'; op: string; operand: ASTNode }
  | { kind: 'assign'; name: string; value: ASTNode }
  | { kind: 'varDecl'; name: string; value: ASTNode; isConst: boolean }
  | { kind: 'print'; value: ASTNode }
  | { kind: 'if'; condition: ASTNode; body: ASTNode; elseBody: ASTNode | null }
  | { kind: 'while'; condition: ASTNode; body: ASTNode }
  | { kind: 'for'; varName: string; iterable: ASTNode; body: ASTNode }
  | { kind: 'functionDef'; name: string; params: string[]; body: ASTNode }
  | { kind: 'return'; value: ASTNode }
  | { kind: 'functionCall'; name: string; args: ASTNode[] }
  | { kind: 'block'; statements: ASTNode[] }
  | { kind: 'list'; elements: ASTNode[] }
  | { kind: 'indexAccess'; obj: ASTNode; index: ASTNode }
  | { kind: 'dotAccess'; obj: ASTNode; attr: string }
  | { kind: 'break' }
  | { kind: 'continue' }
  | { kind: 'ternary'; condition: ASTNode; trueExpr: ASTNode; falseExpr: ASTNode };

// ============================================================
// PARSER
// ============================================================

class ParseError extends Error { constructor(msg: string) { super(msg); } }

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) { this.tokens = tokens; }

  private current(): Token { return this.tokens[this.pos]; }
  private advance(): Token { return this.tokens[this.pos++]; }

  private expect(tt: TokenType): Token {
    if (this.current().type !== tt) {
      throw new ParseError(`Error di baris ${this.current().line}: Diharapkan ${tt}, ditemukan ${this.current().type} (${this.current().value})`);
    }
    return this.advance();
  }

  private match(tt: TokenType): Token | null {
    return this.current().type === tt ? this.advance() : null;
  }

  parse(): ASTNode {
    const stmts: ASTNode[] = [];
    while (this.current().type !== TokenType.EOF) stmts.push(this.parseStatement());
    return { kind: 'block', statements: stmts };
  }

  private parseStatement(): ASTNode {
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

  private parsePrint(): ASTNode {
    this.advance(); this.expect(TokenType.LPAREN);
    const val = this.parseExpression();
    this.expect(TokenType.RPAREN); this.match(TokenType.SEMICOLON);
    return { kind: 'print', value: val };
  }

  private parseVarDecl(isConst: boolean): ASTNode {
    this.advance();
    const name = this.expect(TokenType.IDENTIFIER).value;
    let val: ASTNode = { kind: 'null' };
    if (this.match(TokenType.ASSIGN)) val = this.parseExpression();
    this.match(TokenType.SEMICOLON);
    return { kind: 'varDecl', name, value: val, isConst };
  }

  private parseIf(): ASTNode {
    this.advance(); this.expect(TokenType.LPAREN);
    const cond = this.parseExpression();
    this.expect(TokenType.RPAREN);
    const body = this.parseBlock();
    let elseBody: ASTNode | null = null;
    if (this.match(TokenType.LAIN)) {
      elseBody = this.current().type === TokenType.JIKA
        ? { kind: 'block', statements: [this.parseIf()] }
        : this.parseBlock();
    }
    return { kind: 'if', condition: cond, body, elseBody };
  }

  private parseWhile(): ASTNode {
    this.advance(); this.expect(TokenType.LPAREN);
    const cond = this.parseExpression();
    this.expect(TokenType.RPAREN);
    return { kind: 'while', condition: cond, body: this.parseBlock() };
  }

  private parseFor(): ASTNode {
    this.advance(); this.expect(TokenType.LPAREN);
    const varName = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.DALAM);
    const iterable = this.parseExpression();
    this.expect(TokenType.RPAREN);
    return { kind: 'for', varName, iterable, body: this.parseBlock() };
  }

  private parseFunctionDef(): ASTNode {
    this.advance();
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LPAREN);
    const params: string[] = [];
    if (this.current().type !== TokenType.RPAREN) {
      params.push(this.expect(TokenType.IDENTIFIER).value);
      while (this.match(TokenType.COMMA)) params.push(this.expect(TokenType.IDENTIFIER).value);
    }
    this.expect(TokenType.RPAREN);
    return { kind: 'functionDef', name, params, body: this.parseBlock() };
  }

  private parseReturn(): ASTNode {
    this.advance();
    let val: ASTNode = { kind: 'null' };
    if (this.current().type !== TokenType.SEMICOLON && this.current().type !== TokenType.RBRACE)
      val = this.parseExpression();
    this.match(TokenType.SEMICOLON);
    return { kind: 'return', value: val };
  }

  private parseBlock(): ASTNode {
    this.expect(TokenType.LBRACE);
    const stmts: ASTNode[] = [];
    while (this.current().type !== TokenType.RBRACE && this.current().type !== TokenType.EOF)
      stmts.push(this.parseStatement());
    this.expect(TokenType.RBRACE);
    return { kind: 'block', statements: stmts };
  }

  private parseExprStatement(): ASTNode {
    const expr = this.parseExpression();
    if (expr.kind === 'identifier') {
      if (this.match(TokenType.ASSIGN)) {
        const val = this.parseExpression(); this.match(TokenType.SEMICOLON);
        return { kind: 'assign', name: expr.name, value: val };
      }
      const compoundOpMap: Partial<Record<TokenType, string>> = {
        [TokenType.PLUS_ASSIGN]: '+',
        [TokenType.MINUS_ASSIGN]: '-',
        [TokenType.STAR_ASSIGN]: '*',
        [TokenType.SLASH_ASSIGN]: '/',
      };
      const compoundOp = compoundOpMap[this.current().type];
      if (compoundOp) {
        this.advance();
        const val = this.parseExpression(); this.match(TokenType.SEMICOLON);
        return {
          kind: 'assign',
          name: expr.name,
          value: { kind: 'binaryOp', left: { kind: 'identifier', name: expr.name }, op: compoundOp, right: val },
        };
      }
    }
    this.match(TokenType.SEMICOLON);
    return expr;
  }

  private parseExpression(): ASTNode { return this.parseTernary(); }

  private parseTernary(): ASTNode {
    const expr = this.parseOr();
    if (this.match(TokenType.QUESTION)) {
      const trueExpr = this.parseExpression();
      this.expect(TokenType.COLON);
      const falseExpr = this.parseExpression();
      return { kind: 'ternary', condition: expr, trueExpr, falseExpr };
    }
    return expr;
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.current().type === TokenType.ATAU || this.current().type === TokenType.OR) {
      const op = this.advance().value;
      left = { kind: 'binaryOp', left, op, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseEquality();
    while (this.current().type === TokenType.DAN || this.current().type === TokenType.AND) {
      const op = this.advance().value;
      left = { kind: 'binaryOp', left, op, right: this.parseEquality() };
    }
    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseComparison();
    while (this.current().type === TokenType.EQ || this.current().type === TokenType.NEQ) {
      const op = this.advance().value;
      left = { kind: 'binaryOp', left, op, right: this.parseComparison() };
    }
    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseRange();
    while ([TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE].includes(this.current().type)) {
      const op = this.advance().value;
      left = { kind: 'binaryOp', left, op, right: this.parseRange() };
    }
    return left;
  }

  private parseRange(): ASTNode {
    const left = this.parseAddition();
    if (this.current().type === TokenType.RANGE) {
      this.advance();
      return { kind: 'binaryOp', left, op: '..', right: this.parseAddition() };
    }
    return left;
  }

  private parseAddition(): ASTNode {
    let left = this.parseMultiplication();
    while (this.current().type === TokenType.PLUS || this.current().type === TokenType.MINUS) {
      const op = this.advance().value;
      left = { kind: 'binaryOp', left, op, right: this.parseMultiplication() };
    }
    return left;
  }

  private parseMultiplication(): ASTNode {
    let left = this.parsePower();
    while ([TokenType.STAR, TokenType.SLASH, TokenType.PERCENT].includes(this.current().type)) {
      const op = this.advance().value;
      left = { kind: 'binaryOp', left, op, right: this.parsePower() };
    }
    return left;
  }

  private parsePower(): ASTNode {
    const left = this.parseUnary();
    if (this.current().type === TokenType.POWER) {
      this.advance();
      return { kind: 'binaryOp', left, op: '**', right: this.parsePower() };
    }
    return left;
  }

  private parseUnary(): ASTNode {
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

  private parsePostfix(): ASTNode {
    const expr = this.parsePrimary();
    if (this.current().type === TokenType.LPAREN && expr.kind === 'identifier') {
      this.advance();
      const args: ASTNode[] = [];
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

  private parsePrimary(): ASTNode {
    const t = this.current();
    switch (t.type) {
      case TokenType.ANGKA: this.advance(); return { kind: 'number', value: t.numVal! };
      case TokenType.TEKS: this.advance(); return { kind: 'string', value: t.value };
      case TokenType.BENAR: this.advance(); return { kind: 'boolean', value: true };
      case TokenType.SALAH: this.advance(); return { kind: 'boolean', value: false };
      case TokenType.KOSONG: this.advance(); return { kind: 'null' };
      case TokenType.IDENTIFIER: this.advance(); return { kind: 'identifier', name: t.value };
      case TokenType.LPAREN: this.advance(); const e = this.parseExpression(); this.expect(TokenType.RPAREN); return e;
      case TokenType.LBRACKET:
        this.advance();
        const elements: ASTNode[] = [];
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

class BreakSignal extends Error {}
class ContinueSignal extends Error {}
class ReturnSignal extends Error { value: any; constructor(v: any) { super(); this.value = v; } }
class JakartaRuntimeError extends Error { constructor(msg: string) { super(msg); } }

interface JakartaFunction {
  name: string;
  params: string[];
  body: ASTNode;
  closure: Environment;
}

type BuiltinFunc = (args: any[]) => any;

class Environment {
  private vars: Map<string, any> = new Map();
  private consts: Set<string> = new Set();
  private parent: Environment | null;

  constructor(parent: Environment | null = null) { this.parent = parent; }

  get(name: string): any {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    throw new JakartaRuntimeError(`Variabel "${name}" tidak ditemukan`);
  }

  set(name: string, value: any): void {
    if (this.consts.has(name)) throw new JakartaRuntimeError(`Tidak bisa mengubah konstan "${name}"`);
    if (this.vars.has(name)) { this.vars.set(name, value); return; }
    if (this.parent && this.parent.has(name)) { this.parent.set(name, value); return; }
    throw new JakartaRuntimeError(`Variabel "${name}" belum dideklarasikan`);
  }

  define(name: string, value: any, isConst = false): void {
    this.vars.set(name, value);
    if (isConst) this.consts.add(name);
  }

  has(name: string): boolean {
    if (this.vars.has(name)) return true;
    return this.parent ? this.parent.has(name) : false;
  }
}

class Interpreter {
  private globalEnv: Environment;

  constructor() {
    this.globalEnv = new Environment();
    this.setupBuiltins();
  }

  private setupBuiltins(): void {
    const env = this.globalEnv;
    env.define('panjang', ((args: any[]) => {
      const v = args[0];
      return Array.isArray(v) ? v.length : typeof v === 'string' ? v.length : 0;
    }) as BuiltinFunc);
    env.define('tipe', ((args: any[]) => {
      const v = args[0];
      if (typeof v === 'number') return 'angka';
      if (typeof v === 'string') return 'teks';
      if (typeof v === 'boolean') return 'boolean';
      if (Array.isArray(v)) return 'daftar';
      if (v === null || v === undefined) return 'kosong';
      return 'tidak_diketahui';
    }) as BuiltinFunc);
    env.define('angka', ((args: any[]) => {
      const v = args[0];
      if (typeof v === 'string') return v.includes('.') ? parseFloat(v) : parseInt(v);
      return typeof v === 'number' ? v : 0;
    }) as BuiltinFunc);
    env.define('teks', ((args: any[]) => this.formatValue(args[0])) as BuiltinFunc);
    env.define('urut', ((args: any[]) => [...args[0]].sort((a: any, b: any) => this.toNumber(a) - this.toNumber(b))) as BuiltinFunc);
    env.define('balik', ((args: any[]) => {
      const v = args[0];
      return Array.isArray(v) ? [...v].reverse() : typeof v === 'string' ? v.split('').reverse().join('') : v;
    }) as BuiltinFunc);
    env.define('rentang', ((args: any[]) => {
      let start = 0, end = 0, step = 1;
      if (args.length === 1) { end = Math.floor(args[0]); }
      else if (args.length >= 2) {
        start = Math.floor(args[0]); end = Math.floor(args[1]);
        if (args.length > 2) step = Math.floor(args[2]);
      }
      const result: number[] = [];
      if (step > 0) for (let i = start; i < end; i += step) result.push(i);
      else if (step < 0) for (let i = start; i > end; i += step) result.push(i);
      return result;
    }) as BuiltinFunc);
    env.define('bulat', ((args: any[]) => Math.round(args[0])) as BuiltinFunc);
    env.define('lantai', ((args: any[]) => Math.floor(args[0])) as BuiltinFunc);
    env.define('atap', ((args: any[]) => Math.ceil(args[0])) as BuiltinFunc);
    env.define('akar', ((args: any[]) => Math.sqrt(args[0])) as BuiltinFunc);
    env.define('abs', ((args: any[]) => Math.abs(args[0])) as BuiltinFunc);
    env.define('besar', ((args: any[]) => this.formatValue(args[0]).toUpperCase()) as BuiltinFunc);
    env.define('kecil', ((args: any[]) => this.formatValue(args[0]).toLowerCase()) as BuiltinFunc);
    env.define('gabung', ((args: any[]) => args[0].map((x: any) => this.formatValue(x)).join(args[1])) as BuiltinFunc);
    env.define('belah', ((args: any[]) => {
      const s = this.formatValue(args[0]);
      const sep = args.length > 1 ? this.formatValue(args[1]) : ' ';
      return s.split(sep);
    }) as BuiltinFunc);
    env.define('ganti', ((args: any[]) => this.formatValue(args[0]).replaceAll(this.formatValue(args[1]), this.formatValue(args[2]))) as BuiltinFunc);
    env.define('PI', Math.PI, true);
    env.define('E', Math.E, true);
  }

  private toNumber(v: any): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') return parseFloat(v) || 0;
    return 0;
  }

  private isTruthy(v: any): boolean {
    if (v === null || v === undefined) return false;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return v.length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }

  private formatValue(v: any): string {
    if (v === null || v === undefined) return 'kosong';
    if (typeof v === 'boolean') return v ? 'benar' : 'salah';
    if (typeof v === 'number') return Number.isInteger(v) ? v.toString() : v.toString();
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return '[' + v.map((x: any) => this.formatValue(x)).join(', ') + ']';
    if (typeof v === 'object' && v.name) return `<fungsi ${v.name}>`;
    return String(v);
  }

  run(source: string): void {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    this.execute(ast, this.globalEnv);
  }

  private execute(node: ASTNode, env: Environment): any {
    switch (node.kind) {
      case 'block': {
        let result: any = null;
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
          case '/': { const r = this.toNumber(right); if (r === 0) throw new JakartaRuntimeError('Pembagian dengan nol'); return this.toNumber(left) / r; }
          case '%': return this.toNumber(left) % this.toNumber(right);
          case '**': return Math.pow(this.toNumber(left), this.toNumber(right));
          case '==': return left === right;
          case '!=': return left !== right;
          case '<': return this.toNumber(left) < this.toNumber(right);
          case '>': return this.toNumber(left) > this.toNumber(right);
          case '<=': return this.toNumber(left) <= this.toNumber(right);
          case '>=': return this.toNumber(left) >= this.toNumber(right);
          case '..': {
            const result: number[] = [];
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
        console.log(this.formatValue(val));
        return val;
      }

      case 'if': {
        const cond = this.execute(node.condition, env);
        if (this.isTruthy(cond)) return this.execute(node.body, new Environment(env));
        else if (node.elseBody) return this.execute(node.elseBody, new Environment(env));
        return null;
      }

      case 'while': {
        let result: any = null;
        while (this.isTruthy(this.execute(node.condition, env))) {
          try { result = this.execute(node.body, new Environment(env)); }
          catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
        }
        return result;
      }

      case 'for': {
        const iterable = this.execute(node.iterable, env);
        let result: any = null;
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
        const fn: JakartaFunction = { name: node.name, params: node.params, body: node.body, closure: env };
        env.define(node.name, fn);
        return fn;
      }

      case 'return': {
        const val = this.execute(node.value, env);
        throw new ReturnSignal(val);
      }

      case 'functionCall': return this.execCall(node.name, node.args, env);

      case 'list': return node.elements.map((el: ASTNode) => this.execute(el, env));

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

  private execCall(name: string, argNodes: ASTNode[], env: Environment): any {
    const fn = env.get(name);
    const args = argNodes.map((a: ASTNode) => this.execute(a, env));

    if (typeof fn === 'function') return fn(args);

    if (typeof fn === 'object' && fn.body) {
      const funcEnv = new Environment(fn.closure);
      for (let i = 0; i < fn.params.length; i++) {
        funcEnv.define(fn.params[i], i < args.length ? args[i] : null);
      }
      try { return this.execute(fn.body, funcEnv); }
      catch (e) { if (e instanceof ReturnSignal) return e.value; throw e; }
    }

    throw new JakartaRuntimeError(`"${name}" bukan fungsi`);
  }
}

// ============================================================
// EXPORTS
// ============================================================

export { Interpreter, Lexer, Parser };
export type { ASTNode, Token };
