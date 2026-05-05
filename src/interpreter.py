#!/usr/bin/env python3
"""
Jakarta Language Interpreter (.jkt)
Bahasa pemrograman berbasis Bahasa Indonesia

Cara pakai:
    python interpreter.py main.jkt
"""

import sys
import re
import math
import os

# ============================================================
# TOKEN TYPES
# ============================================================

class TokenType:
    # Literals
    ANGKA = 'ANGKA'           # number
    TEKS = 'TEKS'             # string
    IDENTIFIER = 'IDENTIFIER' # variable/function name

    # Keywords
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
    KELAS = 'kelas'
    KONSTRUKTOR = 'konstruktor'
    INI = 'ini'
    BARU = 'baru'
    DAN = 'dan'
    ATAU = 'atau'
    BUKAN = 'bukan'
    JIKA_LAIN = 'jika_lain'
    COBA = 'coba'
    TANGKAP = 'tangkap'
    LEMPAR = 'lempar'
    PUTUS = 'putus'
    LANJUT = 'lanjut'
    IMPOR = 'impor'
    DARI = 'dari'
    EKSPOR = 'ekspor'
    ASINKRON = 'asinkron'
    TUNGGU = 'tunggu'
    TIPE = 'tipe'

    # Operators
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

    # Delimiters
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

    # Special
    EOF = 'EOF'
    NEWLINE = 'NEWLINE'


KEYWORDS = {
    'cetak': TokenType.CETAK,
    'var': TokenType.VAR,
    'konstan': TokenType.KONSTAN,
    'fungsi': TokenType.FUNGSI,
    'kembali': TokenType.KEMBALI,
    'jika': TokenType.JIKA,
    'lain': TokenType.LAIN,
    'selama': TokenType.SELAMA,
    'untuk': TokenType.UNTUK,
    'dalam': TokenType.DALAM,
    'benar': TokenType.BENAR,
    'salah': TokenType.SALAH,
    'kosong': TokenType.KOSONG,
    'kelas': TokenType.KELAS,
    'konstruktor': TokenType.KONSTRUKTOR,
    'ini': TokenType.INI,
    'baru': TokenType.BARU,
    'dan': TokenType.DAN,
    'atau': TokenType.ATAU,
    'bukan': TokenType.BUKAN,
    'jika_lain': TokenType.JIKA_LAIN,
    'coba': TokenType.COBA,
    'tangkap': TokenType.TANGKAP,
    'lempar': TokenType.LEMPAR,
    'putus': TokenType.PUTUS,
    'lanjut': TokenType.LANJUT,
    'impor': TokenType.IMPOR,
    'dari': TokenType.DARI,
    'ekspor': TokenType.EKSPOR,
    'asinkron': TokenType.ASINKRON,
    'tunggu': TokenType.TUNGGU,
    'tipe': TokenType.TIPE,
}


# ============================================================
# TOKEN
# ============================================================

class Token:
    def __init__(self, type_, value, line=0, column=0):
        self.type = type_
        self.value = value
        self.line = line
        self.column = column

    def __repr__(self):
        return f'Token({self.type}, {self.value!r})'


# ============================================================
# LEXER
# ============================================================

class LexerError(Exception):
    pass


