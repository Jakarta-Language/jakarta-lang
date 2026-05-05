use std::collections::HashMap;
use std::env;
use std::fs;
use std::fmt;

// ============================================================
// TOKEN TYPES
// ============================================================

#[derive(Debug, Clone, PartialEq)]
enum TokenType {
    Angka, Teks, Identifier,
    Cetak, Var, Konstan, Fungsi, Kembali,
    Jika, Lain, Selama, Untuk, Dalam,
    Benar, Salah, Kosong,
    Dan, Atau, Bukan,
    Putus, Lanjut,
    Plus, Minus, Star, Slash, Percent, Power,
    Assign, PlusAssign, MinusAssign, StarAssign, SlashAssign,
    Eq, Neq, Lt, Gt, Lte, Gte,
    And, Or, Not,
    Increment, Decrement, Arrow, Dot, Range,
    LParen, RParen, LBrace, RBrace, LBracket, RBracket,
    Comma, Semicolon, Colon, Question,
    Eof,
}

#[derive(Clone)]
struct Token {
    ttype: TokenType,
    value: String,
    line: usize,
    num_val: f64,
}

impl Token {
    fn new(ttype: TokenType, value: &str, line: usize) -> Self {
        let num_val = value.parse::<f64>().unwrap_or(0.0);
        Token { ttype, value: value.to_string(), line, num_val }
    }
}

fn keyword_map() -> HashMap<&'static str, TokenType> {
    let mut m = HashMap::new();
    m.insert("cetak", TokenType::Cetak);
    m.insert("var", TokenType::Var);
    m.insert("konstan", TokenType::Konstan);
    m.insert("fungsi", TokenType::Fungsi);
    m.insert("kembali", TokenType::Kembali);
    m.insert("jika", TokenType::Jika);
    m.insert("lain", TokenType::Lain);
    m.insert("selama", TokenType::Selama);
    m.insert("untuk", TokenType::Untuk);
    m.insert("dalam", TokenType::Dalam);
    m.insert("benar", TokenType::Benar);
    m.insert("salah", TokenType::Salah);
    m.insert("kosong", TokenType::Kosong);
    m.insert("dan", TokenType::Dan);
    m.insert("atau", TokenType::Atau);
    m.insert("bukan", TokenType::Bukan);
    m.insert("putus", TokenType::Putus);
    m.insert("lanjut", TokenType::Lanjut);
    m
}

// ============================================================
// LEXER
// ============================================================

struct Lexer {
    source: Vec<char>,
    pos: usize,
    line: usize,
}

impl Lexer {
    fn new(source: &str) -> Self {
        Lexer { source: source.chars().collect(), pos: 0, line: 1 }
    }

    fn peek(&self) -> char {
        if self.pos < self.source.len() { self.source[self.pos] } else { '\0' }
    }

    fn peek_next(&self) -> char {
        if self.pos + 1 < self.source.len() { self.source[self.pos + 1] } else { '\0' }
    }

    fn advance(&mut self) -> char {
        let ch = self.source[self.pos];
        self.pos += 1;
        if ch == '\n' { self.line += 1; }
        ch
    }

    fn skip_whitespace(&mut self) {
        while self.pos < self.source.len() && [' ', '\t', '\r'].contains(&self.source[self.pos]) {
            self.advance();
        }
    }

    fn skip_comment(&mut self) -> bool {
        if self.peek() == '/' && self.peek_next() == '/' {
            while self.pos < self.source.len() && self.source[self.pos] != '\n' {
                self.advance();
            }
            return true;
        }
        if self.peek() == '/' && self.peek_next() == '*' {
            self.advance(); self.advance();
            while self.pos < self.source.len() {
                if self.peek() == '*' && self.peek_next() == '/' {
                    self.advance(); self.advance(); break;
                }
                self.advance();
            }
            return true;
        }
        false
    }

    fn read_string(&mut self, quote: char) -> String {
        self.advance();
        let mut result = String::new();
        while self.pos < self.source.len() && self.source[self.pos] != quote {
            if self.source[self.pos] == '\\' {
                self.advance();
                let ch = self.advance();
                match ch {
                    'n' => result.push('\n'),
                    't' => result.push('\t'),
                    'r' => result.push('\r'),
                    '\\' => result.push('\\'),
                    '\'' => result.push('\''),
                    '"' => result.push('"'),
                    _ => result.push(ch),
                }
            } else {
                result.push(self.advance());
            }
        }
        if self.pos < self.source.len() { self.advance(); }
        result
    }

    fn read_number(&mut self) -> (f64, String) {
        let mut s = String::new();
        while self.pos < self.source.len() && self.source[self.pos].is_ascii_digit() {
            s.push(self.advance());
        }
        if self.pos < self.source.len() && self.source[self.pos] == '.'
            && self.pos + 1 < self.source.len() && self.source[self.pos + 1].is_ascii_digit() {
            s.push(self.advance());
            while self.pos < self.source.len() && self.source[self.pos].is_ascii_digit() {
                s.push(self.advance());
            }
            (s.parse::<f64>().unwrap(), s)
        } else {
            (s.parse::<i64>().unwrap() as f64, s)
        }
    }

