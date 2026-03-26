import { Diagnostic, DiagnosticSeverity, Range, Position } from 'vscode-languageserver/node';
import { ParseResult, ParseError } from './parser';
import { ReyAnalyzer } from './analyzer';

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

        return diagnostics;
    }

    private parseErrorToDiagnostic(error: ParseError): Diagnostic {
        const line = Math.max(0, error.line - 1);
        const col = Math.max(0, error.column - 1);
        const endLine = error.endLine ? Math.max(0, error.endLine - 1) : line;
        const endCol = error.endColumn ? Math.max(0, error.endColumn - 1) : col + 1;

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
            }
        }

        return diagnostics;
    }

    private checkFunctionDecl(func: any): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        if (!func.body || func.body.statements.length === 0) {
            diagnostics.push({
                severity: DiagnosticSeverity.Information,
                range: Range.create(
                    Position.create(func.startLine - 1, func.startColumn - 1),
                    Position.create(func.startLine - 1, func.startColumn - 1 + func.name.length)
                ),
                message: 'Function has empty body',
                source: 'Rey [semantic]'
            });
        }

        const hasVariadicParam = func.params.some((p: any) => p.variadic);
        if (hasVariadicParam) {
            const lastParam = func.params[func.params.length - 1];
            if (!lastParam.variadic) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: Range.create(
                        Position.create(lastParam.startLine - 1, lastParam.startColumn - 1),
                        Position.create(lastParam.endLine - 1, lastParam.endColumn - 1)
                    ),
                    message: 'Variadic parameter must be last',
                    source: 'Rey [syntax]'
                });
            }
        }

        const isStaticCreate = func.isPub && func.name === 'create';
        if (isStaticCreate && func.parentStruct) {
            if (func.returnType !== func.parentStruct) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    range: Range.create(
                        Position.create(func.startLine - 1, func.startColumn - 1),
                        Position.create(func.startLine - 1, func.startColumn - 1 + func.name.length)
                    ),
                    message: `Static create method should return ${func.parentStruct}`,
                    source: 'Rey [semantic]'
                });
            }
        }

        return diagnostics;
    }

    private checkVarDecl(decl: any): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        if (!decl.initialValue && !decl.typeAnnotation) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: Range.create(
                    Position.create(decl.startLine - 1, decl.startColumn - 1),
                    Position.create(decl.startLine - 1, decl.startColumn - 1 + decl.name.length)
                ),
                message: 'Variable declaration requires either a type annotation or initial value',
                source: 'Rey [type]'
            });
        }

        if (!decl.mutable && decl.initialValue) {
        }

        return diagnostics;
    }

    private checkStructDecl(struct: any): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        const fieldNames = new Set<string>();
        for (const field of struct.fields) {
            if (fieldNames.has(field.name)) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: Range.create(
                        Position.create(field.startLine - 1, field.startColumn - 1),
                        Position.create(field.endLine - 1, field.endColumn - 1)
                    ),
                    message: `Duplicate field name '${field.name}'`,
                    source: 'Rey [syntax]'
                });
            }
            fieldNames.add(field.name);
        }

        const methodNames = new Set<string>();
        for (const method of struct.methods) {
            if (methodNames.has(method.name)) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: Range.create(
                        Position.create(method.startLine - 1, method.startColumn - 1),
                        Position.create(method.endLine - 1, method.endColumn - 1)
                    ),
                    message: `Duplicate method name '${method.name}'`,
                    source: 'Rey [syntax]'
                });
            }
            methodNames.add(method.name);
        }

        return diagnostics;
    }

    checkImports(modules: Map<string, any>): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        for (const decl of this.parseResult.module.declarations) {
            if (decl.type === 'ImportDecl') {
                const moduleName = decl.module;
                if (!modules.has(moduleName)) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: Range.create(
                            Position.create(decl.startLine - 1, decl.startColumn - 1),
                            Position.create(decl.endLine - 1, decl.endColumn - 1)
                        ),
                        message: `Module '${moduleName}' not found`,
                        source: 'Rey [import]'
                    });
                }

                for (const item of decl.items) {
                }
            }
        }

        return diagnostics;
    }

    checkTypeCompatibility(expr: any, expectedType: string): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];

        return diagnostics;
    }

    checkUnusedSymbols(): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];
        const usedSymbols = new Set<string>();

        for (const token of this.parseResult.tokens) {
            if (token.type === 'Identifier') {
                usedSymbols.add(token.value);
            }
        }

        for (const decl of this.parseResult.module.declarations) {
            if (decl.type === 'VarDecl') {
                if (!usedSymbols.has(decl.name) && !decl.name.startsWith('_')) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Hint,
                        range: Range.create(
                            Position.create(decl.startLine - 1, decl.startColumn - 1),
                            Position.create(decl.startLine - 1, decl.startColumn - 1 + decl.name.length)
                        ),
                        message: `Variable '${decl.name}' is declared but never used`,
                        source: 'Rey [lint]',
                        tags: [1]
                    });
                }
            }
        }

        return diagnostics;
    }
}