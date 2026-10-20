import {
    Position,
    Range,
    Location,
    DocumentSymbol,
    SymbolKind as LspSymbolKind,
    DocumentHighlight,
    DocumentHighlightKind,
    TextEdit,
    WorkspaceEdit,
    SignatureHelp,
    InlayHint,
    InlayHintKind
} from 'vscode-languageserver/node';

import {
    ParseResult,
    Token,
    TokenType,
    Module,
    TopLevelDecl,
    FuncDecl,
    StructDecl,
    EnumDecl,
    VarDecl,
    ImportDecl,
    Block,
    Statement,
    Expression,
    LiteralExpr,
    IdentifierExpr,
    BinaryExpr,
    UnaryExpr,
    CallExpr,
    MemberExpr,
    PathExpr,
    IndexExpr,
    ArrayLiteral,
    TupleLiteral,
    DictLiteral,
    StructLiteral,
    LambdaExpr,
    MatchExpr,
    GroupedExpr,
    InstanceofExpr,
    TypeAnnotation,
    Pattern,
    EnumVariant
} from './parser';

export type SymbolKind =
    | 'function'
    | 'struct'
    | 'enum'
    | 'variable'
    | 'constant'
    | 'parameter'
    | 'field'
    | 'method'
    | 'enumVariant'
    | 'import'
    | 'module';

export interface SymbolInfo {
    name: string;
    kind: SymbolKind;
    type?: string;
    documentation?: string;
    signature?: string;
    location: Location;
    selectionRange: Range;
    containerName?: string;
    isPub?: boolean;
    mutable?: boolean;
    references: Location[];
}

export interface MemberInfo {
    name: string;
    kind: 'field' | 'method';
    type: string;
    signature?: string;
    documentation?: string;
}

export interface HoverInfo {
    type?: string;
    signature?: string;
    documentation?: string;
    range: Range;
}

export class Scope {
    parent?: Scope;
    children: Scope[] = [];
    kind: 'module' | 'function' | 'block' | 'struct' | 'match' | 'for' | 'lambda';
    range: Range;
    symbols: Map<string, SymbolInfo> = new Map();

    constructor(
        kind: 'module' | 'function' | 'block' | 'struct' | 'match' | 'for' | 'lambda',
        range: Range,
        parent?: Scope
    ) {
        this.kind = kind;
        this.range = range;
        this.parent = parent;
        if (parent) {
            parent.children.push(this);
        }
    }

    resolve(name: string): SymbolInfo | undefined {
        if (this.symbols.has(name)) {
            return this.symbols.get(name);
        }
        return this.parent?.resolve(name);
    }

    findScopeAt(pos: Position): Scope {
        for (const child of this.children) {
            if (this.isPositionInsideRange(pos, child.range)) {
                return child.findScopeAt(pos);
            }
        }
        return this;
    }

    private isPositionInsideRange(pos: Position, range: Range): boolean {
        if (pos.line < range.start.line || pos.line > range.end.line) return false;
        if (pos.line === range.start.line && pos.character < range.start.character) return false;
        if (pos.line === range.end.line && pos.character > range.end.character) return false;
        return true;
    }
}

export interface BuiltinDoc {
    name: string;
    signature: string;
    returnType: string;
    doc: string;
    params: { name: string; type: string }[];
}

