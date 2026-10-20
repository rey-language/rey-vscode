import { Diagnostic, DiagnosticSeverity, Range, Position } from 'vscode-languageserver/node';
import { ParseResult, ParseError, StructDecl, EnumDecl, FuncDecl, VarDecl } from './parser';
import { ReyAnalyzer } from './analyzer';

export const DIAGNOSTIC_CODES = {
    UPPERCASE_PRIMITIVE: 'UPPERCASE_PRIMITIVE',
    MISSING_SEMICOLON: 'MISSING_SEMICOLON',
    DUPLICATE_FIELD: 'DUPLICATE_FIELD',
    DUPLICATE_METHOD: 'DUPLICATE_METHOD',
    DUPLICATE_VARIANT: 'DUPLICATE_VARIANT',
    VARIADIC_NOT_LAST: 'VARIADIC_NOT_LAST',
    UNINITIALIZED_VAR: 'UNINITIALIZED_VAR'
};

const UPPERCASE_PRIMITIVE_MAP: Record<string, string> = {
    'String': 'string',
    'Void': 'void',
    'Int': 'int',
    'Float': 'float',
    'Bool': 'bool',
    'Char': 'char',
    'Double': 'float',
    'Uint': 'int',
    'Byte': 'int'
};

export class DiagnosticsProvider {
    private parseResult: ParseResult;
    private analyzer: ReyAnalyzer;

    constructor(parseResult: ParseResult, analyzer: ReyAnalyzer) {
        this.parseResult = parseResult;
        this.analyzer = analyzer;
    }

    getDiagnostics(): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        for (const error of this.parseResult.errors) {
            diagnostics.push(this.parseErrorToDiagnostic(error));
        }

        diagnostics.push(...this.checkSemanticErrors());
        diagnostics.push(...this.checkTypeNaming());
        diagnostics.push(...this.checkSemicolons());

