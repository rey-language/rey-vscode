export enum TokenType {
    // Literals
    Number = 'Number',
    Float = 'Float',
    String = 'String',
    Char = 'Char',
    Boolean = 'Boolean',
    Null = 'Null',
    Identifier = 'Identifier',

    // Keywords
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
    Self = 'Self',

    // Primitive Type Names
    IntType = 'IntType',
    UintType = 'UintType',
    ByteType = 'ByteType',
    FloatType = 'FloatType',
    DoubleType = 'DoubleType',
    StringType = 'StringType',
    BoolType = 'BoolType',
    CharType = 'CharType',
    VoidType = 'VoidType',
    AnyType = 'AnyType',

    // Operators
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
    Arrow = 'Arrow',          // => (Fat Arrow for match & lambda)
    ThinArrow = 'ThinArrow',  // -> (Thin Arrow for return type)
    DoubleColon = 'DoubleColon', // ::
    DotDot = 'DotDot',        // .. (Range)
    Ellipsis = 'Ellipsis',    // ... (Variadic)
    Pipe = 'Pipe',            // | (Union type)

    // Delimiters
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
    Underscore = 'Underscore',

    // Trivia & Special
    Comment = 'Comment',
    BlockComment = 'BlockComment',
    Newline = 'Newline',
    EOF = 'EOF',
    Error = 'Error'
}

export interface Token {
    type: TokenType;
    value: string;
    line: number;       // 1-based start line
    column: number;     // 1-based start column
    endLine: number;    // 1-based end line
    endColumn: number;  // 1-based end column
}

export interface ParseError {
    message: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    category: 'lexer' | 'syntax' | 'type' | 'import' | 'runtime';
}

