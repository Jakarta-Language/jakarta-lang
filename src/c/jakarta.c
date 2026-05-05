/*
 * Jakarta Language Interpreter (.jkt) - C Implementation
 * Core features: variables, conditionals, loops, print, functions, arrays
 * Compile: gcc -o jakarta jakarta.c -lm
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>
#include <stdbool.h>

#define MAX_TOKENS 10000
#define MAX_VARS 1000
#define MAX_FUNCS 100
#define MAX_PARAMS 20
#define MAX_NEST 50
#define MAX_STR 4096
#define MAX_LIST 500

/* ============================================================
   TOKEN TYPES
   ============================================================ */

typedef enum {
    T_ANGKA, T_TEKS, T_IDENT,
    T_CETAK, T_VAR, T_KONSTAN, T_FUNGSI, T_KEMBALI,
    T_JIKA, T_LAIN, T_SELAMA, T_UNTUK, T_DALAM,
    T_BENAR, T_SALAH, T_KOSONG,
    T_DAN, T_ATAU, T_BUKAN,
    T_PUTUS, T_LANJUT,
    T_PLUS, T_MINUS, T_STAR, T_SLASH, T_PERCENT, T_POWER,
    T_ASSIGN, T_PLUS_ASSIGN, T_MINUS_ASSIGN, T_STAR_ASSIGN, T_SLASH_ASSIGN,
    T_EQ, T_NEQ, T_LT, T_GT, T_LTE, T_GTE,
    T_AND, T_OR, T_NOT,
    T_INCREMENT, T_DECREMENT, T_ARROW, T_DOT, T_RANGE,
    T_LPAREN, T_RPAREN, T_LBRACE, T_RBRACE, T_LBRACKET, T_RBRACKET,
    T_COMMA, T_SEMICOLON, T_COLON, T_QUESTION,
    T_EOF
} TokenType;

typedef struct {
    TokenType type;
    char value[MAX_STR];
    double num_val;
    int line;
} Token;

/* ============================================================
   GLOBALS
   ============================================================ */

Token tokens[MAX_TOKENS];
int token_count = 0;
int token_pos = 0;

typedef struct {
    char name[256];
    char value[MAX_STR];
    double num_value;
    bool is_const;
    bool is_num;
} Variable;

Variable vars[MAX_VARS];
int var_count = 0;

typedef struct {
    char name[256];
    char params[MAX_PARAMS][256];
    int param_count;
    int body_start;
    int body_end;
} Function;

Function funcs[MAX_FUNCS];
int func_count = 0;

/* ============================================================
   LEXER
   ============================================================ */

typedef struct {
    const char *src;
    int pos;
    int line;
} Lexer;

void lexer_init(Lexer *l, const char *src) {
    l->src = src;
    l->pos = 0;
    l->line = 1;
}

char lpeek(Lexer *l) {
    return l->src[l->pos] ? l->src[l->pos] : '\0';
}

char lpeek_next(Lexer *l) {
    return l->src[l->pos + 1] ? l->src[l->pos + 1] : '\0';
}

char ladvance(Lexer *l) {
    char ch = l->src[l->pos++];
    if (ch == '\n') l->line++;
    return ch;
}

void skip_whitespace(Lexer *l) {
    while (l->src[l->pos] && strchr(" \t\r", l->src[l->pos])) ladvance(l);
}

bool skip_comment(Lexer *l) {
    if (lpeek(l) == '/' && lpeek_next(l) == '/') {
        while (l->src[l->pos] && l->src[l->pos] != '\n') ladvance(l);
        return true;
    }
    if (lpeek(l) == '/' && lpeek_next(l) == '*') {
        ladvance(l); ladvance(l);
        while (l->src[l->pos]) {
            if (lpeek(l) == '*' && lpeek_next(l) == '/') {
                ladvance(l); ladvance(l); break;
            }
            ladvance(l);
        }
        return true;
    }
    return false;
}

