/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext, window,commands } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;
var console:Console = console;
let extensionContext:ExtensionContext|undefined;
export async function activate(context: ExtensionContext) {
	extensionContext = context;
	context.subscriptions.push(commands.registerCommand('xmidas.restartLanguageServer', restart))
	
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
		}
	};
	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server xmidas
		documentSelector:[{scheme:"file", language: 'xmidas' }, { language: 'xm-macro', pattern: '**∕*.mcr' }],
		// synchronize: {
		// 	//fileEvents:workspace.createFileSystemWatcher(new RelativePattern(window.activeTextEditor.document.uri, '*'))
		// 	fileEvents:[workspace.createFileSystemWatcher('**​/*.py'),workspace.createFileSystemWatcher('**​/*.mcr')]
		// 	// Notify the server about file changes to '.clientrc files contained in the workspace
		// 	//fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		// }
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'xmidasLanguageServer',
		'XmidasLanguageServer',
		serverOptions,
		clientOptions
	);
	console = { ...console,
		log:(msg,...params)=>{
			client.info(`[Client]: ${msg}`)
		},
		info: (msg,...params) =>{
			client.info(`[Client]: ${msg}`)
		},
		warn:(msg,...params) =>{
			client.warn(`[Client]: ${msg}`)
		},
		error:(msg,...params) =>{
			client.error(`[Client]: ${msg}`)
		}
	}
	
	console.info("Starting XM Language Server")
	// Start the client. This will also launch the server
	var result = await client.start();
	console.info("XM Language Server started")
	console.log("test change")
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

async function restart(){
	deactivate()
	if(extensionContext){
		activate(extensionContext)
	}
}