export const BUILTIN_FUNCTIONS: Record<string, BuiltinDoc> = {
    clamp: {
        name: "clamp",
        params: [{ name: "val", type: "int" }, { name: "min", type: "int" }, { name: "max", type: "int" }],
        returnType: "int",
        signature: "clamp(val: int, min: int, max: int): int",
        doc: "Clamps \x60val\x60 to the range [min, max]."
    },

    // 10.1 Scalar Conversions
    int: {
        name: 'int',
        signature: 'int(c: char): int',
        returnType: 'int',
        doc: 'Converts a 1-byte char to its 0..255 unsigned integer code.',
        params: [{ name: 'c', type: 'char' }]
    },
    char: {
        name: 'char',
        signature: 'char(i: int): char',
        returnType: 'char',
        doc: 'Converts an integer in range 0..255 to its single-byte character. Exits 1 if out of range.',
        params: [{ name: 'i', type: 'int' }]
    },
    float: {
        name: 'float',
        signature: 'float(x: int | float): float',
        returnType: 'float',
        doc: 'Converts an integer or float to 64-bit binary64 float.',
        params: [{ name: 'x', type: 'int | float' }]
    },
    string: {
        name: 'string',
        signature: 'string(x: any): string',
        returnType: 'string',
        doc: 'Converts any scalar primitive directly to its string representation.',
        params: [{ name: 'x', type: 'any' }]
    },

    // 10.2 Numeric & Math Builtins
    abs: {
        name: 'abs',
        signature: 'abs(x: int | float): int | float',
        returnType: 'int | float',
        doc: 'Returns the absolute value of a number. Panics on INT64_MIN.',
        params: [{ name: 'x', type: 'int | float' }]
    },
    min: {
        name: 'min',
        signature: 'min(a: int | float, b: int | float): int | float',
        returnType: 'int | float',
        doc: 'Returns the smaller of two numbers.',
        params: [{ name: 'a', type: 'int | float' }, { name: 'b', type: 'int | float' }]
    },
    max: {
        name: 'max',
        signature: 'max(a: int | float, b: int | float): int | float',
        returnType: 'int | float',
        doc: 'Returns the larger of two numbers.',
        params: [{ name: 'a', type: 'int | float' }, { name: 'b', type: 'int | float' }]
    },
    pow: {
        name: 'pow',
        signature: 'pow(base: int | float, exp: int | float): int | float',
        returnType: 'int | float',
        doc: 'Computes base raised to power exponent.',
        params: [{ name: 'base', type: 'int | float' }, { name: 'exp', type: 'int | float' }]
    },
    sqrt: {
        name: 'sqrt',
        signature: 'sqrt(x: float): float',
        returnType: 'float',
        doc: 'Returns the square root of a float. Exits 1 if x < 0.0.',
        params: [{ name: 'x', type: 'float' }]
    },
    exp: {
        name: 'exp',
        signature: 'exp(x: float): float',
        returnType: 'float',
        doc: 'Computes the exponential function (e^x).',
        params: [{ name: 'x', type: 'float' }]
    },
    log: {
        name: 'log',
        signature: 'log(x: float): float',
        returnType: 'float',
        doc: 'Computes the natural logarithm (ln x). Exits 1 if x <= 0.0.',
        params: [{ name: 'x', type: 'float' }]
    },
    sin: {
        name: 'sin',
        signature: 'sin(x: float): float',
        returnType: 'float',
        doc: 'Computes sine of angle in radians.',
        params: [{ name: 'x', type: 'float' }]
    },
    cos: {
        name: 'cos',
        signature: 'cos(x: float): float',
        returnType: 'float',
        doc: 'Computes cosine of angle in radians.',
        params: [{ name: 'x', type: 'float' }]
    },
    tan: {
        name: 'tan',
        signature: 'tan(x: float): float',
        returnType: 'float',
        doc: 'Computes tangent of angle in radians.',
        params: [{ name: 'x', type: 'float' }]
    },
    floor: {
        name: 'floor',
        signature: 'floor(x: float): int',
        returnType: 'int',
        doc: 'Returns the greatest integer <= x (rounds towards -infinity).',
        params: [{ name: 'x', type: 'float' }]
    },
    ceil: {
        name: 'ceil',
        signature: 'ceil(x: float): int',
        returnType: 'int',
        doc: 'Returns the least integer >= x (rounds towards +infinity).',
        params: [{ name: 'x', type: 'float' }]
    },
    round: {
        name: 'round',
        signature: 'round(x: float): int',
        returnType: 'int',
        doc: 'Rounds float to the nearest integer.',
        params: [{ name: 'x', type: 'float' }]
    },
    random: {
        name: 'random',
        signature: 'random(): float',
        returnType: 'float',
        doc: 'Generates a pseudo-random float in range [0.0, 1.0).',
        params: []
    },

    // 10.3 Bitwise & Wrapping Arithmetic
    wrapAdd: {
        name: 'wrapAdd',
        signature: 'wrapAdd(a: int, b: int): int',
        returnType: 'int',
        doc: '64-bit integer addition with two\'s-complement modular wrapping.',
        params: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }]
    },
    wrapSub: {
        name: 'wrapSub',
        signature: 'wrapSub(a: int, b: int): int',
        returnType: 'int',
        doc: '64-bit integer subtraction with two\'s-complement modular wrapping.',
        params: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }]
    },
    wrapMul: {
        name: 'wrapMul',
        signature: 'wrapMul(a: int, b: int): int',
        returnType: 'int',
        doc: '64-bit integer multiplication with two\'s-complement modular wrapping.',
        params: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }]
    },
    bitAnd: {
        name: 'bitAnd',
        signature: 'bitAnd(a: int, b: int): int',
        returnType: 'int',
        doc: 'Bitwise AND (a & b).',
        params: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }]
    },
    bitOr: {
        name: 'bitOr',
        signature: 'bitOr(a: int, b: int): int',
        returnType: 'int',
        doc: 'Bitwise OR (a | b).',
        params: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }]
    },
    bitXor: {
        name: 'bitXor',
        signature: 'bitXor(a: int, b: int): int',
        returnType: 'int',
        doc: 'Bitwise XOR (a ^ b).',
        params: [{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }]
    },
    bitNot: {
        name: 'bitNot',
        signature: 'bitNot(a: int): int',
        returnType: 'int',
        doc: 'Bitwise inversion (~a).',
        params: [{ name: 'a', type: 'int' }]
    },
    bitShl: {
        name: 'bitShl',
        signature: 'bitShl(a: int, n: int): int',
        returnType: 'int',
        doc: 'Bitwise shift left (a << n).',
        params: [{ name: 'a', type: 'int' }, { name: 'n', type: 'int' }]
    },
    bitShr: {
        name: 'bitShr',
        signature: 'bitShr(a: int, n: int): int',
        returnType: 'int',
        doc: 'Arithmetic shift right (a >> n).',
        params: [{ name: 'a', type: 'int' }, { name: 'n', type: 'int' }]
    },

    // 10.4 Standard I/O & Diagnostics
    print: {
        name: 'print',
        signature: 'print(...values: any): void',
        returnType: 'void',
        doc: 'Prints values space-separated to standard output without trailing newline.',
        params: [{ name: '...values', type: 'any' }]
    },
    println: {
        name: 'println',
        signature: 'println(...values: any): void',
        returnType: 'void',
        doc: 'Prints values space-separated to standard output followed by a newline.',
        params: [{ name: '...values', type: 'any' }]
    },
    eprint: {
        name: 'eprint',
        signature: 'eprint(...values: any): void',
        returnType: 'void',
        doc: 'Prints values space-separated to standard error without trailing newline.',
        params: [{ name: '...values', type: 'any' }]
    },
    eprintln: {
        name: 'eprintln',
        signature: 'eprintln(...values: any): void',
        returnType: 'void',
        doc: 'Prints values space-separated to standard error followed by a newline.',
        params: [{ name: '...values', type: 'any' }]
    },
    input: {
        name: 'input',
        signature: 'input(prompt?: string): string',
        returnType: 'string',
        doc: 'Prompts user and reads a line of text from standard input.',
        params: [{ name: 'prompt', type: 'string?' }]
    },
    assert: {
        name: 'assert',
        signature: 'assert(cond: bool, msg: string): void',
        returnType: 'void',
        doc: 'Asserts condition is true. Panics with msg if false.',
        params: [{ name: 'cond', type: 'bool' }, { name: 'msg', type: 'string' }]
    },
    typeof: {
        name: 'typeof',
        signature: 'typeof(val: any): string',
        returnType: 'string',
        doc: 'Returns the runtime type name of the given value.',
        params: [{ name: 'val', type: 'any' }]
    },
    range: {
        name: 'range',
        signature: 'range(start: int, end: int): Vec<int>',
        returnType: 'Vec<int>',
        doc: 'Creates an iterable range of integers [start, end).',
        params: [{ name: 'start', type: 'int' }, { name: 'end', type: 'int' }]
    },

    // 10.5 File System Operations
    readFile: {
        name: 'readFile',
        signature: 'readFile(path: string): string',
        returnType: 'string',
        doc: 'Reads entire file contents into a string. Exits 1 on missing file.',
        params: [{ name: 'path', type: 'string' }]
    },
    writeFile: {
        name: 'writeFile',
        signature: 'writeFile(path: string, data: string): void',
        returnType: 'void',
        doc: 'Writes string contents to file (creates or truncates).',
        params: [{ name: 'path', type: 'string' }, { name: 'data', type: 'string' }]
    },
    appendFile: {
        name: 'appendFile',
        signature: 'appendFile(path: string, data: string): void',
        returnType: 'void',
        doc: 'Appends string contents to an existing or new file.',
        params: [{ name: 'path', type: 'string' }, { name: 'data', type: 'string' }]
    },
    fileExists: {
        name: 'fileExists',
        signature: 'fileExists(path: string): bool',
        returnType: 'bool',
        doc: 'Returns true if file exists on disk, false otherwise.',
        params: [{ name: 'path', type: 'string' }]
    },
    deleteFile: {
        name: 'deleteFile',
        signature: 'deleteFile(path: string): void',
        returnType: 'void',
        doc: 'Deletes a file from the file system.',
        params: [{ name: 'path', type: 'string' }]
    },
    copyFile: {
        name: 'copyFile',
        signature: 'copyFile(src: string, dst: string): void',
        returnType: 'void',
        doc: 'Copies file from src to dst.',
        params: [{ name: 'src', type: 'string' }, { name: 'dst', type: 'string' }]
    },
    moveFile: {
        name: 'moveFile',
        signature: 'moveFile(src: string, dst: string): void',
        returnType: 'void',
        doc: 'Moves or renames file from src to dst.',
        params: [{ name: 'src', type: 'string' }, { name: 'dst', type: 'string' }]
    },
    isFile: {
        name: 'isFile',
        signature: 'isFile(path: string): bool',
        returnType: 'bool',
        doc: 'Returns true if path is a regular file.',
        params: [{ name: 'path', type: 'string' }]
    },
    isDir: {
        name: 'isDir',
        signature: 'isDir(path: string): bool',
        returnType: 'bool',
        doc: 'Returns true if path is a directory.',
        params: [{ name: 'path', type: 'string' }]
    },
    mkdir: {
        name: 'mkdir',
        signature: 'mkdir(path: string): void',
        returnType: 'void',
        doc: 'Creates a single directory.',
        params: [{ name: 'path', type: 'string' }]
    },
    mkdirAll: {
        name: 'mkdirAll',
        signature: 'mkdirAll(path: string): void',
        returnType: 'void',
        doc: 'Recursively creates directories along the path.',
        params: [{ name: 'path', type: 'string' }]
    },
    removeDir: {
        name: 'removeDir',
        signature: 'removeDir(path: string): void',
        returnType: 'void',
        doc: 'Removes an empty directory.',
        params: [{ name: 'path', type: 'string' }]
    },
    removeDirAll: {
        name: 'removeDirAll',
        signature: 'removeDirAll(path: string): void',
        returnType: 'void',
        doc: 'Recursively removes a directory and all its contents.',
        params: [{ name: 'path', type: 'string' }]
    },
    listDir: {
        name: 'listDir',
        signature: 'listDir(path: string): Vec<string>',
        returnType: 'Vec<string>',
        doc: 'Returns list of filenames within directory.',
        params: [{ name: 'path', type: 'string' }]
    },
    listDirPaths: {
        name: 'listDirPaths',
        signature: 'listDirPaths(path: string): Vec<string>',
        returnType: 'Vec<string>',
        doc: 'Returns list of full paths within directory.',
        params: [{ name: 'path', type: 'string' }]
    },
    pathJoin: {
        name: 'pathJoin',
        signature: 'pathJoin(a: string, b: string): string',
        returnType: 'string',
        doc: 'Joins two filesystem path segments.',
        params: [{ name: 'a', type: 'string' }, { name: 'b', type: 'string' }]
    },
    basename: {
        name: 'basename',
        signature: 'basename(path: string): string',
        returnType: 'string',
        doc: 'Returns filename portion of a path.',
        params: [{ name: 'path', type: 'string' }]
    },
    dirname: {
        name: 'dirname',
        signature: 'dirname(path: string): string',
        returnType: 'string',
        doc: 'Returns directory portion of a path.',
        params: [{ name: 'path', type: 'string' }]
    },
    extname: {
        name: 'extname',
        signature: 'extname(path: string): string',
        returnType: 'string',
        doc: 'Returns file extension (including .).',
        params: [{ name: 'path', type: 'string' }]
    },

    // 10.6 Process, Environment & System Execution
    args: {
        name: 'args',
        signature: 'args(): Vec<string>',
        returnType: 'Vec<string>',
        doc: 'Returns list of command-line arguments passed to the program.',
        params: []
    },
    getEnv: {
        name: 'getEnv',
        signature: 'getEnv(name: string): Option<string>',
        returnType: 'Option<string>',
        doc: 'Reads an environment variable.',
        params: [{ name: 'name', type: 'string' }]
    },
    setEnv: {
        name: 'setEnv',
        signature: 'setEnv(name: string, val: string): void',
        returnType: 'void',
        doc: 'Sets an environment variable in current process.',
        params: [{ name: 'name', type: 'string' }, { name: 'val', type: 'string' }]
    },
    unsetEnv: {
        name: 'unsetEnv',
        signature: 'unsetEnv(name: string): void',
        returnType: 'void',
        doc: 'Unsets an environment variable.',
        params: [{ name: 'name', type: 'string' }]
    },
    envAll: {
        name: 'envAll',
        signature: 'envAll(): HashMap<string, string>',
        returnType: 'HashMap<string, string>',
        doc: 'Returns all environment variables as a key-value map.',
        params: []
    },
    cwd: {
        name: 'cwd',
        signature: 'cwd(): string',
        returnType: 'string',
        doc: 'Returns current working directory.',
        params: []
    },
    chdir: {
        name: 'chdir',
        signature: 'chdir(path: string): Result<string, string>',
        returnType: 'Result<string, string>',
        doc: 'Changes current working directory.',
        params: [{ name: 'path', type: 'string' }]
    },
    tempDir: {
        name: 'tempDir',
        signature: 'tempDir(): string',
        returnType: 'string',
        doc: 'Returns system temporary directory path.',
        params: []
    },
    exec: {
        name: 'exec',
        signature: 'exec(cmd: string): Result<string, string>',
        returnType: 'Result<string, string>',
        doc: 'Executes shell command via /bin/sh -c and returns stdout.',
        params: [{ name: 'cmd', type: 'string' }]
    },
    execDetailed: {
        name: 'execDetailed',
        signature: 'execDetailed(cmd: string): ExecResult',
        returnType: 'ExecResult',
        doc: 'Executes shell command and returns struct with stdout, stderr, and exit code.',
        params: [{ name: 'cmd', type: 'string' }]
    },
    which: {
        name: 'which',
        signature: 'which(bin: string): Option<string>',
        returnType: 'Option<string>',
        doc: 'Resolves full path to executable binary using system PATH.',
        params: [{ name: 'bin', type: 'string' }]
    },
    sleepMs: {
        name: 'sleepMs',
        signature: 'sleepMs(ms: int): void',
        returnType: 'void',
        doc: 'Suspends thread execution for specified milliseconds.',
        params: [{ name: 'ms', type: 'int' }]
    },
    exit: {
        name: 'exit',
        signature: 'exit(code: int): void',
        returnType: 'void',
        doc: 'Terminates process immediately with specified status code.',
        params: [{ name: 'code', type: 'int' }]
    }
};

