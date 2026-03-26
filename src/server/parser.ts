export enum TokenType {
    Number = 'Number',
    Float = 'Float',
    String = 'String',
    Char = 'Char',
    Boolean = 'Boolean',
    Null = 'Null',
    Identifier = 'Identifier',
    Func = 'Func',
    Var = 'Var',
    Const = 'Const',
    Struct = 'Struct',
    Enum = 'Enum',
    Match = 'Match',
    If = 'If',
    Else = 'Else',
    While = 'While',
    For = 'For',
    In = 'In',
    Loop = 'Loop',
    Break = 'Break',
    Continue = 'Continue',
    Return = 'Return',
    Import = 'Import',
    Export = 'Export',
    Pub = 'Pub',
    Instanceof = 'Instanceof',
    IntType = 'IntType',
    UintType = 'UintType',
    ByteType = 'ByteType',
    FloatType = 'FloatType',
    DoubleType = 'DoubleType',
    StringType = 'StringType',
    BoolType = 'BoolType',
    CharType = 'CharType',
    VoidType = 'VoidType',
    Plus = 'Plus',
    Minus = 'Minus',
    Star = 'Star',
    Slash = 'Slash',
    Percent = 'Percent',
    PlusAssign = 'PlusAssign',
    MinusAssign = 'MinusAssign',
    StarAssign = 'StarAssign',
    SlashAssign = 'SlashAssign',
    PercentAssign = 'PercentAssign',
    PlusPlus = 'PlusPlus',
    MinusMinus = 'MinusMinus',
    Equal = 'Equal',
    EqualEqual = 'EqualEqual',
    BangEqual = 'BangEqual',
    Less = 'Less',
    LessEqual = 'LessEqual',
    Greater = 'Greater',
    GreaterEqual = 'GreaterEqual',
    Bang = 'Bang',
    AndAnd = 'AndAnd',
    OrOr = 'OrOr',
    Arrow = 'Arrow',
    DoubleColon = 'DoubleColon',
    LParen = 'LParen',
    RParen = 'RParen',
    LBrace = 'LBrace',
    RBrace = 'RBrace',
    LBracket = 'LBracket',
    RBracket = 'RBracket',
    Colon = 'Colon',
    Comma = 'Comma',
    Semicolon = 'Semicolon',
    Dot = 'Dot',
    Question = 'Question',
    Ellipsis = 'Ellipsis',
    Underscore = 'Underscore',
    Newline = 'Newline',
    EOF = 'EOF',
    Error = 'Error'
}

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
}

export interface ParseError {
    message: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    category: 'lexer' | 'syntax' | 'type' | 'import' | 'runtime';
}

