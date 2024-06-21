"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const path = require("path");
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
let client;
var console = console;
let extensionContext;
async function activate(context) {
    extensionContext = context;
    context.subscriptions.push(vscode_1.commands.registerCommand('xmidas.restartLanguageServer', restart));
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
        }
    };
    // Options to control the language client
    const clientOptions = {
        // Register the server xmidas
        documentSelector: [{ scheme: "file", language: 'xmidas' }, { language: 'xm-macro', pattern: '**∕*.mcr' }],
        // synchronize: {
        // 	//fileEvents:workspace.createFileSystemWatcher(new RelativePattern(window.activeTextEditor.document.uri, '*'))
        // 	fileEvents:[workspace.createFileSystemWatcher('**​/*.py'),workspace.createFileSystemWatcher('**​/*.mcr')]
        // 	// Notify the server about file changes to '.clientrc files contained in the workspace
        // 	//fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
        // }
    };
    // Create the language client and start the client.
    client = new node_1.LanguageClient('xmidasLanguageServer', 'XmidasLanguageServer', serverOptions, clientOptions);
    console = { ...console,
        log: (msg, ...params) => {
            client.info(`[Client]: ${msg}`);
        },
        info: (msg, ...params) => {
            client.info(`[Client]: ${msg}`);
        },
        warn: (msg, ...params) => {
            client.warn(`[Client]: ${msg}`);
        },
        error: (msg, ...params) => {
            client.error(`[Client]: ${msg}`);
        }
    };
    console.info("Starting XM Language Server");
    // Start the client. This will also launch the server
    var result = await client.start();
    console.info("XM Language Server started");
    console.log("test change");
}
exports.activate = activate;
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
exports.deactivate = deactivate;
async function restart() {
    deactivate();
    if (extensionContext) {
        activate(extensionContext);
    }
}
//# sourceMappingURL=extension.js.map