    fn read_identifier(&mut self) -> String {
        let mut s = String::new();
        while self.pos < self.source.len() &&
            (self.source[self.pos].is_alphanumeric() || self.source[self.pos] == '_') {
            s.push(self.advance());
        }
        s
    }

    fn tokenize(&mut self) -> Vec<Token> {
        let keywords = keyword_map();
        let mut tokens = Vec::new();

        while self.pos < self.source.len() {
            self.skip_whitespace();
            if self.pos >= self.source.len() { break; }
            if self.skip_comment() { continue; }
            if self.source[self.pos] == '\n' { self.advance(); continue; }

            let line = self.line;
            let ch = self.peek();

            if ch == '"' || ch == '\'' {
                let val = self.read_string(ch);
                tokens.push(Token::new(TokenType::Teks, &val, line));
                continue;
            }

            if ch.is_ascii_digit() {
                let (num, s) = self.read_number();
                let mut t = Token::new(TokenType::Angka, &s, line);
                t.num_val = num;
                tokens.push(t);
                continue;
            }

            if ch.is_alphabetic() || ch == '_' {
                let val = self.read_identifier();
                let tt = keywords.get(val.as_str()).cloned().unwrap_or(TokenType::Identifier);
                tokens.push(Token::new(tt, &val, line));
                continue;
            }

            let two_char: String = if self.pos + 1 < self.source.len() {
                self.source[self.pos..self.pos+2].iter().collect()
            } else { String::new() };

            let two_ops: HashMap<&str, TokenType> = {
                let mut m = HashMap::new();
                m.insert("**", TokenType::Power); m.insert("==", TokenType::Eq);
                m.insert("!=", TokenType::Neq); m.insert("<=", TokenType::Lte);
                m.insert(">=", TokenType::Gte); m.insert("&&", TokenType::And);
                m.insert("||", TokenType::Or); m.insert("++", TokenType::Increment);
                m.insert("--", TokenType::Decrement); m.insert("=>", TokenType::Arrow);
                m.insert("+=", TokenType::PlusAssign); m.insert("-=", TokenType::MinusAssign);
                m.insert("*=", TokenType::StarAssign); m.insert("/=", TokenType::SlashAssign);
                m.insert("..", TokenType::Range);
                m
            };

            if let Some(tt) = two_ops.get(two_char.as_str()) {
                self.advance(); self.advance();
                tokens.push(Token::new(tt.clone(), &two_char, line));
                continue;
            }

            let single_ops: HashMap<char, TokenType> = {
                let mut m = HashMap::new();
                m.insert('+', TokenType::Plus); m.insert('-', TokenType::Minus);
                m.insert('*', TokenType::Star); m.insert('/', TokenType::Slash);
                m.insert('%', TokenType::Percent); m.insert('=', TokenType::Assign);
                m.insert('<', TokenType::Lt); m.insert('>', TokenType::Gt);
                m.insert('!', TokenType::Not);
                m.insert('(', TokenType::LParen); m.insert(')', TokenType::RParen);
                m.insert('{', TokenType::LBrace); m.insert('}', TokenType::RBrace);
                m.insert('[', TokenType::LBracket); m.insert(']', TokenType::RBracket);
                m.insert(',', TokenType::Comma); m.insert(';', TokenType::Semicolon);
                m.insert(':', TokenType::Colon); m.insert('.', TokenType::Dot);
                m.insert('?', TokenType::Question);
                m
            };

            if let Some(tt) = single_ops.get(&ch) {
                self.advance();
                tokens.push(Token::new(tt.clone(), &ch.to_string(), line));
                continue;
            }

            eprintln!("❌ Karakter tidak dikenali: {:?}", ch);
            std::process::exit(1);
        }

        tokens.push(Token::new(TokenType::Eof, "", self.line));
        tokens
    }
}

// ============================================================
// AST NODES
// ============================================================

#[derive(Clone)]
enum ASTNode {
    Number(f64),
    Str(String),
    Boolean(bool),
    Null,
    Identifier(String),
    BinaryOp { left: Box<ASTNode>, op: String, right: Box<ASTNode> },
    UnaryOp { op: String, operand: Box<ASTNode> },
    Assign { name: String, value: Box<ASTNode> },
    VarDecl { name: String, value: Box<ASTNode>, is_const: bool },
    Print(Box<ASTNode>),
    If { condition: Box<ASTNode>, body: Box<ASTNode>, else_body: Option<Box<ASTNode>> },
    While { condition: Box<ASTNode>, body: Box<ASTNode> },
    For { var_name: String, iterable: Box<ASTNode>, body: Box<ASTNode> },
    FunctionDef { name: String, params: Vec<String>, body: Box<ASTNode> },
    Return(Box<ASTNode>),
    FunctionCall { name: String, args: Vec<ASTNode> },
    Block(Vec<ASTNode>),
    List(Vec<ASTNode>),
    IndexAccess { obj: Box<ASTNode>, index: Box<ASTNode> },
    DotAccess { obj: Box<ASTNode>, attr: String },
    Break,
    Continue,
    Ternary { condition: Box<ASTNode>, true_expr: Box<ASTNode>, false_expr: Box<ASTNode> },
}

