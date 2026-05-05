package main

import (
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"
	"unicode"
)

// ============================================================
// TOKEN TYPES
// ============================================================

type TokenType int

const (
	T_ANGKA TokenType = iota
	T_TEKS
	T_IDENTIFIER
	T_CETAK
	T_VAR
	T_KONSTAN
	T_FUNGSI
	T_KEMBALI
	T_JIKA
	T_LAIN
	T_SELAMA
	T_UNTUK
	T_DALAM
	T_BENAR
	T_SALAH
	T_KOSONG
	T_DAN
	T_ATAU
	T_BUKAN
	T_PUTUS
	T_LANJUT
	T_PLUS
	T_MINUS
	T_STAR
	T_SLASH
	T_PERCENT
	T_POWER
	T_ASSIGN
	T_PLUS_ASSIGN
	T_MINUS_ASSIGN
	T_STAR_ASSIGN
	T_SLASH_ASSIGN
	T_EQ
	T_NEQ
	T_LT
	T_GT
	T_LTE
	T_GTE
	T_AND
	T_OR
	T_NOT
	T_INCREMENT
	T_DECREMENT
	T_ARROW
	T_DOT
	T_RANGE
	T_LPAREN
	T_RPAREN
	T_LBRACE
	T_RBRACE
	T_LBRACKET
	T_RBRACKET
	T_COMMA
	T_SEMICOLON
	T_COLON
	T_QUESTION
	T_EOF
)

type Token struct {
	Type    TokenType
	Value   string
	Line    int
	Column  int
	NumVal  float64
	StrVal  string
	BoolVal bool
}

var keywords = map[string]TokenType{
	"cetak": T_CETAK, "var": T_VAR, "konstan": T_KONSTAN,
	"fungsi": T_FUNGSI, "kembali": T_KEMBALI, "jika": T_JIKA,
	"lain": T_LAIN, "selama": T_SELAMA, "untuk": T_UNTUK,
	"dalam": T_DALAM, "benar": T_BENAR, "salah": T_SALAH,
	"kosong": T_KOSONG, "dan": T_DAN, "atau": T_ATAU,
	"bukan": T_BUKAN, "putus": T_PUTUS, "lanjut": T_LANJUT,
}

// ============================================================
// LEXER
// ============================================================

type Lexer struct {
	source  string
	pos     int
	line    int
	column  int
	tokens  []Token
}

func NewLexer(source string) *Lexer {
	return &Lexer{source: source, pos: 0, line: 1, column: 1}
}

func (l *Lexer) peek() rune {
	if l.pos < len(l.source) {
		return rune(l.source[l.pos])
	}
	return 0
}

func (l *Lexer) peekNext() rune {
	if l.pos+1 < len(l.source) {
		return rune(l.source[l.pos+1])
	}
	return 0
}

func (l *Lexer) advance() rune {
	ch := rune(l.source[l.pos])
	l.pos++
	if ch == '\n' {
		l.line++
		l.column = 1
	} else {
		l.column++
	}
	return ch
}

func (l *Lexer) skipWhitespace() {
	for l.pos < len(l.source) && (l.source[l.pos] == ' ' || l.source[l.pos] == '\t' || l.source[l.pos] == '\r') {
		l.advance()
	}
}

func (l *Lexer) skipComment() bool {
	if l.peek() == '/' && l.peekNext() == '/' {
		for l.pos < len(l.source) && l.source[l.pos] != '\n' {
			l.advance()
		}
		return true
	}
	if l.peek() == '/' && l.peekNext() == '*' {
		l.advance()
		l.advance()
		for l.pos < len(l.source) {
			if l.peek() == '*' && l.peekNext() == '/' {
				l.advance()
				l.advance()
				break
			}
			l.advance()
		}
		return true
	}
	return false
}

func (l *Lexer) readString(quote rune) string {
	l.advance()
	result := ""
	for l.pos < len(l.source) && rune(l.source[l.pos]) != quote {
		if l.source[l.pos] == '\\' {
			l.advance()
			ch := l.advance()
			switch ch {
			case 'n':
				result += "\n"
			case 't':
				result += "\t"
			case 'r':
				result += "\r"
			case '\\':
				result += "\\"
			case '\'':
				result += "'"
			case '"':
				result += "\""
			default:
				result += string(ch)
			}
		} else {
			result += string(l.advance())
		}
	}
	if l.pos < len(l.source) {
		l.advance()
	}
	return result
}

func (l *Lexer) readNumber() (float64, bool) {
	start := l.pos
	isFloat := false
	for l.pos < len(l.source) && (unicode.IsDigit(rune(l.source[l.pos])) || l.source[l.pos] == '.') {
		if l.source[l.pos] == '.' {
			if l.pos+1 < len(l.source) && unicode.IsDigit(rune(l.source[l.pos+1])) {
				isFloat = true
			} else {
				break
			}
		}
		l.advance()
	}
	numStr := l.source[start:l.pos]
	val, _ := strconv.ParseFloat(numStr, 64)
	return val, isFloat
}

