import java.io.*;
import java.util.*;

/**
 * Jakarta Language Interpreter (.jkt) - Java Implementation
 * Full-featured interpreter with lexer, parser, and tree-walking interpreter
 */
public class JakartaInterpreter {

    // ============================================================
    // TOKEN TYPES
    // ============================================================

    enum TokenType {
        ANGKA, TEKS, IDENTIFIER,
        CETAK, VAR, KONSTAN, FUNGSI, KEMBALI,
        JIKA, LAIN, SELAMA, UNTUK, DALAM,
        BENAR, SALAH, KOSONG,
        DAN, ATAU, BUKAN,
        PUTUS, LANJUT,
        PLUS, MINUS, STAR, SLASH, PERCENT, POWER,
        ASSIGN, PLUS_ASSIGN, MINUS_ASSIGN, STAR_ASSIGN, SLASH_ASSIGN,
        EQ, NEQ, LT, GT, LTE, GTE,
        AND, OR, NOT,
        INCREMENT, DECREMENT, ARROW, DOT, RANGE,
        LPAREN, RPAREN, LBRACE, RBRACE, LBRACKET, RBRACKET,
        COMMA, SEMICOLON, COLON, QUESTION,
        EOF
    }

    static final Map<String, TokenType> KEYWORDS = new HashMap<>();
    static {
        KEYWORDS.put("cetak", TokenType.CETAK);
        KEYWORDS.put("var", TokenType.VAR);
        KEYWORDS.put("konstan", TokenType.KONSTAN);
        KEYWORDS.put("fungsi", TokenType.FUNGSI);
        KEYWORDS.put("kembali", TokenType.KEMBALI);
        KEYWORDS.put("jika", TokenType.JIKA);
        KEYWORDS.put("lain", TokenType.LAIN);
        KEYWORDS.put("selama", TokenType.SELAMA);
        KEYWORDS.put("untuk", TokenType.UNTUK);
        KEYWORDS.put("dalam", TokenType.DALAM);
        KEYWORDS.put("benar", TokenType.BENAR);
        KEYWORDS.put("salah", TokenType.SALAH);
        KEYWORDS.put("kosong", TokenType.KOSONG);
        KEYWORDS.put("dan", TokenType.DAN);
        KEYWORDS.put("atau", TokenType.ATAU);
        KEYWORDS.put("bukan", TokenType.BUKAN);
        KEYWORDS.put("putus", TokenType.PUTUS);
        KEYWORDS.put("lanjut", TokenType.LANJUT);
    }

    // ============================================================
    // TOKEN
    // ============================================================

    static class Token {
        TokenType type;
        String value;
        double numVal;
        int line;

        Token(TokenType type, String value, int line) {
            this.type = type;
            this.value = value;
            this.numVal = 0;
            this.line = line;
        }
    }

    // ============================================================
    // LEXER
    // ============================================================

    static class Lexer {
        String source;
        int pos, line;
        List<Token> tokens = new ArrayList<>();

        Lexer(String source) {
            this.source = source;
            this.pos = 0;
            this.line = 1;
        }

        char peek() { return pos < source.length() ? source.charAt(pos) : '\0'; }
        char peekNext() { return pos + 1 < source.length() ? source.charAt(pos + 1) : '\0'; }

        char advance() {
            char ch = source.charAt(pos++);
            if (ch == '\n') line++;
            return ch;
        }

        void skipWhitespace() {
            while (pos < source.length() && " \t\r".indexOf(source.charAt(pos)) >= 0) advance();
        }

        boolean skipComment() {
            if (peek() == '/' && peekNext() == '/') {
                while (pos < source.length() && source.charAt(pos) != '\n') advance();
                return true;
            }
            if (peek() == '/' && peekNext() == '*') {
                advance(); advance();
                while (pos < source.length()) {
                    if (peek() == '*' && peekNext() == '/') { advance(); advance(); break; }
                    advance();
                }
                return true;
            }
            return false;
        }

        String readString(char quote) {
            advance();
            StringBuilder sb = new StringBuilder();
            while (pos < source.length() && source.charAt(pos) != quote) {
                if (source.charAt(pos) == '\\') {
                    advance();
                    char ch = advance();
                    switch (ch) {
                        case 'n': sb.append('\n'); break;
                        case 't': sb.append('\t'); break;
                        case 'r': sb.append('\r'); break;
                        case '\\': sb.append('\\'); break;
                        case '\'': sb.append('\''); break;
                        case '"': sb.append('"'); break;
                        default: sb.append(ch);
                    }
                } else {
                    sb.append(advance());
                }
            }
            if (pos < source.length()) advance();
            return sb.toString();
        }

