import { Position, Range, Location, DocumentSymbol, SymbolKind as LspSymbolKind, DocumentHighlight, DocumentHighlightKind, TextEdit, WorkspaceEdit } from 'vscode-languageserver/node';
import { ParseResult, Token, TokenType, LiteralExpr, IdentifierExpr, BinaryExpr, CallExpr, ArrayLiteral, StructLiteral, Expression } from './parser';

export type SymbolKind = 'function' | 'struct' | 'enum' | 'variable' | 'parameter' | 'field' | 'method' | 'enumVariant' | 'import';

export interface SymbolInfo {
    name: string;
    kind: SymbolKind;
    type?: string;
    documentation?: string;
    signature?: string;
    location: Location;
    containerName?: string;
}

export interface MemberInfo { name: string; kind: 'field' | 'method'; type: string; documentation?: string; }
export interface HoverInfo { type?: string; signature?: string; documentation?: string; range: Range; }

interface Scope { parent?: Scope; symbols: Map<string, SymbolInfo>; }

export class ReyAnalyzer {
    private uri: string;
    private parseResult: ParseResult;
    private globalScope: Scope;
    private allSymbols: SymbolInfo[];
    private tokenPositions: Map<number, Token[]>;

    constructor(uri: string, parseResult: ParseResult) {
        this.uri = uri;
        this.parseResult = parseResult;
        this.globalScope = { symbols: new Map() };
        this.allSymbols = [];
        this.tokenPositions = new Map();
        this.analyze();
    }

    private analyze(): void {
        this.buildTokenPositions();
        this.analyzeModule(this.parseResult.module);
    }

    private buildTokenPositions(): void {
        for (const token of this.parseResult.tokens) {
            const line = token.line;
            if (!this.tokenPositions.has(line)) this.tokenPositions.set(line, []);
            this.tokenPositions.get(line)!.push(token);
        }
    }

    private analyzeModule(module: any): void {
        for (const decl of module.declarations) this.analyzeTopLevelDecl(decl);
    }

    private analyzeTopLevelDecl(decl: any): void {
        switch (decl.type) {
            case 'ImportDecl': this.analyzeImport(decl); break;
            case 'VarDecl': this.analyzeVarDecl(decl, this.globalScope); break;
            case 'FuncDecl': this.analyzeFuncDecl(decl); break;
            case 'StructDecl': this.analyzeStructDecl(decl); break;
            case 'EnumDecl': this.analyzeEnumDecl(decl); break;
        }
    }

    private analyzeImport(decl: any): void {
        const loc: Location = { uri: this.uri, range: Range.create(Position.create(decl.startLine - 1, decl.startColumn - 1), Position.create(decl.endLine - 1, decl.endColumn - 1)) };
        this.globalScope.symbols.set(decl.module, { name: decl.module, kind: 'import', location: loc, documentation: `Module: ${decl.module}` });
        this.allSymbols.push({ name: decl.module, kind: 'import', location: loc, documentation: `Imported module: ${decl.module}` });
        for (const item of decl.items) this.globalScope.symbols.set(item, { name: item, kind: 'import', location: loc, documentation: `Imported from ${decl.module}` });
    }

    private analyzeVarDecl(decl: any, scope: Scope): void {
        const loc: Location = { uri: this.uri, range: Range.create(Position.create(decl.startLine - 1, decl.startColumn - 1), Position.create(decl.endLine - 1, decl.endColumn - 1)) };
        let inferredType = decl.typeAnnotation;
        if (!inferredType && decl.initialValue) inferredType = this.inferType(decl.initialValue);
        scope.symbols.set(decl.name, { name: decl.name, kind: 'variable', type: inferredType, location: loc, documentation: decl.mutable ? 'var' : 'const' });
        this.allSymbols.push({ name: decl.name, kind: 'variable', type: inferredType, location: loc, documentation: decl.mutable ? 'var' : 'const' });
    }

    private analyzeFuncDecl(decl: any): void {
        const loc: Location = { uri: this.uri, range: Range.create(Position.create(decl.startLine - 1, decl.startColumn - 1), Position.create(decl.endLine - 1, decl.endColumn - 1)) };
        const paramStr = decl.params.map((p: any) => `${p.variadic ? '...' : ''}${p.name}${p.type ? `: ${p.type}` : ''}${p.defaultValue ? ' = ...' : ''}`).join(', ');
        const signature = `func ${decl.name}(${paramStr})${decl.returnType ? `: ${decl.returnType}` : ''}`;
        this.globalScope.symbols.set(decl.name, { name: decl.name, kind: 'function', type: decl.returnType, signature, location: loc, documentation: decl.isExport ? 'export pub' : decl.isPub ? 'pub' : 'private', containerName: decl.parentStruct });
        if (!decl.parentStruct) this.allSymbols.push({ name: decl.name, kind: 'function', type: decl.returnType, signature, location: loc, documentation: decl.isExport ? 'export pub' : decl.isPub ? 'pub' : '' });
    }