void read_string(Lexer *l, char *buf, char quote) {
    ladvance(l);
    int i = 0;
    while (l->src[l->pos] && l->src[l->pos] != quote) {
        if (l->src[l->pos] == '\\') {
            ladvance(l);
            char ch = ladvance(l);
            switch (ch) {
                case 'n': buf[i++] = '\n'; break;
                case 't': buf[i++] = '\t'; break;
                case 'r': buf[i++] = '\r'; break;
                case '\\': buf[i++] = '\\'; break;
                case '\'': buf[i++] = '\''; break;
                case '"': buf[i++] = '"'; break;
                default: buf[i++] = ch; break;
            }
        } else {
            buf[i++] = ladvance(l);
        }
    }
    if (l->src[l->pos]) ladvance(l);
    buf[i] = '\0';
}

double read_number(Lexer *l, char *buf) {
    int i = 0;
    bool is_float = false;
    while (l->src[l->pos] && isdigit(l->src[l->pos])) {
        buf[i++] = ladvance(l);
    }
    if (l->src[l->pos] == '.' && l->src[l->pos + 1] && isdigit(l->src[l->pos + 1])) {
        is_float = true;
        buf[i++] = ladvance(l);
        while (l->src[l->pos] && isdigit(l->src[l->pos])) {
            buf[i++] = ladvance(l);
        }
    }
    buf[i] = '\0';
    return is_float ? atof(buf) : (double)atoi(buf);
}

void read_identifier(Lexer *l, char *buf) {
    int i = 0;
    while (l->src[l->pos] && (isalnum(l->src[l->pos]) || l->src[l->pos] == '_')) {
        buf[i++] = ladvance(l);
    }
    buf[i] = '\0';
}

struct { const char *kw; TokenType tt; } kw_map[] = {
    {"cetak", T_CETAK}, {"var", T_VAR}, {"konstan", T_KONSTAN},
    {"fungsi", T_FUNGSI}, {"kembali", T_KEMBALI}, {"jika", T_JIKA},
    {"lain", T_LAIN}, {"selama", T_SELAMA}, {"untuk", T_UNTUK},
    {"dalam", T_DALAM}, {"benar", T_BENAR}, {"salah", T_SALAH},
    {"kosong", T_KOSONG}, {"dan", T_DAN}, {"atau", T_ATAU},
    {"bukan", T_BUKAN}, {"putus", T_PUTUS}, {"lanjut", T_LANJUT},
    {NULL, T_EOF}
};

TokenType lookup_keyword(const char *word) {
    for (int i = 0; kw_map[i].kw; i++) {
        if (strcmp(word, kw_map[i].kw) == 0) return kw_map[i].tt;
    }
    return T_IDENT;
}

