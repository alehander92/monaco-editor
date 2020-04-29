define("vs/basic-languages/assembler/assembler", ["require", "exports"], function (require, exports) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    // created with https://microsoft.github.io/monaco-editor/monarch.html
    // based on other microsoft/monaco/monarch grammars because our nim one is probably based on https://github.com/microsoft/monaco-languages)
    // and https://en.wikipedia.org/wiki/X86_instruction_listings#x86_integer_instructions and http://faydoc.tripod.com/cpu/jc.htm
    exports.conf = {
        comments: {
            lineComment: ';'
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
        ],
        autoClosingPairs: [
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
        tokenPostfix: '.asm',
        keywords: ['mov','aaa', 'aad', 'aam', 'aas', 'adc', 'add', 'and', 'call',
            'cbw', 'clc', 'cld', 'cli', 'cmc', 'cmp', 'cmpsb', 'cmpsw', 'cwd',
            // todo next
            'movsb', 'movsw', 'mul', 
            'je', 'ja', 'jae', 'jbe', 'jc', 'jg', 'jge', 'jl', 'jle', 'jna', 'jnae', 'jnb', 'jnbe', 'jce',
            'jne', 'jng', 'jnge', 'jnl', 'jnle', 'jno', 'jnz',
            'push', 'pop', 'or', 'ret', 'retn', 'rol', 'ror', 'shl', 'shr', 'sub', 'xor'
        ],
        typeKeywords: [
        ],
        operators: [
            '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
            '||', '+', '-', '*', '/', '&', '|', '^', '%', '..', '..<',
            '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
            '%=', '<<=', '>>=', '>>>=', 'is', 'in', 'notin'
        ],
        // we include these common regular expressions
        symbols: '', // ['eax', 'ebx', 'ecx', 'edx', 'rax', 'rbx', 'rcx', 'rdx'],

        // The main tokenizer for our languages
        tokenizer: {
            root: [
                // identifiers and keywords
                [/[a-z_$][\w$]*/, { cases: { 
                    // '@symbols': 'symbol',
                            '@keywords': 'keyword',
                            '@default': 'identifier'} }],
                // whitespace
                { include: '@whitespace' },
                // delimiters and operators
                [/[{}()\[\]]/, '@brackets'],
                [/[<>](?!@symbols)/, '@brackets'],
                
                [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                [/0[xX][0-9a-fA-F]+/, 'number.hex'],
                [/\d+/, 'number'],
                // delimiter: after number because of .\d floats
                [/[;,.]/, 'delimiter'],
                // strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
            ],
            comment: [
                [/[^;\*]+/, 'comment'],
                [/[;*]/, 'comment']
            ],
            string: [
                [/[^\\"]+/, 'string'],
                [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ],
            whitespace: [
                [/[ \t\r\n]+/, 'white']
            ],
        },
    };
});