const STRING_METHODS: MemberInfo[] = [
    { name: 'len', kind: 'method', type: 'int', signature: 'len(): int', documentation: 'Returns number of bytes in string.' },
    { name: 'slice', kind: 'method', type: 'string', signature: 'slice(start: int, end: int): string', documentation: 'Returns half-open substring [start, end).' },
    { name: 'indexOf', kind: 'method', type: 'int', signature: 'indexOf(sub: string): int', documentation: 'Returns first byte index of sub, or -1 if absent.' },
    { name: 'lastIndexOf', kind: 'method', type: 'int', signature: 'lastIndexOf(sub: string): int', documentation: 'Returns last byte index of sub, or -1 if absent.' },
    { name: 'contains', kind: 'method', type: 'bool', signature: 'contains(needle: string): bool', documentation: 'Returns true if needle is found in string.' },
    { name: 'startsWith', kind: 'method', type: 'bool', signature: 'startsWith(prefix: string): bool', documentation: 'Returns true if string begins with prefix.' },
    { name: 'endsWith', kind: 'method', type: 'bool', signature: 'endsWith(suffix: string): bool', documentation: 'Returns true if string ends with suffix.' },
    { name: 'toUpper', kind: 'method', type: 'string', signature: 'toUpper(): string', documentation: 'Converts ASCII characters to uppercase.' },
    { name: 'toLower', kind: 'method', type: 'string', signature: 'toLower(): string', documentation: 'Converts ASCII characters to lowercase.' },
    { name: 'trim', kind: 'method', type: 'string', signature: 'trim(): string', documentation: 'Strips leading and trailing ASCII whitespace.' },
    { name: 'trimStart', kind: 'method', type: 'string', signature: 'trimStart(): string', documentation: 'Strips leading ASCII whitespace.' },
    { name: 'trimEnd', kind: 'method', type: 'string', signature: 'trimEnd(): string', documentation: 'Strips trailing ASCII whitespace.' },
    { name: 'padLeft', kind: 'method', type: 'string', signature: 'padLeft(width: int, pad: string): string', documentation: 'Pads left side to width using first byte of pad.' },
    { name: 'padRight', kind: 'method', type: 'string', signature: 'padRight(width: int, pad: string): string', documentation: 'Pads right side to width using first byte of pad.' },
    { name: 'replace', kind: 'method', type: 'string', signature: 'replace(from: string, to: string): string', documentation: 'Replaces occurrences of from with to.' },
    { name: 'repeat', kind: 'method', type: 'string', signature: 'repeat(count: int): string', documentation: 'Returns string repeated count times.' },
    { name: 'split', kind: 'method', type: 'Vec<string>', signature: 'split(delim: string): Vec<string>', documentation: 'Splits string by delimiter ("" splits into individual characters).' },
    { name: 'toInt', kind: 'method', type: 'int', signature: 'toInt(): int', documentation: 'Parses ASCII decimal string to integer. Exits 1 if invalid.' },
    { name: 'toFloat', kind: 'method', type: 'float', signature: 'toFloat(): float', documentation: 'Parses ASCII decimal string to float. Exits 1 if invalid.' },
    { name: 'hash', kind: 'method', type: 'int', signature: 'hash(): int', documentation: 'Returns numeric value of first byte.' },
    { name: 'toString', kind: 'method', type: 'string', signature: 'toString(): string', documentation: 'Identity string conversion.' }
];

const VEC_METHODS: MemberInfo[] = [
    { name: 'push', kind: 'method', type: 'void', signature: 'push(item: T): void', documentation: 'Appends item to end of vector.' },
    { name: 'pop', kind: 'method', type: 'T', signature: 'pop(): T', documentation: 'Removes and returns last item. Exits 1 if empty.' },
    { name: 'len', kind: 'method', type: 'int', signature: 'len(): int', documentation: 'Returns number of elements in vector.' },
    { name: 'get', kind: 'method', type: 'T', signature: 'get(i: int): T', documentation: 'Returns item at index i (checked bounds).' },
    { name: 'set', kind: 'method', type: 'void', signature: 'set(i: int, val: T): void', documentation: 'Overwrites item at index i (checked bounds).' },
    { name: 'contains', kind: 'method', type: 'bool', signature: 'contains(item: T): bool', documentation: 'Returns true if vector contains item.' },
    { name: 'indexOf', kind: 'method', type: 'int', signature: 'indexOf(item: T): int', documentation: 'Returns index of item, or -1 if absent.' },
    { name: 'insert', kind: 'method', type: 'void', signature: 'insert(i: int, item: T): void', documentation: 'Inserts item at index i.' },
    { name: 'remove', kind: 'method', type: 'T', signature: 'remove(i: int): T', documentation: 'Removes and returns item at index i.' },
    { name: 'clear', kind: 'method', type: 'void', signature: 'clear(): void', documentation: 'Removes all elements from vector.' },
    { name: 'reverse', kind: 'method', type: 'void', signature: 'reverse(): void', documentation: 'In-place reverses the order of elements.' },
    { name: 'sort', kind: 'method', type: 'void', signature: 'sort(): void', documentation: 'In-place stable sort (homogeneous ints, floats, strings, bools).' },
    { name: 'slice', kind: 'method', type: 'Vec<T>', signature: 'slice(start: int, end: int): Vec<T>', documentation: 'Returns a new sub-vector from start to end.' },
    { name: 'join', kind: 'method', type: 'string', signature: 'join(sep: string): string', documentation: 'Joins string vector elements separated by sep.' },
    { name: 'map', kind: 'method', type: 'Vec<U>', signature: 'map(fn: (T) -> U): Vec<U>', documentation: 'Transforms elements via mapping function (T) -> U.' },
    { name: 'filter', kind: 'method', type: 'Vec<T>', signature: 'filter(fn: (T) -> bool): Vec<T>', documentation: 'Filters elements satisfying predicate (T) -> bool.' },
    { name: 'reduce', kind: 'method', type: 'U', signature: 'reduce(fn: (U, T) -> U, init: U): U', documentation: 'Folds elements using accumulator (U, T) -> U.' }
];