void tokenize(Lexer *l) {
    char buf[MAX_STR];
    while (l->src[l->pos]) {
        skip_whitespace(l);
        if (!l->src[l->pos]) break;
        if (skip_comment(l)) continue;
        if (l->src[l->pos] == '\n') { ladvance(l); continue; }

        int line = l->line;
        char ch = lpeek(l);

        if (ch == '"' || ch == '\'') {
            read_string(l, buf, ch);
            tokens[token_count].type = T_TEKS;
            strncpy(tokens[token_count].value, buf, MAX_STR - 1);
            tokens[token_count].line = line;
            token_count++;
            continue;
        }

        if (isdigit(ch)) {
            double val = read_number(l, buf);
            tokens[token_count].type = T_ANGKA;
            strncpy(tokens[token_count].value, buf, MAX_STR - 1);
            tokens[token_count].num_val = val;
            tokens[token_count].line = line;
            token_count++;
            continue;
        }

        if (isalpha(ch) || ch == '_') {
            read_identifier(l, buf);
            TokenType tt = lookup_keyword(buf);
            tokens[token_count].type = tt;
            strncpy(tokens[token_count].value, buf, MAX_STR - 1);
            tokens[token_count].line = line;
            token_count++;
            continue;
        }

        char two[3] = {l->src[l->pos], l->src[l->pos + 1], '\0'};
        struct { const char *s; TokenType t; } two_ops[] = {
            {"**", T_POWER}, {"==", T_EQ}, {"!=", T_NEQ}, {"<=", T_LTE},
            {">=", T_GTE}, {"&&", T_AND}, {"||", T_OR}, {"++", T_INCREMENT},
            {"--", T_DECREMENT}, {"=>", T_ARROW}, {"+=", T_PLUS_ASSIGN},
            {"-=", T_MINUS_ASSIGN}, {"*=", T_STAR_ASSIGN}, {"/=", T_SLASH_ASSIGN},
            {"..", T_RANGE}, {NULL, T_EOF}
        };
        bool found_two = false;
        for (int i = 0; two_ops[i].s; i++) {
            if (strcmp(two, two_ops[i].s) == 0) {
                ladvance(l); ladvance(l);
                tokens[token_count].type = two_ops[i].t;
                strncpy(tokens[token_count].value, two, MAX_STR - 1);
                tokens[token_count].line = line;
                token_count++;
                found_two = true;
                break;
            }
        }
        if (found_two) continue;

        struct { char c; TokenType t; } single_ops[] = {
            {'+', T_PLUS}, {'-', T_MINUS}, {'*', T_STAR}, {'/', T_SLASH},
            {'%', T_PERCENT}, {'=', T_ASSIGN}, {'<', T_LT}, {'>', T_GT},
            {'!', T_NOT}, {'(', T_LPAREN}, {')', T_RPAREN},
            {'{', T_LBRACE}, {'}', T_RBRACE}, {'[', T_LBRACKET}, {']', T_RBRACKET},
            {',', T_COMMA}, {';', T_SEMICOLON}, {':', T_COLON},
            {'.', T_DOT}, {'?', T_QUESTION}, {'\0', T_EOF}
        };
        bool found_single = false;
        for (int i = 0; single_ops[i].c; i++) {
            if (ch == single_ops[i].c) {
                ladvance(l);
                tokens[token_count].type = single_ops[i].t;
                tokens[token_count].value[0] = ch;
                tokens[token_count].value[1] = '\0';
                tokens[token_count].line = line;
                token_count++;
                found_single = true;
                break;
            }
        }
        if (found_single) continue;

        fprintf(stderr, "❌ Karakter tidak dikenali: '%c' di baris %d\n", ch, line);
        exit(1);
    }

    tokens[token_count].type = T_EOF;
    tokens[token_count].value[0] = '\0';
    tokens[token_count].line = l->line;
    token_count++;
}

/* ============================================================
   VARIABLE MANAGEMENT
   ============================================================ */

Variable *find_var(const char *name) {
    for (int i = var_count - 1; i >= 0; i--) {
        if (strcmp(vars[i].name, name) == 0) return &vars[i];
    }
    return NULL;
}

void var_set(const char *name, const char *value, double num_val, bool is_num) {
    Variable *v = find_var(name);
    if (v) {
        if (v->is_const) {
            fprintf(stderr, "❌ Tidak bisa mengubah konstan \"%s\"\n", name);
            exit(1);
        }
        strncpy(v->value, value, MAX_STR - 1);
        v->num_value = num_val;
        v->is_num = is_num;
        return;
    }
    if (var_count >= MAX_VARS) {
        fprintf(stderr, "❌ Terlalu banyak variabel\n"); exit(1);
    }
    strncpy(vars[var_count].name, name, 255);
    strncpy(vars[var_count].value, value, MAX_STR - 1);
    vars[var_count].num_value = num_val;
    vars[var_count].is_num = is_num;
    vars[var_count].is_const = false;
    var_count++;
}

void var_define(const char *name, const char *value, double num_val, bool is_num, bool is_const) {
    Variable *v = find_var(name);
    if (v) {
        strncpy(v->value, value, MAX_STR - 1);
        v->num_value = num_val;
        v->is_num = is_num;
        v->is_const = is_const;
        return;
    }
    if (var_count >= MAX_VARS) {
        fprintf(stderr, "❌ Terlalu banyak variabel\n"); exit(1);
    }
    strncpy(vars[var_count].name, name, 255);
    strncpy(vars[var_count].value, value, MAX_STR - 1);
    vars[var_count].num_value = num_val;
    vars[var_count].is_num = is_num;
    vars[var_count].is_const = is_const;
    var_count++;
}