// ============================================================
// PARSER
// ============================================================

struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    fn new(tokens: Vec<Token>) -> Self { Parser { tokens, pos: 0 } }

    fn current(&self) -> &Token { &self.tokens[self.pos] }

    fn advance(&mut self) -> Token {
        let t = self.tokens[self.pos].clone();
        self.pos += 1;
        t
    }

    fn expect(&mut self, tt: TokenType) -> Token {
        if self.current().ttype != tt {
            eprintln!("❌ Error di baris {}: Diharapkan {:?}, ditemukan {:?}",
                self.current().line, tt, self.current().ttype);
            std::process::exit(1);
        }
        self.advance()
    }

    fn match_t(&mut self, tt: TokenType) -> Option<Token> {
        if self.current().ttype == tt { Some(self.advance()) } else { None }
    }

    fn parse(&mut self) -> ASTNode {
        let mut stmts = Vec::new();
        while self.current().ttype != TokenType::Eof {
            stmts.push(self.parse_statement());
        }
        ASTNode::Block(stmts)
    }

    fn parse_statement(&mut self) -> ASTNode {
        match self.current().ttype {
            TokenType::Cetak => self.parse_print(),
            TokenType::Var => self.parse_var_decl(false),
            TokenType::Konstan => self.parse_var_decl(true),
            TokenType::Jika => self.parse_if(),
            TokenType::Selama => self.parse_while(),
            TokenType::Untuk => self.parse_for(),
            TokenType::Fungsi => self.parse_function_def(),
            TokenType::Kembali => self.parse_return(),
            TokenType::Putus => { self.advance(); self.match_t(TokenType::Semicolon); ASTNode::Break }
            TokenType::Lanjut => { self.advance(); self.match_t(TokenType::Semicolon); ASTNode::Continue }
            _ => self.parse_expr_statement(),
        }
    }

    fn parse_print(&mut self) -> ASTNode {
        self.advance(); self.expect(TokenType::LParen);
        let val = self.parse_expression();
        self.expect(TokenType::RParen); self.match_t(TokenType::Semicolon);
        ASTNode::Print(Box::new(val))
    }

    fn parse_var_decl(&mut self, is_const: bool) -> ASTNode {
        self.advance();
        let name = self.expect(TokenType::Identifier).value;
        let val = if self.match_t(TokenType::Assign).is_some() {
            self.parse_expression()
        } else { ASTNode::Null };
        self.match_t(TokenType::Semicolon);
        ASTNode::VarDecl { name, value: Box::new(val), is_const }
    }

    fn parse_if(&mut self) -> ASTNode {
        self.advance(); self.expect(TokenType::LParen);
        let cond = self.parse_expression();
        self.expect(TokenType::RParen);
        let body = self.parse_block();
        let else_body = if self.match_t(TokenType::Lain).is_some() {
            if self.current().ttype == TokenType::Jika {
                Some(Box::new(self.parse_if()))
            } else {
                Some(Box::new(self.parse_block()))
            }
        } else { None };
        ASTNode::If { condition: Box::new(cond), body: Box::new(body), else_body }
    }

    fn parse_while(&mut self) -> ASTNode {
        self.advance(); self.expect(TokenType::LParen);
        let cond = self.parse_expression();
        self.expect(TokenType::RParen);
        let body = self.parse_block();
        ASTNode::While { condition: Box::new(cond), body: Box::new(body) }
    }

    fn parse_for(&mut self) -> ASTNode {
        self.advance(); self.expect(TokenType::LParen);
        let var_name = self.expect(TokenType::Identifier).value;
        self.expect(TokenType::Dalam);
        let iterable = self.parse_expression();
        self.expect(TokenType::RParen);
        let body = self.parse_block();
        ASTNode::For { var_name, iterable: Box::new(iterable), body: Box::new(body) }
    }

    fn parse_function_def(&mut self) -> ASTNode {
        self.advance();
        let name = self.expect(TokenType::Identifier).value;
        self.expect(TokenType::LParen);
        let mut params = Vec::new();
        if self.current().ttype != TokenType::RParen {
            params.push(self.expect(TokenType::Identifier).value);
            while self.match_t(TokenType::Comma).is_some() {
                params.push(self.expect(TokenType::Identifier).value);
            }
        }
        self.expect(TokenType::RParen);
        let body = self.parse_block();
        ASTNode::FunctionDef { name, params, body: Box::new(body) }
    }

    fn parse_return(&mut self) -> ASTNode {
        self.advance();
        let val = if self.current().ttype != TokenType::Semicolon && self.current().ttype != TokenType::RBrace {
            self.parse_expression()
        } else { ASTNode::Null };
        self.match_t(TokenType::Semicolon);
        ASTNode::Return(Box::new(val))
    }

    fn parse_block(&mut self) -> ASTNode {
        self.expect(TokenType::LBrace);
        let mut stmts = Vec::new();
        while self.current().ttype != TokenType::RBrace && self.current().ttype != TokenType::Eof {
            stmts.push(self.parse_statement());
        }
        self.expect(TokenType::RBrace);
        ASTNode::Block(stmts)
    }

    fn parse_expr_statement(&mut self) -> ASTNode {
        let expr = self.parse_expression();
        if let ASTNode::Identifier(name) = &expr {
            if self.match_t(TokenType::Assign).is_some() {
                let val = self.parse_expression();
                self.match_t(TokenType::Semicolon);
                return ASTNode::Assign { name: name.clone(), value: Box::new(val) };
            }
            let compound = [(TokenType::PlusAssign, "+"), (TokenType::MinusAssign, "-"),
                (TokenType::StarAssign, "*"), (TokenType::SlashAssign, "/")];
            for (tt, op) in &compound {
                if self.current().ttype == *tt {
                    self.advance();
                    let val = self.parse_expression();
                    self.match_t(TokenType::Semicolon);
                    return ASTNode::Assign {
                        name: name.clone(),
                        value: Box::new(ASTNode::BinaryOp {
                            left: Box::new(ASTNode::Identifier(name.clone())),
                            op: op.to_string(),
                            right: Box::new(val),
                        }),
                    };
                }
            }
        }
        self.match_t(TokenType::Semicolon);
        expr
    }

    fn parse_expression(&mut self) -> ASTNode { self.parse_ternary() }

    fn parse_ternary(&mut self) -> ASTNode {
        let expr = self.parse_or();
        if self.match_t(TokenType::Question).is_some() {
            let true_expr = self.parse_expression();
            self.expect(TokenType::Colon);
            let false_expr = self.parse_expression();
            return ASTNode::Ternary {
                condition: Box::new(expr), true_expr: Box::new(true_expr), false_expr: Box::new(false_expr)
            };
        }
        expr
    }

    fn parse_or(&mut self) -> ASTNode {
        let mut left = self.parse_and();
        while self.current().ttype == TokenType::Atau || self.current().ttype == TokenType::Or {
            let op = self.advance().value;
            let right = self.parse_and();
            left = ASTNode::BinaryOp { left: Box::new(left), op, right: Box::new(right) };
        }
        left
    }

    fn parse_and(&mut self) -> ASTNode {
        let mut left = self.parse_equality();
        while self.current().ttype == TokenType::Dan || self.current().ttype == TokenType::And {
            let op = self.advance().value;
            let right = self.parse_equality();
            left = ASTNode::BinaryOp { left: Box::new(left), op, right: Box::new(right) };
        }
        left
    }

    fn parse_equality(&mut self) -> ASTNode {
        let mut left = self.parse_comparison();
        while self.current().ttype == TokenType::Eq || self.current().ttype == TokenType::Neq {
            let op = self.advance().value;
            let right = self.parse_comparison();
            left = ASTNode::BinaryOp { left: Box::new(left), op, right: Box::new(right) };
        }
        left
    }

    fn parse_comparison(&mut self) -> ASTNode {
        let mut left = self.parse_range_expr();
        while [TokenType::Lt, TokenType::Gt, TokenType::Lte, TokenType::Gte].contains(&self.current().ttype) {
            let op = self.advance().value;
            let right = self.parse_range_expr();
            left = ASTNode::BinaryOp { left: Box::new(left), op, right: Box::new(right) };
        }
        left
    }

    fn parse_range_expr(&mut self) -> ASTNode {
        let left = self.parse_addition();
        if self.current().ttype == TokenType::Range {
            self.advance();
            let right = self.parse_addition();
            return ASTNode::BinaryOp { left: Box::new(left), op: "..".to_string(), right: Box::new(right) };
        }
        left
    }

    fn parse_addition(&mut self) -> ASTNode {
        let mut left = self.parse_multiplication();
        while self.current().ttype == TokenType::Plus || self.current().ttype == TokenType::Minus {
            let op = self.advance().value;
            let right = self.parse_multiplication();
            left = ASTNode::BinaryOp { left: Box::new(left), op, right: Box::new(right) };
        }
        left
    }

    fn parse_multiplication(&mut self) -> ASTNode {
        let mut left = self.parse_power();
        while [TokenType::Star, TokenType::Slash, TokenType::Percent].contains(&self.current().ttype) {
            let op = self.advance().value;
            let right = self.parse_power();
            left = ASTNode::BinaryOp { left: Box::new(left), op, right: Box::new(right) };
        }
        left
    }

    fn parse_power(&mut self) -> ASTNode {
        let left = self.parse_unary();
        if self.current().ttype == TokenType::Power {
            self.advance();
            let right = self.parse_power();
            return ASTNode::BinaryOp { left: Box::new(left), op: "**".to_string(), right: Box::new(right) };
        }
        left
    }

    fn parse_unary(&mut self) -> ASTNode {
        if [TokenType::Minus, TokenType::Not, TokenType::Bukan].contains(&self.current().ttype) {
            let op = self.advance().value;
            let operand = self.parse_unary();
            return ASTNode::UnaryOp { op, operand: Box::new(operand) };
        }
        if [TokenType::Increment, TokenType::Decrement].contains(&self.current().ttype) {
            let op = self.advance().value;
            let operand = self.parse_primary();
            if let ASTNode::Identifier(name) = &operand {
                let base_op = op.chars().next().unwrap().to_string();
                return ASTNode::Assign {
                    name: name.clone(),
                    value: Box::new(ASTNode::BinaryOp {
                        left: Box::new(ASTNode::Identifier(name.clone())),
                        op: base_op,
                        right: Box::new(ASTNode::Number(1.0)),
                    }),
                };
            }
        }
        self.parse_postfix()
    }

    fn parse_postfix(&mut self) -> ASTNode {
        let expr = self.parse_primary();
        if self.current().ttype == TokenType::LParen {
            if let ASTNode::Identifier(name) = &expr {
                self.advance();
                let mut args = Vec::new();
                if self.current().ttype != TokenType::RParen {
                    args.push(self.parse_expression());
                    while self.match_t(TokenType::Comma).is_some() {
                        args.push(self.parse_expression());
                    }
                }
                self.expect(TokenType::RParen);
                return ASTNode::FunctionCall { name: name.clone(), args };
            }
        }
        if self.current().ttype == TokenType::LBracket {
            self.advance();
            let index = self.parse_expression();
            self.expect(TokenType::RBracket);
            return ASTNode::IndexAccess { obj: Box::new(expr), index: Box::new(index) };
        }
        if self.current().ttype == TokenType::Dot {
            self.advance();
            let attr = self.expect(TokenType::Identifier).value;
            return ASTNode::DotAccess { obj: Box::new(expr), attr };
        }
        expr
    }

    fn parse_primary(&mut self) -> ASTNode {
        let t = self.current().clone();
        match t.ttype {
            TokenType::Angka => { self.advance(); ASTNode::Number(t.num_val) }
            TokenType::Teks => { self.advance(); ASTNode::Str(t.value) }
            TokenType::Benar => { self.advance(); ASTNode::Boolean(true) }
            TokenType::Salah => { self.advance(); ASTNode::Boolean(false) }
            TokenType::Kosong => { self.advance(); ASTNode::Null }
            TokenType::Identifier => { self.advance(); ASTNode::Identifier(t.value) }
            TokenType::LParen => {
                self.advance();
                let expr = self.parse_expression();
                self.expect(TokenType::RParen);
                expr
            }
            TokenType::LBracket => {
                self.advance();
                let mut elements = Vec::new();
                if self.current().ttype != TokenType::RBracket {
                    elements.push(self.parse_expression());
                    while self.match_t(TokenType::Comma).is_some() {
                        elements.push(self.parse_expression());
                    }
                }
                self.expect(TokenType::RBracket);
                ASTNode::List(elements)
            }
            _ => {
                eprintln!("❌ Error di baris {}: Ekspresi tidak valid", t.line);
                std::process::exit(1);
            }
        }
    }
}