        double readNumber(StringBuilder val) {
            while (pos < source.length() && Character.isDigit(source.charAt(pos))) {
                val.append(advance());
            }
            if (pos < source.length() && source.charAt(pos) == '.'
                && pos + 1 < source.length() && Character.isDigit(source.charAt(pos + 1))) {
                val.append(advance());
                while (pos < source.length() && Character.isDigit(source.charAt(pos))) {
                    val.append(advance());
                }
                return Double.parseDouble(val.toString());
            }
            return Integer.parseInt(val.toString());
        }

        String readIdentifier() {
            StringBuilder sb = new StringBuilder();
            while (pos < source.length() &&
                (Character.isLetterOrDigit(source.charAt(pos)) || source.charAt(pos) == '_')) {
                sb.append(advance());
            }
            return sb.toString();
        }

        List<Token> tokenize() {
            Map<String, TokenType> twoOps = new HashMap<>();
            twoOps.put("**", TokenType.POWER); twoOps.put("==", TokenType.EQ);
            twoOps.put("!=", TokenType.NEQ); twoOps.put("<=", TokenType.LTE);
            twoOps.put(">=", TokenType.GTE); twoOps.put("&&", TokenType.AND);
            twoOps.put("||", TokenType.OR); twoOps.put("++", TokenType.INCREMENT);
            twoOps.put("--", TokenType.DECREMENT); twoOps.put("=>", TokenType.ARROW);
            twoOps.put("+=", TokenType.PLUS_ASSIGN); twoOps.put("-=", TokenType.MINUS_ASSIGN);
            twoOps.put("*=", TokenType.STAR_ASSIGN); twoOps.put("/=", TokenType.SLASH_ASSIGN);
            twoOps.put("..", TokenType.RANGE);

            Map<Character, TokenType> singleOps = new HashMap<>();
            singleOps.put('+', TokenType.PLUS); singleOps.put('-', TokenType.MINUS);
            singleOps.put('*', TokenType.STAR); singleOps.put('/', TokenType.SLASH);
            singleOps.put('%', TokenType.PERCENT); singleOps.put('=', TokenType.ASSIGN);
            singleOps.put('<', TokenType.LT); singleOps.put('>', TokenType.GT);
            singleOps.put('!', TokenType.NOT);
            singleOps.put('(', TokenType.LPAREN); singleOps.put(')', TokenType.RPAREN);
            singleOps.put('{', TokenType.LBRACE); singleOps.put('}', TokenType.RBRACE);
            singleOps.put('[', TokenType.LBRACKET); singleOps.put(']', TokenType.RBRACKET);
            singleOps.put(',', TokenType.COMMA); singleOps.put(';', TokenType.SEMICOLON);
            singleOps.put(':', TokenType.COLON); singleOps.put('.', TokenType.DOT);
            singleOps.put('?', TokenType.QUESTION);

            while (pos < source.length()) {
                skipWhitespace();
                if (pos >= source.length()) break;
                if (skipComment()) continue;
                if (source.charAt(pos) == '\n') { advance(); continue; }

                int ln = line;
                char ch = peek();

                if (ch == '"' || ch == '\'') {
                    String val = readString(ch);
                    tokens.add(new Token(TokenType.TEKS, val, ln));
                    continue;
                }

                if (Character.isDigit(ch)) {
                    StringBuilder val = new StringBuilder();
                    double num = readNumber(val);
                    Token t = new Token(TokenType.ANGKA, val.toString(), ln);
                    t.numVal = num;
                    tokens.add(t);
                    continue;
                }

                if (Character.isLetter(ch) || ch == '_') {
                    String val = readIdentifier();
                    TokenType tt = KEYWORDS.getOrDefault(val, TokenType.IDENTIFIER);
                    tokens.add(new Token(tt, val, ln));
                    continue;
                }

                String two = pos + 1 < source.length() ? source.substring(pos, pos + 2) : "";
                if (twoOps.containsKey(two)) {
                    advance(); advance();
                    tokens.add(new Token(twoOps.get(two), two, ln));
                    continue;
                }

                if (singleOps.containsKey(ch)) {
                    advance();
                    tokens.add(new Token(singleOps.get(ch), String.valueOf(ch), ln));
                    continue;
                }

                System.err.println("❌ Karakter tidak dikenali: '" + ch + "' di baris " + ln);
                System.exit(1);
            }

            tokens.add(new Token(TokenType.EOF, "", line));
            return tokens;
        }
    }

    // ============================================================
    // AST NODES
    // ============================================================

