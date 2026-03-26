import {
    createConnection, TextDocuments, ProposedFeatures, InitializeParams, DidChangeConfigurationNotification,
    CompletionItem, CompletionItemKind, TextDocumentPositionParams, TextDocumentSyncKind, InitializeResult,
    Hover, MarkupKind, Location, DocumentSymbol, SymbolKind, DocumentHighlight, TextEdit, FormattingOptions
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { ReyParser } from './parser';
import { ReyAnalyzer } from './analyzer';
import { DiagnosticsProvider } from './diagnostics';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';

interface ReySettings {
    languageServer: { enabled: boolean; trace: string };
    compiler: { path: string; runOnSave: boolean };
    format: { indentSize: number };
}

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
let hasConfigurationCapability = false;
const analyzers: Map<string, ReyAnalyzer> = new Map();
const parser = new ReyParser();

connection.onInitialize((params: InitializeParams) => {
    hasConfigurationCapability = !!params.capabilities.workspace?.configuration;
    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: { resolveProvider: true, triggerCharacters: ['.', ':', '('] },
            hoverProvider: true,
            definitionProvider: true,
            documentSymbolProvider: true,
            documentHighlightProvider: true,
            documentFormattingProvider: true,
            referencesProvider: true,
            renameProvider: true
        }
    };
    return result;
});

connection.onInitialized(() => { if (hasConfigurationCapability) connection.client.register(DidChangeConfigurationNotification.type, undefined); });
connection.onDidChangeConfiguration(() => { analyzers.clear(); documents.all().forEach(validateAndAnalyze); });
documents.onDidOpen(e => validateAndAnalyze(e.document));
documents.onDidChangeContent(e => validateAndAnalyze(e.document));
documents.onDidClose(e => analyzers.delete(e.document.uri));