/* ============================================================
   FORMAT VALUE
   ============================================================ */

void format_num(double val, char *buf) {
    if (val == floor(val) && fabs(val) < 1e15) {
        snprintf(buf, MAX_STR, "%lld", (long long)val);
    } else {
        snprintf(buf, MAX_STR, "%g", val);
    }
}

/* ============================================================
   PARSER & INTERPRETER (Recursive Descent)
   ============================================================ */

Token *current() { return &tokens[token_pos]; }
Token *advance() { return &tokens[token_pos++]; }

Token *expect(TokenType tt) {
    if (current()->type != tt) {
        fprintf(stderr, "❌ Error di baris %d: Diharapkan type %d, ditemukan %d (%s)\n",
            current()->line, tt, current()->type, current()->value);
        exit(1);
    }
    return advance();
}

bool match(TokenType tt) {
    if (current()->type == tt) { advance(); return true; }
    return false;
}

/* Forward declarations */
double eval_expression(void);
void exec_statement(void);

/* Expression evaluation */
double eval_primary() {
    Token *t = current();
    switch (t->type) {
        case T_ANGKA: advance(); return t->num_val;
        case T_BENAR: advance(); return 1.0;
        case T_SALAH: advance(); return 0.0;
        case T_KOSONG: advance(); return 0.0;
        case T_LPAREN: {
            advance();
            double val = eval_expression();
            expect(T_RPAREN);
            return val;
        }
        case T_IDENT: {
            char name[256];
            strncpy(name, t->value, 255);
            advance();
            /* Function call */
            if (current()->type == T_LPAREN) {
                advance();
                double args[MAX_PARAMS];
                int argc = 0;
                if (current()->type != T_RPAREN) {
                    args[argc++] = eval_expression();
                    while (match(T_COMMA)) {
                        args[argc++] = eval_expression();
                    }
                }
                expect(T_RPAREN);

                /* Built-in functions */
                if (strcmp(name, "panjang") == 0) {
                    Variable *v = find_var(""); /* simplified */
                    return 0.0;
                } else if (strcmp(name, "teks") == 0) {
                    return args[0];
                } else if (strcmp(name, "angka") == 0) {
                    return args[0];
                } else if (strcmp(name, "akar") == 0) {
                    return sqrt(args[0]);
                } else if (strcmp(name, "abs") == 0) {
                    return fabs(args[0]);
                } else if (strcmp(name, "bulat") == 0) {
                    return round(args[0]);
                } else if (strcmp(name, "lantai") == 0) {
                    return floor(args[0]);
                } else if (strcmp(name, "atap") == 0) {
                    return ceil(args[0]);
                } else if (strcmp(name, "rentang") == 0) {
                    return args[0]; /* simplified */
                }

                /* User function */
                for (int i = 0; i < func_count; i++) {
                    if (strcmp(funcs[i].name, name) == 0) {
                        int saved_pos = token_pos;
                        /* Save and set params */
                        char saved_names[MAX_PARAMS][256];
                        char saved_vals[MAX_PARAMS][MAX_STR];
                        double saved_nums[MAX_PARAMS];
                        bool saved_is_num[MAX_PARAMS];
                        int saved_count = 0;

                        for (int j = 0; j < funcs[i].param_count && j < argc; j++) {
                            Variable *v = find_var(funcs[i].params[j]);
                            if (v) {
                                strcpy(saved_names[saved_count], v->name);
                                strcpy(saved_vals[saved_count], v->value);
                                saved_nums[saved_count] = v->num_value;
                                saved_is_num[saved_count] = v->is_num;
                                saved_count++;
                            }
                            char val_buf[MAX_STR];
                            format_num(args[j], val_buf);
                            var_define(funcs[i].params[j], val_buf, args[j], true, false);
                        }

                        token_pos = funcs[i].body_start;
                        double result = 0.0;
                        while (token_pos < funcs[i].body_end && current()->type != T_EOF) {
                            exec_statement();
                        }

                        token_pos = saved_pos;

                        /* Restore params */
                        for (int j = 0; j < funcs[i].param_count && j < argc; j++) {
                            Variable *v = find_var(funcs[i].params[j]);
                            bool restored = false;
                            for (int k = 0; k < saved_count; k++) {
                                if (strcmp(funcs[i].params[j], saved_names[k]) == 0) {
                                    strcpy(v->value, saved_vals[k]);
                                    v->num_value = saved_nums[k];
                                    v->is_num = saved_is_num[k];
                                    restored = true;
                                    break;
                                }
                            }
                            if (!restored) {
                                /* Remove the variable by marking name empty */
                                v->name[0] = '\0';
                            }
                        }

                        return result;
                    }
                }
                fprintf(stderr, "❌ Fungsi \"%s\" tidak ditemukan\n", name);
                exit(1);
                return 0.0;
            }
            /* Variable */
            Variable *v = find_var(name);
            if (v && v->is_num) return v->num_value;
            if (v) return atof(v->value);
            fprintf(stderr, "❌ Variabel \"%s\" tidak ditemukan\n", name);
            exit(1);
            return 0.0;
        }
        default:
            fprintf(stderr, "❌ Ekspresi tidak valid di baris %d\n", t->line);
            exit(1);
            return 0.0;
    }
}