export interface AstNode {
    type: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

export interface TypeAnnotation extends AstNode {
    type: 'TypeAnnotation';
    raw: string;
    kind: 'primitive' | 'generic' | 'tuple' | 'function' | 'nullable' | 'union' | 'array';
    base?: string;
    typeArgs?: TypeAnnotation[];
    returnType?: TypeAnnotation;
}

export interface ImportDecl extends AstNode {
    type: 'ImportDecl';
    module: string;
    items: string[];
    isModuleImport: boolean;
    isFilePath: boolean;
    hasSemicolon?: boolean;
}

export interface VarDecl extends AstNode {
    type: 'VarDecl';
    name: string;
    mutable: boolean;
    typeAnnotation?: TypeAnnotation;
    initialValue?: Expression;
    hasSemicolon?: boolean;
}

export interface FuncParam extends AstNode {
    type: 'FuncParam';
    name: string;
    typeAnnotation?: TypeAnnotation;
    defaultValue?: Expression;
    variadic: boolean;
}

export interface FuncDecl extends AstNode {
    type: 'FuncDecl';
    name: string;
    params: FuncParam[];
    returnType?: TypeAnnotation;
    body: Block;
    isPub: boolean;
    isExport: boolean;
    parentStruct?: string;
}

export interface StructField extends AstNode {
    type: 'StructField';
    name: string;
    fieldType: TypeAnnotation;
    isPub: boolean;
}

export interface StructDecl extends AstNode {
    type: 'StructDecl';
    name: string;
    fields: StructField[];
    methods: FuncDecl[];
    isPub?: boolean;
}

export interface EnumVariantParam extends AstNode {
    type: 'EnumVariantParam';
    name?: string;
    typeAnnotation: TypeAnnotation;
}

export interface EnumVariant extends AstNode {
    type: 'EnumVariant';
    name: string;
    params: EnumVariantParam[];
}

export interface EnumDecl extends AstNode {
    type: 'EnumDecl';
    name: string;
    variants: EnumVariant[];
    isPub?: boolean;
}

export type Prim = string | number | boolean | null;

export interface LiteralExpr extends AstNode {
    type: 'LiteralExpr';
    value: Prim;
    literalType: 'number' | 'float' | 'string' | 'char' | 'boolean' | 'null';
    raw?: string;
}

export interface IdentifierExpr extends AstNode {
    type: 'IdentifierExpr';
    name: string;
}

export interface BinaryExpr extends AstNode {
    type: 'BinaryExpr';
    left: Expression;
    operator: string;
    right: Expression;
}

export interface UnaryExpr extends AstNode {
    type: 'UnaryExpr';
    operator: string;
    operand: Expression;
    prefix: boolean;
}

export interface CallExpr extends AstNode {
    type: 'CallExpr';
    callee: Expression;
    arguments: Expression[];
}

export interface MemberExpr extends AstNode {
    type: 'MemberExpr';
    object: Expression;
    property: string;
}

export interface PathExpr extends AstNode {
    type: 'PathExpr';
    qualifier: Expression;
    member: string;
}

export interface IndexExpr extends AstNode {
    type: 'IndexExpr';
    object: Expression;
    index: Expression;
}

export interface ArrayLiteral extends AstNode {
    type: 'ArrayLiteral';
    elements: Expression[];
}

export interface TupleLiteral extends AstNode {
    type: 'TupleLiteral';
    elements: Expression[];
}

export interface DictLiteral extends AstNode {
    type: 'DictLiteral';
    entries: { key: Expression; value: Expression }[];
}

export interface StructLiteralField extends AstNode {
    type: 'StructLiteralField';
    name: string;
    value: Expression;
}

export interface StructLiteral extends AstNode {
    type: 'StructLiteral';
    structName: string;
    fields: StructLiteralField[];
}

export interface LambdaExpr extends AstNode {
    type: 'LambdaExpr';
    params: FuncParam[];
    returnType?: TypeAnnotation;
    body: Expression | Block;
}

export interface RangePattern extends AstNode {
    type: 'RangePattern';
    start: Expression;
    end: Expression;
}

export interface LiteralPattern extends AstNode {
    type: 'LiteralPattern';
    value: Expression;
}

export interface VariablePattern extends AstNode {
    type: 'VariablePattern';
    name: string;
}

export interface EnumPattern extends AstNode {
    type: 'EnumPattern';
    enumName: string;
    variant: string;
    payloads: Pattern[];
}

export interface StructPatternField extends AstNode {
    type: 'StructPatternField';
    name: string;
    pattern?: Pattern;
}

export interface StructPattern extends AstNode {
    type: 'StructPattern';
    structName: string;
    fields: StructPatternField[];
}

export interface TuplePattern extends AstNode {
    type: 'TuplePattern';
    elements: Pattern[];
}

export type Pattern =
    | RangePattern
    | LiteralPattern
    | VariablePattern
    | EnumPattern
    | StructPattern
    | TuplePattern;

export interface MatchArm extends AstNode {
    type: 'MatchArm';
    pattern: Pattern;
    guard?: Expression;
    body: Expression | Block;
}

export interface MatchExpr extends AstNode {
    type: 'MatchExpr';
    target: Expression;
    arms: MatchArm[];
}

export interface GroupedExpr extends AstNode {
    type: 'GroupedExpr';
    inner: Expression;
}

export interface InstanceofExpr extends AstNode {
    type: 'InstanceofExpr';
    target: Expression;
    typeName: string;
}

export type Expression =
    | LiteralExpr
    | IdentifierExpr
    | BinaryExpr
    | UnaryExpr
    | CallExpr
    | MemberExpr
    | PathExpr
    | IndexExpr
    | ArrayLiteral
    | TupleLiteral
    | DictLiteral
    | StructLiteral
    | LambdaExpr
    | MatchExpr
    | GroupedExpr
    | InstanceofExpr;

export interface Block extends AstNode {
    type: 'Block';
    statements: Statement[];
}

export interface IfStmt extends AstNode {
    type: 'IfStmt';
    condition: Expression;
    thenBlock: Block;
    elseBlock?: Block | IfStmt;
}

export interface WhileStmt extends AstNode {
    type: 'WhileStmt';
    condition: Expression;
    body: Block;
}

export interface ForStmt extends AstNode {
    type: 'ForStmt';
    variable: string;
    iterable: Expression;
    body: Block;
}

export interface LoopStmt extends AstNode {
    type: 'LoopStmt';
    body: Block;
}

export interface ReturnStmt extends AstNode {
    type: 'ReturnStmt';
    value?: Expression;
    hasSemicolon?: boolean;
}

export interface BreakStmt extends AstNode {
    type: 'BreakStmt';
    hasSemicolon?: boolean;
}

export interface ContinueStmt extends AstNode {
    type: 'ContinueStmt';
    hasSemicolon?: boolean;
}

export interface ExprStmt extends AstNode {
    type: 'ExprStmt';
    expression: Expression;
    hasSemicolon?: boolean;
}

export interface AssignmentStmt extends AstNode {
    type: 'AssignmentStmt';
    target: Expression;
    operator: string;
    value: Expression;
    hasSemicolon?: boolean;
}

export type Statement =
    | VarDecl
    | FuncDecl
    | StructDecl
    | EnumDecl
    | IfStmt
    | WhileStmt
    | ForStmt
    | LoopStmt
    | ReturnStmt
    | BreakStmt
    | ContinueStmt
    | ExprStmt
    | AssignmentStmt
    | Block;

export type TopLevelDecl = ImportDecl | VarDecl | FuncDecl | StructDecl | EnumDecl | Statement;

export interface Module extends AstNode {
    type: 'Module';
    declarations: TopLevelDecl[];
    errors: ParseError[];
}

export interface ParseResult {
    module: Module;
    tokens: Token[];
    errors: ParseError[];
}

const KEYWORDS: Record<string, TokenType> = {
    'func': TokenType.Func,
    'var': TokenType.Var,
    'const': TokenType.Const,
    'struct': TokenType.Struct,
    'enum': TokenType.Enum,
    'match': TokenType.Match,
    'if': TokenType.If,
    'else': TokenType.Else,
    'while': TokenType.While,
    'for': TokenType.For,
    'in': TokenType.In,
    'loop': TokenType.Loop,
    'break': TokenType.Break,
    'continue': TokenType.Continue,
    'return': TokenType.Return,
    'import': TokenType.Import,
    'export': TokenType.Export,
    'pub': TokenType.Pub,
    'instanceof': TokenType.Instanceof,
    'true': TokenType.Boolean,
    'false': TokenType.Boolean,
    'null': TokenType.Null,
    'self': TokenType.Self,
    'int': TokenType.IntType,
    'uint': TokenType.UintType,
    'byte': TokenType.ByteType,
    'float': TokenType.FloatType,
    'double': TokenType.DoubleType,
    'string': TokenType.StringType,
    'String': TokenType.StringType,
    'bool': TokenType.BoolType,
    'char': TokenType.CharType,
    'void': TokenType.VoidType,
    'Void': TokenType.VoidType,
    'any': TokenType.AnyType
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
        let line = 1;
        let column = 1;
        let i = 0;

        const pushToken = (type: TokenType, value: string, startL: number, startC: number, endL: number, endC: number) => {
            this.tokens.push({
                type,
                value,
                line: startL,
                column: startC,
                endLine: endL,
                endColumn: endC
            });
        };

        while (i < this.source.length) {
            const startLine = line;
            const startCol = column;
            const c = this.source[i];

            // 1. Whitespace
            if (c === '\n') {
                pushToken(TokenType.Newline, '\n', startLine, startCol, line, column);
                line++;
                column = 1;
                i++;
                continue;
            }
            if (/\s/.test(c)) {
                column++;
                i++;
                continue;
            }

            // 2. Comments
            if (c === '/' && this.source[i + 1] === '/') {
                let text = '//';
                i += 2;
                column += 2;
                while (i < this.source.length && this.source[i] !== '\n') {
                    text += this.source[i];
                    i++;
                    column++;
                }
                pushToken(TokenType.Comment, text, startLine, startCol, line, column - 1);
                continue;
            }
            if (c === '/' && this.source[i + 1] === '*') {
                let text = '/*';
                i += 2;
                column += 2;
                while (i < this.source.length && !(this.source[i] === '*' && this.source[i + 1] === '/')) {
                    if (this.source[i] === '\n') {
                        text += '\n';
                        line++;
                        column = 1;
                        i++;
                    } else {
                        text += this.source[i];
                        column++;
                        i++;
                    }
                }
                if (i < this.source.length) {
                    text += '*/';
                    i += 2;
                    column += 2;
                } else {
                    this.errors.push({
                        message: 'Unterminated block comment',
                        line: startLine,
                        column: startCol,
                        category: 'lexer'
                    });
                }
                pushToken(TokenType.BlockComment, text, startLine, startCol, line, column - 1);
                continue;
            }

            // 3. Triple-quoted multiline strings """ ... """
            if (c === '"' && this.source.substring(i, i + 3) === '"""') {
                let str = '"""';
                i += 3;
                column += 3;
                while (i < this.source.length && this.source.substring(i, i + 3) !== '"""') {
                    if (this.source[i] === '\n') {
                        str += '\n';
                        line++;
                        column = 1;
                        i++;
                    } else {
                        str += this.source[i];
                        column++;
                        i++;
                    }
                }
                if (i < this.source.length) {
                    str += '"""';
                    i += 3;
                    column += 3;
                } else {
                    this.errors.push({
                        message: 'Unterminated triple-quoted string',
                        line: startLine,
                        column: startCol,
                        category: 'lexer'
                    });
                }
                pushToken(TokenType.String, str, startLine, startCol, line, column - 1);
                continue;
            }

            // 4. Standard strings " ... "
            if (c === '"') {
                let str = '"';
                i++;
                column++;
                while (i < this.source.length && this.source[i] !== '"') {
                    if (this.source[i] === '\\' && i + 1 < this.source.length) {
                        str += this.source[i++];
                        str += this.source[i++];
                        column += 2;
                    } else if (this.source[i] === '\n') {
                        this.errors.push({
                            message: 'Unterminated string literal on single line',
                            line: startLine,
                            column: startCol,
                            category: 'lexer'
                        });
                        break;
                    } else {
                        str += this.source[i++];
                        column++;
                    }
                }
                if (i < this.source.length && this.source[i] === '"') {
                    str += '"';
                    i++;
                    column++;
                }
                pushToken(TokenType.String, str, startLine, startCol, line, column - 1);
                continue;
            }

            // 5. Character literals ' ... '
            if (c === "'") {
                let chr = "'";
                i++;
                column++;
                while (i < this.source.length && this.source[i] !== "'") {
                    if (this.source[i] === '\\' && i + 1 < this.source.length) {
                        chr += this.source[i++];
                        chr += this.source[i++];
                        column += 2;
                    } else {
                        chr += this.source[i++];
                        column++;
                    }
                }
                if (i < this.source.length && this.source[i] === "'") {
                    chr += "'";
                    i++;
                    column++;
                }
                pushToken(TokenType.Char, chr, startLine, startCol, line, column - 1);
                continue;
            }

            // 6. Numbers: Hex (0x..), Binary (0b..), Decimals/Floats with underscores, Exponents
            if (/\d/.test(c)) {
                let num = '';
                if (c === '0' && (this.source[i + 1] === 'x' || this.source[i + 1] === 'X')) {
                    num += this.source[i++]; // 0
                    num += this.source[i++]; // x
                    column += 2;
                    while (i < this.source.length && /[0-9a-fA-F_]/.test(this.source[i])) {
                        num += this.source[i++];
                        column++;
                    }
                    pushToken(TokenType.Number, num, startLine, startCol, line, column - 1);
                    continue;
                }
                if (c === '0' && (this.source[i + 1] === 'b' || this.source[i + 1] === 'B')) {
                    num += this.source[i++]; // 0
                    num += this.source[i++]; // b
                    column += 2;
                    while (i < this.source.length && /[01_]/.test(this.source[i])) {
                        num += this.source[i++];
                        column++;
                    }
                    pushToken(TokenType.Number, num, startLine, startCol, line, column - 1);
                    continue;
                }

                while (i < this.source.length && /[0-9_]/.test(this.source[i])) {
                    num += this.source[i++];
                    column++;
                }

                let isFloat = false;
                // Fraction: . followed by digit (NOT ..)
                if (this.source[i] === '.' && this.source[i + 1] !== '.' && /\d/.test(this.source[i + 1])) {
                    isFloat = true;
                    num += this.source[i++];
                    column++;
                    while (i < this.source.length && /[0-9_]/.test(this.source[i])) {
                        num += this.source[i++];
                        column++;
                    }
                }

                // Scientific exponent: e or E
                if (this.source[i] === 'e' || this.source[i] === 'E') {
                    isFloat = true;
                    num += this.source[i++];
                    column++;
                    if (this.source[i] === '+' || this.source[i] === '-') {
                        num += this.source[i++];
                        column++;
                    }
                    while (i < this.source.length && /[0-9_]/.test(this.source[i])) {
                        num += this.source[i++];
                        column++;
                    }
                }

                pushToken(isFloat ? TokenType.Float : TokenType.Number, num, startLine, startCol, line, column - 1);
                continue;
            }

            // 7. Identifiers and Keywords
            if (/[a-zA-Z_]/.test(c)) {
                let ident = '';
                while (i < this.source.length && /[a-zA-Z0-9_]/.test(this.source[i])) {
                    ident += this.source[i++];
                    column++;
                }
                const kwType = KEYWORDS[ident];
                pushToken(kwType ?? TokenType.Identifier, ident, startLine, startCol, line, column - 1);
                continue;
            }

            // 8. 3-character operators: ...
            if (this.source.substring(i, i + 3) === '...') {
                pushToken(TokenType.Ellipsis, '...', startLine, startCol, line, column + 2);
                i += 3;
                column += 3;
                continue;
            }

            // 9. 2-character operators: ->, =>, ::, .., ==, !=, <=, >=, &&, ||, +=, -=, *=, /=, %=, ++, --
            const two = this.source.substring(i, i + 2);
            const twoOps: Record<string, TokenType> = {
                '->': TokenType.ThinArrow,
                '=>': TokenType.Arrow,
                '::': TokenType.DoubleColon,
                '..': TokenType.DotDot,
                '==': TokenType.EqualEqual,
                '!=': TokenType.BangEqual,
                '<=': TokenType.LessEqual,
                '>=': TokenType.GreaterEqual,
                '&&': TokenType.AndAnd,
                '||': TokenType.OrOr,
                '+=': TokenType.PlusAssign,
                '-=': TokenType.MinusAssign,
                '*=': TokenType.StarAssign,
                '/=': TokenType.SlashAssign,
                '%=': TokenType.PercentAssign,
                '++': TokenType.PlusPlus,
                '--': TokenType.MinusMinus
            };

            if (twoOps[two]) {
                pushToken(twoOps[two], two, startLine, startCol, line, column + 1);
                i += 2;
                column += 2;
                continue;
            }

            // 10. Single character tokens
            const singleOps: Record<string, TokenType> = {
                '+': TokenType.Plus,
                '-': TokenType.Minus,
                '*': TokenType.Star,
                '/': TokenType.Slash,
                '%': TokenType.Percent,
                '=': TokenType.Equal,
                '<': TokenType.Less,
                '>': TokenType.Greater,
                '!': TokenType.Bang,
                '|': TokenType.Pipe,
                '(': TokenType.LParen,
                ')': TokenType.RParen,
                '{': TokenType.LBrace,
                '}': TokenType.RBrace,
                '[': TokenType.LBracket,
                ']': TokenType.RBracket,
                ':': TokenType.Colon,
                ',': TokenType.Comma,
                ';': TokenType.Semicolon,
                '.': TokenType.Dot,
                '?': TokenType.Question,
                '_': TokenType.Underscore
            };

            if (singleOps[c]) {
                pushToken(singleOps[c], c, startLine, startCol, line, column);
                i++;
                column++;
                continue;
            }

            // Unknown character
            this.errors.push({
                message: `Unexpected character '${c}'`,
                line: startLine,
                column: startCol,
                category: 'lexer'
            });
            i++;
            column++;
        }

        pushToken(TokenType.EOF, '', line, column, line, column);
    }