async function validateAndAnalyze(document: TextDocument): Promise<void> {
    const settings = await getDocumentSettings(document.uri);
    const text = document.getText();
    const parseResult = parser.parse(text);
    const analyzer = new ReyAnalyzer(document.uri, parseResult);
    analyzers.set(document.uri, analyzer);
    const diagnosticsProvider = new DiagnosticsProvider(parseResult, analyzer);
    const diagnostics = diagnosticsProvider.getDiagnostics();
    if (settings.compiler.runOnSave) {
        const compilerDiagnostics = await runCompilerDiagnostics(document, settings);
        diagnostics.push(...compilerDiagnostics);
    }
    connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

async function runCompilerDiagnostics(document: TextDocument, settings: ReySettings): Promise<any[]> {
    const homeDir = os.homedir();
    const stdPath = path.join(homeDir, '.reyc', 'std', 'src');
    const filePath = URI.parse(document.uri).fsPath;
    return new Promise((resolve) => {
        const proc = spawn(settings.compiler.path, ['check', filePath], { env: { ...process.env, REY_STD_PATH: stdPath } });
        let stdout = '', stderr = '';
        proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
        proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
        proc.on('close', () => {
            const output = stdout + stderr;
            const diagnostics: any[] = [];
            for (const line of output.split('\n')) {
                const m = line.match(/error\[(\w+)\]\s*(?:(.+):)?(\d+):(\d+):\s*(.+)/);
                if (m) {
                    const lineNum = Math.max(0, parseInt(m[3], 10) - 1);
                    const colNum = Math.max(0, parseInt(m[4], 10) - 1);
                    diagnostics.push({ severity: 1, range: { start: { line: lineNum, character: colNum }, end: { line: lineNum, character: colNum + 1 } }, message: m[5], source: `Rey [${m[1]}]` });
                }
                const sm = line.match(/error\[(\w+)\]:\s*(.+)/);
                if (sm) diagnostics.push({ severity: 1, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, message: sm[2], source: `Rey [${sm[1]}]` });
            }
            resolve(diagnostics);
        });
        proc.on('error', () => resolve([]));
    });
}

async function getDocumentSettings(resource: string): Promise<ReySettings> {
    if (!hasConfigurationCapability) return { languageServer: { enabled: true, trace: 'off' }, compiler: { path: 'reyc', runOnSave: true }, format: { indentSize: 4 } };
    const result = await connection.workspace.getConfiguration({ scopeUri: resource, section: 'rey' });
    return { languageServer: result?.languageServer ?? { enabled: true, trace: 'off' }, compiler: result?.compiler ?? { path: 'reyc', runOnSave: true }, format: result?.format ?? { indentSize: 4 } };
}

connection.onCompletion(async (textDocumentPosition: TextDocumentPositionParams): Promise<CompletionItem[]> => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) return [];
    const analyzer = analyzers.get(document.uri);
    if (!analyzer) return [];
    const position = textDocumentPosition.position;
    const line = document.getText().split('\n')[position.line];
    const textBeforeCursor = line.substring(0, position.character);
    const items: CompletionItem[] = [];

    if (textBeforeCursor.endsWith('.')) {
        const baseText = textBeforeCursor.substring(0, textBeforeCursor.length - 1).trim();
        const varMatch = baseText.match(/(\w+)\s*\.$/);
        if (varMatch) {
            const varInfo = analyzer.getVariable(varMatch[1], position);
            if (varInfo) {
                const members = analyzer.getMembers(varInfo.type ?? 'unknown');
                for (const m of members) items.push({ label: m.name, kind: m.kind === 'method' ? CompletionItemKind.Method : CompletionItemKind.Field, detail: m.type, documentation: m.documentation, data: { uri: document.uri, type: 'member', name: m.name } });
            }
        }
        return items;
    }
    if (textBeforeCursor.endsWith('::')) {
        const baseText = textBeforeCursor.substring(0, textBeforeCursor.length - 2).trim();
        const enumMatch = baseText.match(/(\w+)\s*::$/);
        if (enumMatch) {
            const variants = analyzer.getEnumVariants(enumMatch[1]);
            for (const v of variants) items.push({ label: v, kind: CompletionItemKind.EnumMember, detail: `${enumMatch[1]}::${v}`, data: { uri: document.uri, type: 'enumVariant', enum: enumMatch[1], variant: v } });
        }
        return items;
    }

    const keywords = ['func', 'var', 'const', 'struct', 'enum', 'match', 'if', 'else', 'while', 'for', 'in', 'loop', 'break', 'continue', 'return', 'import', 'export', 'pub', 'instanceof'];
    for (const kw of keywords) items.push({ label: kw, kind: CompletionItemKind.Keyword, detail: 'keyword' });
    const types = [{ name: 'int', doc: '32-bit signed integer' }, { name: 'uint', doc: '32-bit unsigned integer' }, { name: 'byte', doc: '8-bit unsigned integer' }, { name: 'float', doc: '32-bit floating point' }, { name: 'double', doc: '64-bit floating point' }, { name: 'String', doc: 'String type' }, { name: 'bool', doc: 'Boolean' }, { name: 'char', doc: 'Character' }, { name: 'Void', doc: 'Void' }];
    for (const t of types) items.push({ label: t.name, kind: CompletionItemKind.TypeParameter, detail: 'type', documentation: t.doc });
    const builtins = [{ name: 'println', sig: 'println(...args)' }, { name: 'print', sig: 'print(...args)' }, { name: 'input', sig: 'input(prompt?: String): String' }, { name: 'len', sig: 'len(value): int' }, { name: 'push', sig: 'push(array, value): Void' }, { name: 'pop', sig: 'pop(array): T' }, { name: 'abs', sig: 'abs(n): int|float' }, { name: 'max', sig: 'max(a, b): int|float' }, { name: 'min', sig: 'min(a, b): int|float' }, { name: 'random', sig: 'random(): float' }];
    for (const b of builtins) items.push({ label: b.name, kind: CompletionItemKind.Function, detail: b.sig, insertText: b.name + '($0)', insertTextFormat: 2 });
    const symbols = analyzer.getSymbolsInScope(position);
    for (const s of symbols) {
        const kind = s.kind === 'function' ? CompletionItemKind.Function : s.kind === 'struct' ? CompletionItemKind.Class : s.kind === 'enum' ? CompletionItemKind.Enum : s.kind === 'enumVariant' ? CompletionItemKind.EnumMember : s.kind === 'field' ? CompletionItemKind.Field : s.kind === 'method' ? CompletionItemKind.Method : CompletionItemKind.Variable;
        items.push({ label: s.name, kind, detail: s.type, documentation: s.documentation ?? s.signature });
    }
    return items;
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => item);
connection.onHover((p): Hover | null => {
    const doc = documents.get(p.textDocument.uri);
    if (!doc) return null;
    const analyzer = analyzers.get(doc.uri);
    if (!analyzer) return null;
    const info = analyzer.getHoverInfo(p.position);
    if (!info) return null;
    const contents: string[] = [];
    if (info.type) contents.push(`**Type**: \`${info.type}\``);
    if (info.signature) contents.push(`**Signature**: \`${info.signature}\``);
    if (info.documentation) contents.push(info.documentation);
    return { contents: { kind: MarkupKind.Markdown, value: contents.join('\n\n') }, range: info.range };
});