class Lexer:
    def __init__(self, source):
        self.source = source
        self.pos = 0
        self.line = 1
        self.column = 1
        self.tokens = []

    def error(self, msg):
        raise LexerError(f'Error di baris {self.line}, kolom {self.column}: {msg}')

    def peek(self):
        if self.pos < len(self.source):
            return self.source[self.pos]
        return '\0'

    def peek_next(self):
        if self.pos + 1 < len(self.source):
            return self.source[self.pos + 1]
        return '\0'

    def advance(self):
        ch = self.source[self.pos]
        self.pos += 1
        if ch == '\n':
            self.line += 1
            self.column = 1
        else:
            self.column += 1
        return ch

    def skip_whitespace(self):
        while self.pos < len(self.source) and self.source[self.pos] in ' \t\r':
            self.advance()

    def skip_comment(self):
        if self.peek() == '/' and self.peek_next() == '/':
            while self.pos < len(self.source) and self.source[self.pos] != '\n':
                self.advance()
            return True
        if self.peek() == '/' and self.peek_next() == '*':
            self.advance()
            self.advance()
            while self.pos < len(self.source):
                if self.peek() == '*' and self.peek_next() == '/':
                    self.advance()
                    self.advance()
                    break
                self.advance()
            return True
        return False

    def read_string(self, quote):
        self.advance()  # skip opening quote
        result = ''
        while self.pos < len(self.source) and self.source[self.pos] != quote:
            if self.source[self.pos] == '\\':
                self.advance()
                ch = self.advance()
                escape_map = {'n': '\n', 't': '\t', 'r': '\r', '\\': '\\', "'": "'", '"': '"'}
                result += escape_map.get(ch, ch)
            else:
                result += self.advance()
        if self.pos >= len(self.source):
            self.error('String tidak ditutup')
        self.advance()  # skip closing quote
        return result

    def read_number(self):
        result = ''
        if self.peek() == '0' and self.peek_next() in 'xX':
            self.advance()
            self.advance()
            while self.pos < len(self.source) and self.source[self.pos] in '0123456789abcdefABCDEF':
                result += self.advance()
            return int(result, 16)
        if self.peek() == '0' and self.peek_next() in 'bB':
            self.advance()
            self.advance()
            while self.pos < len(self.source) and self.source[self.pos] in '01':
                result += self.advance()
            return int(result, 2)
        while self.pos < len(self.source) and self.source[self.pos].isdigit():
            result += self.advance()
        if self.pos < len(self.source) and self.source[self.pos] == '.' and (self.pos + 1 < len(self.source) and self.source[self.pos + 1].isdigit()):
            result += self.advance()
            while self.pos < len(self.source) and self.source[self.pos].isdigit():
                result += self.advance()
            return float(result)
        return int(result)

    def read_identifier(self):
        result = ''
        while self.pos < len(self.source) and (self.source[self.pos].isalnum() or self.source[self.pos] == '_'):
            result += self.advance()
        return result

    def tokenize(self):
        while self.pos < len(self.source):
            self.skip_whitespace()
            if self.pos >= len(self.source):
                break

            if self.skip_comment():
                continue

            if self.source[self.pos] == '\n':
                self.advance()
                continue

            line, col = self.line, self.column
            ch = self.peek()

            # String
            if ch in '"\'':
                val = self.read_string(ch)
                self.tokens.append(Token(TokenType.TEKS, val, line, col))
                continue

            # Number
            if ch.isdigit():
                val = self.read_number()
                self.tokens.append(Token(TokenType.ANGKA, val, line, col))
                continue

            # Identifier / Keyword
            if ch.isalpha() or ch == '_':
                val = self.read_identifier()
                token_type = KEYWORDS.get(val, TokenType.IDENTIFIER)
                self.tokens.append(Token(token_type, val, line, col))
                continue

            # Two-character operators
            two_char = self.source[self.pos:self.pos+2] if self.pos + 1 < len(self.source) else ''
            two_char_ops = {
                '**': TokenType.POWER, '==': TokenType.EQ, '!=': TokenType.NEQ,
                '<=': TokenType.LTE, '>=': TokenType.GTE, '&&': TokenType.AND,
                '||': TokenType.OR, '++': TokenType.INCREMENT, '--': TokenType.DECREMENT,
                '=>': TokenType.ARROW, '+=': TokenType.PLUS_ASSIGN, '-=': TokenType.MINUS_ASSIGN,
                '*=': TokenType.STAR_ASSIGN, '/=': TokenType.SLASH_ASSIGN, '..': TokenType.RANGE,
            }
            if two_char in two_char_ops:
                self.advance()
                self.advance()
                self.tokens.append(Token(two_char_ops[two_char], two_char, line, col))
                continue

            # Single-character operators & delimiters
            single_ops = {
                '+': TokenType.PLUS, '-': TokenType.MINUS, '*': TokenType.STAR,
                '/': TokenType.SLASH, '%': TokenType.PERCENT, '=': TokenType.ASSIGN,
                '<': TokenType.LT, '>': TokenType.GT, '!': TokenType.NOT,
                '(': TokenType.LPAREN, ')': TokenType.RPAREN,
                '{': TokenType.LBRACE, '}': TokenType.RBRACE,
                '[': TokenType.LBRACKET, ']': TokenType.RBRACKET,
                ',': TokenType.COMMA, ';': TokenType.SEMICOLON,
                ':': TokenType.COLON, '.': TokenType.DOT, '?': TokenType.QUESTION,
            }
            if ch in single_ops:
                self.advance()
                self.tokens.append(Token(single_ops[ch], ch, line, col))
                continue

            self.error(f'Karakter tidak dikenali: {ch!r}')

        self.tokens.append(Token(TokenType.EOF, None, self.line, self.column))
        return self.tokens