// ============================================================
// INTERPRETER
// ============================================================

#[derive(Clone)]
struct JakartaFunction {
    name: String,
    params: Vec<String>,
    body: ASTNode,
}

#[derive(Clone)]
enum Value {
    Number(f64),
    Str(String),
    Boolean(bool),
    Null,
    List(Vec<Value>),
    Function(JakartaFunction),
    Builtin(String),
}

impl fmt::Debug for Value {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Value::Number(n) => write!(f, "{}", if n == &n.floor() { format!("{}", *n as i64) } else { format!("{:.6}", n) }),
            Value::Str(s) => write!(f, "{}", s),
            Value::Boolean(b) => write!(f, "{}", if *b { "benar" } else { "salah" }),
            Value::Null => write!(f, "kosong"),
            Value::List(v) => {
                let strs: Vec<String> = v.iter().map(|x| format!("{:?}", x)).collect();
                write!(f, "[{}]", strs.join(", "))
            }
            Value::Function(fn_) => write!(f, "<fungsi {}>", fn_.name),
            Value::Builtin(name) => write!(f, "<fungsi bawaan {}>", name),
        }
    }
}

fn format_value(v: &Value) -> String {
    match v {
        Value::Number(n) => if *n == n.floor() && n.abs() < 1e15 {
            format!("{}", *n as i64)
        } else {
            format!("{}", n)
        },
        Value::Str(s) => s.clone(),
        Value::Boolean(b) => if *b { "benar".to_string() } else { "salah".to_string() },
        Value::Null => "kosong".to_string(),
        Value::List(v) => {
            let strs: Vec<String> = v.iter().map(|x| format_value(x)).collect();
            format!("[{}]", strs.join(", "))
        }
        Value::Function(fn_) => format!("<fungsi {}>", fn_.name),
        Value::Builtin(name) => format!("<fungsi bawaan {}>", name),
    }
}