    private analyzeStructDecl(decl: any): void {
        const loc: Location = { uri: this.uri, range: Range.create(Position.create(decl.startLine - 1, decl.startColumn - 1), Position.create(decl.endLine - 1, decl.endColumn - 1)) };
        this.globalScope.symbols.set(decl.name, { name: decl.name, kind: 'struct', location: loc, documentation: `Struct ${decl.name}` });
        this.allSymbols.push({ name: decl.name, kind: 'struct', location: loc, documentation: `Struct with ${decl.fields.length} fields` });
    }

    private analyzeEnumDecl(decl: any): void {
        const loc: Location = { uri: this.uri, range: Range.create(Position.create(decl.startLine - 1, decl.startColumn - 1), Position.create(decl.endLine - 1, decl.endColumn - 1)) };
        this.globalScope.symbols.set(decl.name, { name: decl.name, kind: 'enum', location: loc, documentation: `Enum: ${decl.variants.join(', ')}` });
        this.allSymbols.push({ name: decl.name, kind: 'enum', location: loc, documentation: 'Enum' });
        for (const variant of decl.variants) this.globalScope.symbols.set(`${decl.name}::${variant}`, { name: variant, kind: 'enumVariant', type: decl.name, location: loc, documentation: `Variant of ${decl.name}`, containerName: decl.name });
    }

    private inferType(expr: Expression): string {
        switch (expr.type) {
            case 'LiteralExpr': {
                const le = expr as LiteralExpr;
                switch (le.literalType) { case 'number': return 'int'; case 'float': return 'float'; case 'string': return 'String'; case 'char': return 'char'; case 'boolean': return 'bool'; case 'null': return 'null'; }
                break;
            }
            case 'ArrayLiteral': { const al = expr as ArrayLiteral; return al.elements.length > 0 ? `[${this.inferType(al.elements[0])}]` : '[any]'; }
            case 'StructLiteral': return (expr as StructLiteral).structName;
            case 'IdentifierExpr': { const ie = expr as IdentifierExpr; const sym = this.globalScope.symbols.get(ie.name); return sym?.type ?? 'unknown'; }
            case 'CallExpr': { const ce = expr as CallExpr; if (ce.callee.type === 'IdentifierExpr') { const sym = this.globalScope.symbols.get((ce.callee as IdentifierExpr).name); return sym?.type ?? 'unknown'; } break; }
            case 'BinaryExpr': { const be = expr as BinaryExpr; return ['==', '!=', '<', '<=', '>', '>=', '&&', '||'].includes(be.operator) ? 'bool' : this.inferType(be.left); }
        }
        return 'unknown';
    }

    getSymbolsInScope(position: Position): SymbolInfo[] { return Array.from(this.globalScope.symbols.values()); }
    getVariable(name: string, position: Position): SymbolInfo | undefined { return this.globalScope.symbols.get(name); }

    getMembers(typeName: string): MemberInfo[] {
        const members: MemberInfo[] = [];
        for (const decl of this.parseResult.module.declarations) {
            if (decl.type === 'StructDecl' && decl.name === typeName) {
                for (const f of decl.fields) members.push({ name: f.name, kind: 'field', type: f.fieldType, documentation: f.isPub ? 'public' : 'private' });
                for (const m of decl.methods) { const ps = m.params.map((p: any) => `${p.name}: ${p.type ?? 'any'}`).join(', '); members.push({ name: m.name, kind: 'method', type: m.returnType ?? 'Void', documentation: `${m.name}(${ps})` }); }
            }
            if (decl.type === 'EnumDecl' && decl.name === typeName) for (const v of decl.variants) members.push({ name: v, kind: 'field', type: typeName, documentation: `Enum variant ${v}` });
        }
        if (typeName === 'String') members.push({ name: 'length', kind: 'method', type: 'int', documentation: 'Length' }, { name: 'upper', kind: 'method', type: 'String' }, { name: 'lower', kind: 'method', type: 'String' }, { name: 'contains', kind: 'method', type: 'bool' }, { name: 'split', kind: 'method', type: '[String]' });
        if (typeName.startsWith('[')) members.push({ name: 'length', kind: 'method', type: 'int' }, { name: 'push', kind: 'method', type: 'Void' }, { name: 'pop', kind: 'method', type: 'any' });
        if (typeName.startsWith('{')) members.push({ name: 'length', kind: 'method', type: 'int' });
        return members;
    }

    getEnumVariants(enumName: string): string[] {
        for (const decl of this.parseResult.module.declarations) if (decl.type === 'EnumDecl' && decl.name === enumName) return decl.variants;
        return [];
    }