    static abstract class ASTNode {}
    static class NumberNode extends ASTNode { double value; NumberNode(double v) { value = v; } }
    static class StringNode extends ASTNode { String value; StringNode(String v) { value = v; } }
    static class BooleanNode extends ASTNode { boolean value; BooleanNode(boolean v) { value = v; } }
    static class NullNode extends ASTNode {}
    static class IdentifierNode extends ASTNode { String name; IdentifierNode(String n) { name = n; } }
    static class BinaryOpNode extends ASTNode { ASTNode left; String op; ASTNode right;
        BinaryOpNode(ASTNode l, String o, ASTNode r) { left = l; op = o; right = r; } }
    static class UnaryOpNode extends ASTNode { String op; ASTNode operand;
        UnaryOpNode(String o, ASTNode e) { op = o; operand = e; } }
    static class AssignNode extends ASTNode { String name; ASTNode value;
        AssignNode(String n, ASTNode v) { name = n; value = v; } }
    static class VarDeclNode extends ASTNode { String name; ASTNode value; boolean isConst;
        VarDeclNode(String n, ASTNode v, boolean c) { name = n; value = v; isConst = c; } }
    static class PrintNode extends ASTNode { ASTNode value; PrintNode(ASTNode v) { value = v; } }
    static class IfNode extends ASTNode { ASTNode condition, body, elseBody;
        IfNode(ASTNode c, ASTNode b, ASTNode e) { condition = c; body = b; elseBody = e; } }
    static class WhileNode extends ASTNode { ASTNode condition, body;
        WhileNode(ASTNode c, ASTNode b) { condition = c; body = b; } }
    static class ForNode extends ASTNode { String varName; ASTNode iterable, body;
        ForNode(String v, ASTNode i, ASTNode b) { varName = v; iterable = i; body = b; } }
    static class FunctionDefNode extends ASTNode { String name; List<String> params; ASTNode body;
        FunctionDefNode(String n, List<String> p, ASTNode b) { name = n; params = p; body = b; } }
    static class ReturnNode extends ASTNode { ASTNode value; ReturnNode(ASTNode v) { value = v; } }
    static class FunctionCallNode extends ASTNode { String name; List<ASTNode> args;
        FunctionCallNode(String n, List<ASTNode> a) { name = n; args = a; } }
    static class BlockNode extends ASTNode { List<ASTNode> statements; BlockNode(List<ASTNode> s) { statements = s; } }
    static class ListNode extends ASTNode { List<ASTNode> elements; ListNode(List<ASTNode> e) { elements = e; } }
    static class IndexAccessNode extends ASTNode { ASTNode obj, index;
        IndexAccessNode(ASTNode o, ASTNode i) { obj = o; index = i; } }
    static class DotAccessNode extends ASTNode { ASTNode obj; String attr;
        DotAccessNode(ASTNode o, String a) { obj = o; attr = a; } }
    static class BreakNode extends ASTNode {}
    static class ContinueNode extends ASTNode {}
    static class TernaryNode extends ASTNode { ASTNode condition, trueExpr, falseExpr;
        TernaryNode(ASTNode c, ASTNode t, ASTNode f) { condition = c; trueExpr = t; falseExpr = f; } }

    // ============================================================
    // PARSER
    // ============================================================

    static class Parser {
        List<Token> tokens;
        int pos;

        Parser(List<Token> tokens) { this.tokens = tokens; this.pos = 0; }

        Token current() { return tokens.get(pos); }
        Token advance() { return tokens.get(pos++); }

        Token expect(TokenType tt) {
            if (current().type != tt) {
                System.err.println("❌ Error di baris " + current().line + ": Diharapkan " + tt +
                    ", ditemukan " + current().type + " (" + current().value + ")");
                System.exit(1);
            }
            return advance();
        }

        Token match(TokenType tt) {
            if (current().type == tt) return advance();
            return null;
        }

        ASTNode parse() {
            List<ASTNode> stmts = new ArrayList<>();
            while (current().type != TokenType.EOF) stmts.add(parseStatement());
            return new BlockNode(stmts);
        }

        ASTNode parseStatement() {
            switch (current().type) {
                case CETAK: return parsePrint();
                case VAR: return parseVarDecl(false);
                case KONSTAN: return parseVarDecl(true);
                case JIKA: return parseIf();
                case SELAMA: return parseWhile();
                case UNTUK: return parseFor();
                case FUNGSI: return parseFunctionDef();
                case KEMBALI: return parseReturn();
                case PUTUS: advance(); match(TokenType.SEMICOLON); return new BreakNode();
                case LANJUT: advance(); match(TokenType.SEMICOLON); return new ContinueNode();
                default: return parseExprStatement();
            }
        }

        ASTNode parsePrint() {
            advance(); expect(TokenType.LPAREN);
            ASTNode val = parseExpression();
            expect(TokenType.RPAREN); match(TokenType.SEMICOLON);
            return new PrintNode(val);
        }

        ASTNode parseVarDecl(boolean isConst) {
            advance(); String name = expect(TokenType.IDENTIFIER).value;
            ASTNode val = new NullNode();
            if (match(TokenType.ASSIGN) != null) val = parseExpression();
            match(TokenType.SEMICOLON);
            return new VarDeclNode(name, val, isConst);
        }

