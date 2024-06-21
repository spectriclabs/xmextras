"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.check_file = exports.PLUGINS = void 0;
const node_1 = require("vscode-languageserver/node");
class Plugin {
    constructor() {
        this.id = '';
        this.message = '';
    }
    toString() {
        return `${this.id} = ${this.message}`;
    }
}
class FixmePlugin extends Plugin {
    constructor() {
        super();
        this.id = 'fixme';
        this.message = 'TODO, FIXME, or XXX comment detected';
    }
    check(file) {
        let errors = [];
        let m;
        let pat = /(TODO|FIXME|XXX)/i;
        while ((m = pat.exec(file))) {
            errors.push({ index: m.index, value: m[0] });
        }
        return errors;
    }
}
class LineTooLongPlugin extends Plugin {
    constructor(limit = 200) {
        super();
        this.id = 'line-too-long';
        this.limit = limit;
        this.message = `Line greater than ${limit} characters long`;
    }
    check(file) {
        let pat = /.*\n/g;
        let errors = [];
        let m;
        while ((m = pat.exec(file))) {
            if (m[0].length > this.limit) {
                errors.push({ index: m.index, value: m[0] });
            }
        }
        return errors;
    }
}
class TabCharPlugin extends Plugin {
    constructor() {
        super();
        this.id = 'tab-char';
        this.message = 'Tab character detected';
    }
    check(file) {
        let pat = /.*\t.*\n/g;
        let m;
        let errors = [];
        while ((m = pat.exec(file))) {
            errors.push({ index: m.index, value: m[0] });
        }
        return errors;
    }
}
class TrailingWhitespacePlugin extends Plugin {
    constructor() {
        super();
        this.id = 'trailing-whitespace';
        this.message = 'Trailing whitespace detected';
        this.pat = /[ \t]+$/;
    }
    check(file) {
        let pat = /[ \t]+\n/g;
        let m;
        let errors = [];
        while ((m = pat.exec(file))) {
            errors.push({ index: m.index, value: m[0] });
        }
        return errors;
    }
}
exports.PLUGINS = [
    new FixmePlugin(),
    new LineTooLongPlugin(),
    new TabCharPlugin(),
    new TrailingWhitespacePlugin(),
];
class Issue {
    constructor(path, line_number, plugin) {
        this.path = path;
        this.line_number = line_number;
        this.plugin = plugin;
    }
    toString() {
        return `${this.path}: ${this.line_number}: ${this.plugin.message} (${this.plugin.id})`;
    }
}
function check_file(text, textDocument, settings) {
    const results = [];
    for (let plugin of exports.PLUGINS) {
        if (results.length > settings.maxNumberOfProblems) {
            break;
        }
        let errors = plugin.check(text);
        for (let error of errors) {
            const diagnostic = {
                severity: node_1.DiagnosticSeverity.Warning,
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
    return results;
}
exports.check_file = check_file;
//# sourceMappingURL=mcr.js.map