interface AstNode {
    type: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

export interface ImportDecl extends AstNode { type: 'ImportDecl'; module: string; items: string[]; isModuleImport: boolean; }
export interface VarDecl extends AstNode { type: 'VarDecl'; name: string; mutable: boolean; typeAnnotation?: string; initialValue?: Expression; }
export interface FuncParam { name: string; type?: string; defaultValue?: Expression; variadic: boolean; }
export interface FuncDecl extends AstNode { type: 'FuncDecl'; name: string; params: FuncParam[]; returnType?: string; body: Block; isPub: boolean; isExport: boolean; parentStruct?: string; }
export interface StructField extends AstNode { type: 'StructField'; name: string; fieldType: string; isPub: boolean; }
export interface StructDecl extends AstNode { type: 'StructDecl'; name: string; fields: StructField[]; methods: FuncDecl[]; }
export interface EnumDecl extends AstNode { type: 'EnumDecl'; name: string; variants: string[]; }

type Prim = string | number | boolean | null;
export interface LiteralExpr extends AstNode { type: 'LiteralExpr'; value: Prim; literalType: 'number' | 'float' | 'string' | 'char' | 'boolean' | 'null'; }
export interface IdentifierExpr extends AstNode { type: 'IdentifierExpr'; name: string; }
export interface BinaryExpr extends AstNode { type: 'BinaryExpr'; left: Expression; operator: string; right: Expression; }
export interface UnaryExpr extends AstNode { type: 'UnaryExpr'; operator: string; operand: Expression; }
export interface CallExpr extends AstNode { type: 'CallExpr'; callee: Expression; arguments: Expression[]; }
export interface MemberExpr extends AstNode { type: 'MemberExpr'; object: Expression; property: string; }
export interface IndexExpr extends AstNode { type: 'IndexExpr'; object: Expression; index: Expression; }
export interface ArrayLiteral extends AstNode { type: 'ArrayLiteral'; elements: Expression[]; }
export interface DictLiteral extends AstNode { type: 'DictLiteral'; entries: { key: Prim | Expression; value: Expression }[]; }
export interface StructLiteral extends AstNode { type: 'StructLiteral'; structName: string; fields: { name: string; value: Expression }[]; }
export interface LambdaExpr extends AstNode { type: 'LambdaExpr'; params: { name: string; type?: string }[]; body: Expression | Block; }
export interface MatchExpr extends AstNode { type: 'MatchExpr'; value: Expression; arms: MatchArm[]; }
export interface GroupedExpr extends AstNode { type: 'GroupedExpr'; inner: Expression; }

export type Expression = LiteralExpr | IdentifierExpr | BinaryExpr | UnaryExpr | CallExpr | MemberExpr | IndexExpr | ArrayLiteral | DictLiteral | StructLiteral | LambdaExpr | MatchExpr | GroupedExpr;

export interface Block extends AstNode { type: 'Block'; statements: Statement[]; }
export interface IfStmt extends AstNode { type: 'IfStmt'; condition: Expression; thenBlock: Block; elseBlock?: Block | IfStmt; }
export interface WhileStmt extends AstNode { type: 'WhileStmt'; condition: Expression; body: Block; }
export interface ForStmt extends AstNode { type: 'ForStmt'; variable: string; iterable: Expression; body: Block; }
export interface LoopStmt extends AstNode { type: 'LoopStmt'; body: Block; }
export interface ReturnStmt extends AstNode { type: 'ReturnStmt'; value?: Expression; }
export interface BreakStmt extends AstNode { type: 'BreakStmt'; }
export interface ContinueStmt extends AstNode { type: 'ContinueStmt'; }
export interface ExprStmt extends AstNode { type: 'ExprStmt'; expression: Expression; }
export interface AssignmentStmt extends AstNode { type: 'AssignmentStmt'; target: Expression; operator: string; value: Expression; }

export type Statement = VarDecl | FuncDecl | IfStmt | WhileStmt | ForStmt | LoopStmt | ReturnStmt | BreakStmt | ContinueStmt | ExprStmt | AssignmentStmt;
export type TopLevelDecl = ImportDecl | VarDecl | FuncDecl | StructDecl | EnumDecl;

interface WildcardPattern { type: 'WildcardPattern'; }
interface LiteralPattern { type: 'LiteralPattern'; value: Prim; }
interface IdentifierPattern { type: 'IdentifierPattern'; name: string; }
interface EnumPattern { type: 'EnumPattern'; enumName: string; variant: string; }
interface StructPattern { type: 'StructPattern'; structName: string; fields: { name: string; pattern: Pattern }[]; }
export type Pattern = WildcardPattern | LiteralPattern | IdentifierPattern | EnumPattern | StructPattern;

export interface MatchArm extends AstNode { type: 'MatchArm'; pattern: Pattern; body: Block | Expression; }

export interface Module extends AstNode { type: 'Module'; declarations: TopLevelDecl[]; errors: ParseError[]; }
export interface ParseResult { module: Module; tokens: Token[]; errors: ParseError[]; }

const KEYWORDS: Record<string, TokenType> = {
    'func': TokenType.Func, 'var': TokenType.Var, 'const': TokenType.Const, 'struct': TokenType.Struct,
    'enum': TokenType.Enum, 'match': TokenType.Match, 'if': TokenType.If, 'else': TokenType.Else,
    'while': TokenType.While, 'for': TokenType.For, 'in': TokenType.In, 'loop': TokenType.Loop,
    'break': TokenType.Break, 'continue': TokenType.Continue, 'return': TokenType.Return,
    'import': TokenType.Import, 'export': TokenType.Export, 'pub': TokenType.Pub,
    'instanceof': TokenType.Instanceof, 'true': TokenType.Boolean, 'false': TokenType.Boolean,
    'null': TokenType.Null, 'int': TokenType.IntType, 'uint': TokenType.UintType,
    'byte': TokenType.ByteType, 'float': TokenType.FloatType, 'double': TokenType.DoubleType,
    'String': TokenType.StringType, 'bool': TokenType.BoolType, 'char': TokenType.CharType,
    'Void': TokenType.VoidType
};

export class ReyParser {
    private source: string = '';
    private tokens: Token[] = [];
    private current: number = 0;
    private errors: ParseError[] = [];

    parse(source: string): ParseResult {
        this.source = source;
        this.tokens = [];
        this.current = 0;
        this.errors = [];
        this.scanTokens();
        const module = this.parseModule();
        return { module, tokens: this.tokens, errors: this.errors };
    }