const HASHMAP_METHODS: MemberInfo[] = [
    { name: 'set', kind: 'method', type: 'void', signature: 'set(key: string, val: V): void', documentation: 'Inserts or updates key-value pair.' },
    { name: 'get', kind: 'method', type: 'V', signature: 'get(key: string): V', documentation: 'Retrieves value for key (panics if key absent).' },
    { name: 'has', kind: 'method', type: 'bool', signature: 'has(key: string): bool', documentation: 'Returns true if key exists in map.' },
    { name: 'delete', kind: 'method', type: 'void', signature: 'delete(key: string): void', documentation: 'Removes key and its associated value from map.' },
    { name: 'keys', kind: 'method', type: 'Vec<string>', signature: 'keys(): Vec<string>', documentation: 'Returns vector of all keys in map.' },
    { name: 'values', kind: 'method', type: 'Vec<V>', signature: 'values(): Vec<V>', documentation: 'Returns vector of all values in map.' },
    { name: 'entries', kind: 'method', type: 'Vec<Vec<any>>', signature: 'entries(): Vec<Vec<any>>', documentation: 'Returns vector of [key, value] pairs.' },
    { name: 'len', kind: 'method', type: 'int', signature: 'len(): int', documentation: 'Returns number of entries in map.' },
    { name: 'clear', kind: 'method', type: 'void', signature: 'clear(): void', documentation: 'Removes all entries from map.' }
];

const OPTION_METHODS: MemberInfo[] = [
    { name: 'isSome', kind: 'method', type: 'bool', signature: 'isSome(): bool', documentation: 'Returns true if value is Option::Some.' },
    { name: 'isNone', kind: 'method', type: 'bool', signature: 'isNone(): bool', documentation: 'Returns true if value is Option::None.' },
    { name: 'unwrap', kind: 'method', type: 'T', signature: 'unwrap(): T', documentation: 'Returns payload. Panics if None.' },
    { name: 'unwrapOr', kind: 'method', type: 'T', signature: 'unwrapOr(def: T): T', documentation: 'Returns payload if Some, otherwise def.' }
];

const RESULT_METHODS: MemberInfo[] = [
    { name: 'isOk', kind: 'method', type: 'bool', signature: 'isOk(): bool', documentation: 'Returns true if value is Result::Ok.' },
    { name: 'isErr', kind: 'method', type: 'bool', signature: 'isErr(): bool', documentation: 'Returns true if value is Result::Err.' },
    { name: 'unwrap', kind: 'method', type: 'T', signature: 'unwrap(): T', documentation: 'Returns Ok payload. Panics if Ok.' },
    { name: 'unwrapErr', kind: 'method', type: 'E', signature: 'unwrapErr(): E', documentation: 'Returns Err payload. Panics if Ok.' },
    { name: 'unwrapOr', kind: 'method', type: 'T', signature: 'unwrapOr(def: T): T', documentation: 'Returns Ok payload if Ok, otherwise def.' },
    { name: 'unwrapStr', kind: 'method', type: 'string', signature: 'unwrapStr(): string', documentation: 'Unwraps string Ok payload directly.' },
    { name: 'unwrapOrStr', kind: 'method', type: 'string', signature: 'unwrapOrStr(def: string): string', documentation: 'Returns string Ok payload or string default.' }
];

export class ReyAnalyzer {
    private uri: string;
    private parseResult: ParseResult;
    private rootScope: Scope;
    private allSymbols: SymbolInfo[] = [];
    private identifierReferences: { name: string; location: Location; scope: Scope }[] = [];
    private tokenPositions: Map<number, Token[]> = new Map();

    constructor(uri: string, parseResult: ParseResult) {
        this.uri = uri;
        this.parseResult = parseResult;
        const rootRange = Range.create(
            Position.create(0, 0),
            Position.create(parseResult.module.endLine || 1, parseResult.module.endColumn || 1)
        );
        this.rootScope = new Scope('module', rootRange);
        this.analyze();
    }

    private analyze(): void {
        this.buildTokenPositions();
        this.analyzeModule(this.parseResult.module);
        this.resolveReferences();
    }

    private buildTokenPositions(): void {
        for (const token of this.parseResult.tokens) {
            const line = token.line;
            if (!this.tokenPositions.has(line)) {
                this.tokenPositions.set(line, []);
            }
            this.tokenPositions.get(line)!.push(token);
        }
    }

    private analyzeModule(module: Module): void {
        for (const decl of module.declarations) {
            this.analyzeTopLevelDecl(decl, this.rootScope);
        }
    }

    private analyzeTopLevelDecl(decl: TopLevelDecl, scope: Scope): void {
        switch (decl.type) {
            case 'ImportDecl':
                this.analyzeImport(decl, scope);
                break;
            case 'VarDecl':
                this.analyzeVarDecl(decl, scope);
                break;
            case 'FuncDecl':
                this.analyzeFuncDecl(decl, scope);
                break;
            case 'StructDecl':
                this.analyzeStructDecl(decl, scope);
                break;
            case 'EnumDecl':
                this.analyzeEnumDecl(decl, scope);
                break;
            default:
                this.analyzeStatement(decl, scope);
                break;
        }
    }

    private analyzeImport(decl: ImportDecl, scope: Scope): void {
        const range = this.nodeRange(decl);
        const loc: Location = { uri: this.uri, range };
        const sym: SymbolInfo = {
            name: decl.module,
            kind: 'import',
            location: loc,
            selectionRange: range,
            documentation: decl.isFilePath ? `Import file "${decl.module}"` : `Import module ${decl.module}`,
            references: []
        };
        scope.symbols.set(decl.module, sym);
        this.allSymbols.push(sym);

        for (const item of decl.items) {
            const itemSym: SymbolInfo = {
                name: item,
                kind: 'import',
                location: loc,
                selectionRange: range,
                documentation: `Imported symbol ${item} from ${decl.module}`,
                references: []
            };
            scope.symbols.set(item, itemSym);
            this.allSymbols.push(itemSym);
        }
    }

    private analyzeVarDecl(decl: VarDecl, scope: Scope): void {
        const range = this.nodeRange(decl);
        const selRange = this.findIdentifierRange(decl.startLine, decl.name) ?? range;
        const loc: Location = { uri: this.uri, range };

        let inferredType = decl.typeAnnotation?.raw;
        if (!inferredType && decl.initialValue) {
            inferredType = this.inferType(decl.initialValue, scope);
        }

        const sym: SymbolInfo = {
            name: decl.name,
            kind: decl.mutable ? 'variable' : 'constant',
            type: inferredType ?? 'any',
            signature: `${decl.mutable ? 'var' : 'const'} ${decl.name}: ${inferredType ?? 'any'}`,
            documentation: `${decl.mutable ? 'Mutable variable' : 'Constant'} '${decl.name}'`,
            location: loc,
            selectionRange: selRange,
            mutable: decl.mutable,
            references: []
        };

        scope.symbols.set(decl.name, sym);
        this.allSymbols.push(sym);

        if (decl.initialValue) {
            this.analyzeExpression(decl.initialValue, scope);
        }
    }