        ASTNode parseIf() {
            advance(); expect(TokenType.LPAREN);
            ASTNode cond = parseExpression();
            expect(TokenType.RPAREN);
            ASTNode body = parseBlock();
            ASTNode elseBody = null;
            if (match(TokenType.LAIN) != null) {
                elseBody = current().type == TokenType.JIKA ?
                    new BlockNode(Collections.singletonList(parseIf())) : parseBlock();
            }
            return new IfNode(cond, body, elseBody);
        }

        ASTNode parseWhile() {
            advance(); expect(TokenType.LPAREN);
            ASTNode cond = parseExpression();
            expect(TokenType.RPAREN);
            return new WhileNode(cond, parseBlock());
        }

        ASTNode parseFor() {
            advance(); expect(TokenType.LPAREN);
            String varName = expect(TokenType.IDENTIFIER).value;
            expect(TokenType.DALAM);
            ASTNode iterable = parseExpression();
            expect(TokenType.RPAREN);
            return new ForNode(varName, iterable, parseBlock());
        }

        ASTNode parseFunctionDef() {
            advance(); String name = expect(TokenType.IDENTIFIER).value;
            expect(TokenType.LPAREN);
            List<String> params = new ArrayList<>();
            if (current().type != TokenType.RPAREN) {
                params.add(expect(TokenType.IDENTIFIER).value);
                while (match(TokenType.COMMA) != null)
                    params.add(expect(TokenType.IDENTIFIER).value);
            }
            expect(TokenType.RPAREN);
            return new FunctionDefNode(name, params, parseBlock());
        }

        ASTNode parseReturn() {
            advance();
            ASTNode val = new NullNode();
            if (current().type != TokenType.SEMICOLON && current().type != TokenType.RBRACE)
                val = parseExpression();
            match(TokenType.SEMICOLON);
            return new ReturnNode(val);
        }

        ASTNode parseBlock() {
            expect(TokenType.LBRACE);
            List<ASTNode> stmts = new ArrayList<>();
            while (current().type != TokenType.RBRACE && current().type != TokenType.EOF)
                stmts.add(parseStatement());
            expect(TokenType.RBRACE);
            return new BlockNode(stmts);
        }

        ASTNode parseExprStatement() {
            ASTNode expr = parseExpression();
            if (expr instanceof IdentifierNode) {
                String name = ((IdentifierNode) expr).name;
                if (match(TokenType.ASSIGN) != null) {
                    ASTNode val = parseExpression(); match(TokenType.SEMICOLON);
                    return new AssignNode(name, val);
                }
                Map<TokenType, String> compound = new HashMap<>();
                compound.put(TokenType.PLUS_ASSIGN, "+"); compound.put(TokenType.MINUS_ASSIGN, "-");
                compound.put(TokenType.STAR_ASSIGN, "*"); compound.put(TokenType.SLASH_ASSIGN, "/");
                for (Map.Entry<TokenType, String> e : compound.entrySet()) {
                    if (current().type == e.getKey()) {
                        advance(); ASTNode val = parseExpression(); match(TokenType.SEMICOLON);
                        return new AssignNode(name, new BinaryOpNode(new IdentifierNode(name), e.getValue(), val));
                    }
                }
            }
            match(TokenType.SEMICOLON);
            return expr;
        }

        ASTNode parseExpression() { return parseTernary(); }

        ASTNode parseTernary() {
            ASTNode expr = parseOr();
            if (match(TokenType.QUESTION) != null) {
                ASTNode trueExpr = parseExpression();
                expect(TokenType.COLON);
                ASTNode falseExpr = parseExpression();
                return new TernaryNode(expr, trueExpr, falseExpr);
            }
            return expr;
        }

        ASTNode parseOr() {
            ASTNode left = parseAnd();
            while (current().type == TokenType.ATAU || current().type == TokenType.OR) {
                String op = advance().value; left = new BinaryOpNode(left, op, parseAnd());
            }
            return left;
        }

        ASTNode parseAnd() {
            ASTNode left = parseEquality();
            while (current().type == TokenType.DAN || current().type == TokenType.AND) {
                String op = advance().value; left = new BinaryOpNode(left, op, parseEquality());
            }
            return left;
        }

        ASTNode parseEquality() {
            ASTNode left = parseComparison();
            while (current().type == TokenType.EQ || current().type == TokenType.NEQ) {
                String op = advance().value; left = new BinaryOpNode(left, op, parseComparison());
            }
            return left;
        }

        ASTNode parseComparison() {
            ASTNode left = parseRange();
            while (current().type == TokenType.LT || current().type == TokenType.GT ||
                   current().type == TokenType.LTE || current().type == TokenType.GTE) {
                String op = advance().value; left = new BinaryOpNode(left, op, parseRange());
            }
            return left;
        }

        ASTNode parseRange() {
            ASTNode left = parseAddition();
            if (current().type == TokenType.RANGE) {
                advance(); left = new BinaryOpNode(left, "..", parseAddition());
            }
            return left;
        }

