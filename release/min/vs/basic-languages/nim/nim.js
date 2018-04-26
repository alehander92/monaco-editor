define("vs/basic-languages/nim/nim", ["require", "exports"], function (require, exports) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    // created with https://microsoft.github.io/monaco-editor/monarch.html
    // based on https://nim-lang.org/docs/manual.html
    exports.conf = {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\#\@\\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        comments: {
            lineComment: '#',
            blockComment: ['[#', '#]'],
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
        ],
        autoClosingPairs: [
            { open: '{.', close: '.}' },
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' }
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: '\'', close: '\'' },
            { open: '<', close: '>' },
        ],
        folding: {
            offSide: true,
            markers: {
                start: new RegExp("^\\s*#region\\b"),
                end: new RegExp("^\\s*#endregion\\b")
            }
        }
    };
    exports.language = {
        // Set defaultToken to invalid to see what you do not tokenize yet
        // defaultToken: 'invalid',
        tokenPostfix: '.nim',
        keywords: ['addr', 'and', 'as', 'asm',
            'bind', 'block', 'break',
            'case', 'cast', 'concept', 'const', 'continue', 'converter',
            'defer', 'discard', 'distinct', 'div', 'do',
            'elif', 'else', 'end', 'enum', 'except', 'export',
            'finally', 'for', 'from', 'func',
            'if', 'import', 'in', 'include', 'interface', 'is', 'isnot', 'iterator',
            'let',
            'macro', 'method', 'mixin', 'mod',
            'nil', 'not', 'notin',
            'object', 'of', 'or', 'out',
            'proc', 'ptr',
            'raise', 'ref', 'return',
            'shl', 'shr', 'static',
            'template', 'try', 'tuple', 'type',
            'using',
            'var',
            'when', 'while',
            'xor',
            'yield',
            'echo',
        ],
        typeKeywords: [
            'bool', 'int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'string', 'cstring', 'seq', 'array'
        ],
        operators: [
            '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
            '||', '+', '-', '*', '/', '&', '|', '^', '%', '..', '..<',
            '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
            '%=', '<<=', '>>=', '>>>=', 'is', 'in', 'notin'
        ],
        // we include these common regular expressions
        symbols: /[=><!~?:&|+\-*\/\^%]+/,
        // C# style strings
        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
        // The main tokenizer for our languages
        tokenizer: {
            root: [
                // identifiers and keywords
                [/[a-z_$][\w$]*/, { cases: { '@typeKeywords': 'keyword',
                            '@keywords': 'keyword',
                            '@default': 'identifier' } }],
                [/[A-Z][\w\$]*/, 'type.identifier'],
                // whitespace
                { include: '@whitespace' },
                // delimiters and operators
                [/[{}()\[\]]/, '@brackets'],
                [/[<>](?!@symbols)/, '@brackets'],
                [/@symbols/, { cases: { '@operators': 'operator',
                            '@default': '' } }],
                // numbers
                [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                [/0[xX][0-9a-fA-F]+/, 'number.hex'],
                [/\d+/, 'number'],
                // delimiter: after number because of .\d floats
                [/[;,.]/, 'delimiter'],
                // strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
                // characters
                [/'[^\\']'/, 'string'],
                [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
                [/'/, 'string.invalid']
            ],
            comment: [
                [/[^#\*]+/, 'comment'],
                [/\#\*/, 'comment', '@push'],
                ["#*/", 'comment', '@pop'],
                [/[#*]/, 'comment']
            ],
            string: [
                [/[^\\"]+/, 'string'],
                [/@escapes/, 'string.escape'],
                [/\\./, 'string.escape.invalid'],
                [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ],
            whitespace: [
                [/[ \t\r\n]+/, 'white'],
                [/#\*/, 'comment', '@comment'],
                [/#.*$/, 'comment'],
            ],
        },
    };
});