    private analyzeFuncDecl(decl: FuncDecl, parentScope: Scope): void {
        const range = this.nodeRange(decl);
        const selRange = this.findIdentifierRange(decl.startLine, decl.name) ?? range;
        const loc: Location = { uri: this.uri, range };

        const paramStrs = decl.params.map(p => {
            const v = p.variadic ? '...' : '';
            const t = p.typeAnnotation?.raw ? `: ${p.typeAnnotation.raw}` : '';
            const def = p.defaultValue ? ' = ...' : '';
            return `${v}${p.name}${t}${def}`;
        });
        const retType = decl.returnType?.raw ?? 'void';
        const signature = `func ${decl.name}(${paramStrs.join(', ')}): ${retType}`;

        const sym: SymbolInfo = {
            name: decl.name,
            kind: decl.parentStruct ? 'method' : 'function',
            type: retType,
            signature,
            documentation: `${decl.isPub ? 'pub ' : ''}${decl.isExport ? 'export ' : ''}function ${decl.name}`,
            location: loc,
            selectionRange: selRange,
            containerName: decl.parentStruct,
            isPub: decl.isPub,
            references: []
        };

        parentScope.symbols.set(decl.name, sym);
        this.allSymbols.push(sym);

        // Function Scope for parameters and body
        const funcScope = new Scope('function', range, parentScope);

        for (const p of decl.params) {
            const pRange = Range.create(
                Position.create(p.startLine - 1, p.startColumn - 1),
                Position.create(p.endLine - 1, p.endColumn - 1)
            );
            const pSel = this.findIdentifierRange(p.startLine, p.name) ?? pRange;
            const pType = p.typeAnnotation?.raw ?? (p.variadic ? 'Vec<any>' : 'any');
            const paramSym: SymbolInfo = {
                name: p.name,
                kind: 'parameter',
                type: pType,
                signature: `${p.variadic ? '...' : ''}${p.name}: ${pType}`,
                documentation: `Parameter '${p.name}'`,
                location: { uri: this.uri, range: pRange },
                selectionRange: pSel,
                references: []
            };
            funcScope.symbols.set(p.name, paramSym);
            this.allSymbols.push(paramSym);

            if (p.defaultValue) {
                this.analyzeExpression(p.defaultValue, parentScope);
            }
        }

        this.analyzeBlock(decl.body, funcScope);
    }

    private analyzeStructDecl(decl: StructDecl, scope: Scope): void {
        const range = this.nodeRange(decl);
        const selRange = this.findIdentifierRange(decl.startLine, decl.name) ?? range;
        const loc: Location = { uri: this.uri, range };

        const sym: SymbolInfo = {
            name: decl.name,
            kind: 'struct',
            type: decl.name,
            signature: `struct ${decl.name}`,
            documentation: `Struct '${decl.name}' with ${decl.fields.length} fields and ${decl.methods.length} methods`,
            location: loc,
            selectionRange: selRange,
            references: []
        };

        scope.symbols.set(decl.name, sym);
        this.allSymbols.push(sym);

        // Body scope
        const structScope = new Scope('struct', range, scope);

        // Add 'self' in struct scope
        structScope.symbols.set('self', {
            name: 'self',
            kind: 'variable',
            type: decl.name,
            signature: `self: ${decl.name}`,
            documentation: `Instance of ${decl.name}`,
            location: loc,
            selectionRange: selRange,
            references: []
        });

        for (const f of decl.fields) {
            const fRange = this.nodeRange(f);
            const fSel = this.findIdentifierRange(f.startLine, f.name) ?? fRange;
            const fSym: SymbolInfo = {
                name: f.name,
                kind: 'field',
                type: f.fieldType.raw,
                signature: `${f.isPub ? 'pub ' : ''}${f.name}: ${f.fieldType.raw}`,
                documentation: `Field of ${decl.name}`,
                location: { uri: this.uri, range: fRange },
                selectionRange: fSel,
                containerName: decl.name,
                isPub: f.isPub,
                references: []
            };
            structScope.symbols.set(f.name, fSym);
            this.allSymbols.push(fSym);
        }

        for (const m of decl.methods) {
            this.analyzeFuncDecl(m, structScope);
        }
    }

    private analyzeEnumDecl(decl: EnumDecl, scope: Scope): void {
        const range = this.nodeRange(decl);
        const selRange = this.findIdentifierRange(decl.startLine, decl.name) ?? range;
        const loc: Location = { uri: this.uri, range };

        const variantNames = decl.variants.map(v => v.name).join(', ');
        const sym: SymbolInfo = {
            name: decl.name,
            kind: 'enum',
            type: decl.name,
            signature: `enum ${decl.name} { ${variantNames} }`,
            documentation: `Enum '${decl.name}'`,
            location: loc,
            selectionRange: selRange,
            references: []
        };

        scope.symbols.set(decl.name, sym);
        this.allSymbols.push(sym);

        for (const v of decl.variants) {
            const vRange = this.nodeRange(v);
            const vSel = this.findIdentifierRange(v.startLine, v.name) ?? vRange;
            const paramStr = v.params.length > 0
                ? `(${v.params.map(p => (p.name ? `${p.name}: ` : '') + p.typeAnnotation.raw).join(', ')})`
                : '';
            const vSym: SymbolInfo = {
                name: v.name,
                kind: 'enumVariant',
                type: decl.name,
                signature: `${decl.name}::${v.name}${paramStr}`,
                documentation: `Variant of ${decl.name}`,
                location: { uri: this.uri, range: vRange },
                selectionRange: vSel,
                containerName: decl.name,
                references: []
            };

            scope.symbols.set(`${decl.name}::${v.name}`, vSym);
            this.allSymbols.push(vSym);
        }
    }

    private analyzeBlock(block: Block, parentScope: Scope): void {
        const blockScope = new Scope('block', this.nodeRange(block), parentScope);
        for (const s of block.statements) {
            this.analyzeStatement(s, blockScope);
        }
    }

    private analyzeStatement(stmt: Statement, scope: Scope): void {
        switch (stmt.type) {
            case "Block":
                this.analyzeBlock(stmt, scope);
                break;
            case 'VarDecl':
                this.analyzeVarDecl(stmt, scope);
                break;
            case 'FuncDecl':
                this.analyzeFuncDecl(stmt, scope);
                break;
            case 'StructDecl':
                this.analyzeStructDecl(stmt, scope);
                break;
            case 'EnumDecl':
                this.analyzeEnumDecl(stmt, scope);
                break;
            case 'IfStmt':
                this.analyzeExpression(stmt.condition, scope);
                this.analyzeBlock(stmt.thenBlock, scope);
                if (stmt.elseBlock) {
                    if (stmt.elseBlock.type === 'IfStmt') {
                        this.analyzeStatement(stmt.elseBlock, scope);
                    } else {
                        this.analyzeBlock(stmt.elseBlock, scope);
                    }
                }
                break;
            case 'WhileStmt':
                this.analyzeExpression(stmt.condition, scope);
                this.analyzeBlock(stmt.body, scope);
                break;
            case 'LoopStmt':
                this.analyzeBlock(stmt.body, scope);
                break;
            case 'ForStmt': {
                this.analyzeExpression(stmt.iterable, scope);
                const forScope = new Scope('for', this.nodeRange(stmt), scope);
                const vRange = Range.create(
                    Position.create(stmt.startLine - 1, stmt.startColumn - 1),
                    Position.create(stmt.startLine - 1, stmt.startColumn - 1 + stmt.variable.length)
                );
                const vSym: SymbolInfo = {
                    name: stmt.variable,
                    kind: 'variable',
                    type: 'any',
                    signature: `for ${stmt.variable} in ...`,
                    documentation: `Loop variable '${stmt.variable}'`,
                    location: { uri: this.uri, range: vRange },
                    selectionRange: vRange,
                    references: []
                };
                forScope.symbols.set(stmt.variable, vSym);
                this.allSymbols.push(vSym);
                this.analyzeBlock(stmt.body, forScope);
                break;
            }
            case 'ReturnStmt':
                if (stmt.value) this.analyzeExpression(stmt.value, scope);
                break;
            case 'ExprStmt':
                this.analyzeExpression(stmt.expression, scope);
                break;
            case 'AssignmentStmt':
                this.analyzeExpression(stmt.target, scope);
                this.analyzeExpression(stmt.value, scope);
                break;
        }
    }