fn to_f64(v: &Value) -> f64 {
    match v {
        Value::Number(n) => *n,
        Value::Boolean(b) => if *b { 1.0 } else { 0.0 },
        Value::Str(s) => s.parse::<f64>().unwrap_or(0.0),
        _ => 0.0,
    }
}

fn is_truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Boolean(b) => *b,
        Value::Number(n) => *n != 0.0,
        Value::Str(s) => !s.is_empty(),
        Value::List(l) => !l.is_empty(),
        _ => true,
    }
}

struct Environment {
    vars: HashMap<String, Value>,
    consts: HashMap<String, bool>,
    parent: Option<Box<Environment>>,
}

impl Environment {
    fn new() -> Self { Environment { vars: HashMap::new(), consts: HashMap::new(), parent: None } }
    fn with_parent(parent: Environment) -> Self {
        Environment { vars: HashMap::new(), consts: HashMap::new(), parent: Some(Box::new(parent)) }
    }

    fn get(&self, name: &str) -> Option<Value> {
        if let Some(v) = self.vars.get(name) { return Some(v.clone()); }
        if let Some(ref p) = self.parent { return p.get(name); }
        None
    }

    fn set(&mut self, name: &str, value: Value) {
        if self.consts.get(name).copied().unwrap_or(false) {
            eprintln!("❌ Tidak bisa mengubah konstan {:?}", name);
            std::process::exit(1);
        }
        if self.vars.contains_key(name) { self.vars.insert(name.to_string(), value); return; }
        if let Some(ref mut p) = self.parent {
            if p.has(name) { p.set(name, value); return; }
        }
        self.vars.insert(name.to_string(), value);
    }