    private parseModule(): Module {
        const declarations: TopLevelDecl[] = [];
        this.skipTrivia();

        while (!this.isAtEnd()) {
            const decl = this.parseTopLevel();
            if (decl) {
                declarations.push(decl);
            }
            this.skipTrivia();
        }

        const endToken = this.prev();
        return {
            type: 'Module',
            declarations,
            errors: this.errors,
            startLine: 1,
            startColumn: 1,
            endLine: endToken.endLine || 1,
            endColumn: endToken.endColumn || 1
        };
    }

    private parseTopLevel(): TopLevelDecl | null {
        this.skipTrivia();
        const t = this.peek();

        if (t.type === TokenType.Import) {
            return this.parseImportDecl();
        }

        let isPub = false;
        let isExport = false;

        if (this.match(TokenType.Export)) {
            isExport = true;
            this.skipTrivia();
        }
        if (this.match(TokenType.Pub)) {
            isPub = true;
            this.skipTrivia();
        }

        switch (this.peek().type) {
            case TokenType.Var:
                return this.parseVarDecl(true);
            case TokenType.Const:
                return this.parseVarDecl(false);
            case TokenType.Func:
                return this.parseFuncDecl(isPub, isExport);
            case TokenType.Struct:
                return this.parseStructDecl(isPub);
            case TokenType.Enum:
                return this.parseEnumDecl(isPub);
            default:
                return this.parseStatement();
        }
    }

    private parseImportDecl(): ImportDecl {
        const start = this.advance(); // import
        this.skipTrivia();
        const items: string[] = [];
        let module = '';
        let isModuleImport = false;
        let isFilePath = false;

        if (this.peek().type === TokenType.String) {
            isFilePath = true;
            module = this.advance().value.replace(/^["']|["']$/g, '');
        } else {
            const pathSegments: string[] = [this.expect(TokenType.Identifier, 'Expected module name in import').value];
            while (this.match(TokenType.DoubleColon) || this.match(TokenType.Dot)) {
                this.skipTrivia();
                if (this.match(TokenType.LBrace)) {
                    this.skipTrivia();
                    while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
                        items.push(this.expect(TokenType.Identifier, 'Expected imported symbol name').value);
                        this.skipTrivia();
                        if (this.match(TokenType.Comma)) this.skipTrivia();
                    }
                    this.expect(TokenType.RBrace, "Expected '}' in import list");
                    break;
                } else if (this.check(TokenType.Identifier)) {
                    pathSegments.push(this.advance().value);
                }
            }
            module = pathSegments.join('::');
            if (items.length === 0) {
                isModuleImport = true;
            }
        }

        this.skipTrivia();
        const hasSemi = this.consumeSemicolon('Expected ; after import statement');

        return {
            type: 'ImportDecl',
            module,
            items,
            isModuleImport,
            isFilePath,
            hasSemicolon: hasSemi,
            startLine: start.line,
            startColumn: start.column,
            endLine: this.prev().endLine,
            endColumn: this.prev().endColumn
        };
    }

    private parseVarDecl(mutable: boolean): VarDecl {
        const start = this.advance(); // var or const
        this.skipTrivia();
        const name = this.expect(TokenType.Identifier, 'Expected variable name').value;
        this.skipTrivia();

        let typeAnnotation: TypeAnnotation | undefined;
        if (this.match(TokenType.Colon)) {
            this.skipTrivia();
            typeAnnotation = this.parseType();
        }

        this.skipTrivia();
        let initialValue: Expression | undefined;
        if (this.match(TokenType.Equal)) {
            this.skipTrivia();
            initialValue = this.parseExpression();
        }

        this.skipTrivia();
        const hasSemi = this.consumeSemicolon('Expected ; after variable declaration');

        return {
            type: 'VarDecl',
            name,
            mutable,
            typeAnnotation,
            initialValue,
            hasSemicolon: hasSemi,
            startLine: start.line,
            startColumn: start.column,
            endLine: this.prev().endLine,
            endColumn: this.prev().endColumn
        };
    }

    private parseFuncDecl(isPub: boolean, isExport: boolean, parentStruct?: string): FuncDecl {
        const start = this.advance(); // func
        this.skipTrivia();
        const name = this.expect(TokenType.Identifier, 'Expected function name').value;
        this.skipTrivia();

        this.expect(TokenType.LParen, "Expected '(' after function name");
        this.skipTrivia();

        const params: FuncParam[] = [];
        while (!this.check(TokenType.RParen) && !this.isAtEnd()) {
            const pStart = this.peek();
            const variadic = this.match(TokenType.Ellipsis);
            this.skipTrivia();
            const pName = this.expect(TokenType.Identifier, 'Expected parameter name').value;
            this.skipTrivia();

            let pType: TypeAnnotation | undefined;
            if (this.match(TokenType.Colon)) {
                this.skipTrivia();
                pType = this.parseType();
            }

            this.skipTrivia();
            let pDefault: Expression | undefined;
            if (this.match(TokenType.Equal)) {
                this.skipTrivia();
                pDefault = this.parseExpression();
            }

            params.push({
                type: 'FuncParam',
                name: pName,
                typeAnnotation: pType,
                defaultValue: pDefault,
                variadic,
                startLine: pStart.line,
                startColumn: pStart.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            });

            this.skipTrivia();
            if (this.match(TokenType.Comma)) {
                this.skipTrivia();
            }
        }

        this.expect(TokenType.RParen, "Expected ')' after parameters");
        this.skipTrivia();

        let returnType: TypeAnnotation | undefined;
        if (this.match(TokenType.Colon) || this.match(TokenType.ThinArrow)) {
            this.skipTrivia();
            returnType = this.parseType();
        }

        this.skipTrivia();
        const body = this.parseBlock();

        return {
            type: 'FuncDecl',
            name,
            params,
            returnType,
            body,
            isPub,
            isExport,
            parentStruct,
            startLine: start.line,
            startColumn: start.column,
            endLine: body.endLine,
            endColumn: body.endColumn
        };
    }

    private parseStructDecl(isPub: boolean = false): StructDecl {
        const start = this.advance(); // struct
        this.skipTrivia();
        const name = this.expect(TokenType.Identifier, 'Expected struct name').value;
        this.skipTrivia();

        this.expect(TokenType.LBrace, "Expected '{' before struct body");
        this.skipTrivia();

        const fields: StructField[] = [];
        const methods: FuncDecl[] = [];

        while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
            const itemStart = this.peek();
            let itemPub = false;
            if (this.match(TokenType.Pub)) {
                itemPub = true;
                this.skipTrivia();
            }

            if (this.check(TokenType.Func)) {
                methods.push(this.parseFuncDecl(itemPub, false, name));
            } else if (this.check(TokenType.Identifier)) {
                const fName = this.advance().value;
                this.skipTrivia();
                this.expect(TokenType.Colon, "Expected ':' after struct field name");
                this.skipTrivia();
                const fType = this.parseType();
                this.skipTrivia();
                if (this.match(TokenType.Comma) || this.match(TokenType.Semicolon)) {
                    this.skipTrivia();
                }

                fields.push({
                    type: 'StructField',
                    name: fName,
                    fieldType: fType,
                    isPub: itemPub,
                    startLine: itemStart.line,
                    startColumn: itemStart.column,
                    endLine: this.prev().endLine,
                    endColumn: this.prev().endColumn
                });
            } else {
                this.error(`Unexpected token in struct body: ${this.peek().value}`, this.peek().line, this.peek().column);
                this.advance();
            }
            this.skipTrivia();
        }

        this.expect(TokenType.RBrace, "Expected '}' after struct body");

        return {
            type: 'StructDecl',
            name,
            fields,
            methods,
            isPub,
            startLine: start.line,
            startColumn: start.column,
            endLine: this.prev().endLine,
            endColumn: this.prev().endColumn
        };
    }