# ============================================================
# AST NODES
# ============================================================

class ASTNode:
    pass

class NumberNode(ASTNode):
    def __init__(self, value):
        self.value = value

class StringNode(ASTNode):
    def __init__(self, value):
        self.value = value

class BooleanNode(ASTNode):
    def __init__(self, value):
        self.value = value

class NullNode(ASTNode):
    pass

class IdentifierNode(ASTNode):
    def __init__(self, name):
        self.name = name

class BinaryOpNode(ASTNode):
    def __init__(self, left, op, right):
        self.left = left
        self.op = op
        self.right = right

class UnaryOpNode(ASTNode):
    def __init__(self, op, operand):
        self.op = op
        self.operand = operand

class AssignNode(ASTNode):
    def __init__(self, name, value):
        self.name = name
        self.value = value

class VarDeclNode(ASTNode):
    def __init__(self, name, value, is_const=False):
        self.name = name
        self.value = value
        self.is_const = is_const

class PrintNode(ASTNode):
    def __init__(self, value):
        self.value = value

class IfNode(ASTNode):
    def __init__(self, condition, body, else_body=None):
        self.condition = condition
        self.body = body
        self.else_body = else_body

class WhileNode(ASTNode):
    def __init__(self, condition, body):
        self.condition = condition
        self.body = body

class ForNode(ASTNode):
    def __init__(self, var_name, iterable, body):
        self.var_name = var_name
        self.iterable = iterable
        self.body = body

class FunctionDefNode(ASTNode):
    def __init__(self, name, params, body):
        self.name = name
        self.params = params
        self.body = body

class ReturnNode(ASTNode):
    def __init__(self, value):
        self.value = value

class FunctionCallNode(ASTNode):
    def __init__(self, name, args):
        self.name = name
        self.args = args

class BlockNode(ASTNode):
    def __init__(self, statements):
        self.statements = statements

class ListNode(ASTNode):
    def __init__(self, elements):
        self.elements = elements

class IndexAccessNode(ASTNode):
    def __init__(self, obj, index):
        self.obj = obj
        self.index = index

class DotAccessNode(ASTNode):
    def __init__(self, obj, attr):
        self.obj = obj
        self.attr = attr

class BreakNode(ASTNode):
    pass

class ContinueNode(ASTNode):
    pass

class TernaryNode(ASTNode):
    def __init__(self, condition, true_expr, false_expr):
        self.condition = condition
        self.true_expr = true_expr
        self.false_expr = false_expr


# ============================================================
# PARSER
# ============================================================

class ParseError(Exception):
    pass