        return diagnostics;
    }

    private parseErrorToDiagnostic(error: ParseError): Diagnostic {
        const line = Math.max(0, error.line - 1);
        const col = Math.max(0, error.column - 1);
        const endLine = error.endLine ? Math.max(0, error.endLine - 1) : line;
        const endCol = error.endColumn ? Math.max(0, error.endColumn) : col + 1;

        return {
            severity: DiagnosticSeverity.Error,
            range: Range.create(
                Position.create(line, col),
                Position.create(endLine, endCol)
            ),
            message: error.message,
            source: `Rey [${error.category}]`
        };
    }

    private checkTypeNaming(): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        // Check tokens for uppercase primitive type keywords
        for (const token of this.parseResult.tokens) {
            const replacement = UPPERCASE_PRIMITIVE_MAP[token.value];
            if (replacement) {
                diagnostics.push({
                    code: DIAGNOSTIC_CODES.UPPERCASE_PRIMITIVE,
                    data: { current: token.value, replacement },
                    severity: DiagnosticSeverity.Warning,
                    range: Range.create(
                        Position.create(token.line - 1, token.column - 1),
                        Position.create(token.endLine - 1, token.endColumn)
                    ),
                    message: `Type '${token.value}' should be lowercase '${replacement}' in Rey v0.3.0`,
                    source: 'Rey [type]'
                });
            }
        }

        return diagnostics;
    }

    private checkSemicolons(): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        const checkNode = (node: any) => {
            if (!node || typeof node !== 'object') return;

            if (node.hasSemicolon === false) {
                const line = Math.max(0, (node.endLine ?? node.startLine) - 1);
                const col = Math.max(0, (node.endColumn ?? node.startColumn));
                diagnostics.push({
                    code: DIAGNOSTIC_CODES.MISSING_SEMICOLON,
                    severity: DiagnosticSeverity.Error,
                    range: Range.create(Position.create(line, col), Position.create(line, col + 1)),
                    message: "Missing ';' at end of statement",
                    source: 'Rey [syntax]'
                });
            }

            for (const key of Object.keys(node)) {
                const child = node[key];
                if (Array.isArray(child)) {
                    for (const c of child) checkNode(c);
                } else if (typeof child === 'object' && child !== null) {
                    checkNode(child);
                }
            }
        };

        checkNode(this.parseResult.module);
        return diagnostics;
    }

    private checkSemanticErrors(): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        for (const decl of this.parseResult.module.declarations) {
            switch (decl.type) {
                case 'FuncDecl':
                    diagnostics.push(...this.checkFunctionDecl(decl));
                    break;
                case 'VarDecl':
                    diagnostics.push(...this.checkVarDecl(decl));
                    break;
                case 'StructDecl':
                    diagnostics.push(...this.checkStructDecl(decl));
                    break;
                case 'EnumDecl':
                    diagnostics.push(...this.checkEnumDecl(decl));
                    break;
            }
        }

        return diagnostics;
    }

    private checkFunctionDecl(func: FuncDecl): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        if (!func.body || func.body.statements.length === 0) {
            diagnostics.push({
                severity: DiagnosticSeverity.Information,
                range: Range.create(
                    Position.create(func.startLine - 1, func.startColumn - 1),
                    Position.create(func.startLine - 1, func.startColumn - 1 + func.name.length)
                ),
                message: `Function '${func.name}' has empty body`,
                source: 'Rey [semantic]'
            });
        }

        const hasVariadicParam = func.params.some(p => p.variadic);
        if (hasVariadicParam) {
            const lastParam = func.params[func.params.length - 1];
            if (!lastParam.variadic) {
                diagnostics.push({
                    code: DIAGNOSTIC_CODES.VARIADIC_NOT_LAST,
                    severity: DiagnosticSeverity.Error,
                    range: Range.create(
                        Position.create(lastParam.startLine - 1, lastParam.startColumn - 1),
                        Position.create(lastParam.endLine - 1, lastParam.endColumn)
                    ),
                    message: 'Variadic parameter must be the last parameter',
                    source: 'Rey [syntax]'
                });
            }
        }

        return diagnostics;
    }

    private checkVarDecl(decl: VarDecl): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        if (!decl.initialValue && !decl.typeAnnotation) {
            diagnostics.push({
                code: DIAGNOSTIC_CODES.UNINITIALIZED_VAR,
                severity: DiagnosticSeverity.Error,
                range: Range.create(
                    Position.create(decl.startLine - 1, decl.startColumn - 1),
                    Position.create(decl.startLine - 1, decl.startColumn - 1 + decl.name.length)
                ),
                message: `Variable '${decl.name}' requires either an explicit type annotation or an initial value`,
                source: 'Rey [type]'
            });
        }

        return diagnostics;
    }

    private checkStructDecl(struct: StructDecl): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        const fieldNames = new Set<string>();
        for (const field of struct.fields) {
            if (fieldNames.has(field.name)) {
                diagnostics.push({
                    code: DIAGNOSTIC_CODES.DUPLICATE_FIELD,
                    severity: DiagnosticSeverity.Error,
                    range: Range.create(
                        Position.create(field.startLine - 1, field.startColumn - 1),
                        Position.create(field.endLine - 1, field.endColumn)
                    ),
                    message: `Duplicate field '${field.name}' in struct '${struct.name}'`,
                    source: 'Rey [syntax]'
                });
            }
            fieldNames.add(field.name);
        }

        const methodNames = new Set<string>();
        for (const method of struct.methods) {
            if (methodNames.has(method.name)) {
                diagnostics.push({
                    code: DIAGNOSTIC_CODES.DUPLICATE_METHOD,
                    severity: DiagnosticSeverity.Error,
                    range: Range.create(
                        Position.create(method.startLine - 1, method.startColumn - 1),
                        Position.create(method.endLine - 1, method.endColumn)
                    ),
                    message: `Duplicate method '${method.name}' in struct '${struct.name}'`,
                    source: 'Rey [syntax]'
                });
            }
            methodNames.add(method.name);
        }

        return diagnostics;
    }

    private checkEnumDecl(enm: EnumDecl): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];
        const variantNames = new Set<string>();

        for (const v of enm.variants) {
            if (variantNames.has(v.name)) {
                diagnostics.push({
                    code: DIAGNOSTIC_CODES.DUPLICATE_VARIANT,
                    severity: DiagnosticSeverity.Error,
                    range: Range.create(
                        Position.create(v.startLine - 1, v.startColumn - 1),
                        Position.create(v.endLine - 1, v.endColumn)
                    ),
                    message: `Duplicate enum variant '${v.name}' in enum '${enm.name}'`,
                    source: 'Rey [syntax]'
                });
            }
            variantNames.add(v.name);
        }

        return diagnostics;
    }
}