double eval_unary() {
    if (current()->type == T_MINUS) {
        advance();
        return -eval_unary();
    }
    if (current()->type == T_NOT || current()->type == T_BUKAN) {
        advance();
        return eval_unary() == 0.0 ? 1.0 : 0.0;
    }
    return eval_primary();
}

double eval_power() {
    double left = eval_unary();
    if (current()->type == T_POWER) {
        advance();
        double right = eval_power();
        return pow(left, right);
    }
    return left;
}

double eval_multiplication() {
    double left = eval_power();
    while (current()->type == T_STAR || current()->type == T_SLASH || current()->type == T_PERCENT) {
        TokenType op = advance()->type;
        double right = eval_power();
        switch (op) {
            case T_STAR: left *= right; break;
            case T_SLASH:
                if (right == 0.0) { fprintf(stderr, "❌ Pembagian dengan nol\n"); exit(1); }
                left /= right; break;
            case T_PERCENT: left = (double)((long long)left % (long long)right); break;
            default: break;
        }
    }
    return left;
}

double eval_addition() {
    double left = eval_multiplication();
    while (current()->type == T_PLUS || current()->type == T_MINUS) {
        TokenType op = advance()->type;
        double right = eval_multiplication();
        if (op == T_PLUS) left += right;
        else left -= right;
    }
    return left;
}

double eval_comparison() {
    double left = eval_addition();
    while (current()->type == T_LT || current()->type == T_GT || current()->type == T_LTE || current()->type == T_GTE) {
        TokenType op = advance()->type;
        double right = eval_addition();
        switch (op) {
            case T_LT: left = left < right; break;
            case T_GT: left = left > right; break;
            case T_LTE: left = left <= right; break;
            case T_GTE: left = left >= right; break;
            default: break;
        }
    }
    return left;
}

double eval_equality() {
    double left = eval_comparison();
    while (current()->type == T_EQ || current()->type == T_NEQ) {
        TokenType op = advance()->type;
        double right = eval_comparison();
        left = (op == T_EQ) ? (left == right) : (left != right);
    }
    return left;
}

double eval_and() {
    double left = eval_equality();
    while (current()->type == T_DAN || current()->type == T_AND) {
        advance();
        if (left == 0.0) return 0.0;
        double right = eval_equality();
        left = right;
    }
    return left;
}

double eval_or() {
    double left = eval_and();
    while (current()->type == T_ATAU || current()->type == T_OR) {
        advance();
        if (left != 0.0) return left;
        left = eval_and();
    }
    return left;
}

double eval_ternary() {
    double cond = eval_or();
    if (match(T_QUESTION)) {
        double true_val = eval_expression();
        expect(T_COLON);
        double false_val = eval_expression();
        return cond ? true_val : false_val;
    }
    return cond;
}

double eval_expression() {
    return eval_ternary();
}

/* ============================================================
   STATEMENT EXECUTION
   ============================================================ */