class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def error(self, msg):
        token = self.current()
        raise ParseError(f'Error di baris {token.line}: {msg} (ditemukan: {token.type} = {token.value!r})')

    def current(self):
        return self.tokens[self.pos]

    def peek(self):
        return self.tokens[self.pos]

    def advance(self):
        token = self.tokens[self.pos]
        self.pos += 1
        return token

    def expect(self, token_type):
        if self.current().type != token_type:
            self.error(f'Diharapkan {token_type}')
        return self.advance()

    def match(self, *token_types):
        if self.current().type in token_types:
            return self.advance()
        return None

    def parse(self):
        statements = []
        while self.current().type != TokenType.EOF:
            stmt = self.parse_statement()
            if stmt is not None:
                statements.append(stmt)
        return BlockNode(statements)

    def parse_statement(self):
        token = self.current()

        if token.type == TokenType.CETAK:
            return self.parse_print()
        elif token.type == TokenType.VAR:
            return self.parse_var_decl(is_const=False)
        elif token.type == TokenType.KONSTAN:
            return self.parse_var_decl(is_const=True)
        elif token.type == TokenType.JIKA:
            return self.parse_if()
        elif token.type == TokenType.SELAMA:
            return self.parse_while()
        elif token.type == TokenType.UNTUK:
            return self.parse_for()
        elif token.type == TokenType.FUNGSI:
            return self.parse_function_def()
        elif token.type == TokenType.KEMBALI:
            return self.parse_return()
        elif token.type == TokenType.PUTUS:
            self.advance()
            self.match(TokenType.SEMICOLON)
            return BreakNode()
        elif token.type == TokenType.LANJUT:
            self.advance()
            self.match(TokenType.SEMICOLON)
            return ContinueNode()
        else:
            return self.parse_expr_statement()

    def parse_print(self):
        self.advance()  # skip 'cetak'
        self.expect(TokenType.LPAREN)
        value = self.parse_expression()
        self.expect(TokenType.RPAREN)
        self.match(TokenType.SEMICOLON)
        return PrintNode(value)

    def parse_var_decl(self, is_const=False):
        self.advance()  # skip 'var' or 'konstan'
        name = self.expect(TokenType.IDENTIFIER).value
        value = None
        if self.match(TokenType.ASSIGN):
            value = self.parse_expression()
        self.match(TokenType.SEMICOLON)
        return VarDeclNode(name, value, is_const)

    def parse_if(self):
        self.advance()  # skip 'jika'
        self.expect(TokenType.LPAREN)
        condition = self.parse_expression()
        self.expect(TokenType.RPAREN)
        body = self.parse_block()
        else_body = None
        if self.match(TokenType.LAIN):
            if self.current().type == TokenType.JIKA:
                # lain jika (else if) - parse as nested if
                else_body = BlockNode([self.parse_if()])
            else:
                else_body = self.parse_block()
        return IfNode(condition, body, else_body)

    def parse_while(self):
        self.advance()  # skip 'selama'
        self.expect(TokenType.LPAREN)
        condition = self.parse_expression()
        self.expect(TokenType.RPAREN)
        body = self.parse_block()
        return WhileNode(condition, body)

    def parse_for(self):
        self.advance()  # skip 'untuk'
        self.expect(TokenType.LPAREN)
        var_name = self.expect(TokenType.IDENTIFIER).value
        self.expect(TokenType.DALAM)
        iterable = self.parse_expression()
        self.expect(TokenType.RPAREN)
        body = self.parse_block()
        return ForNode(var_name, iterable, body)

    def parse_function_def(self):
        self.advance()  # skip 'fungsi'
        name = self.expect(TokenType.IDENTIFIER).value
        self.expect(TokenType.LPAREN)
        params = []
        if self.current().type != TokenType.RPAREN:
            params.append(self.expect(TokenType.IDENTIFIER).value)
            while self.match(TokenType.COMMA):
                params.append(self.expect(TokenType.IDENTIFIER).value)
        self.expect(TokenType.RPAREN)
        body = self.parse_block()
        return FunctionDefNode(name, params, body)

    def parse_return(self):
        self.advance()  # skip 'kembali'
        value = None
        if self.current().type != TokenType.SEMICOLON and self.current().type != TokenType.RBRACE:
            value = self.parse_expression()
        self.match(TokenType.SEMICOLON)
        return ReturnNode(value)

    def parse_block(self):
        self.expect(TokenType.LBRACE)
        statements = []
        while self.current().type != TokenType.RBRACE and self.current().type != TokenType.EOF:
            stmt = self.parse_statement()
            if stmt is not None:
                statements.append(stmt)
        self.expect(TokenType.RBRACE)
        return BlockNode(statements)

    def parse_expr_statement(self):
        expr = self.parse_expression()
        # Handle assignment
        if isinstance(expr, IdentifierNode) and self.match(TokenType.ASSIGN):
            value = self.parse_expression()
            self.match(TokenType.SEMICOLON)
            return AssignNode(expr.name, value)
        if isinstance(expr, IdentifierNode) and self.current().type in (TokenType.PLUS_ASSIGN, TokenType.MINUS_ASSIGN, TokenType.STAR_ASSIGN, TokenType.SLASH_ASSIGN):
            op = self.advance().value
            value = self.parse_expression()
            self.match(TokenType.SEMICOLON)
            op_map = {'+=': '+', '-=': '-', '*=': '*', '/=': '/'}
            return AssignNode(expr.name, BinaryOpNode(IdentifierNode(expr.name), op_map[op], value))
        self.match(TokenType.SEMICOLON)
        return expr

    def parse_expression(self):
        return self.parse_ternary()

    def parse_ternary(self):
        expr = self.parse_or()
        if self.match(TokenType.QUESTION):
            true_expr = self.parse_expression()
            self.expect(TokenType.COLON)
            false_expr = self.parse_expression()
            return TernaryNode(expr, true_expr, false_expr)
        return expr

    def parse_or(self):
        left = self.parse_and()
        while self.current().type in (TokenType.ATAU, TokenType.OR):
            op = self.advance().value
            right = self.parse_and()
            left = BinaryOpNode(left, op, right)
        return left

    def parse_and(self):
        left = self.parse_equality()
        while self.current().type in (TokenType.DAN, TokenType.AND):
            op = self.advance().value
            right = self.parse_equality()
            left = BinaryOpNode(left, op, right)
        return left

    def parse_equality(self):
        left = self.parse_comparison()
        while self.current().type in (TokenType.EQ, TokenType.NEQ):
            op = self.advance().value
            right = self.parse_comparison()
            left = BinaryOpNode(left, op, right)
        return left

    def parse_comparison(self):
        left = self.parse_range()
        while self.current().type in (TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE):
            op = self.advance().value
            right = self.parse_range()
            left = BinaryOpNode(left, op, right)
        return left

    def parse_range(self):
        left = self.parse_addition()
        if self.current().type == TokenType.RANGE:
            op = self.advance().value
            right = self.parse_addition()
            left = BinaryOpNode(left, op, right)
        return left

    def parse_addition(self):
        left = self.parse_multiplication()
        while self.current().type in (TokenType.PLUS, TokenType.MINUS):
            op = self.advance().value
            right = self.parse_multiplication()
            left = BinaryOpNode(left, op, right)
        return left

    def parse_multiplication(self):
        left = self.parse_power()
        while self.current().type in (TokenType.STAR, TokenType.SLASH, TokenType.PERCENT):
            op = self.advance().value
            right = self.parse_power()
            left = BinaryOpNode(left, op, right)
        return left

    def parse_power(self):
        left = self.parse_unary()
        if self.current().type == TokenType.POWER:
            op = self.advance().value
            right = self.parse_power()  # right-associative
            left = BinaryOpNode(left, op, right)
        return left

    def parse_unary(self):
        if self.current().type in (TokenType.MINUS, TokenType.NOT, TokenType.BUKAN):
            op = self.advance().value
            operand = self.parse_unary()
            return UnaryOpNode(op, operand)
        if self.current().type in (TokenType.INCREMENT, TokenType.DECREMENT):
            op = self.advance().value
            operand = self.parse_primary()
            return AssignNode(
                operand.name,
                BinaryOpNode(IdentifierNode(operand.name), op[0], NumberNode(1))
            ) if isinstance(operand, IdentifierNode) else self.error('Increment/decrement hanya untuk variabel')
        return self.parse_postfix()

    def parse_postfix(self):
        expr = self.parse_primary()
        # Function call
        if self.current().type == TokenType.LPAREN and isinstance(expr, IdentifierNode):
            self.advance()
            args = []
            if self.current().type != TokenType.RPAREN:
                args.append(self.parse_expression())
                while self.match(TokenType.COMMA):
                    args.append(self.parse_expression())
            self.expect(TokenType.RPAREN)
            return FunctionCallNode(expr.name, args)
        # Index access
        if self.current().type == TokenType.LBRACKET:
            self.advance()
            index = self.parse_expression()
            self.expect(TokenType.RBRACKET)
            return IndexAccessNode(expr, index)
        # Dot access
        if self.current().type == TokenType.DOT:
            self.advance()
            attr = self.expect(TokenType.IDENTIFIER).value
            return DotAccessNode(expr, attr)
        return expr

    def parse_primary(self):
        token = self.current()

        if token.type == TokenType.ANGKA:
            self.advance()
            return NumberNode(token.value)

        if token.type == TokenType.TEKS:
            self.advance()
            return StringNode(token.value)

        if token.type == TokenType.BENAR:
            self.advance()
            return BooleanNode(True)

        if token.type == TokenType.SALAH:
            self.advance()
            return BooleanNode(False)

        if token.type == TokenType.KOSONG:
            self.advance()
            return NullNode()

        if token.type == TokenType.IDENTIFIER:
            self.advance()
            return IdentifierNode(token.value)

        if token.type == TokenType.LPAREN:
            self.advance()
            expr = self.parse_expression()
            self.expect(TokenType.RPAREN)
            return expr

        if token.type == TokenType.LBRACKET:
            self.advance()
            elements = []
            if self.current().type != TokenType.RBRACKET:
                elements.append(self.parse_expression())
                while self.match(TokenType.COMMA):
                    elements.append(self.parse_expression())
            self.expect(TokenType.RBRACKET)
            return ListNode(elements)

        self.error(f'Ekspresi tidak valid')


