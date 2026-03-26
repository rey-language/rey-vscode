import * as path from 'path';
import { ExtensionContext, workspace, window, OutputChannel, commands } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, Trace } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;
let outputChannel: OutputChannel;

export function activate(context: ExtensionContext) {
    outputChannel = window.createOutputChannel('Rey Language Server');
    outputChannel.appendLine('Activating Rey extension...');

    const config = workspace.getConfiguration('rey.languageServer');
    const serverEnabled = config.get<boolean>('enabled', true);

    if (!serverEnabled) {
        outputChannel.appendLine('Language server is disabled in settings');
        return;
    }

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

    context.subscriptions.push(
        commands.registerCommand('rey.showOutput', () => {
            outputChannel.show();
        })
    );

    outputChannel.appendLine('Rey extension activated');
}

export async function deactivate() {
    if (client) {
        outputChannel.appendLine('Deactivating Rey extension...');
        await client.stop();
    }
}