    private analyzeExpression(expr: Expression, scope: Scope): void {
        switch (expr.type) {
            case 'IdentifierExpr': {
                const loc: Location = { uri: this.uri, range: this.nodeRange(expr) };
                this.identifierReferences.push({ name: expr.name, location: loc, scope });
                break;
            }
            case 'BinaryExpr':
                this.analyzeExpression(expr.left, scope);
                this.analyzeExpression(expr.right, scope);
                break;
            case 'UnaryExpr':
                this.analyzeExpression(expr.operand, scope);
                break;
            case 'CallExpr':
                this.analyzeExpression(expr.callee, scope);
                for (const arg of expr.arguments) {
                    this.analyzeExpression(arg, scope);
                }
                break;
            case 'MemberExpr':
                this.analyzeExpression(expr.object, scope);
                break;
            case 'PathExpr':
                this.analyzeExpression(expr.qualifier, scope);
                break;
            case 'IndexExpr':
                this.analyzeExpression(expr.object, scope);
                this.analyzeExpression(expr.index, scope);
                break;
            case 'ArrayLiteral':
            case 'TupleLiteral':
                for (const el of expr.elements) {
                    this.analyzeExpression(el, scope);
                }
                break;
            case 'DictLiteral':
                for (const entry of expr.entries) {
                    this.analyzeExpression(entry.key, scope);
                    this.analyzeExpression(entry.value, scope);
                }
                break;
            case 'StructLiteral':
                for (const f of expr.fields) {
                    this.analyzeExpression(f.value, scope);
                }
                break;
            case 'GroupedExpr':
                this.analyzeExpression(expr.inner, scope);
                break;
            case 'InstanceofExpr':
                this.analyzeExpression(expr.target, scope);
                break;
            case 'LambdaExpr': {
                const lambdaScope = new Scope('lambda', this.nodeRange(expr), scope);
                for (const p of expr.params) {
                    const pRange = Range.create(
                        Position.create(p.startLine - 1, p.startColumn - 1),
                        Position.create(p.endLine - 1, p.endColumn - 1)
                    );
                    const pSym: SymbolInfo = {
                        name: p.name,
                        kind: 'parameter',
                        type: p.typeAnnotation?.raw ?? 'any',
                        signature: `${p.name}: ${p.typeAnnotation?.raw ?? 'any'}`,
                        documentation: `Lambda parameter '${p.name}'`,
                        location: { uri: this.uri, range: pRange },
                        selectionRange: pRange,
                        references: []
                    };
                    lambdaScope.symbols.set(p.name, pSym);
                    this.allSymbols.push(pSym);
                }
                if (expr.body.type === 'Block') {
                    this.analyzeBlock(expr.body, lambdaScope);
                } else {
                    this.analyzeExpression(expr.body, lambdaScope);
                }
                break;
            }
            case 'MatchExpr': {
                this.analyzeExpression(expr.target, scope);
                for (const arm of expr.arms) {
                    const armScope = new Scope('match', this.nodeRange(arm), scope);
                    this.analyzePattern(arm.pattern, armScope);
                    if (arm.body.type === 'Block') {
                        this.analyzeBlock(arm.body, armScope);
                    } else {
                        this.analyzeExpression(arm.body, armScope);
                    }
                }
                break;
            }
        }
    }

    private analyzePattern(pattern: Pattern, scope: Scope): void {
        switch (pattern.type) {
            case 'VariablePattern': {
                if (pattern.name !== '_') {
                    const pRange = this.nodeRange(pattern);
                    const sym: SymbolInfo = {
                        name: pattern.name,
                        kind: 'variable',
                        type: 'any',
                        signature: `match ${pattern.name}`,
                        documentation: `Pattern binding '${pattern.name}'`,
                        location: { uri: this.uri, range: pRange },
                        selectionRange: pRange,
                        references: []
                    };
                    scope.symbols.set(pattern.name, sym);
                    this.allSymbols.push(sym);
                }
                break;
            }
            case 'EnumPattern': {
                for (const p of pattern.payloads) {
                    this.analyzePattern(p, scope);
                }
                break;
            }
            case 'TuplePattern': {
                for (const el of pattern.elements) {
                    this.analyzePattern(el, scope);
                }
                break;
            }
            case 'StructPattern': {
                for (const f of pattern.fields) {
                    if (f.pattern) {
                        this.analyzePattern(f.pattern, scope);
                    } else {
                        // Shorthand field binding e.g. { x, y }
                        const pRange = this.nodeRange(pattern);
                        const sym: SymbolInfo = {
                            name: f.name,
                            kind: 'variable',
                            type: 'any',
                            signature: `field ${f.name}`,
                            documentation: `Field pattern variable '${f.name}'`,
                            location: { uri: this.uri, range: pRange },
                            selectionRange: pRange,
                            references: []
                        };
                        scope.symbols.set(f.name, sym);
                        this.allSymbols.push(sym);
                    }
                }
                break;
            }
        }
    }

    private resolveReferences(): void {
        for (const ref of this.identifierReferences) {
            const sym = ref.scope.resolve(ref.name);
            if (sym) {
                sym.references.push(ref.location);
            }
        }
    }

    public inferType(expr: Expression, scope: Scope): string {
        switch (expr.type) {
            case 'LiteralExpr': {
                switch (expr.literalType) {
                    case 'number':
                        return 'int';
                    case 'float':
                        return 'float';
                    case 'string':
                        return 'string';
                    case 'char':
                        return 'char';
                    case 'boolean':
                        return 'bool';
                    case 'null':
                        return 'null';
                }
                break;
            }
            case 'ArrayLiteral': {
                if (expr.elements.length > 0) {
                    return `Vec<${this.inferType(expr.elements[0], scope)}>`;
                }
                return 'Vec<any>';
            }
            case 'DictLiteral': {
                if (expr.entries.length > 0) {
                    return `HashMap<string, ${this.inferType(expr.entries[0].value, scope)}>`;
                }
                return 'HashMap<string, any>';
            }
            case 'TupleLiteral': {
                return `(${expr.elements.map(e => this.inferType(e, scope)).join(', ')})`;
            }
            case 'StructLiteral':
                return expr.structName;
            case 'IdentifierExpr': {
                const sym = scope.resolve(expr.name);
                return sym?.type ?? 'any';
            }
            case 'CallExpr': {
                if (expr.callee.type === 'IdentifierExpr') {
                    const fnName = expr.callee.name;
                    if (BUILTIN_FUNCTIONS[fnName]) {
                        return BUILTIN_FUNCTIONS[fnName].returnType;
                    }
                    const sym = scope.resolve(fnName);
                    return sym?.type ?? 'any';
                }
                if (expr.callee.type === 'MemberExpr') {
                    const objType = this.inferType(expr.callee.object, scope);
                    const members = this.getMembers(objType);
                    const m = members.find(x => x.name === (expr.callee as MemberExpr).property);
                    return m?.type ?? 'any';
                }
                if (expr.callee.type === 'PathExpr') {
                    // Enum::Variant(...) constructor returns Enum type
                    if (expr.callee.qualifier.type === 'IdentifierExpr') {
                        return (expr.callee.qualifier as IdentifierExpr).name;
                    }
                }
                break;
            }
            case 'MemberExpr': {
                const objType = this.inferType(expr.object, scope);
                const members = this.getMembers(objType);
                const m = members.find(x => x.name === expr.property);
                return m?.type ?? 'any';
            }
            case 'BinaryExpr': {
                const boolOps = ['==', '!=', '<', '<=', '>', '>=', '&&', '||'];
                if (boolOps.includes(expr.operator)) return 'bool';
                return this.inferType(expr.left, scope);
            }
            case 'UnaryExpr': {
                if (expr.operator === '!') return 'bool';
                return this.inferType(expr.operand, scope);
            }
            case 'IndexExpr': {
                const objType = this.inferType(expr.object, scope);
                if (objType.startsWith('Vec<') && objType.endsWith('>')) {
                    return objType.slice(4, -1);
                }
                if (objType.startsWith('[') && objType.endsWith(']')) {
                    return objType.slice(1, -1);
                }
                if (objType === 'string') return 'string';
                break;
            }
            case 'LambdaExpr': {
                const paramTypes = expr.params.map(p => p.typeAnnotation?.raw ?? 'any').join(', ');
                const retType = expr.body.type === 'Block' ? 'void' : this.inferType(expr.body, scope);
                return `(${paramTypes}) -> ${retType}`;
            }
        }
        return 'any';
    }

