define(["require", "exports", "../_.contribution"], function (require, exports, __contribution_1) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    // Allow for running under nodejs/requirejs in tests
    var _monaco = (typeof monaco === 'undefined' ? self.monaco : monaco);
    __contribution_1.registerLanguage({
        id: 'nim',
        extensions: ['.nim'],
        aliases: ['Nim', 'nim'],
        loader: function () { return _monaco.Promise.wrap(new Promise(function (resolve_1, reject_1) { require(['./nim'], resolve_1, reject_1); })); }
    });
});