func (l *Lexer) readIdentifier() string {
	start := l.pos
	for l.pos < len(l.source) && (unicode.IsDigit(rune(l.source[l.pos])) || unicode.IsLetter(rune(l.source[l.pos])) || l.source[l.pos] == '_') {
		l.advance()
	}
	return l.source[start:l.pos]
}

func (l *Lexer) Tokenize() []Token {
	for l.pos < len(l.source) {
		l.skipWhitespace()
		if l.pos >= len(l.source) {
			break
		}
		if l.skipComment() {
			continue
		}
		if l.source[l.pos] == '\n' {
			l.advance()
			continue
		}

		line, col := l.line, l.column
		ch := l.peek()

		if ch == '"' || ch == '\'' {
			val := l.readString(ch)
			l.tokens = append(l.tokens, Token{Type: T_TEKS, Value: val, Line: line, Column: col, StrVal: val})
			continue
		}

		if unicode.IsDigit(ch) {
			numVal, isFloat := l.readNumber()
			numStr := ""
			if isFloat {
				numStr = fmt.Sprintf("%g", numVal)
			} else {
				numStr = fmt.Sprintf("%d", int(numVal))
			}
			l.tokens = append(l.tokens, Token{Type: T_ANGKA, Value: numStr, Line: line, Column: col, NumVal: numVal})
			continue
		}

		if unicode.IsLetter(ch) || ch == '_' {
			val := l.readIdentifier()
			if tt, ok := keywords[val]; ok {
				l.tokens = append(l.tokens, Token{Type: tt, Value: val, Line: line, Column: col})
			} else {
				l.tokens = append(l.tokens, Token{Type: T_IDENTIFIER, Value: val, Line: line, Column: col})
			}
			continue
		}

		twoChar := ""
		if l.pos+1 < len(l.source) {
			twoChar = l.source[l.pos : l.pos+2]
		}
		twoCharOps := map[string]TokenType{
			"**": T_POWER, "==": T_EQ, "!=": T_NEQ, "<=": T_LTE, ">=": T_GTE,
			"&&": T_AND, "||": T_OR, "++": T_INCREMENT, "--": T_DECREMENT,
			"=>": T_ARROW, "+=": T_PLUS_ASSIGN, "-=": T_MINUS_ASSIGN,
			"*=": T_STAR_ASSIGN, "/=": T_SLASH_ASSIGN, "..": T_RANGE,
		}
		if tt, ok := twoCharOps[twoChar]; ok {
			l.advance()
			l.advance()
			l.tokens = append(l.tokens, Token{Type: tt, Value: twoChar, Line: line, Column: col})
			continue
		}

		singleOps := map[rune]TokenType{
			'+': T_PLUS, '-': T_MINUS, '*': T_STAR, '/': T_SLASH, '%': T_PERCENT,
			'=': T_ASSIGN, '<': T_LT, '>': T_GT, '!': T_NOT,
			'(': T_LPAREN, ')': T_RPAREN, '{': T_LBRACE, '}': T_RBRACE,
			'[': T_LBRACKET, ']': T_RBRACKET, ',': T_COMMA, ';': T_SEMICOLON,
			':': T_COLON, '.': T_DOT, '?': T_QUESTION,
		}
		if tt, ok := singleOps[ch]; ok {
			l.advance()
			l.tokens = append(l.tokens, Token{Type: tt, Value: string(ch), Line: line, Column: col})
			continue
		}

		fmt.Printf("❌ Karakter tidak dikenali: %q\n", ch)
		os.Exit(1)
	}

	l.tokens = append(l.tokens, Token{Type: T_EOF, Value: "", Line: l.line, Column: l.column})
	return l.tokens
}

// ============================================================
// AST NODES
// ============================================================

type ASTNode interface {
	nodeType() string
}

type NumberNode struct{ Value float64 }
type StringNode struct{ Value string }
type BooleanNode struct{ Value bool }
type NullNode struct{}
type IdentifierNode struct{ Name string }
type BinaryOpNode struct{ Left ASTNode; Op string; Right ASTNode }
type UnaryOpNode struct{ Op string; Operand ASTNode }
type AssignNode struct{ Name string; Value ASTNode }
type VarDeclNode struct{ Name string; Value ASTNode; IsConst bool }
type PrintNode struct{ Value ASTNode }
type IfNode struct{ Condition ASTNode; Body ASTNode; ElseBody ASTNode }
type WhileNode struct{ Condition ASTNode; Body ASTNode }
type ForNode struct{ VarName string; Iterable ASTNode; Body ASTNode }
type FunctionDefNode struct{ Name string; Params []string; Body ASTNode }
type ReturnNode struct{ Value ASTNode }
type FunctionCallNode struct{ Name string; Args []ASTNode }
type BlockNode struct{ Statements []ASTNode }
type ListNode struct{ Elements []ASTNode }
type IndexAccessNode struct{ Obj ASTNode; Index ASTNode }
type DotAccessNode struct{ Obj ASTNode; Attr string }
type BreakNode struct{}
type ContinueNode struct{}
type TernaryNode struct{ Condition ASTNode; TrueExpr ASTNode; FalseExpr ASTNode }

func (n *NumberNode) nodeType() string      { return "NumberNode" }
func (n *StringNode) nodeType() string      { return "StringNode" }
func (n *BooleanNode) nodeType() string     { return "BooleanNode" }
func (n *NullNode) nodeType() string        { return "NullNode" }
func (n *IdentifierNode) nodeType() string  { return "IdentifierNode" }
func (n *BinaryOpNode) nodeType() string    { return "BinaryOpNode" }
func (n *UnaryOpNode) nodeType() string     { return "UnaryOpNode" }
func (n *AssignNode) nodeType() string      { return "AssignNode" }
func (n *VarDeclNode) nodeType() string     { return "VarDeclNode" }
func (n *PrintNode) nodeType() string       { return "PrintNode" }
func (n *IfNode) nodeType() string          { return "IfNode" }
func (n *WhileNode) nodeType() string       { return "WhileNode" }
func (n *ForNode) nodeType() string         { return "ForNode" }
func (n *FunctionDefNode) nodeType() string { return "FunctionDefNode" }
func (n *ReturnNode) nodeType() string      { return "ReturnNode" }
func (n *FunctionCallNode) nodeType() string { return "FunctionCallNode" }
func (n *BlockNode) nodeType() string       { return "BlockNode" }
func (n *ListNode) nodeType() string        { return "ListNode" }
func (n *IndexAccessNode) nodeType() string { return "IndexAccessNode" }
func (n *DotAccessNode) nodeType() string   { return "DotAccessNode" }
func (n *BreakNode) nodeType() string       { return "BreakNode" }
func (n *ContinueNode) nodeType() string    { return "ContinueNode" }
func (n *TernaryNode) nodeType() string     { return "TernaryNode" }

// ============================================================
// PARSER
// ============================================================

type Parser struct {
	tokens []Token
	pos    int
}

func NewParser(tokens []Token) *Parser {
	return &Parser{tokens: tokens, pos: 0}
}

func (p *Parser) current() Token {
	return p.tokens[p.pos]
}

func (p *Parser) advance() Token {
	t := p.tokens[p.pos]
	p.pos++
	return t
}

func (p *Parser) expect(tt TokenType) Token {
	if p.current().Type != tt {
		fmt.Printf("❌ Error di baris %d: Diharapkan %d, ditemukan %d (%s)\n", p.current().Line, tt, p.current().Type, p.current().Value)
		os.Exit(1)
	}
	return p.advance()
}

func (p *Parser) match(tt TokenType) *Token {
	if p.current().Type == tt {
		t := p.advance()
		return &t
	}
	return nil
}

func (p *Parser) Parse() ASTNode {
	stmts := []ASTNode{}
	for p.current().Type != T_EOF {
		if s := p.parseStatement(); s != nil {
			stmts = append(stmts, s)
		}
	}
	return &BlockNode{Statements: stmts}
}

func (p *Parser) parseStatement() ASTNode {
	t := p.current()
	switch t.Type {
	case T_CETAK:
		return p.parsePrint()
	case T_VAR:
		return p.parseVarDecl(false)
	case T_KONSTAN:
		return p.parseVarDecl(true)
	case T_JIKA:
		return p.parseIf()
	case T_SELAMA:
		return p.parseWhile()
	case T_UNTUK:
		return p.parseFor()
	case T_FUNGSI:
		return p.parseFunctionDef()
	case T_KEMBALI:
		return p.parseReturn()
	case T_PUTUS:
		p.advance()
		p.match(T_SEMICOLON)
		return &BreakNode{}
	case T_LANJUT:
		p.advance()
		p.match(T_SEMICOLON)
		return &ContinueNode{}
	default:
		return p.parseExprStatement()
	}
}

func (p *Parser) parsePrint() ASTNode {
	p.advance()
	p.expect(T_LPAREN)
	val := p.parseExpression()
	p.expect(T_RPAREN)
	p.match(T_SEMICOLON)
	return &PrintNode{Value: val}
}

func (p *Parser) parseVarDecl(isConst bool) ASTNode {
	p.advance()
	name := p.expect(T_IDENTIFIER).Value
	var val ASTNode = &NullNode{}
	if p.match(T_ASSIGN) != nil {
		val = p.parseExpression()
	}
	p.match(T_SEMICOLON)
	return &VarDeclNode{Name: name, Value: val, IsConst: isConst}
}

func (p *Parser) parseIf() ASTNode {
	p.advance()
	p.expect(T_LPAREN)
	cond := p.parseExpression()
	p.expect(T_RPAREN)
	body := p.parseBlock()
	var elseBody ASTNode = nil
	if p.match(T_LAIN) != nil {
		if p.current().Type == T_JIKA {
			elseBody = &BlockNode{Statements: []ASTNode{p.parseIf()}}
		} else {
			elseBody = p.parseBlock()
		}
	}
	return &IfNode{Condition: cond, Body: body, ElseBody: elseBody}
}

func (p *Parser) parseWhile() ASTNode {
	p.advance()
	p.expect(T_LPAREN)
	cond := p.parseExpression()
	p.expect(T_RPAREN)
	body := p.parseBlock()
	return &WhileNode{Condition: cond, Body: body}
}

