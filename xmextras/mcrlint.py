from pathlib import Path

import re
import sys


class Plugin:
    pass


class TrailingWhitespacePlugin(Plugin):
    def __init__(self):
        self.id = 'TrailingWhitespace'
        self.message = 'Trailing whitespace detected'
        self.pat = re.compile(r'[ \t]+$')

    def check(self, line):
        return self.pat.search(line)


class FixmePlugin(Plugin):
    def __init__(self):
        self.id = 'Fixme'
        self.message = 'TODO, FIXME, or XXX comment detected'
        self.pat = re.compile(r'![ \t\-]+ (TODO|FIXME|XXX)')

    def check(self, line):
        return self.pat.search(line)


class TabCharPlugin(Plugin):
    def __init__(self):
        self.id = 'TabChar'
        self.message = 'Tab character detected'

    def check(self, line):
        return '\t' in line


PLUGINS = [
    TrailingWhitespacePlugin(),
    FixmePlugin(),
    TabCharPlugin(),
]


def check_line(line: str, plugins):
    results = []

    for plugin in plugins:
        if plugin.check(line):
            results.append(plugin)

    return results


class Issue:
    def __init__(self, path: Path, line_number: int, plugin: Plugin):
        self.path = path
        self.line_number = line_number
        self.plugin = plugin

    def __str__(self):
        return f'{self.path}: {self.line_number}: {self.plugin.message} ({self.plugin.id})'


def check_file(path: Path, disable=None):
    if disable is None:
        disable = []

    if not isinstance(disable, list):
        raise ValueError("Expected list of disabled plugin ID's or None")

    plugins = [plugin for plugin in PLUGINS if plugin.id not in disable]

    with path.open('r', encoding='utf8') as f:
        for line_num, line in enumerate(f):
            line_issues = check_line(line, plugins)

            for issue in line_issues:
                yield Issue(path, line_num+1, issue)


def mcrlint():
    paths = [Path(p) for p in sys.argv[1:]]
    issue_count = 0

    for path in paths:
        if not path.exists():
            print(f'Could not find {path}')
            continue

        for issue in check_file(path):
            print(issue)
            issue_count += 1

    print(f'Found {issue_count} issues')

    if issue_count > 0:
        sys.exit(1)
