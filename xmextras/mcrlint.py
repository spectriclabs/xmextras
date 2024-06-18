from argparse import ArgumentParser
from pathlib import Path

import re
import sys


class Plugin:
    def __str__(self):
        return f'{self.id} = {self.message}'  # pylint: disable=no-member


class FixmePlugin(Plugin):
    def __init__(self):
        self.id = 'fixme'
        self.message = 'TODO, FIXME, or XXX comment detected'
        self.pat = re.compile(r'![ \t\-]+(TODO|FIXME|XXX)')

    def check(self, line):
        return self.pat.search(line)


class LineTooLongPlugin(Plugin):
    def __init__(self, limit=200):
        self.id = 'line-too-long'
        self.limit = limit
        self.message = f'Line greater than {limit} characters long'

    def check(self, line):
        return len(line) > self.limit


class RuntimeCommandBinding(Plugin):
    def __init__(self):
        self.id = 'runtime-command-binding'
        self.message = 'Runtime command binding caret detected'

    def check(self, line):
        return line.strip().startswith('^')


class TabCharPlugin(Plugin):
    def __init__(self):
        self.id = 'tab-char'
        self.message = 'Tab character detected'

    def check(self, line):
        return '\t' in line


class TrailingWhitespacePlugin(Plugin):
    def __init__(self):
        self.id = 'trailing-whitespace'
        self.message = 'Trailing whitespace detected'
        self.pat = re.compile(r'[ \t]+$')

    def check(self, line):
        return self.pat.search(line)


PLUGINS = [
    FixmePlugin(),
    LineTooLongPlugin(),
    RuntimeCommandBinding(),
    TabCharPlugin(),
    TrailingWhitespacePlugin(),
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


def check_file(path: Path, plugins):
    with path.open('r', encoding='utf8') as f:
        for line_num, line in enumerate(f):
            line_issues = check_line(line, plugins)

            for issue in line_issues:
                yield Issue(path, line_num+1, issue)


def all_paths_exist(paths):
    num_missing = 0

    for path in paths:
        if not path.exists():
            print(f'Could not find {path}')
            num_missing += 1

    return num_missing == 0


def get_active_plugins(disable):
    disabled_plugins = [p.lower() for p in disable.split(',')]
    return [p for p in PLUGINS if p.id not in disabled_plugins]


def mcrlint():
    parser = ArgumentParser(description='Linter for X-Midas macro code')
    parser.add_argument('-d', '--disable', default='', help='Comma-separated list of check plugins to disable')
    parser.add_argument('--list', action='store_true', help='List check plugins')
    parser.add_argument('filenames', nargs='*')
    args = parser.parse_args()

    if args.list:
        for plugin in PLUGINS:
            print(str(plugin))
        sys.exit(0)

    paths = [Path(p) for p in args.filenames]

    if len(paths) == 0:
        print('No paths specified')
        sys.exit(1)

    plugins = get_active_plugins(args.disable)

    if not all_paths_exist(paths):
        sys.exit(1)

    issue_count = 0

    for path in paths:
        for issue in check_file(path, plugins):
            print(issue)
            issue_count += 1

    print(f'Found {issue_count} issues')

    if issue_count > 0:
        sys.exit(1)