func (p *Parser) parseFor() ASTNode {
	p.advance()
	p.expect(T_LPAREN)
	varName := p.expect(T_IDENTIFIER).Value
	p.expect(T_DALAM)
	iterable := p.parseExpression()
	p.expect(T_RPAREN)
	body := p.parseBlock()
	return &ForNode{VarName: varName, Iterable: iterable, Body: body}
}

func (p *Parser) parseFunctionDef() ASTNode {
	p.advance()
	name := p.expect(T_IDENTIFIER).Value
	p.expect(T_LPAREN)
	params := []string{}
	if p.current().Type != T_RPAREN {
		params = append(params, p.expect(T_IDENTIFIER).Value)
		for p.match(T_COMMA) != nil {
			params = append(params, p.expect(T_IDENTIFIER).Value)
		}
	}
	p.expect(T_RPAREN)
	body := p.parseBlock()
	return &FunctionDefNode{Name: name, Params: params, Body: body}
}

func (p *Parser) parseReturn() ASTNode {
	p.advance()
	var val ASTNode = &NullNode{}
	if p.current().Type != T_SEMICOLON && p.current().Type != T_RBRACE {
		val = p.parseExpression()
	}
	p.match(T_SEMICOLON)
	return &ReturnNode{Value: val}
}

func (p *Parser) parseBlock() ASTNode {
	p.expect(T_LBRACE)
	stmts := []ASTNode{}
	for p.current().Type != T_RBRACE && p.current().Type != T_EOF {
		if s := p.parseStatement(); s != nil {
			stmts = append(stmts, s)
		}
	}
	p.expect(T_RBRACE)
	return &BlockNode{Statements: stmts}
}

func (p *Parser) parseExprStatement() ASTNode {
	expr := p.parseExpression()
	if id, ok := expr.(*IdentifierNode); ok {
		if p.match(T_ASSIGN) != nil {
			val := p.parseExpression()
			p.match(T_SEMICOLON)
			return &AssignNode{Name: id.Name, Value: val}
		}
		compoundOps := map[TokenType]string{T_PLUS_ASSIGN: "+", T_MINUS_ASSIGN: "-", T_STAR_ASSIGN: "*", T_SLASH_ASSIGN: "/"}
		for tt, op := range compoundOps {
			if p.current().Type == tt {
				p.advance()
				val := p.parseExpression()
				p.match(T_SEMICOLON)
				return &AssignNode{Name: id.Name, Value: &BinaryOpNode{Left: &IdentifierNode{Name: id.Name}, Op: op, Right: val}}
			}
		}
	}
	p.match(T_SEMICOLON)
	return expr
}

func (p *Parser) parseExpression() ASTNode {
	return p.parseTernary()
}

func (p *Parser) parseTernary() ASTNode {
	expr := p.parseOr()
	if p.match(T_QUESTION) != nil {
		trueExpr := p.parseExpression()
		p.expect(T_COLON)
		falseExpr := p.parseExpression()
		return &TernaryNode{Condition: expr, TrueExpr: trueExpr, FalseExpr: falseExpr}
	}
	return expr
}

func (p *Parser) parseOr() ASTNode {
	left := p.parseAnd()
	for p.current().Type == T_ATAU || p.current().Type == T_OR {
		op := p.advance().Value
		right := p.parseAnd()
		left = &BinaryOpNode{Left: left, Op: op, Right: right}
	}
	return left
}

func (p *Parser) parseAnd() ASTNode {
	left := p.parseEquality()
	for p.current().Type == T_DAN || p.current().Type == T_AND {
		op := p.advance().Value
		right := p.parseEquality()
		left = &BinaryOpNode{Left: left, Op: op, Right: right}
	}
	return left
}

func (p *Parser) parseEquality() ASTNode {
	left := p.parseComparison()
	for p.current().Type == T_EQ || p.current().Type == T_NEQ {
		op := p.advance().Value
		right := p.parseComparison()
		left = &BinaryOpNode{Left: left, Op: op, Right: right}
	}
	return left
}

func (p *Parser) parseComparison() ASTNode {
	left := p.parseRange()
	for p.current().Type == T_LT || p.current().Type == T_GT || p.current().Type == T_LTE || p.current().Type == T_GTE {
		op := p.advance().Value
		right := p.parseRange()
		left = &BinaryOpNode{Left: left, Op: op, Right: right}
	}
	return left
}

func (p *Parser) parseRange() ASTNode {
	left := p.parseAddition()
	if p.current().Type == T_RANGE {
		p.advance()
		right := p.parseAddition()
		left = &BinaryOpNode{Left: left, Op: "..", Right: right}
	}
	return left
}

func (p *Parser) parseAddition() ASTNode {
	left := p.parseMultiplication()
	for p.current().Type == T_PLUS || p.current().Type == T_MINUS {
		op := p.advance().Value
		right := p.parseMultiplication()
		left = &BinaryOpNode{Left: left, Op: op, Right: right}
	}
	return left
}