    private scanTokens(): void {
        let line = 1, column = 1, i = 0;
        const push = (type: TokenType, value: string) => {
            this.tokens.push({ type, value, line, column, endLine: line, endColumn: column + value.length - 1 });
        };
        while (i < this.source.length) {
            const c = this.source[i];
            if (c === '\n') { push(TokenType.Newline, '\n'); line++; column = 1; i++; continue; }
            if (/\s/.test(c)) { column++; i++; continue; }
            if (c === '/' && this.source[i + 1] === '/') { while (i < this.source.length && this.source[i] !== '\n') i++; continue; }
            if (c === '"' && this.source.substring(i, i + 3) === '"""') {
                let str = '"""'; i += 3; column += 3;
                while (i < this.source.length - 2 && this.source.substring(i, i + 3) !== '"""') {
                    if (this.source[i] === '\n') { line++; column = 0; }
                    str += this.source[i++]; column++;
                }
                str += '"""'; i += 3; column += 3;
                push(TokenType.String, str); continue;
            }
            if (c === '"') {
                let str = '"'; i++; column++;
                while (i < this.source.length && this.source[i] !== '"') {
                    if (this.source[i] === '\\' && i + 1 < this.source.length) { str += this.source[i++] + this.source[i++]; column += 2; }
                    else if (this.source[i] === '\n') { this.errors.push({ message: 'Unterminated string', line, column, category: 'lexer' }); break; }
                    else { str += this.source[i++]; column++; }
                }
                if (i < this.source.length) { str += '"'; i++; column++; }
                push(TokenType.String, str); continue;
            }
            if (c === "'") {
                let chr = "'"; i++; column++;
                while (i < this.source.length && this.source[i] !== "'") {
                    if (this.source[i] === '\\' && i + 1 < this.source.length) { chr += this.source[i++] + this.source[i++]; column += 2; }
                    else { chr += this.source[i++]; column++; }
                }
                if (i < this.source.length) { chr += "'"; i++; column++; }
                push(TokenType.Char, chr); continue;
            }
            if (/\d/.test(c)) {
                let num = '';
                while (i < this.source.length && /\d/.test(this.source[i])) { num += this.source[i++]; column++; }
                if (this.source[i] === '.' && /\d/.test(this.source[i + 1])) {
                    num += '.'; i++; column++;
                    while (i < this.source.length && /\d/.test(this.source[i])) { num += this.source[i++]; column++; }
                    push(TokenType.Float, num);
                } else push(TokenType.Number, num);
                continue;
            }
            if (/[a-zA-Z_]/.test(c)) {
                let ident = '';
                while (i < this.source.length && /[a-zA-Z0-9_]/.test(this.source[i])) { ident += this.source[i++]; column++; }
                push(KEYWORDS[ident] ?? TokenType.Identifier, ident); continue;
            }
            const three = this.source.substring(i, i + 3);
            if (three === '...') { push(TokenType.Ellipsis, '...'); i += 3; column += 3; continue; }
            const two = this.source.substring(i, i + 2);
            const twoOps: Record<string, TokenType> = {
                '+=': TokenType.PlusAssign, '-=': TokenType.MinusAssign, '*=': TokenType.StarAssign,
                '/=': TokenType.SlashAssign, '%=': TokenType.PercentAssign, '++': TokenType.PlusPlus,
                '--': TokenType.MinusMinus, '==': TokenType.EqualEqual, '!=': TokenType.BangEqual,
                '<=': TokenType.LessEqual, '>=': TokenType.GreaterEqual, '&&': TokenType.AndAnd,
                '||': TokenType.OrOr, '=>': TokenType.Arrow, '::': TokenType.DoubleColon
            };
            if (twoOps[two]) { push(twoOps[two], two); i += 2; column += 2; continue; }
            const singleOps: Record<string, TokenType> = {
                '+': TokenType.Plus, '-': TokenType.Minus, '*': TokenType.Star, '/': TokenType.Slash,
                '%': TokenType.Percent, '=': TokenType.Equal, '<': TokenType.Less, '>': TokenType.Greater,
                '!': TokenType.Bang, '(': TokenType.LParen, ')': TokenType.RParen, '{': TokenType.LBrace,
                '}': TokenType.RBrace, '[': TokenType.LBracket, ']': TokenType.RBracket, ':': TokenType.Colon,
                ',': TokenType.Comma, ';': TokenType.Semicolon, '.': TokenType.Dot, '?': TokenType.Question
            };
            if (singleOps[c]) { push(singleOps[c], c); i++; column++; continue; }
            this.errors.push({ message: `Unexpected character '${c}'`, line, column, category: 'lexer' });
            i++; column++;
        }
        push(TokenType.EOF, '');
    }