# ============================================================
# INTERPRETER
# ============================================================

class BreakSignal(Exception):
    pass

class ContinueSignal(Exception):
    pass

class ReturnSignal(Exception):
    def __init__(self, value):
        self.value = value

class RuntimeError_(Exception):
    pass


class Environment:
    def __init__(self, parent=None):
        self.vars = {}
        self.consts = set()
        self.parent = parent

    def get(self, name):
        if name in self.vars:
            return self.vars[name]
        if self.parent:
            return self.parent.get(name)
        raise RuntimeError_(f'Variabel "{name}" tidak ditemukan')

    def set(self, name, value):
        if name in self.consts:
            raise RuntimeError_(f'Tidak bisa mengubah konstan "{name}"')
        if name in self.vars:
            self.vars[name] = value
            return
        if self.parent and self.parent.has(name):
            self.parent.set(name, value)
            return
        self.vars[name] = value

    def define(self, name, value, is_const=False):
        self.vars[name] = value
        if is_const:
            self.consts.add(name)

    def has(self, name):
        if name in self.vars:
            return True
        if self.parent:
            return self.parent.has(name)
        return False


class Interpreter:
    def __init__(self):
        self.global_env = Environment()
        self._setup_builtins()

    def _setup_builtins(self):
        # Built-in functions
        self.global_env.define('panjang', lambda args: len(args[0]))  # length
        self.global_env.define('tipe', lambda args: type(args[0]).__name__)  # type
        self.global_env.define('angka', lambda args: int(args[0]) if isinstance(args[0], str) and '.' not in args[0] else float(args[0]))  # int/float conversion
        self.global_env.define('teks', lambda args: self._format_value(args[0]))  # string conversion
        self.global_env.define('urut', lambda args: sorted(args[0]))  # sort
        self.global_env.define('balik', lambda args: args[0][::-1])  # reverse
        self.global_env.define('rentang', lambda args: list(range(args[0], args[1] if len(args) > 1 else args[0], args[2] if len(args) > 2 else 1)) if len(args) > 1 else list(range(args[0])))  # range
        self.global_env.define('bulat', lambda args: round(args[0]))  # round
        self.global_env.define('lantai', lambda args: math.floor(args[0]))  # floor
        self.global_env.define('atap', lambda args: math.ceil(args[0]))  # ceil
        self.global_env.define('akar', lambda args: math.sqrt(args[0]))  # sqrt
        self.global_env.define('abs', lambda args: abs(args[0]))  # abs
        self.global_env.define('acak', lambda args: __import__('random').randint(args[0], args[1]) if len(args) > 1 else __import__('random').random())  # random
        self.global_env.define('masuk', lambda args: input(args[0] if args else ''))  # input
        self.global_env.define('gabung', lambda args: args[1].join(str(x) for x in args[0]))  # join
        self.global_env.define('belah', lambda args: args[0].split(args[1] if len(args) > 1 else ' '))  # split
        self.global_env.define('ganti', lambda args: args[0].replace(args[1], args[2]))  # replace
        self.global_env.define('besar', lambda args: args[0].upper())  # upper
        self.global_env.define('kecil', lambda args: args[0].lower())  # lower
        self.global_env.define('sisipkan', lambda args: args[0].insert(args[1], args[2]) or args[0])  # insert
        self.global_env.define('hapus', lambda args: args[0].pop(args[1]) if len(args) > 1 else args[0].pop())  # pop
        self.global_env.define('PI', math.pi)
        self.global_env.define('E', math.e)

    def run(self, source):
        lexer = Lexer(source)
        tokens = lexer.tokenize()
        parser = Parser(tokens)
        ast = parser.parse()
        return self.execute(ast, self.global_env)

    def execute(self, node, env):
        method_name = f'visit_{type(node).__name__}'
        method = getattr(self, method_name, None)
        if method is None:
            raise RuntimeError_(f'Node tidak didukung: {type(node).__name__}')
        return method(node, env)

    def visit_BlockNode(self, node, env):
        result = None
        for stmt in node.statements:
            result = self.execute(stmt, env)
        return result

    def visit_NumberNode(self, node, env):
        return node.value

    def visit_StringNode(self, node, env):
        return node.value

    def visit_BooleanNode(self, node, env):
        return node.value

    def visit_NullNode(self, node, env):
        return None

    def visit_IdentifierNode(self, node, env):
        return env.get(node.name)

    def visit_BinaryOpNode(self, node, env):
        left = self.execute(node.left, env)

        # Short-circuit for logical operators
        if node.op in ('dan', '&&'):
            if not self._is_truthy(left):
                return left
            return self.execute(node.right, env)
        if node.op in ('atau', '||'):
            if self._is_truthy(left):
                return left
            return self.execute(node.right, env)

        right = self.execute(node.right, env)

        ops = {
            '+': lambda a, b: a + b,
            '-': lambda a, b: a - b,
            '*': lambda a, b: a * b,
            '/': lambda a, b: a / b if b != 0 else self._error('Pembagian dengan nol'),
            '%': lambda a, b: a % b,
            '**': lambda a, b: a ** b,
            '==': lambda a, b: a == b,
            '!=': lambda a, b: a != b,
            '<': lambda a, b: a < b,
            '>': lambda a, b: a > b,
            '<=': lambda a, b: a <= b,
            '>=': lambda a, b: a >= b,
            '..': lambda a, b: list(range(a, b + 1)),
        }
        if node.op in ops:
            return ops[node.op](left, right)
        self._error(f'Operator tidak dikenali: {node.op}')

    def visit_UnaryOpNode(self, node, env):
        operand = self.execute(node.operand, env)
        if node.op == '-':
            return -operand
        if node.op in ('!', 'bukan'):
            return not self._is_truthy(operand)
        self._error(f'Operator unary tidak dikenali: {node.op}')

    def visit_AssignNode(self, node, env):
        value = self.execute(node.value, env)
        env.set(node.name, value)
        return value

    def visit_VarDeclNode(self, node, env):
        value = self.execute(node.value, env) if node.value else None
        env.define(node.name, value, node.is_const)
        return value

    def visit_PrintNode(self, node, env):
        value = self.execute(node.value, env)
        print(self._format_value(value))
        return value

    def visit_IfNode(self, node, env):
        condition = self.execute(node.condition, env)
        if self._is_truthy(condition):
            return self.execute(node.body, Environment(env))
        elif node.else_body:
            return self.execute(node.else_body, Environment(env))
        return None

    def visit_WhileNode(self, node, env):
        result = None
        while self._is_truthy(self.execute(node.condition, env)):
            try:
                result = self.execute(node.body, Environment(env))
            except BreakSignal:
                break
            except ContinueSignal:
                continue
        return result

    def visit_ForNode(self, node, env):
        iterable = self.execute(node.iterable, env)
        result = None
        for item in iterable:
            loop_env = Environment(env)
            loop_env.define(node.var_name, item)
            try:
                result = self.execute(node.body, loop_env)
            except BreakSignal:
                break
            except ContinueSignal:
                continue
        return result

    def visit_FunctionDefNode(self, node, env):
        func = {'name': node.name, 'params': node.params, 'body': node.body, 'closure': env}
        env.define(node.name, func)
        return func

    def visit_ReturnNode(self, node, env):
        value = self.execute(node.value, env) if node.value else None
        raise ReturnSignal(value)

    def visit_FunctionCallNode(self, node, env):
        func = env.get(node.name)
        args = [self.execute(arg, env) for arg in node.args]

        # Built-in function (lambda)
        if callable(func):
            return func(args)

        # User-defined function
        if isinstance(func, dict) and 'body' in func:
            func_env = Environment(func['closure'])
            for i, param in enumerate(func['params']):
                func_env.define(param, args[i] if i < len(args) else None)
            try:
                result = self.execute(func['body'], func_env)
            except ReturnSignal as ret:
                result = ret.value
            return result

        self._error(f'"{node.name}" bukan fungsi')

    def visit_ListNode(self, node, env):
        return [self.execute(el, env) for el in node.elements]

    def visit_IndexAccessNode(self, node, env):
        obj = self.execute(node.obj, env)
        index = self.execute(node.index, env)
        return obj[index]

    def visit_DotAccessNode(self, node, env):
        obj = self.execute(node.obj, env)
        if node.attr == 'panjang':
            return len(obj)
        if isinstance(obj, dict) and node.attr in obj:
            return obj[node.attr]
        self._error(f'Atribut "{node.attr}" tidak ditemukan')

    def visit_BreakNode(self, node, env):
        raise BreakSignal()

    def visit_ContinueNode(self, node, env):
        raise ContinueSignal()

    def visit_TernaryNode(self, node, env):
        condition = self.execute(node.condition, env)
        if self._is_truthy(condition):
            return self.execute(node.true_expr, env)
        return self.execute(node.false_expr, env)

    def _is_truthy(self, value):
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value != 0
        if isinstance(value, str):
            return len(value) > 0
        if isinstance(value, list):
            return len(value) > 0
        return True

    def _format_value(self, value):
        if value is None:
            return 'kosong'
        if isinstance(value, bool):
            return 'benar' if value else 'salah'
        if isinstance(value, list):
            return '[' + ', '.join(self._format_value(v) for v in value) + ']'
        return str(value)

    def _error(self, msg):
        raise RuntimeError_(msg)


