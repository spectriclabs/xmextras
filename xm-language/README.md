# Language Support for Xmidas Macros by Spectric Labs
Provides xmidas language support via custom language server that parses the option tree manifest and commands

## Features
 - tooltip function signatures
 - completions suggestions
 - syntanx highlighting
 - linting


## Quick start
In the extention settings add the path to a folder containing the xmidas installation, and any option trees, or the path to a single option tree



# Development

## Local Development
```
git clone https://github.com/spectriclabs/xmextras
cd xm-language
npm install
npm run watch
```


## Build

```
npx vsce package
```

## Publish

```
npx vsce publish
```

## Install

https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix

