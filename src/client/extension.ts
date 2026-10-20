import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { workspace, ExtensionContext, window, commands, Terminal, Uri } from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions
} from 'vscode-languageclient/node';

let client: LanguageClient;
let reyTerminal: Terminal | undefined;

function findReyCompiler(configuredPath: string): string {
    if (configuredPath && fs.existsSync(configuredPath)) {
        return configuredPath;
    }

    // Check REY_HOME
    if (process.env.REY_HOME) {
        const homeBin = path.join(process.env.REY_HOME, 'bin', 'rey');
        if (fs.existsSync(homeBin)) return homeBin;
    }

    // Check standard user installation
    const userBin = path.join(os.homedir(), '.rey', 'bin', 'rey');
    if (fs.existsSync(userBin)) return userBin;

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

    return configuredPath || 'rey';
}

function getTerminal(): Terminal {
    if (!reyTerminal || reyTerminal.exitStatus !== undefined) {
        reyTerminal = window.createTerminal('Rey');
    }
    return reyTerminal;
}

export function activate(context: ExtensionContext) {
    const config = workspace.getConfiguration('rey');
    const compilerPath = findReyCompiler(config.get<string>('compilerPath', 'rey'));
    const isLspEnabled = config.get<boolean>('enableLsp', false);

    // Register Commands
    context.subscriptions.push(
        commands.registerCommand('rey.runFile', (uri?: Uri) => {
            const targetUri = uri || window.activeTextEditor?.document.uri;
            if (!targetUri || !targetUri.fsPath.endsWith('.rey')) {
                window.showErrorMessage('No active Rey file to run');
                return;
            }
            const terminal = getTerminal();
            terminal.show();
            terminal.sendText(`${compilerPath} run "${targetUri.fsPath}"`);
        })
    );

    context.subscriptions.push(
        commands.registerCommand('rey.buildFile', (uri?: Uri) => {
            const targetUri = uri || window.activeTextEditor?.document.uri;
            if (!targetUri || !targetUri.fsPath.endsWith('.rey')) {
                window.showErrorMessage('No active Rey file to build');
                return;
            }
            const terminal = getTerminal();
            terminal.show();
            terminal.sendText(`${compilerPath} build "${targetUri.fsPath}"`);
        })
    );

    context.subscriptions.push(
        commands.registerCommand('rey.checkFile', (uri?: Uri) => {
            const targetUri = uri || window.activeTextEditor?.document.uri;
            if (!targetUri || !targetUri.fsPath.endsWith('.rey')) {
                window.showErrorMessage('No active Rey file to check');
                return;
            }
            const terminal = getTerminal();
            terminal.show();
            terminal.sendText(`${compilerPath} check "${targetUri.fsPath}"`);
        })
    );

    if (isLspEnabled) {
        startLanguageServer(compilerPath, context);
    }
}

function startLanguageServer(compilerPath: string, context: ExtensionContext) {
    const serverOptions: ServerOptions = {
        command: compilerPath,
        args: ['lsp']
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'rey' }],
        synchronize: {
            fileEvents: workspace.createFileSystemWatcher('**/*.rey')
        }
    };

    client = new LanguageClient(
        'reyLanguageServer',
        'Rey Language Server',
        serverOptions,
        clientOptions
    );

    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