    getHoverInfo(position: Position): HoverInfo | null {
        const line = position.line + 1;
        const col = position.character + 1;
        const tokens = this.tokenPositions.get(line);
        if (!tokens) return null;
        let matched: Token | undefined;
        for (const t of tokens) if (col >= t.column && col <= t.endColumn) matched = t;
        if (!matched) return null;
        const sym = this.globalScope.symbols.get(matched.value);
        if (sym) return { type: sym.type, signature: sym.signature, documentation: sym.documentation, range: Range.create(Position.create(matched.line - 1, matched.column - 1), Position.create(matched.endLine - 1, matched.endColumn - 1)) };
        return null;
    }

    getDefinition(position: Position): Location | null {
        const line = position.line + 1;
        const col = position.character + 1;
        const tokens = this.tokenPositions.get(line);
        if (!tokens) return null;
        let matched: Token | undefined;
        for (const t of tokens) if (col >= t.column && col <= t.endColumn) matched = t;
        if (!matched) return null;
        const sym = this.globalScope.symbols.get(matched.value);
        return sym?.location ?? null;
    }

    getDocumentSymbols(): DocumentSymbol[] {
        const symbols: DocumentSymbol[] = [];
        for (const decl of this.parseResult.module.declarations) {
            const r = Range.create(Position.create(decl.startLine - 1, decl.startColumn - 1), Position.create(decl.endLine - 1, decl.endColumn - 1));
            if (decl.type === 'ImportDecl') symbols.push(DocumentSymbol.create(decl.module, 'Import', LspSymbolKind.Module, r, r));
            else if (decl.type === 'VarDecl') symbols.push(DocumentSymbol.create(decl.name, decl.typeAnnotation ?? 'inferred', LspSymbolKind.Variable, r, r));
            else if (decl.type === 'FuncDecl') symbols.push(DocumentSymbol.create(decl.name, decl.returnType ?? 'Void', LspSymbolKind.Function, r, r));
            else if (decl.type === 'StructDecl') {
                const children: DocumentSymbol[] = [];
                for (const f of decl.fields) children.push(DocumentSymbol.create(f.name, f.fieldType, LspSymbolKind.Field, r, r));
                for (const m of decl.methods) children.push(DocumentSymbol.create(m.name, m.returnType ?? 'Void', LspSymbolKind.Method, r, r));
                symbols.push(DocumentSymbol.create(decl.name, 'Struct', LspSymbolKind.Class, r, r, children));
            }
            else if (decl.type === 'EnumDecl') symbols.push(DocumentSymbol.create(decl.name, 'Enum', LspSymbolKind.Enum, r, r));
        }
        return symbols;
    }

    getDocumentHighlights(position: Position): DocumentHighlight[] {
        const line = position.line + 1;
        const col = position.character + 1;
        const tokens = this.tokenPositions.get(line);
        if (!tokens) return [];
        let matched: Token | undefined;
        for (const t of tokens) if (col >= t.column && col <= t.endColumn) matched = t;
        if (!matched) return [];
        const highlights: DocumentHighlight[] = [];
        for (const t of this.parseResult.tokens) if (t.value === matched!.value) highlights.push(DocumentHighlight.create(Range.create(Position.create(t.line - 1, t.column - 1), Position.create(t.endLine - 1, t.endColumn - 1)), DocumentHighlightKind.Read));
        return highlights;
    }

    getReferences(position: Position): Location[] {
        const line = position.line + 1;
        const col = position.character + 1;
        const tokens = this.tokenPositions.get(line);
        if (!tokens) return [];
        let matched: Token | undefined;
        for (const t of tokens) if (col >= t.column && col <= t.endColumn) matched = t;
        if (!matched) return [];
        const refs: Location[] = [];
        for (const t of this.parseResult.tokens) if (t.value === matched!.value) refs.push({ uri: this.uri, range: Range.create(Position.create(t.line - 1, t.column - 1), Position.create(t.endLine - 1, t.endColumn - 1)) });
        return refs;
    }

    getRenameEdits(position: Position, newName: string): WorkspaceEdit | null {
        const line = position.line + 1;
        const col = position.character + 1;
        const tokens = this.tokenPositions.get(line);
        if (!tokens) return null;
        let matched: Token | undefined;
        for (const t of tokens) if (col >= t.column && col <= t.endColumn) matched = t;
        if (!matched) return null;
        const edits: TextEdit[] = [];
        for (const t of this.parseResult.tokens) if (t.value === matched!.value) edits.push(TextEdit.replace(Range.create(Position.create(t.line - 1, t.column - 1), Position.create(t.endLine - 1, t.endColumn - 1)), newName));
        return { changes: { [this.uri]: edits } };
    }
}