    public getSymbolsInScope(position: Position): SymbolInfo[] {
        const scope = this.rootScope.findScopeAt(position);
        const results: SymbolInfo[] = [];
        let curr: Scope | undefined = scope;
        while (curr) {
            for (const sym of curr.symbols.values()) {
                if (!results.some(r => r.name === sym.name)) {
                    results.push(sym);
                }
            }
            curr = curr.parent;
        }
        return results;
    }

    public getVariable(name: string, position: Position): SymbolInfo | undefined {
        const scope = this.rootScope.findScopeAt(position);
        return scope.resolve(name);
    }

    public getEnumVariants(enumName: string): string[] {
        for (const decl of this.parseResult.module.declarations) {
            if (decl.type === 'EnumDecl' && decl.name === enumName) {
                return decl.variants.map(v => v.name);
            }
        }
        return [];
    }

    public getMembers(typeName: string): MemberInfo[] {
        const cleanType = typeName.replace(/\?$/, '');

        if (cleanType === 'string' || cleanType === 'String') {
            return STRING_METHODS;
        }
        if (cleanType.startsWith('Vec<') || cleanType === 'Vec' || (cleanType.startsWith('[') && cleanType.endsWith(']'))) {
            return VEC_METHODS;
        }
        if (cleanType.startsWith('HashMap<') || cleanType === 'HashMap') {
            return HASHMAP_METHODS;
        }
        if (cleanType.startsWith('Option<') || cleanType === 'Option') {
            return OPTION_METHODS;
        }
        if (cleanType.startsWith('Result<') || cleanType === 'Result') {
            return RESULT_METHODS;
        }

        const members: MemberInfo[] = [];
        for (const decl of this.parseResult.module.declarations) {
            if (decl.type === 'StructDecl' && decl.name === cleanType) {
                for (const f of decl.fields) {
                    members.push({
                        name: f.name,
                        kind: 'field',
                        type: f.fieldType.raw,
                        documentation: `${f.isPub ? 'pub ' : ''}field of ${cleanType}`
                    });
                }
                for (const m of decl.methods) {
                    const ps = m.params.map(p => `${p.name}: ${p.typeAnnotation?.raw ?? 'any'}`).join(', ');
                    members.push({
                        name: m.name,
                        kind: 'method',
                        type: m.returnType?.raw ?? 'void',
                        signature: `${m.name}(${ps}): ${m.returnType?.raw ?? 'void'}`,
                        documentation: `${m.isPub ? 'pub ' : ''}method of ${cleanType}`
                    });
                }
            }
            if (decl.type === 'EnumDecl' && decl.name === cleanType) {
                for (const v of decl.variants) {
                    members.push({
                        name: v.name,
                        kind: 'field',
                        type: cleanType,
                        documentation: `Enum variant ${cleanType}::${v.name}`
                    });
                }
            }
        }
        return members;
    }

    public getPathMembers(qualifier: string): MemberInfo[] {
        const members: MemberInfo[] = [];
        for (const decl of this.parseResult.module.declarations) {
            if (decl.type === 'EnumDecl' && decl.name === qualifier) {
                for (const v of decl.variants) {
                    const paramStr = v.params.length > 0
                        ? `(${v.params.map(p => (p.name ? `${p.name}: ` : '') + p.typeAnnotation.raw).join(', ')})`
                        : '';
                    members.push({
                        name: v.name,
                        kind: 'field',
                        type: qualifier,
                        signature: `${qualifier}::${v.name}${paramStr}`,
                        documentation: `Enum variant ${qualifier}::${v.name}`
                    });
                }
            }
            if (decl.type === 'StructDecl' && decl.name === qualifier) {
                for (const m of decl.methods) {
                    const ps = m.params.map(p => `${p.name}: ${p.typeAnnotation?.raw ?? 'any'}`).join(', ');
                    members.push({
                        name: m.name,
                        kind: 'method',
                        type: m.returnType?.raw ?? 'void',
                        signature: `${qualifier}::${m.name}(${ps})`,
                        documentation: `Static method ${qualifier}::${m.name}`
                    });
                }
            }
        }

        if (qualifier === 'Option') {
            members.push(
                { name: 'Some', kind: 'field', type: 'Option<T>', signature: 'Option::Some(val)', documentation: 'Constructs an Option containing a value.' },
                { name: 'None', kind: 'field', type: 'Option<T>', signature: 'Option::None', documentation: 'Constructs an empty Option.' }
            );
        }
        if (qualifier === 'Result') {
            members.push(
                { name: 'Ok', kind: 'field', type: 'Result<T, E>', signature: 'Result::Ok(val)', documentation: 'Constructs a successful Result.' },
                { name: 'Err', kind: 'field', type: 'Result<T, E>', signature: 'Result::Err(err)', documentation: 'Constructs an error Result.' }
            );
        }
        if (qualifier === 'Vec') {
            members.push(
                { name: 'new', kind: 'method', type: 'Vec<T>', signature: 'Vec.new(): Vec<T>', documentation: 'Creates a new empty growable vector.' }
            );
        }
        if (qualifier === 'HashMap') {
            members.push(
                { name: 'new', kind: 'method', type: 'HashMap<string, V>', signature: 'HashMap.new(): HashMap<string, V>', documentation: 'Creates a new empty hash map.' }
            );
        }

        return members;
    }

    public getHoverInfo(pos: Position): HoverInfo | null {
        const token = this.findTokenAt(pos);
        if (!token) return null;

        const tokenRange = Range.create(
            Position.create(token.line - 1, token.column - 1),
            Position.create(token.endLine - 1, token.endColumn)
        );

        // Check builtin functions first
        if (BUILTIN_FUNCTIONS[token.value]) {
            const b = BUILTIN_FUNCTIONS[token.value];
            return {
                signature: `(builtin function) ${b.signature}`,
                documentation: b.doc,
                type: b.returnType,
                range: tokenRange
            };
        }

        // Check if cursor is on a member of standard types
        for (const m of STRING_METHODS) {
            if (m.name === token.value) {
                return {
                    signature: `(string method) ${m.signature ?? m.name}`,
                    documentation: m.documentation,
                    type: m.type,
                    range: tokenRange
                };
            }
        }
        for (const m of VEC_METHODS) {
            if (m.name === token.value) {
                return {
                    signature: `(Vec method) ${m.signature ?? m.name}`,
                    documentation: m.documentation,
                    type: m.type,
                    range: tokenRange
                };
            }
        }
        for (const m of HASHMAP_METHODS) {
            if (m.name === token.value) {
                return {
                    signature: `(HashMap method) ${m.signature ?? m.name}`,
                    documentation: m.documentation,
                    type: m.type,
                    range: tokenRange
                };
            }
        }

        // Scope lookup
        const scope = this.rootScope.findScopeAt(pos);
        const sym = scope.resolve(token.value);
        if (sym) {
            return {
                signature: `(${sym.kind}) ${sym.signature ?? sym.name}`,
                documentation: sym.documentation,
                type: sym.type,
                range: tokenRange
            };
        }

        return null;
    }

    public getDefinition(pos: Position): Location | null {
        const token = this.findTokenAt(pos);
        if (!token) return null;

        const scope = this.rootScope.findScopeAt(pos);
        const sym = scope.resolve(token.value);
        if (sym) {
            return {
                uri: this.uri,
                range: sym.selectionRange
            };
        }
        return null;
    }

    public getReferences(pos: Position): Location[] {
        const token = this.findTokenAt(pos);
        if (!token) return [];

        const scope = this.rootScope.findScopeAt(pos);
        const sym = scope.resolve(token.value);
        if (!sym) return [];

        return [sym.location, ...sym.references];
    }