    fn define(&mut self, name: &str, value: Value, is_const: bool) {
        self.vars.insert(name.to_string(), value);
        if is_const { self.consts.insert(name.to_string(), true); }
    }

    fn has(&self, name: &str) -> bool {
        if self.vars.contains_key(name) { return true; }
        if let Some(ref p) = self.parent { return p.has(name); }
        false
    }
}

struct BreakSignal;
struct ContinueSignal;
struct ReturnSignal(Value);

struct JakartaInterpreter {
    global_env: Environment,
}

impl JakartaInterpreter {
    fn new() -> Self {
        let mut env = Environment::new();
        Self::setup_builtins(&mut env);
        JakartaInterpreter { global_env: env }
    }

    fn setup_builtins(env: &mut Environment) {
        env.define("panjang", Value::Builtin("panjang".into()), false);
        env.define("tipe", Value::Builtin("tipe".into()), false);
        env.define("angka", Value::Builtin("angka".into()), false);
        env.define("teks", Value::Builtin("teks".into()), false);
        env.define("urut", Value::Builtin("urut".into()), false);
        env.define("balik", Value::Builtin("balik".into()), false);
        env.define("rentang", Value::Builtin("rentang".into()), false);
        env.define("bulat", Value::Builtin("bulat".into()), false);
        env.define("lantai", Value::Builtin("lantai".into()), false);
        env.define("atap", Value::Builtin("atap".into()), false);
        env.define("akar", Value::Builtin("akar".into()), false);
        env.define("abs", Value::Builtin("abs".into()), false);
        env.define("besar", Value::Builtin("besar".into()), false);
        env.define("kecil", Value::Builtin("kecil".into()), false);
        env.define("gabung", Value::Builtin("gabung".into()), false);
        env.define("belah", Value::Builtin("belah".into()), false);
        env.define("ganti", Value::Builtin("ganti".into()), false);
        env.define("PI", Value::Number(std::f64::consts::PI), true);
        env.define("E", Value::Number(std::f64::consts::E), true);
    }

    fn call_builtin(&self, name: &str, args: &[Value]) -> Value {
        match name {
            "panjang" => match &args[0] {
                Value::List(l) => Value::Number(l.len() as f64),
                Value::Str(s) => Value::Number(s.len() as f64),
                _ => Value::Number(0.0),
            },
            "tipe" => match &args[0] {
                Value::Number(_) => Value::Str("angka".into()),
                Value::Str(_) => Value::Str("teks".into()),
                Value::Boolean(_) => Value::Str("boolean".into()),
                Value::List(_) => Value::Str("daftar".into()),
                Value::Null => Value::Str("kosong".into()),
                _ => Value::Str("tidak_diketahui".into()),
            },
            "angka" => match &args[0] {
                Value::Str(s) => if s.contains('.') { Value::Number(s.parse::<f64>().unwrap_or(0.0)) }
                    else { Value::Number(s.parse::<i64>().unwrap_or(0) as f64) },
                Value::Number(n) => Value::Number(*n),
                _ => Value::Number(0.0),
            },
            "teks" => Value::Str(format_value(&args[0])),
            "urut" => {
                if let Value::List(l) = &args[0] {
                    let mut sorted = l.clone();
                    sorted.sort_by(|a, b| to_f64(a).partial_cmp(&to_f64(b)).unwrap());
                    Value::List(sorted)
                } else { args[0].clone() }
            },
            "balik" => match &args[0] {
                Value::List(l) => Value::List(l.iter().rev().cloned().collect()),
                Value::Str(s) => Value::Str(s.chars().rev().collect()),
                _ => args[0].clone(),
            },
            "rentang" => {
                let (start, end, step) = if args.len() == 1 {
                    (0, to_f64(&args[0]) as i64, 1)
                } else if args.len() == 2 {
                    (to_f64(&args[0]) as i64, to_f64(&args[1]) as i64, 1)
                } else {
                    (to_f64(&args[0]) as i64, to_f64(&args[1]) as i64, to_f64(&args[2]) as i64)
                };
                let mut result = Vec::new();
                let mut i = start;
                if step > 0 {
                    while i < end { result.push(Value::Number(i as f64)); i += step; }
                } else if step < 0 {
                    while i > end { result.push(Value::Number(i as f64)); i += step; }
                }
                Value::List(result)
            },
            "bulat" => Value::Number(to_f64(&args[0]).round()),
            "lantai" => Value::Number(to_f64(&args[0]).floor()),
            "atap" => Value::Number(to_f64(&args[0]).ceil()),
            "akar" => Value::Number(to_f64(&args[0]).sqrt()),
            "abs" => Value::Number(to_f64(&args[0]).abs()),
            "besar" => Value::Str(format_value(&args[0]).to_uppercase()),
            "kecil" => Value::Str(format_value(&args[0]).to_lowercase()),
            "gabung" => {
                if let Value::List(l) = &args[0] {
                    let sep = format_value(&args[1]);
                    let strs: Vec<String> = l.iter().map(|x| format_value(x)).collect();
                    Value::Str(strs.join(&sep))
                } else { Value::Str(String::new()) }
            },
            "belah" => {
                let s = format_value(&args[0]);
                let sep = if args.len() > 1 { format_value(&args[1]) } else { " ".to_string() };
                Value::List(s.split(&sep).map(|p| Value::Str(p.to_string())).collect())
            },
            "ganti" => {
                let s = format_value(&args[0]);
                let old = format_value(&args[1]);
                let new = format_value(&args[2]);
                Value::Str(s.replace(&old, &new))
            },
            _ => Value::Null,
        }
    }