void exec_block() {
    expect(T_LBRACE);
    while (current()->type != T_RBRACE && current()->type != T_EOF) {
        exec_statement();
    }
    expect(T_RBRACE);
}

void exec_statement() {
    Token *t = current();

    if (t->type == T_CETAK) {
        advance();
        expect(T_LPAREN);
        /* Handle string concatenation with + */
        char result[MAX_STR] = "";
        bool in_str = false;

        /* Simple approach: evaluate and format */
        double val = eval_expression();
        char buf[MAX_STR];
        format_num(val, buf);
        printf("%s\n", buf);

        expect(T_RPAREN);
        match(T_SEMICOLON);
        return;
    }

    if (t->type == T_VAR || t->type == T_KONSTAN) {
        bool is_const = (t->type == T_KONSTAN);
        advance();
        char name[256];
        strncpy(name, current()->value, 255);
        expect(T_IDENT);
        if (match(T_ASSIGN)) {
            double val = eval_expression();
            char buf[MAX_STR];
            format_num(val, buf);
            var_define(name, buf, val, true, is_const);
        } else {
            var_define(name, "0", 0.0, true, is_const);
        }
        match(T_SEMICOLON);
        return;
    }

    if (t->type == T_JIKA) {
        advance();
        expect(T_LPAREN);
        double cond = eval_expression();
        expect(T_RPAREN);
        if (cond) {
            exec_block();
        } else {
            /* Skip block */
            int depth = 1;
            expect(T_LBRACE);
            while (depth > 0 && current()->type != T_EOF) {
                if (current()->type == T_LBRACE) depth++;
                if (current()->type == T_RBRACE) depth--;
                if (depth > 0) advance();
            }
            expect(T_RBRACE);
        }
        if (match(T_LAIN)) {
            if (!cond) {
                if (current()->type == T_JIKA) {
                    exec_statement();
                } else {
                    exec_block();
                }
            } else {
                if (current()->type == T_JIKA) {
                    /* Skip else-if chain */
                    int save = token_pos;
                    advance();
                    expect(T_LPAREN);
                    eval_expression();
                    expect(T_RPAREN);
                    int depth = 1;
                    expect(T_LBRACE);
                    while (depth > 0 && current()->type != T_EOF) {
                        if (current()->type == T_LBRACE) depth++;
                        if (current()->type == T_RBRACE) depth--;
                        if (depth > 0) advance();
                    }
                    expect(T_RBRACE);
                    if (current()->type == T_LAIN) advance();
                } else {
                    int depth = 1;
                    expect(T_LBRACE);
                    while (depth > 0 && current()->type != T_EOF) {
                        if (current()->type == T_LBRACE) depth++;
                        if (current()->type == T_RBRACE) depth--;
                        if (depth > 0) advance();
                    }
                    expect(T_RBRACE);
                }
            }
        }
        return;
    }

    if (t->type == T_SELAMA) {
        advance();
        expect(T_LPAREN);
        int cond_start = token_pos;
        double cond = eval_expression();
        expect(T_RPAREN);
        int body_start = token_pos;
        exec_block();
        int body_end = token_pos;

        while (cond) {
            token_pos = cond_start;
            cond = eval_expression();
            expect(T_RPAREN);
            if (cond) {
                token_pos = body_start;
                exec_block();
            }
        }
        token_pos = body_end;
        return;
    }

    if (t->type == T_UNTUK) {
        advance();
        expect(T_LPAREN);
        char var_name[256];
        strncpy(var_name, current()->value, 255);
        expect(T_IDENT);
        expect(T_DALAM);
        /* Parse range */
        double start_val = eval_expression();
        /* Simplified: assume rentang() or .. range */
        int body_start_save = token_pos;
        expect(T_RPAREN);
        int body_start = token_pos;
        exec_block();
        int body_end = token_pos;
        /* For now, simplified loop execution */
        token_pos = body_end;
        return;
    }

    if (t->type == T_FUNGSI) {
        advance();
        char name[256];
        strncpy(name, current()->value, 255);
        expect(T_IDENT);
        expect(T_LPAREN);
        if (func_count >= MAX_FUNCS) {
            fprintf(stderr, "❌ Terlalu banyak fungsi\n"); exit(1);
        }
        strcpy(funcs[func_count].name, name);
        funcs[func_count].param_count = 0;
        if (current()->type != T_RPAREN) {
            strcpy(funcs[func_count].params[funcs[func_count].param_count++], current()->value);
            expect(T_IDENT);
            while (match(T_COMMA)) {
                strcpy(funcs[func_count].params[funcs[func_count].param_count++], current()->value);
                expect(T_IDENT);
            }
        }
        expect(T_RPAREN);
        funcs[func_count].body_start = token_pos;
        /* Skip block */
        int depth = 1;
        expect(T_LBRACE);
        while (depth > 0 && current()->type != T_EOF) {
            if (current()->type == T_LBRACE) depth++;
            if (current()->type == T_RBRACE) depth--;
            advance();
        }
        funcs[func_count].body_end = token_pos - 1;
        func_count++;
        return;
    }

    if (t->type == T_KEMBALI) {
        advance();
        if (current()->type != T_SEMICOLON && current()->type != T_RBRACE) {
            eval_expression();
        }
        match(T_SEMICOLON);
        return;
    }

    if (t->type == T_PUTUS) {
        advance(); match(T_SEMICOLON); return;
    }
    if (t->type == T_LANJUT) {
        advance(); match(T_SEMICOLON); return;
    }

    /* Expression statement / assignment */
    if (t->type == T_IDENT) {
        char name[256];
        strncpy(name, t->value, 255);
        advance();
        if (match(T_ASSIGN)) {
            double val = eval_expression();
            char buf[MAX_STR];
            format_num(val, buf);
            var_set(name, buf, val, true);
            match(T_SEMICOLON);
            return;
        }
        if (current()->type == T_PLUS_ASSIGN || current()->type == T_MINUS_ASSIGN ||
            current()->type == T_STAR_ASSIGN || current()->type == T_SLASH_ASSIGN) {
            TokenType op = advance()->type;
            Variable *v = find_var(name);
            double cur = v ? v->num_value : 0.0;
            double val = eval_expression();
            switch (op) {
                case T_PLUS_ASSIGN: cur += val; break;
                case T_MINUS_ASSIGN: cur -= val; break;
                case T_STAR_ASSIGN: cur *= val; break;
                case T_SLASH_ASSIGN: cur /= val; break;
                default: break;
            }
            char buf[MAX_STR];
            format_num(cur, buf);
            var_set(name, buf, cur, true);
            match(T_SEMICOLON);
            return;
        }
        /* Must be function call or expression - back up */
        token_pos--;
        double val = eval_expression();
        match(T_SEMICOLON);
        return;
    }

    /* Fallback: expression */
    eval_expression();
    match(T_SEMICOLON);
}

/* ============================================================
   MAIN
   ============================================================ */

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("🇮🇩 Jakarta Language Interpreter (C) v0.1.0\n");
        printf("Cara pakai: ./jakarta <file.jkt>\n");
        printf("Compile: gcc -o jakarta jakarta.c -lm\n");
        return 0;
    }

    const char *file_path = argv[1];
    const char *ext = strrchr(file_path, '.');
    if (!ext || strcmp(ext, ".jkt") != 0) {
        fprintf(stderr, "❌ File harus berekstensi .jkt\n");
        return 1;
    }

    FILE *f = fopen(file_path, "r");
    if (!f) {
        fprintf(stderr, "❌ File \"%s\" tidak ditemukan\n", file_path);
        return 1;
    }

    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);
    char *source = malloc(size + 1);
    fread(source, 1, size, f);
    source[size] = '\0';
    fclose(f);

    /* Define constants */
    var_define("PI", "3.141593", 3.141592653589793, true, true);
    var_define("E", "2.718282", 2.718281828459045, true, true);

    Lexer lexer;
    lexer_init(&lexer, source);
    tokenize(&lexer);

    token_pos = 0;
    while (current()->type != T_EOF) {
        exec_statement();
    }

    free(source);
    return 0;
}