        ASTNode parseAddition() {
            ASTNode left = parseMultiplication();
            while (current().type == TokenType.PLUS || current().type == TokenType.MINUS) {
                String op = advance().value; left = new BinaryOpNode(left, op, parseMultiplication());
            }
            return left;
        }

        ASTNode parseMultiplication() {
            ASTNode left = parsePower();
            while (current().type == TokenType.STAR || current().type == TokenType.SLASH || current().type == TokenType.PERCENT) {
                String op = advance().value; left = new BinaryOpNode(left, op, parsePower());
            }
            return left;
        }

        ASTNode parsePower() {
            ASTNode left = parseUnary();
            if (current().type == TokenType.POWER) {
                advance(); left = new BinaryOpNode(left, "**", parsePower());
            }
            return left;
        }

        ASTNode parseUnary() {
            if (current().type == TokenType.MINUS || current().type == TokenType.NOT || current().type == TokenType.BUKAN) {
                String op = advance().value; return new UnaryOpNode(op, parseUnary());
            }
            if (current().type == TokenType.INCREMENT || current().type == TokenType.DECREMENT) {
                String op = advance().value;
                ASTNode operand = parsePrimary();
                if (operand instanceof IdentifierNode) {
                    String name = ((IdentifierNode) operand).name;
                    return new AssignNode(name, new BinaryOpNode(new IdentifierNode(name),
                        op.substring(0, 1), new NumberNode(1)));
                }
            }
            return parsePostfix();
        }

        ASTNode parsePostfix() {
            ASTNode expr = parsePrimary();
            if (current().type == TokenType.LPAREN && expr instanceof IdentifierNode) {
                advance(); List<ASTNode> args = new ArrayList<>();
                if (current().type != TokenType.RPAREN) {
                    args.add(parseExpression());
                    while (match(TokenType.COMMA) != null) args.add(parseExpression());
                }
                expect(TokenType.RPAREN);
                return new FunctionCallNode(((IdentifierNode) expr).name, args);
            }
            if (current().type == TokenType.LBRACKET) {
                advance(); ASTNode index = parseExpression(); expect(TokenType.RBRACKET);
                return new IndexAccessNode(expr, index);
            }
            if (current().type == TokenType.DOT) {
                advance(); String attr = expect(TokenType.IDENTIFIER).value;
                return new DotAccessNode(expr, attr);
            }
            return expr;
        }

        ASTNode parsePrimary() {
            Token t = current();
            switch (t.type) {
                case ANGKA: advance(); return new NumberNode(t.numVal);
                case TEKS: advance(); return new StringNode(t.value);
                case BENAR: advance(); return new BooleanNode(true);
                case SALAH: advance(); return new BooleanNode(false);
                case KOSONG: advance(); return new NullNode();
                case IDENTIFIER: advance(); return new IdentifierNode(t.value);
                case LPAREN: advance(); ASTNode e = parseExpression(); expect(TokenType.RPAREN); return e;
                case LBRACKET:
                    advance(); List<ASTNode> elements = new ArrayList<>();
                    if (current().type != TokenType.RBRACKET) {
                        elements.add(parseExpression());
                        while (match(TokenType.COMMA) != null) elements.add(parseExpression());
                    }
                    expect(TokenType.RBRACKET);
                    return new ListNode(elements);
                default:
                    System.err.println("❌ Ekspresi tidak valid di baris " + t.line);
                    System.exit(1); return null;
            }
        }
    }

    // ============================================================
    // INTERPRETER
    // ============================================================

    static class BreakSignal extends RuntimeException {}
    static class ContinueSignal extends RuntimeException {}
    static class ReturnSignal extends RuntimeException { Object value; ReturnSignal(Object v) { value = v; } }

    static class JakartaFunction {
        String name; List<String> params; ASTNode body; Environment closure;
        JakartaFunction(String n, List<String> p, ASTNode b, Environment c) {
            name = n; params = p; body = b; closure = c;
        }
    }

    @FunctionalInterface
    interface BuiltinFunc { Object apply(List<Object> args); }

    static class Environment {
        Map<String, Object> vars = new HashMap<>();
        Set<String> consts = new HashSet<>();
        Environment parent;

        Environment(Environment parent) { this.parent = parent; }

        Object get(String name) {
            if (vars.containsKey(name)) return vars.get(name);
            if (parent != null) return parent.get(name);
            throw new RuntimeException("Variabel \"" + name + "\" tidak ditemukan");
        }

        void set(String name, Object value) {
            if (consts.contains(name)) throw new RuntimeException("Tidak bisa mengubah konstan \"" + name + "\"");
            if (vars.containsKey(name)) { vars.put(name, value); return; }
            if (parent != null && parent.has(name)) { parent.set(name, value); return; }
            vars.put(name, value);
        }

        void define(String name, Object value, boolean isConst) {
            vars.put(name, value);
            if (isConst) consts.add(name);
        }