    fn run(&mut self, source: &str) {
        let mut lexer = Lexer::new(source);
        let tokens = lexer.tokenize();
        let mut parser = Parser::new(tokens);
        let ast = parser.parse();
        self.execute(&ast, &mut self.global_env);
    }

    fn execute(&mut self, node: &ASTNode, env: &mut Environment) -> Value {
        match node {
            ASTNode::Block(stmts) => {
                let mut result = Value::Null;
                for s in stmts { result = self.execute(s, env); }
                result
            }
            ASTNode::Number(n) => Value::Number(*n),
            ASTNode::Str(s) => Value::Str(s.clone()),
            ASTNode::Boolean(b) => Value::Boolean(*b),
            ASTNode::Null => Value::Null,
            ASTNode::Identifier(name) => env.get(name).unwrap_or_else(|| {
                eprintln!("❌ Variabel {:?} tidak ditemukan", name);
                std::process::exit(1);
            }),
            ASTNode::BinaryOp { left, op, right } => self.exec_binary(left, op, right, env),
            ASTNode::UnaryOp { op, operand } => {
                let val = self.execute(operand, env);
                match op.as_str() {
                    "-" => Value::Number(-to_f64(&val)),
                    "!" | "bukan" => Value::Boolean(!is_truthy(&val)),
                    _ => Value::Null,
                }
            }
            ASTNode::Assign { name, value } => {
                let val = self.execute(value, env);
                env.set(name, val.clone());
                val
            }
            ASTNode::VarDecl { name, value, is_const } => {
                let val = self.execute(value, env);
                env.define(name, val.clone(), *is_const);
                val
            }
            ASTNode::Print(val) => {
                let v = self.execute(val, env);
                println!("{}", format_value(&v));
                v
            }
            ASTNode::If { condition, body, else_body } => {
                let cond = self.execute(condition, env);
                if is_truthy(&cond) {
                    let mut child = Environment::with_parent(env.clone());
                    self.execute(body, &mut child)
                } else if let Some(eb) = else_body {
                    let mut child = Environment::with_parent(env.clone());
                    self.execute(eb, &mut child)
                } else { Value::Null }
            }
            ASTNode::While { condition, body } => {
                let mut result = Value::Null;
                loop {
                    let cond = self.execute(condition, env);
                    if !is_truthy(&cond) { break; }
                    let mut child = Environment::with_parent(env.clone());
                    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        self.execute(body, &mut child)
                    })) {
                        Ok(r) => result = r,
                        Err(_) => break,
                    }
                }
                result
            }
            ASTNode::For { var_name, iterable, body } => {
                let iter_val = self.execute(iterable, env);
                let mut result = Value::Null;
                if let Value::List(items) = iter_val {
                    for item in items {
                        let mut child = Environment::with_parent(env.clone());
                        child.define(var_name, item, false);
                        self.execute(body, &mut child);
                    }
                }
                result
            }
            ASTNode::FunctionDef { name, params, body } => {
                let fn_ = JakartaFunction { name: name.clone(), params: params.clone(), body: (**body).clone() };
                env.define(name, Value::Function(fn_), false);
                Value::Null
            }
            ASTNode::Return(val) => {
                let v = self.execute(val, env);
                // In Rust, we use a simple approach - print return value handling
                v
            }
            ASTNode::FunctionCall { name, args } => self.exec_call(name, args, env),
            ASTNode::List(elements) => {
                Value::List(elements.iter().map(|e| self.execute(e, env)).collect())
            }
            ASTNode::IndexAccess { obj, index } => {
                let o = self.execute(obj, env);
                let i = self.execute(index, env);
                match (&o, &i) {
                    (Value::List(l), Value::Number(n)) => l[*n as usize].clone(),
                    (Value::Str(s), Value::Number(n)) => Value::Str(s.chars().nth(*n as usize).unwrap_or('\0').to_string()),
                    _ => Value::Null,
                }
            }
            ASTNode::DotAccess { obj, attr } => {
                let o = self.execute(obj, env);
                if attr == "panjang" {
                    match &o {
                        Value::List(l) => Value::Number(l.len() as f64),
                        Value::Str(s) => Value::Number(s.len() as f64),
                        _ => Value::Number(0.0),
                    }
                } else { Value::Null }
            }
            ASTNode::Break => Value::Null,
            ASTNode::Continue => Value::Null,
            ASTNode::Ternary { condition, true_expr, false_expr } => {
                let cond = self.execute(condition, env);
                if is_truthy(&cond) { self.execute(true_expr, env) }
                else { self.execute(false_expr, env) }
            }
        }
    }

    fn exec_binary(&mut self, left: &ASTNode, op: &str, right: &ASTNode, env: &mut Environment) -> Value {
        let lv = self.execute(left, env);

        if op == "dan" || op == "&&" {
            if !is_truthy(&lv) { return lv; }
            return self.execute(right, env);
        }
        if op == "atau" || op == "||" {
            if is_truthy(&lv) { return lv; }
            return self.execute(right, env);
        }

        let rv = self.execute(right, env);

        match op {
            "+" => match (&lv, &rv) {
                (Value::Str(s), _) => Value::Str(format!("{}{}", s, format_value(&rv))),
                (_, Value::Str(s)) => Value::Str(format!("{}{}", format_value(&lv), s)),
                (Value::List(l), Value::List(r)) => {
                    let mut combined = l.clone();
                    combined.extend(r.iter().cloned());
                    Value::List(combined)
                }
                (Value::List(l), v) => {
                    let mut combined = l.clone();
                    combined.push(v.clone());
                    Value::List(combined)
                }
                _ => Value::Number(to_f64(&lv) + to_f64(&rv)),
            },
            "-" => Value::Number(to_f64(&lv) - to_f64(&rv)),
            "*" => Value::Number(to_f64(&lv) * to_f64(&rv)),
            "/" => {
                let r = to_f64(&rv);
                if r == 0.0 { eprintln!("❌ Pembagian dengan nol"); std::process::exit(1); }
                Value::Number(to_f64(&lv) / r)
            }
            "%" => Value::Number((to_f64(&lv) as i64 % to_f64(&rv) as i64) as f64),
            "**" => Value::Number(to_f64(&lv).powf(to_f64(&rv))),
            "==" => Value::Boolean(format_value(&lv) == format_value(&rv)),
            "!=" => Value::Boolean(format_value(&lv) != format_value(&rv)),
            "<" => Value::Boolean(to_f64(&lv) < to_f64(&rv)),
            ">" => Value::Boolean(to_f64(&lv) > to_f64(&rv)),
            "<=" => Value::Boolean(to_f64(&lv) <= to_f64(&rv)),
            ">=" => Value::Boolean(to_f64(&lv) >= to_f64(&rv)),
            ".." => {
                let s = to_f64(&lv) as i64;
                let e = to_f64(&rv) as i64;
                Value::List((s..=e).map(|i| Value::Number(i as f64)).collect())
            }
            _ => Value::Null,
        }
    }

    fn exec_call(&mut self, name: &str, args: &[ASTNode], env: &mut Environment) -> Value {
        let arg_vals: Vec<Value> = args.iter().map(|a| self.execute(a, env)).collect();

        let fn_val = env.get(name);
        match fn_val {
            Some(Value::Builtin(bname)) => self.call_builtin(&bname, &arg_vals),
            Some(Value::Function(f)) => {
                let mut func_env = Environment::with_parent(
                    env.get("__closure_env__").unwrap_or_else(|| env.clone())
                );
                // Use the closure from the function definition
                for (i, param) in f.params.iter().enumerate() {
                    func_env.define(param, if i < arg_vals.len() { arg_vals[i].clone() } else { Value::Null }, false);
                }
                self.execute(&f.body, &mut func_env)
            }
            Some(_) => { eprintln!("❌ {:?} bukan fungsi", name); std::process::exit(1); }
            None => { eprintln!("❌ Fungsi {:?} tidak ditemukan", name); std::process::exit(1); }
        }
    }
}

// ============================================================
// MAIN
// ============================================================

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("🇮🇩 Jakarta Language Interpreter (Rust) v0.1.0");
        println!("Cara pakai: cargo run -- <file.jkt>");
        return;
    }

    let file_path = &args[1];
    if !file_path.ends_with(".jkt") {
        eprintln!("❌ File harus berekstensi .jkt");
        std::process::exit(1);
    }

    let source = fs::read_to_string(file_path).unwrap_or_else(|_| {
        eprintln!("❌ File {:?} tidak ditemukan", file_path);
        std::process::exit(1);
    });

    let mut interp = JakartaInterpreter::new();
    interp.run(&source);
}