# ============================================================
# MAIN
# ============================================================

def main():
    if len(sys.argv) < 2:
        print('🇮🇩 Jakarta Language Interpreter v0.1.0')
        print('Cara pakai: python interpreter.py <file.jkt>')
        print()
        print('Mode REPL (ketik "keluar" untuk keluar):')
        interpreter = Interpreter()
        while True:
            try:
                line = input('jkt> ')
                if line.strip() in ('keluar', 'exit', 'quit'):
                    break
                if line.strip():
                    result = interpreter.run(line)
                    if result is not None:
                        print(interpreter._format_value(result))
            except KeyboardInterrupt:
                print()
                break
            except Exception as e:
                print(f'Error: {e}')
        return

    file_path = sys.argv[1]
    if not file_path.endswith('.jkt'):
        print('Error: File harus berekstensi .jkt')
        sys.exit(1)

    if not os.path.exists(file_path):
        print(f'Error: File "{file_path}" tidak ditemukan')
        sys.exit(1)

    with open(file_path, 'r', encoding='utf-8') as f:
        source = f.read()

    interpreter = Interpreter()
    try:
        interpreter.run(source)
    except LexerError as e:
        print(f'❌ Kesalahan Lexer: {e}')
        sys.exit(1)
    except ParseError as e:
        print(f'❌ Kesalahan Parser: {e}')
        sys.exit(1)
    except RuntimeError_ as e:
        print(f'❌ Kesalahan Runtime: {e}')
        sys.exit(1)
    except ReturnSignal:
        pass


if __name__ == '__main__':
    main()