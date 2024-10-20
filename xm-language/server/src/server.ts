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
	InitializeResult,
	CompletionList,
	Definition
} from 'vscode-languageserver/node';
import { globSync } from 'glob';
import { stat, Stats, readFileSync, readdirSync } from 'node:fs';
import { join as pathJoin } from "path";
import { XmidasSettings, defaultSettings } from "./settings"
import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { check_file } from "./linter/mcr"
import { start } from 'node:repl';
// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);
console = {
	...console,
	log: (msg, ...params) => {
		if (typeof msg == "object") {
			msg = JSON.stringify(msg)
		}
		connection.console.info(`[Server]: ${msg}`)
	},
	info: (msg, ...params) => {
		if (typeof msg == "object") {
			msg = JSON.stringify(msg)
		}
		connection.console.info(`[Server]: ${msg}`)
	},
	warn: (msg, ...params) => {
		if (typeof msg == "object") {
			msg = JSON.stringify(msg)
		}
		connection.console.warn(`[Server]: ${msg}`)
	},
	error: (msg, ...params) => {
		if (typeof msg == "object") {
			msg = JSON.stringify(msg)
		}
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
			hoverProvider: true,
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			},
			definitionProvider:true
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

async function getDocumentSettings(resource: string): Promise<XmidasSettings> {
	console.log("getDocumentSettings Updated")

	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: "xmidasLanguageServer"
		});
		documentSettings.set(resource, result);
	}
	const settings = await result
	//Lets resolve disk paths to an option tree this allows users to set a directory of many optiontrees or a single option tree.
	//We look for a manifest and if the folder contains one we assume it is a full option tree path, otherwise we look one folder deeper for a manifest
	const resolvedPaths: string[] = []
	for (let path of [...settings.xmDiskPaths].reverse()) {
		if (path[0] === '~') {
			path = pathJoin(process.env.HOME || "", path.slice(1));
		}
		let foundManifest = false
		if (await pathHasManifest(path)) {
			resolvedPaths.push(path)
			continue
		}

		try {
			const files = readdirSync(path)

			for (let file of files) {
				if (await pathHasManifest(pathJoin(path, file))) {
					foundManifest = true
					resolvedPaths.push(pathJoin(path, file))
				}
			}
		} catch (error: any) {
		}
		if (!foundManifest) {
			console.error(`${path} is not a valid XMIDAS path it will not be scanned because no manifest was found`)
		}
	}
	console.log({ ...settings, xmDiskPaths: resolvedPaths })
	return { ...settings, xmDiskPaths: resolvedPaths };
}
async function pathHasManifest(path: string) {
	const manifest = `${path}/manifest.txt`
	try {
		const manifestStats = await asyncStat(manifest)

		if (manifestStats.isFile()) {
			return true
		}
	} catch (error: any) {
	}
	return false
}
const asyncStat = async (filePath: string): Promise<Stats> => {
	return new Promise((resolve, reject) => stat(filePath, (err, stats) => {
		if (err) {
			reject(err)
			return
		}
		resolve(stats)
	}))
}