        boolean has(String name) {
            if (vars.containsKey(name)) return true;
            return parent != null && parent.has(name);
        }
    }

    static class Interpreter {
        Environment globalEnv;

        Interpreter() {
            globalEnv = new Environment(null);
            setupBuiltins();
        }

        void setupBuiltins() {
            globalEnv.define("panjang", (BuiltinFunc) args -> {
                Object v = args.get(0);
                if (v instanceof List) return (double) ((List<?>) v).size();
                if (v instanceof String) return (double) ((String) v).length();
                return 0.0;
            }, false);

            globalEnv.define("tipe", (BuiltinFunc) args -> {
                Object v = args.get(0);
                if (v instanceof Double) return "angka";
                if (v instanceof String) return "teks";
                if (v instanceof Boolean) return "boolean";
                if (v instanceof List) return "daftar";
                if (v == null) return "kosong";
                return "tidak_diketahui";
            }, false);

            globalEnv.define("angka", (BuiltinFunc) args -> {
                Object v = args.get(0);
                if (v instanceof String) {
                    String s = (String) v;
                    return s.contains(".") ? Double.parseDouble(s) : (double) Integer.parseInt(s);
                }
                return v instanceof Double ? v : 0.0;
            }, false);

            globalEnv.define("teks", (BuiltinFunc) args -> formatValue(args.get(0)), false);
            globalEnv.define("urut", (BuiltinFunc) args -> {
                @SuppressWarnings("unchecked")
                List<Object> list = new ArrayList<>((List<Object>) args.get(0));
                list.sort((a, b) -> Double.compare(toDouble(a), toDouble(b)));
                return list;
            }, false);

            globalEnv.define("balik", (BuiltinFunc) args -> {
                Object v = args.get(0);
                if (v instanceof List) { List<Object> l = new ArrayList<>((List<?>) v); Collections.reverse(l); return l; }
                if (v instanceof String) return new StringBuilder((String) v).reverse().toString();
                return v;
            }, false);

            globalEnv.define("rentang", (BuiltinFunc) args -> {
                int start = 0, end = 0, step = 1;
                if (args.size() == 1) { end = toDouble(args.get(0)).intValue(); }
                else if (args.size() >= 2) {
                    start = toDouble(args.get(0)).intValue();
                    end = toDouble(args.get(1)).intValue();
                    if (args.size() > 2) step = toDouble(args.get(2)).intValue();
                }
                List<Object> result = new ArrayList<>();
                if (step > 0) for (int i = start; i < end; i += step) result.add((double) i);
                else if (step < 0) for (int i = start; i > end; i += step) result.add((double) i);
                return result;
            }, false);

            globalEnv.define("bulat", (BuiltinFunc) args -> (double) Math.round(toDouble(args.get(0))), false);
            globalEnv.define("lantai", (BuiltinFunc) args -> (double) (int) Math.floor(toDouble(args.get(0))), false);
            globalEnv.define("atap", (BuiltinFunc) args -> (double) (int) Math.ceil(toDouble(args.get(0))), false);
            globalEnv.define("akar", (BuiltinFunc) args -> Math.sqrt(toDouble(args.get(0))), false);
            globalEnv.define("abs", (BuiltinFunc) args -> Math.abs(toDouble(args.get(0))), false);
            globalEnv.define("besar", (BuiltinFunc) args -> formatValue(args.get(0)).toUpperCase(), false);
            globalEnv.define("kecil", (BuiltinFunc) args -> formatValue(args.get(0)).toLowerCase(), false);
            globalEnv.define("gabung", (BuiltinFunc) args -> {
                @SuppressWarnings("unchecked")
                List<Object> list = (List<Object>) args.get(0);
                String sep = formatValue(args.get(1));
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < list.size(); i++) {
                    if (i > 0) sb.append(sep);
                    sb.append(formatValue(list.get(i)));
                }
                return sb.toString();
            }, false);

            globalEnv.define("belah", (BuiltinFunc) args -> {
                String s = formatValue(args.get(0));
                String sep = args.size() > 1 ? formatValue(args.get(1)) : " ";
                String[] parts = s.split(sep, -1);
                List<Object> result = new ArrayList<>();
                for (String p : parts) result.add(p);
                return result;
            }, false);

            globalEnv.define("ganti", (BuiltinFunc) args -> {
                String s = formatValue(args.get(0));
                return s.replace(formatValue(args.get(1)), formatValue(args.get(2)));
            }, false);

            globalEnv.define("PI", Math.PI, true);
            globalEnv.define("E", Math.E, true);
        }

        void run(String source) {
            Lexer lexer = new Lexer(source);
            List<Token> tokens = lexer.tokenize();
            Parser parser = new Parser(tokens);
            ASTNode ast = parser.parse();
            execute(ast, globalEnv);
        }