    private parseModule(): Module {
        const declarations: TopLevelDecl[] = [];
        while (!this.isAtEnd()) { this.skipNewlines(); if (this.isAtEnd()) break; const d = this.parseTopLevel(); if (d) declarations.push(d); }
        return { type: 'Module', declarations, errors: this.errors, startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 };
    }

    private parseTopLevel(): TopLevelDecl | null {
        const t = this.peek();
        if (t.type === TokenType.Import) return this.parseImport();
        const isExport = this.match(TokenType.Export); if (isExport) this.skipNewlines();
        const isPub = this.match(TokenType.Pub); if (isPub) this.skipNewlines();
        switch (this.peek().type) {
            case TokenType.Var: return this.parseVarDecl(true);
            case TokenType.Const: return this.parseVarDecl(false);
            case TokenType.Func: return this.parseFuncDecl(isPub, isExport);
            case TokenType.Struct: return this.parseStructDecl();
            case TokenType.Enum: return this.parseEnumDecl();
        }
        this.error(`Expected declaration, got ${this.peek().type}`, this.peek().line, this.peek().column);
        this.advance();
        return null;
    }

    private parseImport(): ImportDecl {
        this.expect(TokenType.Import, 'Expected import'); this.skipNewlines();
        const first = this.advance(); const module = first.value; const items: string[] = [];
        let isModuleImport = false;
        this.skipNewlines();
        if (this.match(TokenType.DoubleColon)) {
            this.skipNewlines();
            if (this.match(TokenType.LBrace)) {
                this.skipNewlines();
                while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
                    items.push(this.expect(TokenType.Identifier, 'Expected import name').value);
                    this.skipNewlines(); if (this.match(TokenType.Comma)) this.skipNewlines();
                }
                this.expect(TokenType.RBrace, 'Expected }');
            } else items.push(this.expect(TokenType.Identifier, 'Expected import name').value);
        } else {
            while (this.match(TokenType.Dot)) {
                this.skipNewlines(); isModuleImport = true;
                if (this.match(TokenType.LBrace)) {
                    this.skipNewlines();
                    while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
                        items.push(this.expect(TokenType.Identifier, 'Expected import name').value);
                        this.skipNewlines(); if (this.match(TokenType.Comma)) this.skipNewlines();
                    }
                    this.expect(TokenType.RBrace, 'Expected }');
                } else items.push(this.expect(TokenType.Identifier, 'Expected import name').value);
            }
        }
        return { type: 'ImportDecl', module, items, isModuleImport, startLine: first.line, startColumn: first.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn };
    }

    private parseVarDecl(mutable: boolean): VarDecl {
        const start = this.advance(); this.skipNewlines();
        const name = this.expect(TokenType.Identifier, 'Expected name').value; this.skipNewlines();
        let typeAnnotation: string | undefined;
        if (this.match(TokenType.Colon)) { this.skipNewlines(); typeAnnotation = this.parseType(); }
        this.skipNewlines();
        let initialValue: Expression | undefined;
        if (this.match(TokenType.Equal)) { this.skipNewlines(); initialValue = this.parseExpression(); }
        return { type: 'VarDecl', name, mutable, typeAnnotation, initialValue, startLine: start.line, startColumn: start.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn };
    }

    private parseFuncDecl(isPub: boolean, isExport: boolean, parentStruct?: string): FuncDecl {
        const start = this.advance(); this.skipNewlines();
        const name = this.expect(TokenType.Identifier, 'Expected function name').value; this.skipNewlines();
        this.expect(TokenType.LParen, 'Expected ('); this.skipNewlines();
        const params: FuncParam[] = [];
        while (!this.check(TokenType.RParen) && !this.isAtEnd()) {
            const variadic = this.match(TokenType.Ellipsis);
            const n = this.expect(TokenType.Identifier, 'Expected param').value; this.skipNewlines();
            let pt: string | undefined, dv: Expression | undefined;
            if (this.match(TokenType.Colon)) { this.skipNewlines(); pt = this.parseType(); }
            this.skipNewlines();
            if (this.match(TokenType.Equal)) { this.skipNewlines(); dv = this.parseExpression(); }
            params.push({ name: n, type: pt, defaultValue: dv, variadic });
            this.skipNewlines(); if (this.match(TokenType.Comma)) this.skipNewlines();
        }
        this.expect(TokenType.RParen, 'Expected )'); this.skipNewlines();
        let returnType: string | undefined;
        if (this.match(TokenType.Colon)) { this.skipNewlines(); returnType = this.parseType(); }
        this.skipNewlines();
        const body = this.parseBlock();
        return { type: 'FuncDecl', name, params, returnType, body, isPub, isExport, parentStruct, startLine: start.line, startColumn: start.column, endLine: body.endLine, endColumn: body.endColumn };
    }

    private parseStructDecl(): StructDecl {
        const start = this.advance(); this.skipNewlines();
        const name = this.expect(TokenType.Identifier, 'Expected struct name').value; this.skipNewlines();
        this.expect(TokenType.LBrace, 'Expected {'); this.skipNewlines();
        const fields: StructField[] = []; const methods: FuncDecl[] = [];
        while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
            this.skipNewlines(); const isPub = this.match(TokenType.Pub); this.skipNewlines();
            if (this.check(TokenType.Func)) methods.push(this.parseFuncDecl(isPub, false, name));
            else {
                const fn = this.expect(TokenType.Identifier, 'Expected field').value; this.skipNewlines();
                this.expect(TokenType.Colon, 'Expected :'); this.skipNewlines();
                const ft = this.parseType(); this.skipNewlines();
                if (this.match(TokenType.Comma)) this.skipNewlines();
                fields.push({ type: 'StructField', name: fn, fieldType: ft, isPub, startLine: start.line, startColumn: start.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn });
            }
        }
        this.expect(TokenType.RBrace, 'Expected }');
        return { type: 'StructDecl', name, fields, methods, startLine: start.line, startColumn: start.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn };
    }

    private parseEnumDecl(): EnumDecl {
        const start = this.advance(); this.skipNewlines();
        const name = this.expect(TokenType.Identifier, 'Expected enum name').value; this.skipNewlines();
        this.expect(TokenType.LBrace, 'Expected {'); this.skipNewlines();
        const variants: string[] = [];
        while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
            variants.push(this.expect(TokenType.Identifier, 'Expected variant').value); this.skipNewlines();
            if (this.match(TokenType.Comma)) this.skipNewlines();
        }
        this.expect(TokenType.RBrace, 'Expected }');
        return { type: 'EnumDecl', name, variants, startLine: start.line, startColumn: start.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn };
    }

    private parseType(): string {
        let t = '';
        if (this.match(TokenType.IntType)) t = 'int';
        else if (this.match(TokenType.UintType)) t = 'uint';
        else if (this.match(TokenType.ByteType)) t = 'byte';
        else if (this.match(TokenType.FloatType)) t = 'float';
        else if (this.match(TokenType.DoubleType)) t = 'double';
        else if (this.match(TokenType.StringType)) t = 'String';
        else if (this.match(TokenType.BoolType)) t = 'bool';
        else if (this.match(TokenType.CharType)) t = 'char';
        else if (this.match(TokenType.VoidType)) t = 'Void';
        else if (this.match(TokenType.Identifier)) t = this.prev().value;
        this.skipNewlines();
        if (this.match(TokenType.LBracket)) { this.skipNewlines(); const inner = this.parseType(); this.expect(TokenType.RBracket, 'Expected ]'); return `[${inner}]`; }
        if (this.match(TokenType.LBrace)) { this.skipNewlines(); const k = this.parseType(); this.skipNewlines(); this.expect(TokenType.Colon, 'Expected :'); this.skipNewlines(); const v = this.parseType(); this.skipNewlines(); this.expect(TokenType.RBrace, 'Expected }'); return `{${k}:${v}}`; }
        if (this.match(TokenType.Question)) return `${t}?`;
        return t;
    }

    private parseBlock(): Block {
        const start = this.expect(TokenType.LBrace, 'Expected {'); this.skipNewlines();
        const stmts: Statement[] = [];
        while (!this.check(TokenType.RBrace) && !this.isAtEnd()) { const s = this.parseStatement(); if (s) stmts.push(s); this.skipNewlines(); }
        this.expect(TokenType.RBrace, 'Expected }');
        return { type: 'Block', statements: stmts, startLine: start.line, startColumn: start.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn };
    }

    private parseStatement(): Statement | null {
        this.skipNewlines();
        switch (this.peek().type) {
            case TokenType.Var: return this.parseVarDecl(true);
            case TokenType.Const: return this.parseVarDecl(false);
            case TokenType.If: return this.parseIfStmt();
            case TokenType.While: return this.parseWhileStmt();
            case TokenType.For: return this.parseForStmt();
            case TokenType.Loop: return this.parseLoopStmt();
            case TokenType.Return: return this.parseReturnStmt();
            case TokenType.Break: { const t = this.advance(); return { type: 'BreakStmt', startLine: t.line, startColumn: t.column, endLine: t.endLine, endColumn: t.endColumn }; }
            case TokenType.Continue: { const t = this.advance(); return { type: 'ContinueStmt', startLine: t.line, startColumn: t.column, endLine: t.endLine, endColumn: t.endColumn }; }
            default: return this.parseExprOrAssignStmt();
        }
    }

    private parseIfStmt(): IfStmt {
        const start = this.advance(); this.skipNewlines();
        const cond = this.parseExpression(); this.skipNewlines();
        const thenBlock = this.parseBlock(); this.skipNewlines();
        let elseBlock: Block | IfStmt | undefined;
        if (this.match(TokenType.Else)) { this.skipNewlines(); elseBlock = this.check(TokenType.If) ? this.parseIfStmt() : this.parseBlock(); }
        return { type: 'IfStmt', condition: cond, thenBlock, elseBlock, startLine: start.line, startColumn: start.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn };
    }

    private parseWhileStmt(): WhileStmt {
        const start = this.advance(); this.skipNewlines();
        const cond = this.parseExpression(); this.skipNewlines();
        const body = this.parseBlock();
        return { type: 'WhileStmt', condition: cond, body, startLine: start.line, startColumn: start.column, endLine: body.endLine, endColumn: body.endColumn };
    }

    private parseForStmt(): ForStmt {
        const start = this.advance(); this.skipNewlines();
        const v = this.expect(TokenType.Identifier, 'Expected var').value; this.skipNewlines();
        this.expect(TokenType.In, 'Expected in'); this.skipNewlines();
        const it = this.parseExpression(); this.skipNewlines();
        const body = this.parseBlock();
        return { type: 'ForStmt', variable: v, iterable: it, body, startLine: start.line, startColumn: start.column, endLine: body.endLine, endColumn: body.endColumn };
    }

    private parseLoopStmt(): LoopStmt {
        const start = this.advance(); this.skipNewlines();
        const body = this.parseBlock();
        return { type: 'LoopStmt', body, startLine: start.line, startColumn: start.column, endLine: body.endLine, endColumn: body.endColumn };
    }

    private parseReturnStmt(): ReturnStmt {
        const start = this.advance(); this.skipNewlines();
        const v = (!this.check(TokenType.Semicolon) && !this.check(TokenType.RBrace) && !this.isAtEnd()) ? this.parseExpression() : undefined;
        return { type: 'ReturnStmt', value: v, startLine: start.line, startColumn: start.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn };
    }

    private parseExprOrAssignStmt(): Statement {
        const expr = this.parseExpression();
        const assignOps = [TokenType.Equal, TokenType.PlusAssign, TokenType.MinusAssign, TokenType.StarAssign, TokenType.SlashAssign, TokenType.PercentAssign];
        if (assignOps.some(op => this.check(op))) {
            const op = this.advance().value; this.skipNewlines();
            const val = this.parseExpression();
            return { type: 'AssignmentStmt', target: expr, operator: op, value: val, startLine: expr.startLine, startColumn: expr.startColumn, endLine: val.endLine, endColumn: val.endColumn };
        }
        return { type: 'ExprStmt', expression: expr, startLine: expr.startLine, startColumn: expr.startColumn, endLine: expr.endLine, endColumn: expr.endColumn };
    }

    private parseExpression(): Expression { return this.parseOr(); }
    private parseOr(): Expression {
        let left = this.parseAnd();
        while (this.match(TokenType.OrOr)) { this.skipNewlines(); const right = this.parseAnd(); left = { type: 'BinaryExpr', left, operator: '||', right, startLine: left.startLine, startColumn: left.startColumn, endLine: right.endLine, endColumn: right.endColumn }; }
        return left;
    }
    private parseAnd(): Expression {
        let left = this.parseEquality();
        while (this.match(TokenType.AndAnd)) { this.skipNewlines(); const right = this.parseEquality(); left = { type: 'BinaryExpr', left, operator: '&&', right, startLine: left.startLine, startColumn: left.startColumn, endLine: right.endLine, endColumn: right.endColumn }; }
        return left;
    }
    private parseEquality(): Expression {
        let left = this.parseComparison();
        while (this.match(TokenType.EqualEqual) || this.match(TokenType.BangEqual)) { const op = this.prev().value; this.skipNewlines(); const right = this.parseComparison(); left = { type: 'BinaryExpr', left, operator: op, right, startLine: left.startLine, startColumn: left.startColumn, endLine: right.endLine, endColumn: right.endColumn }; }
        return left;
    }
    private parseComparison(): Expression {
        let left = this.parseTerm();
        while ([TokenType.Less, TokenType.LessEqual, TokenType.Greater, TokenType.GreaterEqual, TokenType.Instanceof].some(t => this.check(t))) {
            const op = this.advance().value; this.skipNewlines(); const right = this.parseTerm(); left = { type: 'BinaryExpr', left, operator: op, right, startLine: left.startLine, startColumn: left.startColumn, endLine: right.endLine, endColumn: right.endColumn };
        }
        return left;
    }
    private parseTerm(): Expression {
        let left = this.parseFactor();
        while (this.match(TokenType.Plus) || this.match(TokenType.Minus)) { const op = this.prev().value; this.skipNewlines(); const right = this.parseFactor(); left = { type: 'BinaryExpr', left, operator: op, right, startLine: left.startLine, startColumn: left.startColumn, endLine: right.endLine, endColumn: right.endColumn }; }
        return left;
    }
    private parseFactor(): Expression {
        let left = this.parseUnary();
        while (this.match(TokenType.Star) || this.match(TokenType.Slash) || this.match(TokenType.Percent)) { const op = this.prev().value; this.skipNewlines(); const right = this.parseUnary(); left = { type: 'BinaryExpr', left, operator: op, right, startLine: left.startLine, startColumn: left.startColumn, endLine: right.endLine, endColumn: right.endColumn }; }
        return left;
    }
    private parseUnary(): Expression {
        if (this.match(TokenType.Bang) || this.match(TokenType.Minus) || this.match(TokenType.PlusPlus) || this.match(TokenType.MinusMinus)) {
            const op = this.prev(); const operand = this.parseUnary();
            return { type: 'UnaryExpr', operator: op.value, operand, startLine: op.line, startColumn: op.column, endLine: operand.endLine, endColumn: operand.endColumn };
        }
        return this.parsePostfix();
    }
    private parsePostfix(): Expression {
        let expr = this.parsePrimary();
        while (true) {
            this.skipNewlines();
            if (this.match(TokenType.PlusPlus) || this.match(TokenType.MinusMinus)) { const op = this.prev(); expr = { type: 'UnaryExpr', operator: op.value, operand: expr, startLine: expr.startLine, startColumn: expr.startColumn, endLine: op.endLine, endColumn: op.endColumn }; }
            else if (this.match(TokenType.LParen)) { this.skipNewlines(); const args: Expression[] = []; while (!this.check(TokenType.RParen) && !this.isAtEnd()) { args.push(this.parseExpression()); this.skipNewlines(); if (this.match(TokenType.Comma)) this.skipNewlines(); } this.expect(TokenType.RParen, 'Expected )'); expr = { type: 'CallExpr', callee: expr, arguments: args, startLine: expr.startLine, startColumn: expr.startColumn, endLine: this.prev().endLine, endColumn: this.prev().endColumn }; }
            else if (this.match(TokenType.Dot)) { this.skipNewlines(); const prop = this.expect(TokenType.Identifier, 'Expected property').value; expr = { type: 'MemberExpr', object: expr, property: prop, startLine: expr.startLine, startColumn: expr.startColumn, endLine: this.prev().endLine, endColumn: this.prev().endColumn }; }
            else if (this.match(TokenType.LBracket)) { this.skipNewlines(); const idx = this.parseExpression(); this.skipNewlines(); this.expect(TokenType.RBracket, 'Expected ]'); expr = { type: 'IndexExpr', object: expr, index: idx, startLine: expr.startLine, startColumn: expr.startColumn, endLine: this.prev().endLine, endColumn: this.prev().endColumn }; }
            else break;
        }
        return expr;
    }

    private parsePrimary(): Expression {
        const t = this.peek();
        if (this.match(TokenType.Number)) return { type: 'LiteralExpr', value: parseInt(t.value, 10), literalType: 'number', startLine: t.line, startColumn: t.column, endLine: t.endLine, endColumn: t.endColumn };
        if (this.match(TokenType.Float)) return { type: 'LiteralExpr', value: parseFloat(t.value), literalType: 'float', startLine: t.line, startColumn: t.column, endLine: t.endLine, endColumn: t.endColumn };
        if (this.match(TokenType.String)) return { type: 'LiteralExpr', value: t.value, literalType: 'string', startLine: t.line, startColumn: t.column, endLine: t.endLine, endColumn: t.endColumn };
        if (this.match(TokenType.Char)) return { type: 'LiteralExpr', value: t.value, literalType: 'char', startLine: t.line, startColumn: t.column, endLine: t.endLine, endColumn: t.endColumn };
        if (this.match(TokenType.Boolean)) return { type: 'LiteralExpr', value: t.value === 'true', literalType: 'boolean', startLine: t.line, startColumn: t.column, endLine: t.endLine, endColumn: t.endColumn };
        if (this.match(TokenType.Null)) return { type: 'LiteralExpr', value: null, literalType: 'null', startLine: t.line, startColumn: t.column, endLine: t.endLine, endColumn: t.endColumn };
        if (this.match(TokenType.Identifier)) return { type: 'IdentifierExpr', name: t.value, startLine: t.line, startColumn: t.column, endLine: t.endLine, endColumn: t.endColumn };
        if (this.match(TokenType.LParen)) { this.skipNewlines(); const e = this.parseExpression(); this.expect(TokenType.RParen, 'Expected )'); return { type: 'GroupedExpr', inner: e, startLine: t.line, startColumn: t.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn }; }
        if (this.match(TokenType.LBracket)) { this.skipNewlines(); const el: Expression[] = []; while (!this.check(TokenType.RBracket) && !this.isAtEnd()) { el.push(this.parseExpression()); this.skipNewlines(); if (this.match(TokenType.Comma)) this.skipNewlines(); } this.expect(TokenType.RBracket, 'Expected ]'); return { type: 'ArrayLiteral', elements: el, startLine: t.line, startColumn: t.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn }; }
        if (this.match(TokenType.LBrace)) {
            this.skipNewlines();
            if (this.check(TokenType.Identifier) && this.lookaheadColon()) {
                const sn = this.advance().value; this.skipNewlines(); this.expect(TokenType.Colon, 'Expected :'); this.skipNewlines();
                const f: { name: string; value: Expression }[] = [];
                while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
                    const fn = this.expect(TokenType.Identifier, 'Expected field').value; this.skipNewlines(); this.expect(TokenType.Colon, 'Expected :'); this.skipNewlines();
                    const fv = this.parseExpression(); this.skipNewlines(); f.push({ name: fn, value: fv }); if (this.match(TokenType.Comma)) this.skipNewlines();
                }
                this.expect(TokenType.RBrace, 'Expected }');
                return { type: 'StructLiteral', structName: sn, fields: f, startLine: t.line, startColumn: t.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn };
            }
            const entries: { key: Prim | Expression; value: Expression }[] = [];
            while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
                let k: Prim | Expression;
                if (this.match(TokenType.String)) k = this.prev().value;
                else if (this.match(TokenType.Identifier)) k = this.prev().value;
                else k = this.parseExpression();
                this.skipNewlines(); this.expect(TokenType.Colon, 'Expected :'); this.skipNewlines();
                const v = this.parseExpression(); this.skipNewlines();
                entries.push({ key: k, value: v }); if (this.match(TokenType.Comma)) this.skipNewlines();
            }
            this.expect(TokenType.RBrace, 'Expected }');
            return { type: 'DictLiteral', entries, startLine: t.line, startColumn: t.column, endLine: this.prev().endLine, endColumn: this.prev().endColumn };
        }
        this.error(`Unexpected token ${t.type}`, t.line, t.column); this.advance();
        return { type: 'LiteralExpr', value: null, literalType: 'null', startLine: t.line, startColumn: t.column, endLine: t.endLine, endColumn: t.endColumn };
    }

    private lookaheadColon(): boolean {
        let i = 1; while (i < this.tokens.length && this.tokens[this.current + i]?.type === TokenType.Newline) i++;
        return this.tokens[this.current + i]?.type === TokenType.Colon;
    }

    private error(message: string, line: number, column: number): void { this.errors.push({ message, line, column, category: 'syntax' }); }
    private peek(): Token { return this.tokens[this.current] ?? { type: TokenType.EOF, value: '', line: 0, column: 0, endLine: 0, endColumn: 0 }; }
    private prev(): Token { return this.tokens[this.current - 1] ?? { type: TokenType.EOF, value: '', line: 0, column: 0, endLine: 0, endColumn: 0 }; }
    private isAtEnd(): boolean { return this.peek().type === TokenType.EOF; }
    private check(type: TokenType): boolean { return !this.isAtEnd() && this.peek().type === type; }
    private match(type: TokenType): boolean { if (this.check(type)) { this.current++; return true; } return false; }
    private advance(): Token { if (!this.isAtEnd()) this.current++; return this.prev(); }
    private expect(type: TokenType, msg: string): Token { if (this.check(type)) return this.advance(); this.error(msg, this.peek().line, this.peek().column); return this.peek(); }
    private skipNewlines(): void { while (this.match(TokenType.Newline)) {} }
}