/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';
import { stat, Stats,readFileSync } from 'node:fs';

import {XmidasSettings,defaultSettings} from "./settings"
import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import {check_file} from "./linter/mcr"
import { rejects } from 'node:assert';
// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);
console = {...console,
	log:(msg,...params)=>{
		connection.console.info(`[Server]: ${msg}`)
	},
	info: (msg,...params) =>{
		connection.console.info(`[Server]: ${msg}`)
	},
	warn:(msg,...params) =>{
		connection.console.warn(`[Server]: ${msg}`)
	},
	error:(msg,...params) =>{
		connection.console.error(`[Server]: ${msg}`)
	}
}
console.log("Starting server")
// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	connection.window.showInformationMessage("Xmidas Language Server Started")
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			hoverProvider:true,
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	console.log("onInitialize")
	console.log(JSON.stringify(result))
	return result;
});

connection.onInitialized(() => {
	console.log("regster for setting changes")
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});



// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
let globalSettings: XmidasSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<XmidasSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	console.log("onDidChangeConfiguration")
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <XmidasSettings>(
			(change.settings.xmidasLanguageServer || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(runLintOnDocument);
});

function getDocumentSettings(resource: string): Thenable<XmidasSettings> {
	console.log("getDocumentSettings")

	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section:"xmidasLanguageServer"
		});
		documentSettings.set(resource, result);
	}
	return result;
}
const asyncStat = async (filePath:string):Promise<Stats>=>{
	return new Promise((resolve,reject)=> stat(filePath,(err,stats)=>{
		if(err){
			reject(err)
			return 
		}
		resolve(stats)
	}))
}
connection.onHover(async (params,...rest)=>{

	const {textDocument,position} = params
	let document = documents.get(textDocument.uri)
	if(document){
		let line = document.getText({start:{line:position.line,character:0},end:{line:position.line+1,character:0}})
		let text = document.getText({start:position,end:{line:position.line,character:position.character+20}})
		let startIndex = line.indexOf(text);
		let tokenStart = line.lastIndexOf(" ",startIndex)+1;
		let tokenEnd = line.indexOf(" ",tokenStart)
		let token = line.substring(tokenStart,tokenEnd)
		console.debug(`Looking for explain for ${token}`)
		//TODO What is the correct order of SYS path. Can we do this dynamically? do we need to start an xmshell to do this?
		//for now just look at the extention setting configuration and use that order
		const settings = await getDocumentSettings(textDocument.uri);
		//Look in reverse order so we check option trees first
		for( let path of [...settings.xmDiskPaths].reverse()){
			const explainFile = `${path}/exp/${token}.exp`
			try {
			const stats = await asyncStat(explainFile)

			if(stats.isFile()){
				const contents = readFileSync(explainFile)
				return {
					contents:{
						kind:"plaintext",
						value:contents.toString()
					}
				}
			}
			} catch (error:any) {
				console.log(error.message)
			}
		}
	}
	return undefined
})
// Only keep settings for open documents
documents.onDidClose(e => {
	console.log("onDidClose")

	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	console.log("onDidChangeContent")

	runLintOnDocument(change.document);
});

async function runLintOnDocument(textDocument: TextDocument): Promise<void> {
	console.log("start lint")
	
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);
	console.log("settings")
	console.log(JSON.stringify(settings))
	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText();
	const lines = text.split("\n")
	
	console.log("start lint")
	const diagnostics:Diagnostic[] = check_file(text,textDocument,settings)
	console.log("stop lint")


	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	console.log("lint complete")
}

connection.onDidChangeWatchedFiles(_change => {
	console.log("onDidChangeWatchedFiles")

	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		console.log("onCompletion")

		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript',
				kind: CompletionItemKind.Text,
				data: 2
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
console.log("Listening")