        @SuppressWarnings("unchecked")
        Object execute(ASTNode node, Environment env) {
            if (node instanceof BlockNode) {
                Object result = null;
                for (ASTNode s : ((BlockNode) node).statements) result = execute(s, env);
                return result;
            }
            if (node instanceof NumberNode) return ((NumberNode) node).value;
            if (node instanceof StringNode) return ((StringNode) node).value;
            if (node instanceof BooleanNode) return ((BooleanNode) node).value;
            if (node instanceof NullNode) return null;
            if (node instanceof IdentifierNode) return env.get(((IdentifierNode) node).name);

            if (node instanceof BinaryOpNode) {
                BinaryOpNode bin = (BinaryOpNode) node;
                Object left = execute(bin.left, env);

                if (bin.op.equals("dan") || bin.op.equals("&&"))
                    return !isTruthy(left) ? left : execute(bin.right, env);
                if (bin.op.equals("atau") || bin.op.equals("||"))
                    return isTruthy(left) ? left : execute(bin.right, env);

                Object right = execute(bin.right, env);
                switch (bin.op) {
                    case "+":
                        if (left instanceof String || right instanceof String)
                            return formatValue(left) + formatValue(right);
                        if (left instanceof List) {
                            List<Object> l = new ArrayList<>((List<Object>) left);
                            if (right instanceof List) l.addAll((List<Object>) right);
                            else l.add(right);
                            return l;
                        }
                        return toDouble(left) + toDouble(right);
                    case "-": return toDouble(left) - toDouble(right);
                    case "*": return toDouble(left) * toDouble(right);
                    case "/":
                        double r = toDouble(right);
                        if (r == 0) throw new RuntimeException("Pembagian dengan nol");
                        return toDouble(left) / r;
                    case "%": return (double) (toDouble(left).intValue() % toDouble(right).intValue());
                    case "**": return Math.pow(toDouble(left), toDouble(right));
                    case "==": return left.equals(right);
                    case "!=": return !left.equals(right);
                    case "<": return toDouble(left) < toDouble(right);
                    case ">": return toDouble(left) > toDouble(right);
                    case "<=": return toDouble(left) <= toDouble(right);
                    case ">=": return toDouble(left) >= toDouble(right);
                    case "..":
                        List<Object> range = new ArrayList<>();
                        for (int i = toDouble(left).intValue(); i <= toDouble(right).intValue(); i++)
                            range.add((double) i);
                        return range;
                }
            }

            if (node instanceof UnaryOpNode) {
                UnaryOpNode un = (UnaryOpNode) node;
                Object operand = execute(un.operand, env);
                if (un.op.equals("-")) return -toDouble(operand);
                if (un.op.equals("!") || un.op.equals("bukan")) return !isTruthy(operand);
            }

            if (node instanceof AssignNode) {
                AssignNode a = (AssignNode) node;
                Object val = execute(a.value, env);
                env.set(a.name, val);
                return val;
            }

            if (node instanceof VarDeclNode) {
                VarDeclNode vd = (VarDeclNode) node;
                Object val = execute(vd.value, env);
                env.define(vd.name, val, vd.isConst);
                return val;
            }

            if (node instanceof PrintNode) {
                Object val = execute(((PrintNode) node).value, env);
                System.out.println(formatValue(val));
                return val;
            }

            if (node instanceof IfNode) {
                IfNode ifNode = (IfNode) node;
                if (isTruthy(execute(ifNode.condition, env)))
                    return execute(ifNode.body, new Environment(env));
                else if (ifNode.elseBody != null)
                    return execute(ifNode.elseBody, new Environment(env));
                return null;
            }

            if (node instanceof WhileNode) {
                WhileNode w = (WhileNode) node;
                Object result = null;
                while (isTruthy(execute(w.condition, env))) {
                    try { result = execute(w.body, new Environment(env)); }
                    catch (BreakSignal e) { break; }
                    catch (ContinueSignal e) { continue; }
                }
                return result;
            }

            if (node instanceof ForNode) {
                ForNode f = (ForNode) node;
                Object iterable = execute(f.iterable, env);
                Object result = null;
                if (iterable instanceof List) {
                    for (Object item : (List<?>) iterable) {
                        try {
                            Environment loopEnv = new Environment(env);
                            loopEnv.define(f.varName, item, false);
                            result = execute(f.body, loopEnv);
                        } catch (BreakSignal e) { break; }
                        catch (ContinueSignal e) { continue; }
                    }
                }
                return result;
            }

            if (node instanceof FunctionDefNode) {
                FunctionDefNode fd = (FunctionDefNode) node;
                JakartaFunction fn = new JakartaFunction(fd.name, fd.params, fd.body, env);
                env.define(fd.name, fn, false);
                return fn;
            }

            if (node instanceof ReturnNode) {
                ReturnNode rn = (ReturnNode) node;
                Object val = execute(rn.value, env);
                throw new ReturnSignal(val);
            }

            if (node instanceof FunctionCallNode) {
                FunctionCallNode fc = (FunctionCallNode) node;
                Object fn = env.get(fc.name);
                List<Object> argVals = new ArrayList<>();
                for (ASTNode a : fc.args) argVals.add(execute(a, env));

                if (fn instanceof BuiltinFunc) return ((BuiltinFunc) fn).apply(argVals);

                if (fn instanceof JakartaFunction) {
                    JakartaFunction f = (JakartaFunction) fn;
                    Environment funcEnv = new Environment(f.closure);
                    for (int i = 0; i < f.params.size(); i++)
                        funcEnv.define(f.params.get(i), i < argVals.size() ? argVals.get(i) : null, false);
                    try { return execute(f.body, funcEnv); }
                    catch (ReturnSignal rs) { return rs.value; }
                }

                throw new RuntimeException("\"" + fc.name + "\" bukan fungsi");
            }

            if (node instanceof ListNode) {
                List<Object> result = new ArrayList<>();
                for (ASTNode el : ((ListNode) node).elements) result.add(execute(el, env));
                return result;
            }

            if (node instanceof IndexAccessNode) {
                IndexAccessNode ia = (IndexAccessNode) node;
                Object obj = execute(ia.obj, env);
                Object index = execute(ia.index, env);
                if (obj instanceof List) return ((List<?>) obj).get(toDouble(index).intValue());
                if (obj instanceof String) return String.valueOf(((String) obj).charAt(toDouble(index).intValue()));
                return null;
            }

            if (node instanceof DotAccessNode) {
                DotAccessNode da = (DotAccessNode) node;
                Object obj = execute(da.obj, env);
                if (da.attr.equals("panjang")) {
                    if (obj instanceof List) return (double) ((List<?>) obj).size();
                    if (obj instanceof String) return (double) ((String) obj).length();
                }
                return null;
            }

            if (node instanceof BreakNode) throw new BreakSignal();
            if (node instanceof ContinueNode) throw new ContinueSignal();

            if (node instanceof TernaryNode) {
                TernaryNode tn = (TernaryNode) node;
                return isTruthy(execute(tn.condition, env)) ? execute(tn.trueExpr, env) : execute(tn.falseExpr, env);
            }

            return null;
        }