func (p *Parser) parseMultiplication() ASTNode {
	left := p.parsePower()
	for p.current().Type == T_STAR || p.current().Type == T_SLASH || p.current().Type == T_PERCENT {
		op := p.advance().Value
		right := p.parsePower()
		left = &BinaryOpNode{Left: left, Op: op, Right: right}
	}
	return left
}

func (p *Parser) parsePower() ASTNode {
	left := p.parseUnary()
	if p.current().Type == T_POWER {
		p.advance()
		right := p.parsePower()
		left = &BinaryOpNode{Left: left, Op: "**", Right: right}
	}
	return left
}

func (p *Parser) parseUnary() ASTNode {
	if p.current().Type == T_MINUS || p.current().Type == T_NOT || p.current().Type == T_BUKAN {
		op := p.advance().Value
		operand := p.parseUnary()
		return &UnaryOpNode{Op: op, Operand: operand}
	}
	if p.current().Type == T_INCREMENT || p.current().Type == T_DECREMENT {
		op := p.advance().Value
		operand := p.parsePrimary()
		if id, ok := operand.(*IdentifierNode); ok {
			baseOp := string(op[0])
			return &AssignNode{Name: id.Name, Value: &BinaryOpNode{Left: &IdentifierNode{Name: id.Name}, Op: baseOp, Right: &NumberNode{Value: 1}}}
		}
	}
	return p.parsePostfix()
}

func (p *Parser) parsePostfix() ASTNode {
	expr := p.parsePrimary()
	if p.current().Type == T_LPAREN {
		if id, ok := expr.(*IdentifierNode); ok {
			p.advance()
			args := []ASTNode{}
			if p.current().Type != T_RPAREN {
				args = append(args, p.parseExpression())
				for p.match(T_COMMA) != nil {
					args = append(args, p.parseExpression())
				}
			}
			p.expect(T_RPAREN)
			return &FunctionCallNode{Name: id.Name, Args: args}
		}
	}
	if p.current().Type == T_LBRACKET {
		p.advance()
		index := p.parseExpression()
		p.expect(T_RBRACKET)
		return &IndexAccessNode{Obj: expr, Index: index}
	}
	if p.current().Type == T_DOT {
		p.advance()
		attr := p.expect(T_IDENTIFIER).Value
		return &DotAccessNode{Obj: expr, Attr: attr}
	}
	return expr
}

func (p *Parser) parsePrimary() ASTNode {
	t := p.current()
	switch t.Type {
	case T_ANGKA:
		p.advance()
		return &NumberNode{Value: t.NumVal}
	case T_TEKS:
		p.advance()
		return &StringNode{Value: t.StrVal}
	case T_BENAR:
		p.advance()
		return &BooleanNode{Value: true}
	case T_SALAH:
		p.advance()
		return &BooleanNode{Value: false}
	case T_KOSONG:
		p.advance()
		return &NullNode{}
	case T_IDENTIFIER:
		p.advance()
		return &IdentifierNode{Name: t.Value}
	case T_LPAREN:
		p.advance()
		expr := p.parseExpression()
		p.expect(T_RPAREN)
		return expr
	case T_LBRACKET:
		p.advance()
		elements := []ASTNode{}
		if p.current().Type != T_RBRACKET {
			elements = append(elements, p.parseExpression())
			for p.match(T_COMMA) != nil {
				elements = append(elements, p.parseExpression())
			}
		}
		p.expect(T_RBRACKET)
		return &ListNode{Elements: elements}
	default:
		fmt.Printf("❌ Error di baris %d: Ekspresi tidak valid (%s)\n", t.Line, t.Value)
		os.Exit(1)
		return nil
	}
}

// ============================================================
// INTERPRETER
// ============================================================

type BreakSignal struct{}
type ContinueSignal struct{}
type ReturnSignal struct{ Value interface{} }

type Function struct {
	Name    string
	Params  []string
	Body    ASTNode
	Closure *Environment
}

type BuiltinFunc func(args []interface{}) interface{}

type Environment struct {
	vars   map[string]interface{}
	consts map[string]bool
	parent *Environment
}

func NewEnvironment(parent *Environment) *Environment {
	return &Environment{
		vars:   make(map[string]interface{}),
		consts: make(map[string]bool),
		parent: parent,
	}
}

func (e *Environment) Get(name string) (interface{}, bool) {
	if v, ok := e.vars[name]; ok {
		return v, true
	}
	if e.parent != nil {
		return e.parent.Get(name)
	}
	return nil, false
}

func (e *Environment) Set(name string, value interface{}) {
	if e.consts[name] {
		fmt.Printf("❌ Tidak bisa mengubah konstan %q\n", name)
		os.Exit(1)
	}
	if _, ok := e.vars[name]; ok {
		e.vars[name] = value
		return
	}
	if e.parent != nil && e.parent.Has(name) {
		e.parent.Set(name, value)
		return
	}
	e.vars[name] = value
}

func (e *Environment) Define(name string, value interface{}, isConst bool) {
	e.vars[name] = value
	if isConst {
		e.consts[name] = true
	}
}

func (e *Environment) Has(name string) bool {
	if _, ok := e.vars[name]; ok {
		return true
	}
	if e.parent != nil {
		return e.parent.Has(name)
	}
	return false
}