    public getHighlights(pos: Position): DocumentHighlight[] {
        const token = this.findTokenAt(pos);
        if (!token) return [];

        const scope = this.rootScope.findScopeAt(pos);
        const sym = scope.resolve(token.value);
        if (!sym) return [];

        const highlights: DocumentHighlight[] = [
            { range: sym.selectionRange, kind: DocumentHighlightKind.Write }
        ];

        for (const ref of sym.references) {
            highlights.push({ range: ref.range, kind: DocumentHighlightKind.Read });
        }

        return highlights;
    }

    public getDocumentHighlights(pos: Position): DocumentHighlight[] {
        return this.getHighlights(pos);
    }

    public getRenameEdits(pos: Position, newName: string): WorkspaceEdit | null {
        const token = this.findTokenAt(pos);
        if (!token) return null;

        const scope = this.rootScope.findScopeAt(pos);
        const sym = scope.resolve(token.value);
        if (!sym) return null;

        const changes: Record<string, TextEdit[]> = {};
        changes[this.uri] = [
            TextEdit.replace(sym.selectionRange, newName),
            ...sym.references.map(ref => TextEdit.replace(ref.range, newName))
        ];

        return { changes };
    }

    public getDocumentSymbols(): DocumentSymbol[] {
        const result: DocumentSymbol[] = [];

        for (const decl of this.parseResult.module.declarations) {
            switch (decl.type) {
                case 'FuncDecl': {
                    const range = this.nodeRange(decl);
                    const selRange = this.findIdentifierRange(decl.startLine, decl.name) ?? range;
                    result.push({
                        name: decl.name,
                        kind: LspSymbolKind.Function,
                        range,
                        selectionRange: selRange,
                        detail: decl.returnType?.raw ?? 'void'
                    });
                    break;
                }
                case 'StructDecl': {
                    const range = this.nodeRange(decl);
                    const selRange = this.findIdentifierRange(decl.startLine, decl.name) ?? range;
                    const children: DocumentSymbol[] = [];
                    for (const f of decl.fields) {
                        const fRange = this.nodeRange(f);
                        const fSel = this.findIdentifierRange(f.startLine, f.name) ?? fRange;
                        children.push({
                            name: f.name,
                            kind: LspSymbolKind.Field,
                            range: fRange,
                            selectionRange: fSel,
                            detail: f.fieldType.raw
                        });
                    }
                    for (const m of decl.methods) {
                        const mRange = this.nodeRange(m);
                        const mSel = this.findIdentifierRange(m.startLine, m.name) ?? mRange;
                        children.push({
                            name: m.name,
                            kind: LspSymbolKind.Method,
                            range: mRange,
                            selectionRange: mSel,
                            detail: m.returnType?.raw ?? 'void'
                        });
                    }
                    result.push({
                        name: decl.name,
                        kind: LspSymbolKind.Struct,
                        range,
                        selectionRange: selRange,
                        children
                    });
                    break;
                }
                case 'EnumDecl': {
                    const range = this.nodeRange(decl);
                    const selRange = this.findIdentifierRange(decl.startLine, decl.name) ?? range;
                    const children: DocumentSymbol[] = decl.variants.map(v => {
                        const vRange = this.nodeRange(v);
                        const vSel = this.findIdentifierRange(v.startLine, v.name) ?? vRange;
                        return {
                            name: v.name,
                            kind: LspSymbolKind.EnumMember,
                            range: vRange,
                            selectionRange: vSel
                        };
                    });
                    result.push({
                        name: decl.name,
                        kind: LspSymbolKind.Enum,
                        range,
                        selectionRange: selRange,
                        children
                    });
                    break;
                }
                case 'VarDecl': {
                    const range = this.nodeRange(decl);
                    const selRange = this.findIdentifierRange(decl.startLine, decl.name) ?? range;
                    result.push({
                        name: decl.name,
                        kind: decl.mutable ? LspSymbolKind.Variable : LspSymbolKind.Constant,
                        range,
                        selectionRange: selRange,
                        detail: decl.typeAnnotation?.raw ?? 'inferred'
                    });
                    break;
                }
            }
        }

        return result;
    }

    public getSignatureHelp(pos: Position): SignatureHelp | null {
        const call = this.findCallExprAt(pos, this.parseResult.module);
        if (!call) return null;

        let fnName = '';
        if (call.callee.type === 'IdentifierExpr') {
            fnName = (call.callee as IdentifierExpr).name;
        } else if (call.callee.type === 'MemberExpr') {
            fnName = (call.callee as MemberExpr).property;
        }

        const builtin = BUILTIN_FUNCTIONS[fnName];
        if (builtin) {
            return {
                signatures: [
                    {
                        label: builtin.signature,
                        documentation: builtin.doc,
                        parameters: builtin.params.map(p => ({
                            label: `${p.name}: ${p.type}`
                        }))
                    }
                ],
                activeSignature: 0,
                activeParameter: (() => {
                    let active = 0;
                    for (let i = 0; i < call.arguments.length; i++) {
                        const arg = call.arguments[i];
                        const argRange = this.nodeRange(arg);
                        if (pos.line > argRange.end.line || (pos.line === argRange.end.line && pos.character >= argRange.end.character)) {
                            active = i + 1;
                        }
                    }
                    return Math.min(active, builtin.params.length > 0 ? builtin.params.length - 1 : 0);
                })()
            };
        }

        const scope = this.rootScope.findScopeAt(pos);
        const sym = scope.resolve(fnName);
        if (sym && sym.signature) {
            return {
                signatures: [
                    {
                        label: sym.signature,
                        documentation: sym.documentation,
                        parameters: []
                    }
                ],
                activeSignature: 0,
                activeParameter: 0
            };
        }

        return null;
    }

    public getInlayHints(range: Range): InlayHint[] {
        const hints: InlayHint[] = [];
        for (const sym of this.allSymbols) {
            if (
                sym.kind === 'variable' ||
                sym.kind === 'constant'
            ) {
                if (
                    sym.selectionRange.start.line >= range.start.line &&
                    sym.selectionRange.end.line <= range.end.line &&
                    sym.type &&
                    sym.type !== 'any'
                ) {
                    hints.push({
                        position: sym.selectionRange.end,
                        label: `: ${sym.type}`,
                        kind: InlayHintKind.Type,
                        paddingLeft: true
                    });
                }
            }
        }
        return hints;
    }

    private findCallExprAt(pos: Position, node: any): CallExpr | null {
        if (!node || typeof node !== 'object') return null;

        if (node.type === 'CallExpr') {
            const range = this.nodeRange(node);
            if (this.isPositionInsideRange(pos, range)) {
                return node as CallExpr;
            }
        }

        for (const key of Object.keys(node)) {
            const val = node[key];
            if (Array.isArray(val)) {
                for (const child of val) {
                    const found = this.findCallExprAt(pos, child);
                    if (found) return found;
                }
            } else if (typeof val === 'object' && val !== null) {
                const found = this.findCallExprAt(pos, val);
                if (found) return found;
            }
        }

        return null;
    }

    private findTokenAt(pos: Position): Token | null {
        const line = pos.line + 1;
        const col = pos.character + 1;
        const tokens = this.tokenPositions.get(line);
        if (!tokens) return null;

        for (const t of tokens) {
            if (col >= t.column && col <= t.endColumn) {
                return t;
            }
        }
        return null;
    }

    private findIdentifierRange(line: number, name: string): Range | null {
        const tokens = this.tokenPositions.get(line);
        if (!tokens) return null;
        for (const t of tokens) {
            if (t.type === TokenType.Identifier && t.value === name) {
                return Range.create(
                    Position.create(t.line - 1, t.column - 1),
                    Position.create(t.endLine - 1, t.endColumn)
                );
            }
        }
        return null;
    }

    private nodeRange(node: { startLine: number; startColumn: number; endLine: number; endColumn: number }): Range {
        return Range.create(
            Position.create(Math.max(0, node.startLine - 1), Math.max(0, node.startColumn - 1)),
            Position.create(Math.max(0, node.endLine - 1), Math.max(0, node.endColumn))
        );
    }

    private isPositionInsideRange(pos: Position, range: Range): boolean {
        if (pos.line < range.start.line || pos.line > range.end.line) return false;
        if (pos.line === range.start.line && pos.character < range.start.character) return false;
        if (pos.line === range.end.line && pos.character > range.end.character) return false;
        return true;
    }
}