        Double toDouble(Object v) {
            if (v instanceof Double) return (Double) v;
            if (v instanceof Boolean) return ((Boolean) v) ? 1.0 : 0.0;
            if (v instanceof String) { try { return Double.parseDouble((String) v); } catch (Exception e) { return 0.0; } }
            return 0.0;
        }

        boolean isTruthy(Object v) {
            if (v == null) return false;
            if (v instanceof Boolean) return (Boolean) v;
            if (v instanceof Double) return (Double) v != 0;
            if (v instanceof String) return !((String) v).isEmpty();
            if (v instanceof List) return !((List<?>) v).isEmpty();
            return true;
        }

        String formatValue(Object v) {
            if (v == null) return "kosong";
            if (v instanceof Boolean) return (Boolean) v ? "benar" : "salah";
            if (v instanceof Double) {
                double d = (Double) v;
                if (d == Math.floor(d) && Math.abs(d) < 1e15) return String.valueOf((long) d);
                return String.valueOf(d);
            }
            if (v instanceof String) return (String) v;
            if (v instanceof List) {
                StringBuilder sb = new StringBuilder("[");
                List<?> list = (List<?>) v;
                for (int i = 0; i < list.size(); i++) {
                    if (i > 0) sb.append(", ");
                    sb.append(formatValue(list.get(i)));
                }
                sb.append("]");
                return sb.toString();
            }
            if (v instanceof JakartaFunction) return "<fungsi " + ((JakartaFunction) v).name + ">";
            if (v instanceof BuiltinFunc) return "<fungsi bawaan>";
            return String.valueOf(v);
        }
    }

    // ============================================================
    // MAIN
    // ============================================================

    public static void main(String[] args) {
        if (args.length < 1) {
            System.out.println("🇮🇩 Jakarta Language Interpreter (Java) v0.1.0");
            System.out.println("Cara pakai: java JakartaInterpreter <file.jkt>");
            return;
        }

        String filePath = args[0];
        if (!filePath.endsWith(".jkt")) {
            System.err.println("❌ File harus berekstensi .jkt");
            System.exit(1);
        }

        String source;
        try {
            source = new String(java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(filePath)));
        } catch (IOException e) {
            System.err.println("❌ File \"" + filePath + "\" tidak ditemukan");
            System.exit(1);
            return;
        }

        Interpreter interp = new Interpreter();
        try {
            interp.run(source);
        } catch (BreakSignal | ContinueSignal e) {
            // ignore
        } catch (ReturnSignal e) {
            // ignore
        } catch (Exception e) {
            System.err.println("❌ Kesalahan: " + e.getMessage());
            System.exit(1);
        }
    }
}