type Interpreter struct {
	globalEnv *Environment
}

func NewInterpreter() *Interpreter {
	i := &Interpreter{globalEnv: NewEnvironment(nil)}
	i.setupBuiltins()
	return i
}

func (i *Interpreter) setupBuiltins() {
	i.globalEnv.Define("panjang", BuiltinFunc(func(args []interface{}) interface{} {
		switch v := args[0].(type) {
		case []interface{}:
			return float64(len(v))
		case string:
			return float64(len(v))
		}
		return float64(0)
	}), false)

	i.globalEnv.Define("tipe", BuiltinFunc(func(args []interface{}) interface{} {
		switch args[0].(type) {
		case float64:
			return "angka"
		case string:
			return "teks"
		case bool:
			return "boolean"
		case []interface{}:
			return "daftar"
		case nil:
			return "kosong"
		}
		return "tidak_diketahui"
	}), false)

	i.globalEnv.Define("angka", BuiltinFunc(func(args []interface{}) interface{} {
		switch v := args[0].(type) {
		case string:
			if strings.Contains(v, ".") {
				f, _ := strconv.ParseFloat(v, 64)
				return f
			}
			n, _ := strconv.Atoi(v)
			return float64(n)
		case float64:
			return v
		}
		return float64(0)
	}), false)

	i.globalEnv.Define("teks", BuiltinFunc(func(args []interface{}) interface{} {
		return formatValue(args[0])
	}), false)

	i.globalEnv.Define("urut", BuiltinFunc(func(args []interface{}) interface{} {
		list := args[0].([]interface{})
		sorted := make([]interface{}, len(list))
		copy(sorted, list)
		for j := 0; j < len(sorted)-1; j++ {
			for k := 0; k < len(sorted)-j-1; k++ {
				if toFloat(sorted[k]) > toFloat(sorted[k+1]) {
					sorted[k], sorted[k+1] = sorted[k+1], sorted[k]
				}
			}
		}
		return sorted
	}), false)

	i.globalEnv.Define("balik", BuiltinFunc(func(args []interface{}) interface{} {
		switch v := args[0].(type) {
		case []interface{}:
			result := make([]interface{}, len(v))
			for j := range v {
				result[j] = v[len(v)-1-j]
			}
			return result
		case string:
			runes := []rune(v)
			for j, k := 0, len(runes)-1; j < k; j, k = j+1, k-1 {
				runes[j], runes[k] = runes[k], runes[j]
			}
			return string(runes)
		}
		return args[0]
	}), false)

	i.globalEnv.Define("rentang", BuiltinFunc(func(args []interface{}) interface{} {
		start := int(toFloat(args[0]))
		var end, step int
		if len(args) > 1 {
			end = int(toFloat(args[1]))
		} else {
			end = start
			start = 0
		}
		if len(args) > 2 {
			step = int(toFloat(args[2]))
		} else {
			step = 1
		}
		result := []interface{}{}
		if step > 0 {
			for j := start; j < end; j += step {
				result = append(result, float64(j))
			}
		} else if step < 0 {
			for j := start; j > end; j += step {
				result = append(result, float64(j))
			}
		}
		return result
	}), false)

	i.globalEnv.Define("bulat", BuiltinFunc(func(args []interface{}) interface{} {
		return float64(int(math.Round(toFloat(args[0]))))
	}), false)

	i.globalEnv.Define("lantai", BuiltinFunc(func(args []interface{}) interface{} {
		return float64(int(math.Floor(toFloat(args[0]))))
	}), false)

	i.globalEnv.Define("atap", BuiltinFunc(func(args []interface{}) interface{} {
		return float64(int(math.Ceil(toFloat(args[0]))))
	}), false)

	i.globalEnv.Define("akar", BuiltinFunc(func(args []interface{}) interface{} {
		return math.Sqrt(toFloat(args[0]))
	}), false)

	i.globalEnv.Define("abs", BuiltinFunc(func(args []interface{}) interface{} {
		return math.Abs(toFloat(args[0]))
	}), false)

	i.globalEnv.Define("besar", BuiltinFunc(func(args []interface{}) interface{} {
		return strings.ToUpper(fmt.Sprintf("%v", args[0]))
	}), false)

	i.globalEnv.Define("kecil", BuiltinFunc(func(args []interface{}) interface{} {
		return strings.ToLower(fmt.Sprintf("%v", args[0]))
	}), false)

	i.globalEnv.Define("gabung", BuiltinFunc(func(args []interface{}) interface{} {
		list := args[0].([]interface{})
		sep := fmt.Sprintf("%v", args[1])
		strs := make([]string, len(list))
		for j, v := range list {
			strs[j] = formatValue(v)
		}
		return strings.Join(strs, sep)
	}), false)

	i.globalEnv.Define("belah", BuiltinFunc(func(args []interface{}) interface{} {
		s := fmt.Sprintf("%v", args[0])
		sep := " "
		if len(args) > 1 {
			sep = fmt.Sprintf("%v", args[1])
		}
		parts := strings.Split(s, sep)
		result := make([]interface{}, len(parts))
		for j, p := range parts {
			result[j] = p
		}
		return result
	}), false)

	i.globalEnv.Define("ganti", BuiltinFunc(func(args []interface{}) interface{} {
		s := fmt.Sprintf("%v", args[0])
		old := fmt.Sprintf("%v", args[1])
		new_ := fmt.Sprintf("%v", args[2])
		return strings.ReplaceAll(s, old, new_)
	}), false)

	i.globalEnv.Define("PI", math.Pi, true)
	i.globalEnv.Define("E", math.E, true)
}