    private parseEnumDecl(isPub: boolean = false): EnumDecl {
        const start = this.advance(); // enum
        this.skipTrivia();
        const name = this.expect(TokenType.Identifier, 'Expected enum name').value;
        this.skipTrivia();

        this.expect(TokenType.LBrace, "Expected '{' before enum variants");
        this.skipTrivia();

        const variants: EnumVariant[] = [];

        while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
            const vStart = this.peek();
            const vName = this.expect(TokenType.Identifier, 'Expected enum variant name').value;
            this.skipTrivia();

            const params: EnumVariantParam[] = [];
            if (this.match(TokenType.LParen)) {
                this.skipTrivia();
                while (!this.check(TokenType.RParen) && !this.isAtEnd()) {
                    const pStart = this.peek();
                    let pName: string | undefined;
                    // Check named payload: field: type
                    if (this.check(TokenType.Identifier) && this.lookaheadIs(TokenType.Colon)) {
                        pName = this.advance().value;
                        this.skipTrivia();
                        this.expect(TokenType.Colon, "Expected ':'");
                        this.skipTrivia();
                    }
                    const pType = this.parseType();
                    params.push({
                        type: 'EnumVariantParam',
                        name: pName,
                        typeAnnotation: pType,
                        startLine: pStart.line,
                        startColumn: pStart.column,
                        endLine: this.prev().endLine,
                        endColumn: this.prev().endColumn
                    });
                    this.skipTrivia();
                    if (this.match(TokenType.Comma)) {
                        this.skipTrivia();
                    }
                }
                this.expect(TokenType.RParen, "Expected ')' after variant parameters");
            }

            variants.push({
                type: 'EnumVariant',
                name: vName,
                params,
                startLine: vStart.line,
                startColumn: vStart.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            });

            this.skipTrivia();
            if (this.match(TokenType.Comma)) {
                this.skipTrivia();
            }
        }

        this.expect(TokenType.RBrace, "Expected '}' after enum variants");

