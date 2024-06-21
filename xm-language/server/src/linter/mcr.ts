import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { XmidasSettings } from '../settings';

interface LintError{
    index:number;
    value:string;
}

abstract class Plugin {
    id: string;
    message: string;

    constructor() {
        this.id = '';
        this.message = '';
    }
    abstract check(file:string):LintError[]
    toString(): string {
        return `${this.id} = ${this.message}`;
    }
}

class FixmePlugin extends Plugin {
    constructor() {
        super();
        this.id = 'fixme';
        this.message = 'TODO, FIXME, or XXX comment detected';
    }

    check(file: string)  {
        let errors:LintError[] = []
        let m: RegExpExecArray | null;
        let pat = /(TODO|FIXME|XXX)/ig;
        while((m = pat.exec(file))){
            errors.push({index:m.index,value:m[0]})
        }
        return errors;
    }
}

class LineTooLongPlugin extends Plugin {
    limit: number;

    constructor(limit: number = 200) {
        super();
        this.id = 'line-too-long';
        this.limit = limit;
        this.message = `Line greater than ${limit} characters long`;
    }

    check(file: string) {
        let pat = /.*\n/g;
        let errors:LintError[] = []
        let m: RegExpExecArray | null;
        while((m = pat.exec(file))){
            if(m[0].length > this.limit){
                errors.push({index:m.index,value:m[0]})
            }
        }
        return errors
    }
}

class TabCharPlugin extends Plugin {
    constructor() {
        super();
        this.id = 'tab-char';
        this.message = 'Tab character detected';
    }

    check(file: string) {
        let pat = /.*\t.*\n/g;
        let m: RegExpExecArray | null;
        let errors:LintError[] = []
        while((m = pat.exec(file))){
            errors.push({index:m.index,value:m[0]})
        }
        return errors
    }
}

class TrailingWhitespacePlugin extends Plugin {
    pat: RegExp;

    constructor() {
        super();
        this.id = 'trailing-whitespace';
        this.message = 'Trailing whitespace detected';
        this.pat = /[ \t]+$/;
    }

    check(file: string)  {
        let pat = /[ \t]+\n/g;
        let m: RegExpExecArray | null;
        let errors:LintError[] = []
        while((m = pat.exec(file))){
            errors.push({index:m.index,value:m[0]})
        }
        return errors
    }
}

export const PLUGINS: Plugin[] = [
    new FixmePlugin(),
    new LineTooLongPlugin(),
    new TabCharPlugin(),
    new TrailingWhitespacePlugin(),
];

class Issue {
    path: string;
    line_number: number;
    plugin: Plugin;

    constructor(path: string, line_number: number, plugin: Plugin) {
        this.path = path;
        this.line_number = line_number;
        this.plugin = plugin;
    }

    toString(): string {
        return `${this.path}: ${this.line_number}: ${this.plugin.message} (${this.plugin.id})`;
    }
}
export function check_file(text:string,textDocument:TextDocument,settings:XmidasSettings){
    const disabledLintPlugins = settings.disabledLintPlugins.split(",")
    const results: Diagnostic[] = [];
    for(let plugin of PLUGINS){
        if(disabledLintPlugins.includes(plugin.id)){
            console.log(`${plugin.id} is disabled`)
            continue
        }
        console.log(`starting ${plugin.id}`)
        if(results.length > settings.maxNumberOfProblems){
            break
        }
        let errors = plugin.check(text);
        for(let error of errors){
            const diagnostic: Diagnostic = {
                severity: DiagnosticSeverity.Warning,
                range: {
                    start: textDocument.positionAt(error.index),
                    end: textDocument.positionAt(error.index + error.value.length)
                },
                message: `${error.value} ${plugin.message}`,
                source: plugin.id
            };
            results.push(diagnostic);
        }
    }
    return results
}