var levDist = function(s:string, t:string) {
    var d:number[][] = []; //2d matrix

    // Step 1
    var n = s.length;
    var m = t.length;

    if (n == 0) return m;
    if (m == 0) return n;

    //Create an array of arrays in javascript (a descending loop is quicker)
    for (var i = n; i >= 0; i--) d[i] = [];

    // Step 2
    for (var i = n; i >= 0; i--) d[i][0] = i;
    for (var j = m; j >= 0; j--) d[0][j] = j;

    // Step 3
    for (var i = 1; i <= n; i++) {
        var s_i = s.charAt(i - 1);

        // Step 4
        for (var j = 1; j <= m; j++) {

            //Check the jagged ld total so far
            if (i == j && d[i][j] > 4) return n;

            var t_j = t.charAt(j - 1);
            var cost = (s_i == t_j) ? 0 : 1; // Step 5

            //Calculate the minimum
            var mi = d[i - 1][j] + 1;
            var b = d[i][j - 1] + 1;
            var c = d[i - 1][j - 1] + cost;

            if (b < mi) mi = b;
            if (c < mi) mi = c;

            d[i][j] = mi; // Step 6

            //Damerau transposition
            if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }

    // Step 7
    return d[n][m];
}
connection.onHover(async (params, ...rest) => {
	var commands = await getCommandsFromText(params)
	const token = getTokenFromText(params)
	if(!token){
		return
	}
	//filter out commands where the token is shorter than the shortname
	commands = commands.filter(command=>{
		if(token.length > command.name.length){
			return false
		}
		if(token.length < command.shortName.length){
			return false
		}
		return true
	})

	var hover: string = ""
	if (commands.length) {
		let command = commands[0];
		let typedef = `${command.name.toLowerCase()} ${command.params.map(param => {
			const [typeName,type] = Object.entries(XMParamType).filter(e=> e[1] === param.type)[0]
			return `${typeName}:${type}=${param.default}`
		}).join(",")}`
		hover += "```xmidas\n" + typedef + "\n\n```\n\n"
		const explainFile = `${command.path}/exp/${command.name.toLowerCase()}.exp`
		const stats = await asyncStat(explainFile)
		if (stats.isFile()) {
			hover += "______________________________\n";
			const explain = readFileSync(explainFile);
			hover += "\n\n```plaintext\n" +explain.toString();
		}
	}
	if (hover !== "") {
		return {
			contents: {
				kind: "markdown",
				value: hover
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

function getTokenFromText(params: TextDocumentPositionParams) {
	const { textDocument, position } = params
	let document = documents.get(textDocument.uri);
	if (document) {
		let line = document.getText({ start: { line: position.line, character: 0 }, end: { line: position.line + 1, character: 0 } })
		let text = document.getText({ start: position, end: { line: position.line, character: position.character + 20 } })
		let startIndex = line.indexOf(text);
		let tokenStart = line.lastIndexOf(" ", startIndex) + 1;
		let tokenEnd = line.indexOf(" ", tokenStart)
		if (tokenEnd == -1) {
			//check if we are typing a new command on an existing line
			tokenEnd = line.indexOf("\n",tokenStart)
			if(tokenEnd == -1){
				tokenEnd = position.character
			}
		}
		let token = line.substring(tokenStart, tokenEnd)
		//Remove switches
		token = token.split("/")[0]
		return token
	}
}
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
	const diagnostics: Diagnostic[] = check_file(text, textDocument, settings)
	console.log("stop lint")


	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	console.log("lint complete")
}
enum XMParamType {
	INPUT = "I",
	OUTPUT = "O",
	ASCII = "A",
	NUMERIC = "N", //alias for double
	RESULT = "R",
	TABLE = "T",
	UNSTRANSLATED = "U", //Untranslated ascii string (could be a aux path or device)
	HASH = "H",
	COLLECTION = "C",//List or array
	KEYVALUE = "K", //key value list (like extended header)
	DOUBLE = "D",
	FLOAT = "F",
	XLONG = "X", //eXtended long int not sure how this is different from a long
	LONG = "L",
	INT = "I", //short int
	BYTE = "B",
	OFFSET = "O",//Binary offset
	ANY = "_" //xmidas attempts to parse as a double if it cannot it is cast to unstranslated (ascii)
}
interface XMCommandParam {
	type: XMParamType;
	default: null | string | number;

}
enum XMCommandSupport {
	HOST = "H",
	MACRO = "M",
	INTRINSIC = "I",
	DATASTREAM = "D",
	SSP = "S",
	PYMACRO = "P",
	EXECUTABLE = "E",
	FOREIGN = "F",
	OSCOMMAND = "O"
}

var SUPPORT_TYPE_TO_FOLDER:Record<string,string> = {
	[XMCommandSupport.HOST]:"/host/",
	[XMCommandSupport.MACRO]:"/mcr/",
	[XMCommandSupport.PYMACRO]:"/mcr/",
	[XMCommandSupport.INTRINSIC]:"/lib/xmintrinsics/"
}

interface XMCommand {
	category: number;
	name: string;
	shortName: string;
	numParams: number;
	paramsRepeatable:boolean;
	supportType: XMCommandSupport;
	params: XMCommandParam[]
	path:string;
	location?:string
}
const COMMAND_CACHE = new Map()
async function parseOptIonTreeCommandsFile(path: string): Promise<XMCommand[]> {
	const commandsFile = `${path}/cfg/commands.cfg`
	console.log(commandsFile)
	if (COMMAND_CACHE.has(path)) {
		return COMMAND_CACHE.get(path)
	}
	try {
		const stats = await asyncStat(commandsFile)

		if (stats.isFile()) {
			const contents = readFileSync(commandsFile)
			let commands = parseCommands(contents.toString(),path)
			commands = commands.sort((a,b)=>a.shortName.length - b.shortName.length)
			COMMAND_CACHE.set(path, commands)
			return commands
		}
	} catch (error: any) {
		console.log(error.message)
	}
	return []
}
function parseCommands(text: string,path:string) {
	const commands: XMCommand[] = []
	// @ts-ignore
	text = text.replaceAll(/&\n\s+/g, "");//Replace continue on next line characters it breaks the following regex pattern
	const pattern = /(\d+)?\s+(\w+)\*(\w+)?\s+(\w),(\d+)(\+?)\s+(.+)+#([IOANRTUHCKDFXLIBO_?\d]+)/g
	
	for (let match of text.matchAll(pattern)) {
		let [category, shortName, additionalName, commandType, matchedParams,repeated, paramDefaults, paramTypes] = match.splice(1);
		let numParams = parseInt(matchedParams)
		let supportType = commandType as XMCommandSupport;
		let name = additionalName ? shortName + additionalName : shortName;
		let location;
		if(SUPPORT_TYPE_TO_FOLDER[supportType]){
			let cname = name.toLowerCase()
			let supportFolder = SUPPORT_TYPE_TO_FOLDER[supportType]
			let expectedFolder = `${path}/${supportFolder}/${cname}*`
			var files = globSync(expectedFolder)
			files = files.filter(f=>!f.match(/.*(\.exe|\.so|\.mcr|\.b)/))
			if(files.length == 1){
				location = files[0]
			}
		}
		let command: XMCommand = {
			category: parseInt(category),
			shortName,
			name,
			supportType,
			numParams,
			paramsRepeatable:repeated === "+",
			params: [],
			path,
			location
		}
		let defaults = paramDefaults.split(",");
		let index = 1
		//param type #OA5NI = [O,A,A,A,A,A,N,I]
		for (let match of paramTypes.matchAll(/(\d+\w|\w)/g)) {
			let count = match[1].slice(0, -1)
			let type = match[1].slice(-1)
			if (count == "") {//There is only one of this type in the sequence 
				command.params.push({
					type: type as unknown as XMParamType,
					default: defaults[index]
				})
				index++
			} else {
				for (let i = 0; i < parseInt(count); i++) {
					command.params.push({
						type: type as unknown as XMParamType,
						default: defaults[index]
					})
					index++
				}
			}
		}
		commands.push(command)
	}
	console.log(`Parsed ${commands.length} from ${path}`)
	return commands
}

async function getCommandsFromText(params:TextDocumentPositionParams){
	let allCommands:Record<string,XMCommand>= {}
	const token = getTokenFromText(params)
	const { textDocument } = params
	const settings = await getDocumentSettings(textDocument.uri);
	if(!token){
		return []
	}
	//Look in listed order so the llast paths overwrite any commands found in lower paths
	for (let path of [...settings.xmDiskPaths]) {
		let commands = await parseOptIonTreeCommandsFile(path);
		commands = commands.filter(command => {
			return token.toLowerCase().startsWith(command.shortName.toLowerCase()) || command.name.toLowerCase().startsWith(token.toLowerCase())
		})
		commands.forEach(c=>{
			allCommands[c.name] = c
		})
	}
	//sort the commands by levinstine distance so the one closest to the token is first
	var commands = Object.values(allCommands)
	commands = commands.sort((a,b)=>levDist(a.name.toLowerCase(),token)-levDist(b.name.toLowerCase(),token))
	return commands

}
connection.onDefinition(async (params,cancel)=>{
	const commands = await getCommandsFromText(params)
	console.log("onDefinition")
	console.log(commands)
	if(commands.length == 1 && commands[0].location){
		let definition:Definition ={uri:commands[0].location,range:{start:{line:0,character:0},end:{line:0,character:0}}}
		return definition
	}
})

connection.onCompletion(async (params, cancel) => {
	console.log("On completion")
	if (cancel.isCancellationRequested) {
		return
	}
	const commands = await getCommandsFromText(params)
	const completions: CompletionList = { isIncomplete: false, items: [] }
	if(!commands.length){
		return
	}
	commands.forEach(command => {
		completions.items.push(
			{
				label: command.name,
				kind: CompletionItemKind.Function,
				insertText: `${command.name.toLowerCase()} ${command.params.map(param => {
					return param.default
				}).join(",")}`,
				detail: command.params.map(param => {
					return Object.entries(XMParamType).filter(entry => entry[1] === param.type).map(entry => entry[0])
				}).join(","),
				documentation: "Show link to explain",
				data: { path:command.path, command }
			}
		)
	})
	return completions
})
connection.onDidChangeWatchedFiles(_change => {
	console.log("onDidChangeWatchedFiles")

	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
// connection.onCompletion(
// 	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
// 		console.log("onCompletion")

// 		// The pass parameter contains the position of the text document in
// 		// which code complete got requested. For the example we ignore this
// 		// info and always provide the same completion items.
// 		return [
// 			{
// 				label: 'TypeScript',
// 				kind: CompletionItemKind.Text,
// 				data: 1
// 			},
// 			{
// 				label: 'JavaScript',
// 				kind: CompletionItemKind.Text,
// 				data: 2
// 			}
// 		];
// 	}
// );

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