func toFloat(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case int:
		return float64(val)
	case bool:
		if val {
			return 1
		}
		return 0
	case string:
		f, _ := strconv.ParseFloat(val, 64)
		return f
	}
	return 0
}

func isTruthy(v interface{}) bool {
	switch val := v.(type) {
	case nil:
		return false
	case bool:
		return val
	case float64:
		return val != 0
	case string:
		return len(val) > 0
	case []interface{}:
		return len(val) > 0
	}
	return true
}

func formatValue(v interface{}) string {
	switch val := v.(type) {
	case nil:
		return "kosong"
	case bool:
		if val {
			return "benar"
		}
		return "salah"
	case float64:
		if val == float64(int(val)) {
			return fmt.Sprintf("%d", int(val))
		}
		return fmt.Sprintf("%g", val)
	case string:
		return val
	case []interface{}:
		strs := make([]string, len(val))
		for i, v := range val {
			strs[i] = formatValue(v)
		}
		return "[" + strings.Join(strs, ", ") + "]"
	case *Function:
		return fmt.Sprintf("<fungsi %s>", val.Name)
	case BuiltinFunc:
		return "<fungsi bawaan>"
	}
	return fmt.Sprintf("%v", v)
}

func (interp *Interpreter) Run(source string) {
	lexer := NewLexer(source)
	tokens := lexer.Tokenize()
	parser := NewParser(tokens)
	ast := parser.Parse()
	defer func() {
		if r := recover(); r != nil {
			switch v := r.(type) {
			case BreakSignal:
			case ContinueSignal:
			case ReturnSignal:
			case error:
				fmt.Printf("❌ Error: %v\n", v)
			default:
				fmt.Printf("❌ Error: %v\n", v)
			}
		}
	}()
	interp.Execute(ast, interp.globalEnv)
}

func (interp *Interpreter) Execute(node ASTNode, env *Environment) interface{} {
	switch n := node.(type) {
	case *BlockNode:
		var result interface{}
		for _, stmt := range n.Statements {
			result = interp.Execute(stmt, env)
		}
		return result
	case *NumberNode:
		return n.Value
	case *StringNode:
		return n.Value
	case *BooleanNode:
		return n.Value
	case *NullNode:
		return nil
	case *IdentifierNode:
		if v, ok := env.Get(n.Name); ok {
			return v
		}
		fmt.Printf("❌ Variabel %q tidak ditemukan\n", n.Name)
		os.Exit(1)
		return nil
	case *BinaryOpNode:
		return interp.execBinaryOp(n, env)
	case *UnaryOpNode:
		operand := interp.Execute(n.Operand, env)
		if n.Op == "-" {
			return -toFloat(operand)
		}
		if n.Op == "!" || n.Op == "bukan" {
			return !isTruthy(operand)
		}
	case *AssignNode:
		val := interp.Execute(n.Value, env)
		env.Set(n.Name, val)
		return val
	case *VarDeclNode:
		val := interp.Execute(n.Value, env)
		env.Define(n.Name, val, n.IsConst)
		return val
	case *PrintNode:
		val := interp.Execute(n.Value, env)
		fmt.Println(formatValue(val))
		return val
	case *IfNode:
		cond := interp.Execute(n.Condition, env)
		if isTruthy(cond) {
			return interp.Execute(n.Body, NewEnvironment(env))
		} else if n.ElseBody != nil {
			return interp.Execute(n.ElseBody, NewEnvironment(env))
		}
	case *WhileNode:
		var result interface{}
		for isTruthy(interp.Execute(n.Condition, env)) {
			func() {
				defer func() {
					if r := recover(); r != nil {
						switch r.(type) {
						case BreakSignal:
							panic(r)
						case ContinueSignal:
						default:
							panic(r)
						}
					}
				}()
				result = interp.Execute(n.Body, NewEnvironment(env))
			}()
		}
		return result
	case *ForNode:
		iterable := interp.Execute(n.Iterable, env)
		var result interface{}
		switch it := iterable.(type) {
		case []interface{}:
			for _, item := range it {
				func() {
					defer func() {
						if r := recover(); r != nil {
							switch r.(type) {
							case BreakSignal:
								panic(r)
							case ContinueSignal:
							default:
								panic(r)
							}
						}
					}()
					loopEnv := NewEnvironment(env)
					loopEnv.Define(n.VarName, item, false)
					result = interp.Execute(n.Body, loopEnv)
				}()
			}
		}
		return result
	case *FunctionDefNode:
		fn := &Function{Name: n.Name, Params: n.Params, Body: n.Body, Closure: env}
		env.Define(n.Name, fn, false)
		return fn
	case *ReturnNode:
		val := interp.Execute(n.Value, env)
		panic(ReturnSignal{Value: val})
	case *FunctionCallNode:
		return interp.execFunctionCall(n, env)
	case *ListNode:
		result := make([]interface{}, len(n.Elements))
		for i, el := range n.Elements {
			result[i] = interp.Execute(el, env)
		}
		return result
	case *IndexAccessNode:
		obj := interp.Execute(n.Obj, env)
		index := interp.Execute(n.Index, env)
		switch o := obj.(type) {
		case []interface{}:
			return o[int(toFloat(index))]
		case string:
			return string([]rune(o)[int(toFloat(index))])
		}
	case *DotAccessNode:
		obj := interp.Execute(n.Obj, env)
		if n.Attr == "panjang" {
			switch o := obj.(type) {
			case []interface{}:
				return float64(len(o))
			case string:
				return float64(len(o))
			}
		}
	case *BreakNode:
		panic(BreakSignal{})
	case *ContinueNode:
		panic(ContinueSignal{})
	case *TernaryNode:
		cond := interp.Execute(n.Condition, env)
		if isTruthy(cond) {
			return interp.Execute(n.TrueExpr, env)
		}
		return interp.Execute(n.FalseExpr, env)
	}
	return nil
}

