import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult,
    Hover,
    MarkupKind,
    Location,
    DocumentSymbol,
    DocumentHighlight,
    TextEdit,
    SignatureHelp,
    InlayHint,
    InlayHintParams,
    CodeActionParams,
    CodeAction,
    CodeActionKind,
    WorkspaceEdit
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { ReyParser } from './parser';
import { ReyAnalyzer, BUILTIN_FUNCTIONS } from './analyzer';
import { DiagnosticsProvider, DIAGNOSTIC_CODES } from './diagnostics';
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
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.', ':', '(']
            },
            hoverProvider: true,
            definitionProvider: true,
            documentSymbolProvider: true,
            documentHighlightProvider: true,
            documentFormattingProvider: true,
            referencesProvider: true,
            renameProvider: true,
            signatureHelpProvider: {
                triggerCharacters: ['(', ',']
            },
            inlayHintProvider: true,
            codeActionProvider: true
        }
    };
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
});

connection.onDidChangeConfiguration(() => {
    analyzers.clear();
    documents.all().forEach(validateAndAnalyze);
});

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
        const proc = spawn(settings.compiler.path, ['check', filePath], {
            env: { ...process.env, REY_STD_PATH: stdPath }
        });
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
                    diagnostics.push({
                        severity: 1,
                        range: {
                            start: { line: lineNum, character: colNum },
                            end: { line: lineNum, character: colNum + 1 }
                        },
                        message: m[5],
                        source: `Rey [${m[1]}]`
                    });
                }
                const sm = line.match(/error\[(\w+)\]:\s*(.+)/);
                if (sm) {
                    diagnostics.push({
                        severity: 1,
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 0 }
                        },
                        message: sm[2],
                        source: `Rey [${sm[1]}]`
                    });
                }
            }
            resolve(diagnostics);
        });

        proc.on('error', () => resolve([]));
    });
}