        return {
            type: 'EnumDecl',
            name,
            variants,
            isPub,
            startLine: start.line,
            startColumn: start.column,
            endLine: this.prev().endLine,
            endColumn: this.prev().endColumn
        };
    }

    public parseType(): TypeAnnotation {
        this.skipTrivia();
        const start = this.peek();
        let baseType: TypeAnnotation;

        // 1. Tuple type or grouped type: (T, U)
        if (this.match(TokenType.LParen)) {
            this.skipTrivia();
            const types: TypeAnnotation[] = [];
            while (!this.check(TokenType.RParen) && !this.isAtEnd()) {
                types.push(this.parseType());
                this.skipTrivia();
                if (this.match(TokenType.Comma)) {
                    this.skipTrivia();
                }
            }
            this.expect(TokenType.RParen, "Expected ')' in type");
            this.skipTrivia();

            // Check if it is a function type: (int, string) -> bool
            if (this.match(TokenType.ThinArrow)) {
                this.skipTrivia();
                const ret = this.parseType();
                const raw = `(${types.map(t => t.raw).join(', ')}) -> ${ret.raw}`;
                baseType = {
                    type: 'TypeAnnotation',
                    kind: 'function',
                    raw,
                    typeArgs: types,
                    returnType: ret,
                    startLine: start.line,
                    startColumn: start.column,
                    endLine: this.prev().endLine,
                    endColumn: this.prev().endColumn
                };
            } else {
                const raw = `(${types.map(t => t.raw).join(', ')})`;
                baseType = {
                    type: 'TypeAnnotation',
                    kind: 'tuple',
                    raw,
                    typeArgs: types,
                    startLine: start.line,
                    startColumn: start.column,
                    endLine: this.prev().endLine,
                    endColumn: this.prev().endColumn
                };
            }
        }
        // 2. Bracket array type: [T]
        else if (this.match(TokenType.LBracket)) {
            this.skipTrivia();
            const inner = this.parseType();
            this.skipTrivia();
            this.expect(TokenType.RBracket, "Expected ']' in array type");
            baseType = {
                type: 'TypeAnnotation',
                kind: 'array',
                raw: `[${inner.raw}]`,
                typeArgs: [inner],
                startLine: start.line,
                startColumn: start.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            };
        }
        // 3. Named / primitive / generic type: int, Vec<T>, HashMap<K, V>
        else {
            const token = this.advance();
            const name = token.value;
            let typeArgs: TypeAnnotation[] | undefined;

            this.skipTrivia();
            // Generic parameters <T, U>
            if (this.match(TokenType.Less)) {
                this.skipTrivia();
                typeArgs = [];
                while (!this.check(TokenType.Greater) && !this.isAtEnd()) {
                    typeArgs.push(this.parseType());
                    this.skipTrivia();
                    if (this.match(TokenType.Comma)) {
                        this.skipTrivia();
                    }
                }
                this.expect(TokenType.Greater, "Expected '>' after generic type arguments");
            }

            const raw = typeArgs && typeArgs.length > 0
                ? `${name}<${typeArgs.map(t => t.raw).join(', ')}>`
                : name;

            baseType = {
                type: 'TypeAnnotation',
                kind: typeArgs && typeArgs.length > 0 ? 'generic' : 'primitive',
                base: name,
                raw,
                typeArgs,
                startLine: start.line,
                startColumn: start.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            };
        }

        // 4. Postfix Nullable: T?
        while (this.match(TokenType.Question)) {
            baseType = {
                type: 'TypeAnnotation',
                kind: 'nullable',
                base: baseType.raw,
                raw: `${baseType.raw}?`,
                typeArgs: [baseType],
                startLine: baseType.startLine,
                startColumn: baseType.startColumn,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            };
        }

        // 5. Union types: T | U
        if (this.match(TokenType.Pipe)) {
            this.skipTrivia();
            const rightType = this.parseType();
            baseType = {
                type: 'TypeAnnotation',
                kind: 'union',
                raw: `${baseType.raw} | ${rightType.raw}`,
                typeArgs: [baseType, rightType],
                startLine: baseType.startLine,
                startColumn: baseType.startColumn,
                endLine: rightType.endLine,
                endColumn: rightType.endColumn
            };
        }

        return baseType;
    }

    private parseBlock(): Block {
        this.skipTrivia();
        const start = this.expect(TokenType.LBrace, "Expected '{'");
        this.skipTrivia();

        const statements: Statement[] = [];
        while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
            const stmt = this.parseStatement();
            if (stmt) {
                statements.push(stmt);
            }
            this.skipTrivia();
        }

        this.expect(TokenType.RBrace, "Expected '}'");

        return {
            type: 'Block',
            statements,
            startLine: start.line,
            startColumn: start.column,
            endLine: this.prev().endLine,
            endColumn: this.prev().endColumn
        };
    }

    private parseStatement(): Statement | null {
        this.skipTrivia();
        const t = this.peek();

        switch (t.type) {
            case TokenType.LBrace:
                return this.parseBlock();
            case TokenType.Var:
                return this.parseVarDecl(true);
            case TokenType.Const:
                return this.parseVarDecl(false);
            case TokenType.If:
                return this.parseIfStmt();
            case TokenType.While:
                return this.parseWhileStmt();
            case TokenType.For:
                return this.parseForStmt();
            case TokenType.Loop:
                return this.parseLoopStmt();
            case TokenType.Return:
                return this.parseReturnStmt();
            case TokenType.Break: {
                const s = this.advance();
                this.skipTrivia();
                const hasSemi = this.consumeSemicolon("Expected ';' after break");
                return {
                    type: 'BreakStmt',
                    hasSemicolon: hasSemi,
                    startLine: s.line,
                    startColumn: s.column,
                    endLine: this.prev().endLine,
                    endColumn: this.prev().endColumn
                };
            }
            case TokenType.Continue: {
                const s = this.advance();
                this.skipTrivia();
                const hasSemi = this.consumeSemicolon("Expected ';' after continue");
                return {
                    type: 'ContinueStmt',
                    hasSemicolon: hasSemi,
                    startLine: s.line,
                    startColumn: s.column,
                    endLine: this.prev().endLine,
                    endColumn: this.prev().endColumn
                };
            }
            case TokenType.Func: {
                return this.parseFuncDecl(false, false);
            }
            case TokenType.Struct: {
                return this.parseStructDecl(false);
            }
            case TokenType.Enum: {
                return this.parseEnumDecl(false);
            }
            default:
                return this.parseExprOrAssignStmt();
        }
    }

    private parseIfStmt(): IfStmt {
        const start = this.advance(); // if
        this.skipTrivia();
        const condition = this.parseExpression();
        this.skipTrivia();
        const thenBlock = this.parseBlock();
        this.skipTrivia();

        let elseBlock: Block | IfStmt | undefined;
        if (this.match(TokenType.Else)) {
            this.skipTrivia();
            elseBlock = this.check(TokenType.If) ? this.parseIfStmt() : this.parseBlock();
        }

        return {
            type: 'IfStmt',
            condition,
            thenBlock,
            elseBlock,
            startLine: start.line,
            startColumn: start.column,
            endLine: this.prev().endLine,
            endColumn: this.prev().endColumn
        };
    }

    private parseWhileStmt(): WhileStmt {
        const start = this.advance(); // while
        this.skipTrivia();
        const condition = this.parseExpression();
        this.skipTrivia();
        const body = this.parseBlock();

        return {
            type: 'WhileStmt',
            condition,
            body,
            startLine: start.line,
            startColumn: start.column,
            endLine: body.endLine,
            endColumn: body.endColumn
        };
    }

    private parseForStmt(): ForStmt {
        const start = this.advance(); // for
        this.skipTrivia();
        const variable = this.expect(TokenType.Identifier, 'Expected loop variable name').value;
        this.skipTrivia();
        this.expect(TokenType.In, "Expected 'in' in for-loop");
        this.skipTrivia();
        const iterable = this.parseExpression();
        this.skipTrivia();
        const body = this.parseBlock();

        return {
            type: 'ForStmt',
            variable,
            iterable,
            body,
            startLine: start.line,
            startColumn: start.column,
            endLine: body.endLine,
            endColumn: body.endColumn
        };
    }

    private parseLoopStmt(): LoopStmt {
        const start = this.advance(); // loop
        this.skipTrivia();
        const body = this.parseBlock();

        return {
            type: 'LoopStmt',
            body,
            startLine: start.line,
            startColumn: start.column,
            endLine: body.endLine,
            endColumn: body.endColumn
        };
    }

    private parseReturnStmt(): ReturnStmt {
        const start = this.advance(); // return
        this.skipTrivia();

        let value: Expression | undefined;
        if (!this.check(TokenType.Semicolon) && !this.check(TokenType.RBrace) && !this.isAtEnd()) {
            value = this.parseExpression();
        }

        this.skipTrivia();
        const hasSemi = this.consumeSemicolon("Expected ';' after return");

        return {
            type: 'ReturnStmt',
            value,
            hasSemicolon: hasSemi,
            startLine: start.line,
            startColumn: start.column,
            endLine: this.prev().endLine,
            endColumn: this.prev().endColumn
        };
    }

    private parseExprOrAssignStmt(): Statement {
        const expr = this.parseExpression();
        this.skipTrivia();

        const assignOps = [
            TokenType.Equal,
            TokenType.PlusAssign,
            TokenType.MinusAssign,
            TokenType.StarAssign,
            TokenType.SlashAssign,
            TokenType.PercentAssign
        ];

        if (assignOps.some(op => this.check(op))) {
            const op = this.advance().value;
            this.skipTrivia();
            const val = this.parseExpression();
            this.skipTrivia();
            const hasSemi = this.consumeSemicolon("Expected ';' after assignment");

            return {
                type: 'AssignmentStmt',
                target: expr,
                operator: op,
                value: val,
                hasSemicolon: hasSemi,
                startLine: expr.startLine,
                startColumn: expr.startColumn,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            };
        }

        const hasSemi = this.consumeSemicolon("Expected ';' after expression statement");
        return {
            type: 'ExprStmt',
            expression: expr,
            hasSemicolon: hasSemi,
            startLine: expr.startLine,
            startColumn: expr.startColumn,
            endLine: this.prev().endLine,
            endColumn: this.prev().endColumn
        };
    }

    public parseExpression(): Expression {
        return this.parseLambdaOrMatch();
    }

    private parseLambdaOrMatch(): Expression {
        this.skipTrivia();

        // 1. Shorthand single parameter lambda: x => expr
        if (this.check(TokenType.Identifier) && this.lookaheadIs(TokenType.Arrow)) {
            const pToken = this.advance();
            this.skipTrivia();
            this.advance(); // =>
            this.skipTrivia();
            const body = this.check(TokenType.LBrace) ? this.parseBlock() : this.parseExpression();
            return {
                type: 'LambdaExpr',
                params: [{
                    type: 'FuncParam',
                    name: pToken.value,
                    variadic: false,
                    startLine: pToken.line,
                    startColumn: pToken.column,
                    endLine: pToken.endLine,
                    endColumn: pToken.endColumn
                }],
                body,
                startLine: pToken.line,
                startColumn: pToken.column,
                endLine: body.endLine,
                endColumn: body.endColumn
            };
        }

        // 2. Match expression: match expr { pattern => expr, ... }
        if (this.check(TokenType.Match)) {
            const start = this.advance(); // match
            this.skipTrivia();
            const target = this.parseOr();
            this.skipTrivia();
            this.expect(TokenType.LBrace, "Expected '{' after match target");
            this.skipTrivia();

            const arms: MatchArm[] = [];
            while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
                const armStart = this.peek();
                const pattern = this.parsePattern();
                this.skipTrivia();

                let guard: Expression | undefined;
                if (this.match(TokenType.If)) {
                    this.skipTrivia();
                    guard = this.parseExpression();
                    this.skipTrivia();
                }

                this.expect(TokenType.Arrow, "Expected '=>' in match arm");
                this.skipTrivia();

                let body: Expression | Block;
                if (this.check(TokenType.LBrace)) {
                    body = this.parseBlock();
                } else {
                    body = this.parseExpression();
                }

                arms.push({
                    type: 'MatchArm',
                    pattern,
                    guard,
                    body,
                    startLine: armStart.line,
                    startColumn: armStart.column,
                    endLine: body.endLine,
                    endColumn: body.endColumn
                });

                this.skipTrivia();
                if (this.match(TokenType.Comma)) {
                    this.skipTrivia();
                }
            }

            this.expect(TokenType.RBrace, "Expected '}' after match arms");

            return {
                type: 'MatchExpr',
                target,
                arms,
                startLine: start.line,
                startColumn: start.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            };
        }

        // 3. Multi-param lambda: (x: int, y: int) => ...
        if (this.check(TokenType.LParen) && this.lookaheadIsLambda()) {
            return this.parseFullLambda();
        }

        return this.parseOr();
    }

    private parseFullLambda(): LambdaExpr {
        const start = this.expect(TokenType.LParen, "Expected '(' in lambda");
        this.skipTrivia();

        const params: FuncParam[] = [];
        while (!this.check(TokenType.RParen) && !this.isAtEnd()) {
            const pStart = this.peek();
            const variadic = this.match(TokenType.Ellipsis);
            this.skipTrivia();
            const pName = this.expect(TokenType.Identifier, 'Expected lambda parameter name').value;
            this.skipTrivia();

            let pType: TypeAnnotation | undefined;
            if (this.match(TokenType.Colon)) {
                this.skipTrivia();
                pType = this.parseType();
            }

            params.push({
                type: 'FuncParam',
                name: pName,
                typeAnnotation: pType,
                variadic,
                startLine: pStart.line,
                startColumn: pStart.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            });

            this.skipTrivia();
            if (this.match(TokenType.Comma)) {
                this.skipTrivia();
            }
        }

        this.expect(TokenType.RParen, "Expected ')' after lambda parameters");
        this.skipTrivia();

        let retType: TypeAnnotation | undefined;
        if (this.match(TokenType.Colon) || this.match(TokenType.ThinArrow)) {
            this.skipTrivia();
            retType = this.parseType();
            this.skipTrivia();
        }

        this.expect(TokenType.Arrow, "Expected '=>' after lambda signature");
        this.skipTrivia();

        const body = this.check(TokenType.LBrace) ? this.parseBlock() : this.parseExpression();

        return {
            type: 'LambdaExpr',
            params,
            returnType: retType,
            body,
            startLine: start.line,
            startColumn: start.column,
            endLine: body.endLine,
            endColumn: body.endColumn
        };
    }

    private parsePattern(): Pattern {
        this.skipTrivia();
        const start = this.peek();

        // 1. Wildcard: _
        if (this.match(TokenType.Underscore)) {
            return {
                type: 'VariablePattern',
                name: '_',
                startLine: start.line,
                startColumn: start.column,
                endLine: start.endLine,
                endColumn: start.endColumn
            };
        }

        // 2. Tuple pattern: (a, b, c)
        if (this.match(TokenType.LParen)) {
            this.skipTrivia();
            const elements: Pattern[] = [];
            while (!this.check(TokenType.RParen) && !this.isAtEnd()) {
                elements.push(this.parsePattern());
                this.skipTrivia();
                if (this.match(TokenType.Comma)) this.skipTrivia();
            }
            this.expect(TokenType.RParen, "Expected ')' in tuple pattern");
            return {
                type: 'TuplePattern',
                elements,
                startLine: start.line,
                startColumn: start.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            };
        }

        // 3. Enum pattern: Enum::Variant(...) or Name::Variant
        if (this.check(TokenType.Identifier) && this.lookaheadIs(TokenType.DoubleColon)) {
            const enumName = this.advance().value;
            this.advance(); // ::
            this.skipTrivia();
            const variant = this.expect(TokenType.Identifier, 'Expected enum variant name').value;
            this.skipTrivia();

            const payloads: Pattern[] = [];
            if (this.match(TokenType.LParen)) {
                this.skipTrivia();
                while (!this.check(TokenType.RParen) && !this.isAtEnd()) {
                    payloads.push(this.parsePattern());
                    this.skipTrivia();
                    if (this.match(TokenType.Comma)) this.skipTrivia();
                }
                this.expect(TokenType.RParen, "Expected ')' in enum pattern");
            }

            return {
                type: 'EnumPattern',
                enumName,
                variant,
                payloads,
                startLine: start.line,
                startColumn: start.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            };
        }

        // 4. Struct pattern: Point { x, y }
        if (this.check(TokenType.Identifier) && this.lookaheadIs(TokenType.LBrace)) {
            const structName = this.advance().value;
            this.advance(); // {
            this.skipTrivia();

            const fields: StructPatternField[] = [];
            while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
                const fStart = this.peek();
                const fName = this.expect(TokenType.Identifier, 'Expected field name in pattern').value;
                this.skipTrivia();
                let subPattern: Pattern | undefined;
                if (this.match(TokenType.Colon)) {
                    this.skipTrivia();
                    subPattern = this.parsePattern();
                }
                fields.push({
                    type: 'StructPatternField',
                    name: fName,
                    pattern: subPattern,
                    startLine: fStart.line,
                    startColumn: fStart.column,
                    endLine: this.prev().endLine,
                    endColumn: this.prev().endColumn
                });
                this.skipTrivia();
                if (this.match(TokenType.Comma)) this.skipTrivia();
            }
            this.expect(TokenType.RBrace, "Expected '}' in struct pattern");

            return {
                type: 'StructPattern',
                structName,
                fields,
                startLine: start.line,
                startColumn: start.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            };
        }

        // 5. Literal expression or Range pattern: 0..9 or 42
        const expr = this.parsePrimary();
        this.skipTrivia();

        if (this.match(TokenType.DotDot)) {
            this.skipTrivia();
            const endExpr = this.parsePrimary();
            return {
                type: 'RangePattern',
                start: expr,
                end: endExpr,
                startLine: expr.startLine,
                startColumn: expr.startColumn,
                endLine: endExpr.endLine,
                endColumn: endExpr.endColumn
            };
        }

        if (expr.type === 'IdentifierExpr') {
            return {
                type: 'VariablePattern',
                name: expr.name,
                startLine: expr.startLine,
                startColumn: expr.startColumn,
                endLine: expr.endLine,
                endColumn: expr.endColumn
            };
        }

        return {
            type: 'LiteralPattern',
            value: expr,
            startLine: expr.startLine,
            startColumn: expr.startColumn,
            endLine: expr.endLine,
            endColumn: expr.endColumn
        };
    }

    private parseOr(): Expression {
        let left = this.parseAnd();
        while (this.match(TokenType.OrOr)) {
            this.skipTrivia();
            const right = this.parseAnd();
            left = {
                type: 'BinaryExpr',
                left,
                operator: '||',
                right,
                startLine: left.startLine,
                startColumn: left.startColumn,
                endLine: right.endLine,
                endColumn: right.endColumn
            };
        }
        return left;
    }

    private parseAnd(): Expression {
        let left = this.parseBitOr();
        while (this.match(TokenType.AndAnd)) {
            this.skipTrivia();
            const right = this.parseBitOr();
            left = {
                type: 'BinaryExpr',
                left,
                operator: '&&',
                right,
                startLine: left.startLine,
                startColumn: left.startColumn,
                endLine: right.endLine,
                endColumn: right.endColumn
            };
        }
        return left;
    }

    private parseBitOr(): Expression {
        let left = this.parseEquality();
        while (this.match(TokenType.Pipe)) {
            this.skipTrivia();
            const right = this.parseEquality();
            left = {
                type: 'BinaryExpr',
                left,
                operator: '|',
                right,
                startLine: left.startLine,
                startColumn: left.startColumn,
                endLine: right.endLine,
                endColumn: right.endColumn
            };
        }
        return left;
    }

    private parseEquality(): Expression {
        let left = this.parseComparison();
        while (this.match(TokenType.EqualEqual) || this.match(TokenType.BangEqual)) {
            const op = this.prev().value;
            this.skipTrivia();
            const right = this.parseComparison();
            left = {
                type: 'BinaryExpr',
                left,
                operator: op,
                right,
                startLine: left.startLine,
                startColumn: left.startColumn,
                endLine: right.endLine,
                endColumn: right.endColumn
            };
        }
        return left;
    }

    private parseComparison(): Expression {
        let left = this.parseRange();
        while (
            this.match(TokenType.Less) ||
            this.match(TokenType.LessEqual) ||
            this.match(TokenType.Greater) ||
            this.match(TokenType.GreaterEqual) ||
            this.match(TokenType.Instanceof)
        ) {
            const op = this.prev();
            this.skipTrivia();
            if (op.type === TokenType.Instanceof) {
                const targetType = this.expect(TokenType.Identifier, 'Expected type name after instanceof').value;
                left = {
                    type: 'InstanceofExpr',
                    target: left,
                    typeName: targetType,
                    startLine: left.startLine,
                    startColumn: left.startColumn,
                    endLine: this.prev().endLine,
                    endColumn: this.prev().endColumn
                };
            } else {
                const right = this.parseRange();
                left = {
                    type: 'BinaryExpr',
                    left,
                    operator: op.value,
                    right,
                    startLine: left.startLine,
                    startColumn: left.startColumn,
                    endLine: right.endLine,
                    endColumn: right.endColumn
                };
            }
        }
        return left;
    }

    private parseRange(): Expression {
        let left = this.parseTerm();
        if (this.match(TokenType.DotDot)) {
            this.skipTrivia();
            const right = this.parseTerm();
            left = {
                type: 'BinaryExpr',
                left,
                operator: '..',
                right,
                startLine: left.startLine,
                startColumn: left.startColumn,
                endLine: right.endLine,
                endColumn: right.endColumn
            };
        }
        return left;
    }

    private parseTerm(): Expression {
        let left = this.parseFactor();
        while (this.match(TokenType.Plus) || this.match(TokenType.Minus)) {
            const op = this.prev().value;
            this.skipTrivia();
            const right = this.parseFactor();
            left = {
                type: 'BinaryExpr',
                left,
                operator: op,
                right,
                startLine: left.startLine,
                startColumn: left.startColumn,
                endLine: right.endLine,
                endColumn: right.endColumn
            };
        }
        return left;
    }

    private parseFactor(): Expression {
        let left = this.parseUnary();
        while (
            this.match(TokenType.Star) ||
            this.match(TokenType.Slash) ||
            this.match(TokenType.Percent)
        ) {
            const op = this.prev().value;
            this.skipTrivia();
            const right = this.parseUnary();
            left = {
                type: 'BinaryExpr',
                left,
                operator: op,
                right,
                startLine: left.startLine,
                startColumn: left.startColumn,
                endLine: right.endLine,
                endColumn: right.endColumn
            };
        }
        return left;
    }

    private parseUnary(): Expression {
        if (
            this.match(TokenType.Bang) ||
            this.match(TokenType.Minus) ||
            this.match(TokenType.PlusPlus) ||
            this.match(TokenType.MinusMinus)
        ) {
            const op = this.prev();
            this.skipTrivia();
            const operand = this.parseUnary();
            return {
                type: 'UnaryExpr',
                operator: op.value,
                operand,
                prefix: true,
                startLine: op.line,
                startColumn: op.column,
                endLine: operand.endLine,
                endColumn: operand.endColumn
            };
        }
        return this.parsePostfix();
    }

    private parsePostfix(): Expression {
        let expr = this.parsePrimary();

        while (true) {
            this.skipTrivia();

            // Postfix ++ or --
            if (this.match(TokenType.PlusPlus) || this.match(TokenType.MinusMinus)) {
                const op = this.prev();
                expr = {
                    type: 'UnaryExpr',
                    operator: op.value,
                    operand: expr,
                    prefix: false,
                    startLine: expr.startLine,
                    startColumn: expr.startColumn,
                    endLine: op.endLine,
                    endColumn: op.endColumn
                };
            }
            // Function call callee(args...)
            else if (this.match(TokenType.LParen)) {
                this.skipTrivia();
                const args: Expression[] = [];
                while (!this.check(TokenType.RParen) && !this.isAtEnd()) {
                    args.push(this.parseExpression());
                    this.skipTrivia();
                    if (this.match(TokenType.Comma)) {
                        this.skipTrivia();
                    }
                }
                this.expect(TokenType.RParen, "Expected ')' after arguments");
                expr = {
                    type: 'CallExpr',
                    callee: expr,
                    arguments: args,
                    startLine: expr.startLine,
                    startColumn: expr.startColumn,
                    endLine: this.prev().endLine,
                    endColumn: this.prev().endColumn
                };
            }
            // Member access expr.prop
            else if (this.match(TokenType.Dot)) {
                this.skipTrivia();
                const propToken = this.advance();
                expr = {
                    type: 'MemberExpr',
                    object: expr,
                    property: propToken.value,
                    startLine: expr.startLine,
                    startColumn: expr.startColumn,
                    endLine: propToken.endLine,
                    endColumn: propToken.endColumn
                };
            }
            // Double-colon path expr::member
            else if (this.match(TokenType.DoubleColon)) {
                this.skipTrivia();
                const memberToken = this.expect(TokenType.Identifier, 'Expected identifier after ::');
                expr = {
                    type: 'PathExpr',
                    qualifier: expr,
                    member: memberToken.value,
                    startLine: expr.startLine,
                    startColumn: expr.startColumn,
                    endLine: memberToken.endLine,
                    endColumn: memberToken.endColumn
                };
            }
            // Index access expr[idx]
            else if (this.match(TokenType.LBracket)) {
                this.skipTrivia();
                const idx = this.parseExpression();
                this.skipTrivia();
                this.expect(TokenType.RBracket, "Expected ']' after index");
                expr = {
                    type: 'IndexExpr',
                    object: expr,
                    index: idx,
                    startLine: expr.startLine,
                    startColumn: expr.startColumn,
                    endLine: this.prev().endLine,
                    endColumn: this.prev().endColumn
                };
            } else {
                break;
            }
        }

        return expr;
    }

    private parsePrimary(): Expression {
        this.skipTrivia();
        const t = this.peek();

        // 1. Numbers
        if (this.match(TokenType.Number)) {
            const raw = t.value;
            let val: number;
            if (raw.startsWith('0x') || raw.startsWith('0X')) {
                val = parseInt(raw.replace(/_/g, ''), 16);
            } else if (raw.startsWith('0b') || raw.startsWith('0B')) {
                val = parseInt(raw.slice(2).replace(/_/g, ''), 2);
            } else {
                val = parseInt(raw.replace(/_/g, ''), 10);
            }
            return {
                type: 'LiteralExpr',
                value: val,
                literalType: 'number',
                raw,
                startLine: t.line,
                startColumn: t.column,
                endLine: t.endLine,
                endColumn: t.endColumn
            };
        }

        // 2. Floats
        if (this.match(TokenType.Float)) {
            const raw = t.value;
            const val = parseFloat(raw.replace(/_/g, ''));
            return {
                type: 'LiteralExpr',
                value: val,
                literalType: 'float',
                raw,
                startLine: t.line,
                startColumn: t.column,
                endLine: t.endLine,
                endColumn: t.endColumn
            };
        }

        // 3. Strings
        if (this.match(TokenType.String)) {
            let strVal = t.value;
            if (strVal.startsWith('"""') && strVal.endsWith('"""')) {
                strVal = strVal.slice(3, -3);
            } else if (strVal.startsWith('"') && strVal.endsWith('"')) {
                strVal = strVal.slice(1, -1);
            }
            return {
                type: 'LiteralExpr',
                value: strVal,
                literalType: 'string',
                raw: t.value,
                startLine: t.line,
                startColumn: t.column,
                endLine: t.endLine,
                endColumn: t.endColumn
            };
        }

        // 4. Characters
        if (this.match(TokenType.Char)) {
            let chVal = t.value;
            if (chVal.startsWith("'") && chVal.endsWith("'")) {
                chVal = chVal.slice(1, -1);
            }
            return {
                type: 'LiteralExpr',
                value: chVal,
                literalType: 'char',
                raw: t.value,
                startLine: t.line,
                startColumn: t.column,
                endLine: t.endLine,
                endColumn: t.endColumn
            };
        }

        // 5. Booleans
        if (this.match(TokenType.Boolean)) {
            return {
                type: 'LiteralExpr',
                value: t.value === 'true',
                literalType: 'boolean',
                raw: t.value,
                startLine: t.line,
                startColumn: t.column,
                endLine: t.endLine,
                endColumn: t.endColumn
            };
        }

        // 6. Null
        if (this.match(TokenType.Null)) {
            return {
                type: 'LiteralExpr',
                value: null,
                literalType: 'null',
                raw: 'null',
                startLine: t.line,
                startColumn: t.column,
                endLine: t.endLine,
                endColumn: t.endColumn
            };
        }

        // 7. Identifier or Struct Literal
        if (this.match(TokenType.Identifier) || this.match(TokenType.Self)) {
            const ident = t.value;

            // Check if this is a struct literal instantiation: Ident { field: val, ... }
            if (this.check(TokenType.LBrace) && this.lookaheadIsFieldColon()) {
                this.advance(); // {
                this.skipTrivia();
                const fields: StructLiteralField[] = [];
                while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
                    const fStart = this.peek();
                    const fName = this.expect(TokenType.Identifier, 'Expected field name in struct literal').value;
                    this.skipTrivia();
                    this.expect(TokenType.Colon, "Expected ':'");
                    this.skipTrivia();
                    const fVal = this.parseExpression();
                    fields.push({
                        type: 'StructLiteralField',
                        name: fName,
                        value: fVal,
                        startLine: fStart.line,
                        startColumn: fStart.column,
                        endLine: this.prev().endLine,
                        endColumn: this.prev().endColumn
                    });
                    this.skipTrivia();
                    if (this.match(TokenType.Comma)) {
                        this.skipTrivia();
                    }
                }
                this.expect(TokenType.RBrace, "Expected '}' in struct literal");

                return {
                    type: 'StructLiteral',
                    structName: ident,
                    fields,
                    startLine: t.line,
                    startColumn: t.column,
                    endLine: this.prev().endLine,
                    endColumn: this.prev().endColumn
                };
            }

            return {
                type: 'IdentifierExpr',
                name: ident,
                startLine: t.line,
                startColumn: t.column,
                endLine: t.endLine,
                endColumn: t.endColumn
            };
        }

        // 8. Parenthesized Expression or Tuple Literal: (a, b)
        if (this.match(TokenType.LParen)) {
            this.skipTrivia();
            const elements: Expression[] = [];
            let hasComma = false;

            while (!this.check(TokenType.RParen) && !this.isAtEnd()) {
                elements.push(this.parseExpression());
                this.skipTrivia();
                if (this.match(TokenType.Comma)) {
                    hasComma = true;
                    this.skipTrivia();
                }
            }
            this.expect(TokenType.RParen, "Expected ')'");

            if (elements.length === 1 && !hasComma) {
                return {
                    type: 'GroupedExpr',
                    inner: elements[0],
                    startLine: t.line,
                    startColumn: t.column,
                    endLine: this.prev().endLine,
                    endColumn: this.prev().endColumn
                };
            }

            return {
                type: 'TupleLiteral',
                elements,
                startLine: t.line,
                startColumn: t.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            };
        }

        // 9. Array Literal: [a, b, c]
        if (this.match(TokenType.LBracket)) {
            this.skipTrivia();
            const elements: Expression[] = [];
            while (!this.check(TokenType.RBracket) && !this.isAtEnd()) {
                elements.push(this.parseExpression());
                this.skipTrivia();
                if (this.match(TokenType.Comma)) {
                    this.skipTrivia();
                }
            }
            this.expect(TokenType.RBracket, "Expected ']'");
            return {
                type: 'ArrayLiteral',
                elements,
                startLine: t.line,
                startColumn: t.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            };
        }

        // 10. Dictionary Literal: {"key": value, ...}
        if (this.match(TokenType.LBrace)) {
            this.skipTrivia();
            const entries: { key: Expression; value: Expression }[] = [];
            while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
                const k = this.parseExpression();
                this.skipTrivia();
                this.expect(TokenType.Colon, "Expected ':' after dictionary key");
                this.skipTrivia();
                const v = this.parseExpression();
                entries.push({ key: k, value: v });
                this.skipTrivia();
                if (this.match(TokenType.Comma)) {
                    this.skipTrivia();
                }
            }
            this.expect(TokenType.RBrace, "Expected '}' in dictionary literal");
            return {
                type: 'DictLiteral',
                entries,
                startLine: t.line,
                startColumn: t.column,
                endLine: this.prev().endLine,
                endColumn: this.prev().endColumn
            };
        }

        // Recovery on unexpected token
        this.error(`Unexpected token '${t.value}' in expression`, t.line, t.column);
        this.advance();
        return {
            type: 'LiteralExpr',
            value: null,
            literalType: 'null',
            raw: 'null',
            startLine: t.line,
            startColumn: t.column,
            endLine: t.endLine,
            endColumn: t.endColumn
        };
    }

    private lookaheadIs(type: TokenType): boolean {
        let i = 1;
        while (this.current + i < this.tokens.length) {
            const tok = this.tokens[this.current + i];
            if (tok.type !== TokenType.Newline && tok.type !== TokenType.Comment && tok.type !== TokenType.BlockComment) {
                return tok.type === type;
            }
            i++;
        }
        return false;
    }

    private lookaheadIsFieldColon(): boolean {
        let i = 1;
        // Skip '{'
        while (this.current + i < this.tokens.length) {
            const tok = this.tokens[this.current + i];
            if (tok.type === TokenType.LBrace) {
                i++;
                break;
            }
            if (tok.type !== TokenType.Newline && tok.type !== TokenType.Comment && tok.type !== TokenType.BlockComment) {
                return false;
            }
            i++;
        }
        // Skip whitespace after '{'
        while (this.current + i < this.tokens.length) {
            const tok = this.tokens[this.current + i];
            if (tok.type !== TokenType.Newline && tok.type !== TokenType.Comment && tok.type !== TokenType.BlockComment) {
                if (tok.type === TokenType.RBrace) return true; // empty struct or dict
                if (tok.type === TokenType.Identifier) {
                    // Check next token after identifier is ':'
                    let j = i + 1;
                    while (this.current + j < this.tokens.length) {
                        const nextTok = this.tokens[this.current + j];
                        if (nextTok.type !== TokenType.Newline && nextTok.type !== TokenType.Comment && nextTok.type !== TokenType.BlockComment) {
                            return nextTok.type === TokenType.Colon;
                        }
                        j++;
                    }
                }
                return false;
            }
            i++;
        }
        return false;
    }

    private lookaheadIsLambda(): boolean {
        let depth = 0;
        let i = 0;
        while (this.current + i < this.tokens.length) {
            const tok = this.tokens[this.current + i];
            if (tok.type === TokenType.LParen) depth++;
            else if (tok.type === TokenType.RParen) {
                depth--;
                if (depth === 0) {
                    // Lookahead after ')' for '=>' or ': Type =>'
                    let j = i + 1;
                    while (this.current + j < this.tokens.length) {
                        const after = this.tokens[this.current + j];
                        if (after.type === TokenType.Arrow) return true;
                        if (after.type === TokenType.Colon || after.type === TokenType.ThinArrow || after.type === TokenType.Identifier) {
                            j++;
                            continue;
                        }
                        if (after.type !== TokenType.Newline && after.type !== TokenType.Comment && after.type !== TokenType.BlockComment) {
                            break;
                        }
                        j++;
                    }
                    return false;
                }
            }
            i++;
        }
        return false;
    }

    private consumeSemicolon(msg: string): boolean {
        this.skipTrivia();
        if (this.match(TokenType.Semicolon)) {
            return true;
        }
        // Graceful error recovery: record syntax error but allow parser to proceed
        this.error(msg, this.prev().endLine, this.prev().endColumn + 1);
        return false;
    }

    private skipTrivia(): void {
        while (
            this.match(TokenType.Newline) ||
            this.match(TokenType.Comment) ||
            this.match(TokenType.BlockComment)
        ) {}
    }

    private error(message: string, line: number, column: number): void {
        this.errors.push({ message, line, column, category: 'syntax' });
    }

    public peek(): Token {
        return this.tokens[this.current] ?? {
            type: TokenType.EOF,
            value: '',
            line: 0,
            column: 0,
            endLine: 0,
            endColumn: 0
        };
    }

    public prev(): Token {
        return this.tokens[this.current - 1] ?? {
            type: TokenType.EOF,
            value: '',
            line: 0,
            column: 0,
            endLine: 0,
            endColumn: 0
        };
    }

    public isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    public check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    public match(type: TokenType): boolean {
        if (this.check(type)) {
            this.advance();
            return true;
        }
        return false;
    }

    public advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.prev();
    }

    public expect(type: TokenType, msg: string): Token {
        if (this.check(type)) return this.advance();
        this.error(msg, this.peek().line, this.peek().column);
        return this.peek();
    }
}
