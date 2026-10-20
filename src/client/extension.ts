import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext, workspace, window, OutputChannel, commands, Terminal, Uri } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, Trace } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;
let outputChannel: OutputChannel;
let reyTerminal: Terminal | undefined;

function findReyCompiler(configuredPath: string): string {
    if (configuredPath && configuredPath !== 'rey' && configuredPath !== 'reyc') {
        if (fs.existsSync(configuredPath)) {
            return configuredPath;
        }
    }

    // Check workspace relative builds
    const workspaceFolders = workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            const candidate1 = path.join(folder.uri.fsPath, 'rey-lang', 'build', 'rey');
            if (fs.existsSync(candidate1)) return candidate1;

            const candidate2 = path.join(folder.uri.fsPath, 'build', 'rey');
            if (fs.existsSync(candidate2)) return candidate2;
        }
    }

    // Known common development path
    const devPath = '/Volumes/SSD/Developer/rey-language/rey-lang/build/rey';
    if (fs.existsSync(devPath)) {
        return devPath;
    }

    return configuredPath || 'rey';
}

function getTerminal(): Terminal {
    if (!reyTerminal || reyTerminal.exitStatus !== undefined) {
        reyTerminal = window.createTerminal('Rey');
    }
    return reyTerminal;
}

export function activate(context: ExtensionContext) {
    outputChannel = window.createOutputChannel('Rey Language Server');
    outputChannel.appendLine('Activating Rey Language Extension v0.3.0...');

    const config = workspace.getConfiguration('rey.languageServer');
    const serverEnabled = config.get<boolean>('enabled', true);

    if (serverEnabled) {
        const serverModule = context.asAbsolutePath(path.join('out', 'server', 'server.js'));
        const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

        const serverOptions: ServerOptions = {
            run: { module: serverModule, transport: TransportKind.ipc },
            debug: {
                module: serverModule,
                transport: TransportKind.ipc,
                options: debugOptions
            }
        };

        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: 'file', language: 'rey' }],
            synchronize: {
                fileEvents: workspace.createFileSystemWatcher('**/*.rey')
            },
            outputChannel: outputChannel,
            traceOutputChannel: outputChannel
        };

        client = new LanguageClient('reyLanguageServer', 'Rey Language Server', serverOptions, clientOptions);

        const traceConfig = config.get<string>('trace', 'off');
        if (traceConfig !== 'off') {
            client.setTrace(traceConfig === 'verbose' ? Trace.Verbose : Trace.Messages);
        }

        client.start();
    } else {
        outputChannel.appendLine('Language server is disabled in settings');
    }

    // Command: Restart Language Server
    context.subscriptions.push(
        commands.registerCommand('rey.restartServer', async () => {
            if (client) {
                outputChannel.appendLine('Restarting language server...');
                await client.stop();
                client.start();
                window.showInformationMessage('Rey language server restarted');
            }
        })
    );

    // Command: Show Output
    context.subscriptions.push(
        commands.registerCommand('rey.showOutput', () => {
            outputChannel.show();
        })
    );

    // Command: Run Current File
    context.subscriptions.push(
        commands.registerCommand('rey.runFile', async (uri?: Uri) => {
            const activeEditor = window.activeTextEditor;
            const targetUri = uri || activeEditor?.document.uri;

            if (!targetUri || !targetUri.fsPath.endsWith('.rey')) {
                window.showWarningMessage('Please open or select a Rey (.rey) file to run.');
                return;
            }

            if (activeEditor && activeEditor.document.isDirty) {
                await activeEditor.document.save();
            }

            const compilerConfig = workspace.getConfiguration('rey.compiler');
            const compilerPath = findReyCompiler(compilerConfig.get<string>('path', 'rey'));
            const filePath = targetUri.fsPath;

            const terminal = getTerminal();
            terminal.show();
            terminal.sendText(`"${compilerPath}" run "${filePath}"`);
        })
    );

    // Command: Build Current File
    context.subscriptions.push(
        commands.registerCommand('rey.buildFile', async (uri?: Uri) => {
            const activeEditor = window.activeTextEditor;
            const targetUri = uri || activeEditor?.document.uri;

            if (!targetUri || !targetUri.fsPath.endsWith('.rey')) {
                window.showWarningMessage('Please open or select a Rey (.rey) file to build.');
                return;
            }

            if (activeEditor && activeEditor.document.isDirty) {
                await activeEditor.document.save();
            }

            const compilerConfig = workspace.getConfiguration('rey.compiler');
            const compilerPath = findReyCompiler(compilerConfig.get<string>('path', 'rey'));
            const filePath = targetUri.fsPath;

            const terminal = getTerminal();
            terminal.show();
            terminal.sendText(`"${compilerPath}" build "${filePath}"`);
        })
    );

    // Command: Check Current File
    context.subscriptions.push(
        commands.registerCommand('rey.checkFile', async (uri?: Uri) => {
            const activeEditor = window.activeTextEditor;
            const targetUri = uri || activeEditor?.document.uri;

            if (!targetUri || !targetUri.fsPath.endsWith('.rey')) {
                window.showWarningMessage('Please open or select a Rey (.rey) file to check.');
                return;
            }

            if (activeEditor && activeEditor.document.isDirty) {
                await activeEditor.document.save();
            }

            const compilerConfig = workspace.getConfiguration('rey.compiler');
            const compilerPath = findReyCompiler(compilerConfig.get<string>('path', 'rey'));
            const filePath = targetUri.fsPath;

            const terminal = getTerminal();
            terminal.show();
            terminal.sendText(`"${compilerPath}" check "${filePath}"`);
        })
    );

    outputChannel.appendLine('Rey extension activated successfully.');
}

export async function deactivate() {
    if (client) {
        outputChannel.appendLine('Deactivating Rey extension...');
        await client.stop();
    }
}