func (interp *Interpreter) execBinaryOp(n *BinaryOpNode, env *Environment) interface{} {
	left := interp.Execute(n.Left, env)

	if n.Op == "dan" || n.Op == "&&" {
		if !isTruthy(left) {
			return left
		}
		return interp.Execute(n.Right, env)
	}
	if n.Op == "atau" || n.Op == "||" {
		if isTruthy(left) {
			return left
		}
		return interp.Execute(n.Right, env)
	}

	right := interp.Execute(n.Right, env)

	switch n.Op {
	case "+":
		if ls, ok := left.(string); ok {
			return ls + formatValue(right)
		}
		if rs, ok := right.(string); ok {
			return formatValue(left) + rs
		}
		if ll, ok := left.([]interface{}); ok {
			if rl, ok := right.([]interface{}); ok {
				return append(ll, rl...)
			}
			return append(ll, right)
		}
		return toFloat(left) + toFloat(right)
	case "-":
		return toFloat(left) - toFloat(right)
	case "*":
		return toFloat(left) * toFloat(right)
	case "/":
		r := toFloat(right)
		if r == 0 {
			fmt.Println("❌ Pembagian dengan nol")
			os.Exit(1)
		}
		return toFloat(left) / r
	case "%":
		return float64(int(toFloat(left)) % int(toFloat(right)))
	case "**":
		return math.Pow(toFloat(left), toFloat(right))
	case "==":
		return left == right
	case "!=":
		return left != right
	case "<":
		return toFloat(left) < toFloat(right)
	case ">":
		return toFloat(left) > toFloat(right)
	case "<=":
		return toFloat(left) <= toFloat(right)
	case ">=":
		return toFloat(left) >= toFloat(right)
	case "..":
		result := []interface{}{}
		for j := int(toFloat(left)); j <= int(toFloat(right)); j++ {
			result = append(result, float64(j))
		}
		return result
	}
	fmt.Printf("❌ Operator tidak dikenali: %s\n", n.Op)
	os.Exit(1)
	return nil
}

func (interp *Interpreter) execFunctionCall(n *FunctionCallNode, env *Environment) interface{} {
	fn, ok := env.Get(n.Name)
	if !ok {
		fmt.Printf("❌ Fungsi %q tidak ditemukan\n", n.Name)
		os.Exit(1)
	}

	args := make([]interface{}, len(n.Args))
	for i, a := range n.Args {
		args[i] = interp.Execute(a, env)
	}

	if builtin, ok := fn.(BuiltinFunc); ok {
		return builtin(args)
	}

	if f, ok := fn.(*Function); ok {
		funcEnv := NewEnvironment(f.Closure)
		for i, param := range f.Params {
			val := interface{}(nil)
			if i < len(args) {
				val = args[i]
			}
			funcEnv.Define(param, val, false)
		}
		var result interface{}
		func() {
			defer func() {
				if r := recover(); r != nil {
					if ret, ok := r.(ReturnSignal); ok {
						result = ret.Value
					} else {
						panic(r)
					}
				}
			}()
			result = interp.Execute(f.Body, funcEnv)
		}()
		return result
	}

	fmt.Printf("❌ %q bukan fungsi\n", n.Name)
	os.Exit(1)
	return nil
}

// ============================================================
// MAIN
// ============================================================

func main() {
	if len(os.Args) < 2 {
		fmt.Println("🇮🇩 Jakarta Language Interpreter (Go) v0.1.0")
		fmt.Println("Cara pakai: go run main.go <file.jkt>")
		return
	}

	filePath := os.Args[1]
	if !strings.HasSuffix(filePath, ".jkt") {
		fmt.Println("❌ File harus berekstensi .jkt")
		os.Exit(1)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Printf("❌ File %q tidak ditemukan\n", filePath)
		os.Exit(1)
	}

	interp := NewInterpreter()
	interp.Run(string(data))
}