connection.onDefinition((p): Location | null => {
    const doc = documents.get(p.textDocument.uri);
    if (!doc) return null;
    const analyzer = analyzers.get(doc.uri);
    if (!analyzer) return null;
    return analyzer.getDefinition(p.position);
});

connection.onDocumentSymbol((p): DocumentSymbol[] => {
    const doc = documents.get(p.textDocument.uri);
    if (!doc) return [];
    const analyzer = analyzers.get(doc.uri);
    if (!analyzer) return [];
    return analyzer.getDocumentSymbols();
});

connection.onDocumentHighlight((p) => {
    const doc = documents.get(p.textDocument.uri);
    if (!doc) return [];
    const analyzer = analyzers.get(doc.uri);
    if (!analyzer) return [];
    return analyzer.getDocumentHighlights(p.position);
});

connection.onReferences((p) => {
    const doc = documents.get(p.textDocument.uri);
    if (!doc) return [];
    const analyzer = analyzers.get(doc.uri);
    if (!analyzer) return [];
    return analyzer.getReferences(p.position);
});

connection.onRenameRequest((p) => {
    const doc = documents.get(p.textDocument.uri);
    if (!doc) return null;
    const analyzer = analyzers.get(doc.uri);
    if (!analyzer) return null;
    return analyzer.getRenameEdits(p.position, p.newName);
});

connection.onDocumentFormatting(async (p): Promise<TextEdit[]> => {
    const doc = documents.get(p.textDocument.uri);
    if (!doc) return [];
    const settings = await getDocumentSettings(doc.uri);
    return formatDocument(doc, settings.format.indentSize);
});

function formatDocument(document: TextDocument, indentSize: number): TextEdit[] {
    const lines = document.getText().split('\n');
    const edits: TextEdit[] = [];
    let currentIndent = 0;
    const indentStr = ' '.repeat(indentSize);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        const decreaseIndent = /^[}\]\)]/.test(trimmed);
        if (decreaseIndent) currentIndent = Math.max(0, currentIndent - 1);
        const expectedIndent = indentStr.repeat(currentIndent);
        const currentLineIndent = line.match(/^(\s*)/)?.[1] ?? '';
        if (currentLineIndent !== expectedIndent) edits.push({ range: { start: { line: i, character: 0 }, end: { line: i, character: currentLineIndent.length } }, newText: expectedIndent });
        const increaseIndent = /[{[(]\s*$/.test(trimmed) && !/[}\])]/.test(trimmed);
        if (increaseIndent) currentIndent++;
    }
    return edits;
}

documents.listen(connection);
connection.listen();