async function getDocumentSettings(resource: string): Promise<ReySettings> {
    if (!hasConfigurationCapability) {
        return {
            languageServer: { enabled: true, trace: 'off' },
            compiler: { path: 'rey', runOnSave: true },
            format: { indentSize: 4 }
        };
    }
    const result = await connection.workspace.getConfiguration({
        scopeUri: resource,
        section: 'rey'
    });
    return {
        languageServer: result?.languageServer ?? { enabled: true, trace: 'off' },
        compiler: result?.compiler ?? { path: 'rey', runOnSave: true },
        format: result?.format ?? { indentSize: 4 }
    };
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

    // Path completions after `::`
    if (textBeforeCursor.endsWith('::')) {
        const baseMatch = textBeforeCursor.match(/([a-zA-Z_]\w*)\s*::$/);
        if (baseMatch) {
            const qualifier = baseMatch[1];
            const members = analyzer.getPathMembers(qualifier);
            for (const m of members) {
                items.push({
                    label: m.name,
                    kind: m.kind === 'method' ? CompletionItemKind.Method : CompletionItemKind.EnumMember,
                    detail: m.type,
                    documentation: m.documentation,
                    insertText: m.name
                });
            }
        }
        return items;
    }

    // Member completions after `.`
    if (textBeforeCursor.endsWith('.')) {
        const memberMatch = textBeforeCursor.match(/([a-zA-Z_]\w*)\s*\.$/);
        if (memberMatch) {
            const varName = memberMatch[1];
            const varInfo = analyzer.getVariable(varName, position);
            const varType = varInfo?.type ?? 'any';
            const members = analyzer.getMembers(varType);
            for (const m of members) {
                const isMethod = m.kind === 'method';
                items.push({
                    label: m.name,
                    kind: isMethod ? CompletionItemKind.Method : CompletionItemKind.Field,
                    detail: m.signature ?? m.type,
                    documentation: m.documentation,
                    insertText: isMethod ? `${m.name}($0)` : m.name,
                    insertTextFormat: isMethod ? 2 : 1
                });
            }
        }
        return items;
    }

    // Keywords
    const keywords = [
        'func', 'var', 'const', 'struct', 'enum', 'match',
        'if', 'else', 'while', 'for', 'in', 'loop', 'break',
        'continue', 'return', 'import', 'pub', 'instanceof',
        'true', 'false', 'null', 'self'
    ];
    for (const kw of keywords) {
        items.push({ label: kw, kind: CompletionItemKind.Keyword, detail: 'keyword' });
    }

    // Primitive & standard Types
    const types = [
        { name: 'int', doc: '64-bit signed integer' },
        { name: 'float', doc: '64-bit IEEE-754 floating-point number' },
        { name: 'bool', doc: 'Boolean (true or false)' },
        { name: 'char', doc: '1-byte ASCII character' },
        { name: 'string', doc: 'Immutable UTF-8/byte string' },
        { name: 'void', doc: 'Empty return type' },
        { name: 'any', doc: 'Dynamic top type' },
        { name: 'Vec', doc: 'Growable vector collection: Vec<T>' },
        { name: 'HashMap', doc: 'Key-value hash map: HashMap<string, V>' },
        { name: 'Option', doc: 'Optional value: Option<T> (Some(T) or None)' },
        { name: 'Result', doc: 'Result value: Result<T, E> (Ok(T) or Err(E))' }
    ];
    for (const t of types) {
        items.push({
            label: t.name,
            kind: CompletionItemKind.Class,
            detail: 'type',
            documentation: t.doc
        });
    }

    // Standard Library Builtin Functions
    for (const b of Object.values(BUILTIN_FUNCTIONS)) {
        items.push({
            label: b.name,
            kind: CompletionItemKind.Function,
            detail: b.signature,
            documentation: b.doc,
            insertText: `${b.name}($0)`,
            insertTextFormat: 2
        });
    }

    // In-scope symbols (variables, parameters, functions, structs, enums)
    const symbols = analyzer.getSymbolsInScope(position);
    for (const s of symbols) {
        let kind: CompletionItemKind = CompletionItemKind.Variable;
        if (s.kind === 'function' || s.kind === 'method') kind = CompletionItemKind.Function;
        else if (s.kind === 'struct') kind = CompletionItemKind.Class;
        else if (s.kind === 'enum') kind = CompletionItemKind.Enum;
        else if (s.kind === 'enumVariant') kind = CompletionItemKind.EnumMember;
        else if (s.kind === 'field') kind = CompletionItemKind.Field;
        else if (s.kind === 'constant') kind = CompletionItemKind.Constant;

        items.push({
            label: s.name,
            kind,
            detail: s.type,
            documentation: s.documentation ?? s.signature
        });
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
    if (info.signature) contents.push(`\`\`\`rey\n${info.signature}\n\`\`\``);
    if (info.type) contents.push(`**Type**: \`${info.type}\``);
    if (info.documentation) contents.push(info.documentation);

    return {
        contents: { kind: MarkupKind.Markdown, value: contents.join('\n\n') },
        range: info.range
    };
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

connection.onDocumentHighlight((p): DocumentHighlight[] => {
    const doc = documents.get(p.textDocument.uri);
    if (!doc) return [];
    const analyzer = analyzers.get(doc.uri);
    if (!analyzer) return [];
    return analyzer.getDocumentHighlights(p.position);
});

connection.onReferences((p): Location[] => {
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

connection.onSignatureHelp((p): SignatureHelp | null => {
    const doc = documents.get(p.textDocument.uri);
    if (!doc) return null;
    const analyzer = analyzers.get(doc.uri);
    if (!analyzer) return null;
    return analyzer.getSignatureHelp(p.position);
});

connection.languages?.inlayHint?.on((p: InlayHintParams): InlayHint[] => {
    const doc = documents.get(p.textDocument.uri);
    if (!doc) return [];
    const analyzer = analyzers.get(doc.uri);
    if (!analyzer) return [];
    return analyzer.getInlayHints(p.range);
});

connection.onCodeAction((p: CodeActionParams): CodeAction[] => {
    const actions: CodeAction[] = [];
    const docUri = p.textDocument.uri;

    for (const diag of p.context.diagnostics) {
        if (diag.code === DIAGNOSTIC_CODES.UPPERCASE_PRIMITIVE && diag.data) {
            const data = diag.data as { current: string; replacement: string };
            const edit: WorkspaceEdit = {
                changes: {
                    [docUri]: [TextEdit.replace(diag.range, data.replacement)]
                }
            };
            actions.push({
                title: `Change '${data.current}' to lowercase '${data.replacement}'`,
                kind: CodeActionKind.QuickFix,
                diagnostics: [diag],
                isPreferred: true,
                edit
            });
        } else if (diag.code === DIAGNOSTIC_CODES.MISSING_SEMICOLON) {
            const edit: WorkspaceEdit = {
                changes: {
                    [docUri]: [TextEdit.insert(diag.range.start, ';')]
                }
            };
            actions.push({
                title: "Add missing ';'",
                kind: CodeActionKind.QuickFix,
                diagnostics: [diag],
                isPreferred: true,
                edit
            });
        }
    }

    return actions;
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

        if (currentLineIndent !== expectedIndent) {
            edits.push({
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: currentLineIndent.length }
                },
                newText: expectedIndent
            });
        }

        const increaseIndent = /[{[(]\s*$/.test(trimmed) && !/[}\])]$/.test(trimmed);
        if (increaseIndent) currentIndent++;
    }
    return edits;
}

documents.listen(connection);
connection.listen();
