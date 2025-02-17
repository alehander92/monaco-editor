/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as nls from '../../../nls.js';
import { HistoryNavigator } from '../../../base/common/history.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ContextKeyExpr, IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import * as strings from '../../../base/common/strings.js';
import { registerEditorContribution, registerEditorAction, EditorAction, EditorCommand, registerEditorCommand } from '../../browser/editorExtensions.js';
import { FIND_IDS, FindModelBoundToEditorModel, ToggleCaseSensitiveKeybinding, ToggleRegexKeybinding, ToggleWholeWordKeybinding, ToggleSearchScopeKeybinding, ShowPreviousFindTermKeybinding, ShowNextFindTermKeybinding, CONTEXT_FIND_WIDGET_VISIBLE, CONTEXT_FIND_INPUT_FOCUSED } from './findModel.js';
import { FindReplaceState } from './findState.js';
import { Delayer } from '../../../base/common/async.js';
import { EditorContextKeys } from '../../common/editorContextKeys.js';
import { IStorageService, StorageScope } from '../../../platform/storage/common/storage.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { IContextViewService } from '../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { FindWidget } from './findWidget.js';
import { FindOptionsWidget } from './findOptionsWidget.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { KeybindingsRegistry } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { optional } from '../../../platform/instantiation/common/instantiation.js';
export function getSelectionSearchString(editor) {
    var selection = editor.getSelection();
    // if selection spans multiple lines, default search string to empty
    if (selection.startLineNumber === selection.endLineNumber) {
        if (selection.isEmpty()) {
            var wordAtPosition = editor.getModel().getWordAtPosition(selection.getStartPosition());
            if (wordAtPosition) {
                return wordAtPosition.word;
            }
        }
        else {
            return editor.getModel().getValueInRange(selection);
        }
    }
    return null;
}
var CommonFindController = /** @class */ (function (_super) {
    __extends(CommonFindController, _super);
    function CommonFindController(editor, contextKeyService, storageService, clipboardService) {
        var _this = _super.call(this) || this;
        _this._editor = editor;
        _this._findWidgetVisible = CONTEXT_FIND_WIDGET_VISIBLE.bindTo(contextKeyService);
        _this._storageService = storageService;
        _this._clipboardService = clipboardService;
        _this._updateHistoryDelayer = new Delayer(500);
        _this._currentHistoryNavigator = new HistoryNavigator();
        _this._state = _this._register(new FindReplaceState());
        _this.loadQueryState();
        _this._register(_this._state.onFindReplaceStateChange(function (e) { return _this._onStateChanged(e); }));
        _this._model = null;
        _this._register(_this._editor.onDidChangeModel(function () {
            var shouldRestartFind = (_this._editor.getModel() && _this._state.isRevealed);
            _this.disposeModel();
            _this._state.change({
                searchScope: null,
                matchCase: _this._storageService.getBoolean('editor.matchCase', StorageScope.WORKSPACE, false),
                wholeWord: _this._storageService.getBoolean('editor.wholeWord', StorageScope.WORKSPACE, false),
                isRegex: _this._storageService.getBoolean('editor.isRegex', StorageScope.WORKSPACE, false)
            }, false);
            if (shouldRestartFind) {
                _this._start({
                    forceRevealReplace: false,
                    seedSearchStringFromSelection: false && _this._editor.getConfiguration().contribInfo.find.seedSearchStringFromSelection,
                    seedSearchStringFromGlobalClipboard: false,
                    shouldFocus: 0 /* NoFocusChange */,
                    shouldAnimate: false,
                });
            }
        }));
        return _this;
    }
    CommonFindController.get = function (editor) {
        return editor.getContribution(CommonFindController.ID);
    };
    CommonFindController.prototype.dispose = function () {
        this.disposeModel();
        _super.prototype.dispose.call(this);
    };
    CommonFindController.prototype.disposeModel = function () {
        if (this._model) {
            this._model.dispose();
            this._model = null;
        }
    };
    CommonFindController.prototype.getId = function () {
        return CommonFindController.ID;
    };
    CommonFindController.prototype._onStateChanged = function (e) {
        this.saveQueryState(e);
        if (e.updateHistory && e.searchString) {
            this._delayedUpdateHistory();
        }
        if (e.isRevealed) {
            if (this._state.isRevealed) {
                this._findWidgetVisible.set(true);
            }
            else {
                this._findWidgetVisible.reset();
                this.disposeModel();
            }
        }
        if (e.searchString) {
            this.setGlobalBufferTerm(this._state.searchString);
        }
    };
    CommonFindController.prototype.saveQueryState = function (e) {
        if (e.isRegex) {
            this._storageService.store('editor.isRegex', this._state.actualIsRegex, StorageScope.WORKSPACE);
        }
        if (e.wholeWord) {
            this._storageService.store('editor.wholeWord', this._state.actualWholeWord, StorageScope.WORKSPACE);
        }
        if (e.matchCase) {
            this._storageService.store('editor.matchCase', this._state.actualMatchCase, StorageScope.WORKSPACE);
        }
    };
    CommonFindController.prototype.loadQueryState = function () {
        this._state.change({
            matchCase: this._storageService.getBoolean('editor.matchCase', StorageScope.WORKSPACE, this._state.matchCase),
            wholeWord: this._storageService.getBoolean('editor.wholeWord', StorageScope.WORKSPACE, this._state.wholeWord),
            isRegex: this._storageService.getBoolean('editor.isRegex', StorageScope.WORKSPACE, this._state.isRegex)
        }, false);
    };
    CommonFindController.prototype._delayedUpdateHistory = function () {
        this._updateHistoryDelayer.trigger(this._updateHistory.bind(this));
    };
    CommonFindController.prototype._updateHistory = function () {
        if (this._state.searchString) {
            this._currentHistoryNavigator.add(this._state.searchString);
        }
    };
    CommonFindController.prototype.getState = function () {
        return this._state;
    };
    CommonFindController.prototype.getHistory = function () {
        return this._currentHistoryNavigator;
    };
    CommonFindController.prototype.closeFindWidget = function () {
        this._state.change({
            isRevealed: false,
            searchScope: null
        }, false);
        this._editor.focus();
    };
    CommonFindController.prototype.toggleCaseSensitive = function () {
        this._state.change({ matchCase: !this._state.matchCase }, false);
    };
    CommonFindController.prototype.toggleWholeWords = function () {
        this._state.change({ wholeWord: !this._state.wholeWord }, false);
    };
    CommonFindController.prototype.toggleRegex = function () {
        this._state.change({ isRegex: !this._state.isRegex }, false);
    };
    CommonFindController.prototype.toggleSearchScope = function () {
        if (this._state.searchScope) {
            this._state.change({ searchScope: null }, true);
        }
        else {
            var selection = this._editor.getSelection();
            if (selection.endColumn === 1 && selection.endLineNumber > selection.startLineNumber) {
                selection = selection.setEndPosition(selection.endLineNumber - 1, 1);
            }
            if (!selection.isEmpty()) {
                this._state.change({ searchScope: selection }, true);
            }
        }
    };
    CommonFindController.prototype.setSearchString = function (searchString) {
        if (this._state.isRegex) {
            searchString = strings.escapeRegExpCharacters(searchString);
        }
        this._state.change({ searchString: searchString }, false);
    };
    CommonFindController.prototype.highlightFindOptions = function () {
        // overwritten in subclass
    };
    CommonFindController.prototype._start = function (opts) {
        this.disposeModel();
        if (!this._editor.getModel()) {
            // cannot do anything with an editor that doesn't have a model...
            return;
        }
        var stateChanges = {
            isRevealed: true
        };
        if (opts.seedSearchStringFromSelection) {
            var selectionSearchString = getSelectionSearchString(this._editor);
            if (selectionSearchString) {
                if (this._state.isRegex) {
                    stateChanges.searchString = strings.escapeRegExpCharacters(selectionSearchString);
                }
                else {
                    stateChanges.searchString = selectionSearchString;
                }
            }
        }
        if (!stateChanges.searchString && opts.seedSearchStringFromGlobalClipboard) {
            var selectionSearchString = this.getGlobalBufferTerm();
            if (selectionSearchString) {
                stateChanges.searchString = selectionSearchString;
            }
        }
        // Overwrite isReplaceRevealed
        if (opts.forceRevealReplace) {
            stateChanges.isReplaceRevealed = true;
        }
        else if (!this._findWidgetVisible.get()) {
            stateChanges.isReplaceRevealed = false;
        }
        this._state.change(stateChanges, false);
        if (!this._model) {
            this._model = new FindModelBoundToEditorModel(this._editor, this._state);
        }
    };
    CommonFindController.prototype.start = function (opts) {
        this._start(opts);
    };
    CommonFindController.prototype.moveToNextMatch = function () {
        if (this._model) {
            this._model.moveToNextMatch();
            return true;
        }
        return false;
    };
    CommonFindController.prototype.moveToPrevMatch = function () {
        if (this._model) {
            this._model.moveToPrevMatch();
            return true;
        }
        return false;
    };
    CommonFindController.prototype.replace = function () {
        if (this._model) {
            this._model.replace();
            return true;
        }
        return false;
    };
    CommonFindController.prototype.replaceAll = function () {
        if (this._model) {
            this._model.replaceAll();
            return true;
        }
        return false;
    };
    CommonFindController.prototype.selectAllMatches = function () {
        if (this._model) {
            this._model.selectAllMatches();
            this._editor.focus();
            return true;
        }
        return false;
    };
    CommonFindController.prototype.showPreviousFindTerm = function () {
        var previousTerm = this._currentHistoryNavigator.previous();
        if (previousTerm) {
            this._state.change({ searchString: previousTerm }, false, false);
        }
        return true;
    };
    CommonFindController.prototype.showNextFindTerm = function () {
        var nextTerm = this._currentHistoryNavigator.next();
        if (nextTerm) {
            this._state.change({ searchString: nextTerm }, false, false);
        }
        return true;
    };
    CommonFindController.prototype.getGlobalBufferTerm = function () {
        if (this._editor.getConfiguration().contribInfo.find.globalFindClipboard
            && this._clipboardService
            && !this._editor.getModel().isTooLargeForHavingARichMode()) {
            return this._clipboardService.readFindText();
        }
        return '';
    };
    CommonFindController.prototype.setGlobalBufferTerm = function (text) {
        if (this._editor.getConfiguration().contribInfo.find.globalFindClipboard
            && this._clipboardService
            && !this._editor.getModel().isTooLargeForHavingARichMode()) {
            this._clipboardService.writeFindText(text);
        }
    };
    CommonFindController.ID = 'editor.contrib.findController';
    CommonFindController = __decorate([
        __param(1, IContextKeyService),
        __param(2, IStorageService),
        __param(3, IClipboardService)
    ], CommonFindController);
    return CommonFindController;
}(Disposable));
export { CommonFindController };
var FindController = /** @class */ (function (_super) {
    __extends(FindController, _super);
    function FindController(editor, _contextViewService, _contextKeyService, _keybindingService, _themeService, storageService, clipboardService) {
        var _this = _super.call(this, editor, _contextKeyService, storageService, clipboardService) || this;
        _this._contextViewService = _contextViewService;
        _this._contextKeyService = _contextKeyService;
        _this._keybindingService = _keybindingService;
        _this._themeService = _themeService;
        return _this;
    }
    FindController.prototype._start = function (opts) {
        if (!this._widget) {
            this._createFindWidget();
        }
        _super.prototype._start.call(this, opts);
        if (opts.shouldFocus === 2 /* FocusReplaceInput */) {
            this._widget.focusReplaceInput();
        }
        else if (opts.shouldFocus === 1 /* FocusFindInput */) {
            this._widget.focusFindInput();
        }
    };
    FindController.prototype.highlightFindOptions = function () {
        if (!this._widget) {
            this._createFindWidget();
        }
        if (this._state.isRevealed) {
            this._widget.highlightFindOptions();
        }
        else {
            this._findOptionsWidget.highlightFindOptions();
        }
    };
    FindController.prototype._createFindWidget = function () {
        this._widget = this._register(new FindWidget(this._editor, this, this._state, this._contextViewService, this._keybindingService, this._contextKeyService, this._themeService));
        this._findOptionsWidget = this._register(new FindOptionsWidget(this._editor, this._state, this._keybindingService, this._themeService));
    };
    FindController = __decorate([
        __param(1, IContextViewService),
        __param(2, IContextKeyService),
        __param(3, IKeybindingService),
        __param(4, IThemeService),
        __param(5, IStorageService),
        __param(6, optional(IClipboardService))
    ], FindController);
    return FindController;
}(CommonFindController));
export { FindController };
var StartFindAction = /** @class */ (function (_super) {
    __extends(StartFindAction, _super);
    function StartFindAction() {
        return _super.call(this, {
            id: FIND_IDS.StartFindAction,
            label: nls.localize('startFindAction', "Find"),
            alias: 'Find',
            precondition: null,
            kbOpts: {
                kbExpr: null,
                primary: 2048 /* CtrlCmd */ | 36 /* KEY_F */
            }
        }) || this;
    }
    StartFindAction.prototype.run = function (accessor, editor) {
        var controller = CommonFindController.get(editor);
        if (controller) {
            controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: editor.getConfiguration().contribInfo.find.seedSearchStringFromSelection,
                seedSearchStringFromGlobalClipboard: editor.getConfiguration().contribInfo.find.globalFindClipboard,
                shouldFocus: 1 /* FocusFindInput */,
                shouldAnimate: true
            });
        }
    };
    return StartFindAction;
}(EditorAction));
export { StartFindAction };
var StartFindWithSelectionAction = /** @class */ (function (_super) {
    __extends(StartFindWithSelectionAction, _super);
    function StartFindWithSelectionAction() {
        return _super.call(this, {
            id: FIND_IDS.StartFindWithSelection,
            label: nls.localize('startFindAction', "Find"),
            alias: 'Find',
            precondition: null,
            kbOpts: {
                kbExpr: null,
                primary: null,
                mac: {
                    primary: 2048 /* CtrlCmd */ | 35 /* KEY_E */,
                }
            }
        }) || this;
    }
    StartFindWithSelectionAction.prototype.run = function (accessor, editor) {
        var controller = CommonFindController.get(editor);
        if (controller) {
            controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: true,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 1 /* FocusFindInput */,
                shouldAnimate: true
            });
            controller.setGlobalBufferTerm(controller.getState().searchString);
        }
    };
    return StartFindWithSelectionAction;
}(EditorAction));
export { StartFindWithSelectionAction };
var MatchFindAction = /** @class */ (function (_super) {
    __extends(MatchFindAction, _super);
    function MatchFindAction() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MatchFindAction.prototype.run = function (accessor, editor) {
        var controller = CommonFindController.get(editor);
        if (controller && !this._run(controller)) {
            controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: (controller.getState().searchString.length === 0) && editor.getConfiguration().contribInfo.find.seedSearchStringFromSelection,
                seedSearchStringFromGlobalClipboard: true,
                shouldFocus: 0 /* NoFocusChange */,
                shouldAnimate: true
            });
            this._run(controller);
        }
    };
    return MatchFindAction;
}(EditorAction));
export { MatchFindAction };
var NextMatchFindAction = /** @class */ (function (_super) {
    __extends(NextMatchFindAction, _super);
    function NextMatchFindAction() {
        return _super.call(this, {
            id: FIND_IDS.NextMatchFindAction,
            label: nls.localize('findNextMatchAction', "Find Next"),
            alias: 'Find Next',
            precondition: null,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 61 /* F3 */,
                mac: { primary: 2048 /* CtrlCmd */ | 37 /* KEY_G */, secondary: [61 /* F3 */] }
            }
        }) || this;
    }
    NextMatchFindAction.prototype._run = function (controller) {
        return controller.moveToNextMatch();
    };
    return NextMatchFindAction;
}(MatchFindAction));
export { NextMatchFindAction };
var PreviousMatchFindAction = /** @class */ (function (_super) {
    __extends(PreviousMatchFindAction, _super);
    function PreviousMatchFindAction() {
        return _super.call(this, {
            id: FIND_IDS.PreviousMatchFindAction,
            label: nls.localize('findPreviousMatchAction', "Find Previous"),
            alias: 'Find Previous',
            precondition: null,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 1024 /* Shift */ | 61 /* F3 */,
                mac: { primary: 2048 /* CtrlCmd */ | 1024 /* Shift */ | 37 /* KEY_G */, secondary: [1024 /* Shift */ | 61 /* F3 */] }
            }
        }) || this;
    }
    PreviousMatchFindAction.prototype._run = function (controller) {
        return controller.moveToPrevMatch();
    };
    return PreviousMatchFindAction;
}(MatchFindAction));
export { PreviousMatchFindAction };
var SelectionMatchFindAction = /** @class */ (function (_super) {
    __extends(SelectionMatchFindAction, _super);
    function SelectionMatchFindAction() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SelectionMatchFindAction.prototype.run = function (accessor, editor) {
        var controller = CommonFindController.get(editor);
        if (!controller) {
            return;
        }
        var selectionSearchString = getSelectionSearchString(editor);
        if (selectionSearchString) {
            controller.setSearchString(selectionSearchString);
        }
        if (!this._run(controller)) {
            controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: editor.getConfiguration().contribInfo.find.seedSearchStringFromSelection,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* NoFocusChange */,
                shouldAnimate: true
            });
            this._run(controller);
        }
    };
    return SelectionMatchFindAction;
}(EditorAction));
export { SelectionMatchFindAction };
var NextSelectionMatchFindAction = /** @class */ (function (_super) {
    __extends(NextSelectionMatchFindAction, _super);
    function NextSelectionMatchFindAction() {
        return _super.call(this, {
            id: FIND_IDS.NextSelectionMatchFindAction,
            label: nls.localize('nextSelectionMatchFindAction', "Find Next Selection"),
            alias: 'Find Next Selection',
            precondition: null,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* CtrlCmd */ | 61 /* F3 */
            }
        }) || this;
    }
    NextSelectionMatchFindAction.prototype._run = function (controller) {
        return controller.moveToNextMatch();
    };
    return NextSelectionMatchFindAction;
}(SelectionMatchFindAction));
export { NextSelectionMatchFindAction };
var PreviousSelectionMatchFindAction = /** @class */ (function (_super) {
    __extends(PreviousSelectionMatchFindAction, _super);
    function PreviousSelectionMatchFindAction() {
        return _super.call(this, {
            id: FIND_IDS.PreviousSelectionMatchFindAction,
            label: nls.localize('previousSelectionMatchFindAction', "Find Previous Selection"),
            alias: 'Find Previous Selection',
            precondition: null,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* CtrlCmd */ | 1024 /* Shift */ | 61 /* F3 */
            }
        }) || this;
    }
    PreviousSelectionMatchFindAction.prototype._run = function (controller) {
        return controller.moveToPrevMatch();
    };
    return PreviousSelectionMatchFindAction;
}(SelectionMatchFindAction));
export { PreviousSelectionMatchFindAction };
var StartFindReplaceAction = /** @class */ (function (_super) {
    __extends(StartFindReplaceAction, _super);
    function StartFindReplaceAction() {
        return _super.call(this, {
            id: FIND_IDS.StartFindReplaceAction,
            label: nls.localize('startReplace', "Replace"),
            alias: 'Replace',
            precondition: null,
            kbOpts: {
                kbExpr: null,
                primary: 2048 /* CtrlCmd */ | 38 /* KEY_H */,
                mac: { primary: 2048 /* CtrlCmd */ | 512 /* Alt */ | 36 /* KEY_F */ }
            }
        }) || this;
    }
    StartFindReplaceAction.prototype.run = function (accessor, editor) {
        if (editor.getConfiguration().readOnly) {
            return;
        }
        var controller = CommonFindController.get(editor);
        var currentSelection = editor.getSelection();
        // we only seed search string from selection when the current selection is single line and not empty.
        var seedSearchStringFromSelection = !currentSelection.isEmpty() &&
            currentSelection.startLineNumber === currentSelection.endLineNumber && editor.getConfiguration().contribInfo.find.seedSearchStringFromSelection;
        var oldSearchString = controller.getState().searchString;
        // if the existing search string in find widget is empty and we don't seed search string from selection, it means the Find Input
        // is still empty, so we should focus the Find Input instead of Replace Input.
        var shouldFocus = (!!oldSearchString || seedSearchStringFromSelection) ?
            2 /* FocusReplaceInput */ : 1 /* FocusFindInput */;
        if (controller) {
            controller.start({
                forceRevealReplace: true,
                seedSearchStringFromSelection: seedSearchStringFromSelection,
                seedSearchStringFromGlobalClipboard: editor.getConfiguration().contribInfo.find.seedSearchStringFromSelection,
                shouldFocus: shouldFocus,
                shouldAnimate: true
            });
        }
    };
    return StartFindReplaceAction;
}(EditorAction));
export { StartFindReplaceAction };
var ShowNextFindTermAction = /** @class */ (function (_super) {
    __extends(ShowNextFindTermAction, _super);
    function ShowNextFindTermAction() {
        return _super.call(this, {
            id: FIND_IDS.ShowNextFindTermAction,
            label: nls.localize('showNextFindTermAction', "Show Next Find Term"),
            alias: 'Show Next Find Term',
            precondition: CONTEXT_FIND_WIDGET_VISIBLE,
            kbOpts: {
                weight: KeybindingsRegistry.WEIGHT.editorContrib(5),
                kbExpr: ContextKeyExpr.and(CONTEXT_FIND_INPUT_FOCUSED, EditorContextKeys.focus),
                primary: ShowNextFindTermKeybinding.primary,
                mac: ShowNextFindTermKeybinding.mac,
                win: ShowNextFindTermKeybinding.win,
                linux: ShowNextFindTermKeybinding.linux
            }
        }) || this;
    }
    ShowNextFindTermAction.prototype._run = function (controller) {
        return controller.showNextFindTerm();
    };
    return ShowNextFindTermAction;
}(MatchFindAction));
export { ShowNextFindTermAction };
var ShowPreviousFindTermAction = /** @class */ (function (_super) {
    __extends(ShowPreviousFindTermAction, _super);
    function ShowPreviousFindTermAction() {
        return _super.call(this, {
            id: FIND_IDS.ShowPreviousFindTermAction,
            label: nls.localize('showPreviousFindTermAction', "Show Previous Find Term"),
            alias: 'Find Show Previous Find Term',
            precondition: CONTEXT_FIND_WIDGET_VISIBLE,
            kbOpts: {
                weight: KeybindingsRegistry.WEIGHT.editorContrib(5),
                kbExpr: ContextKeyExpr.and(CONTEXT_FIND_INPUT_FOCUSED, EditorContextKeys.focus),
                primary: ShowPreviousFindTermKeybinding.primary,
                mac: ShowPreviousFindTermKeybinding.mac,
                win: ShowPreviousFindTermKeybinding.win,
                linux: ShowPreviousFindTermKeybinding.linux
            }
        }) || this;
    }
    ShowPreviousFindTermAction.prototype._run = function (controller) {
        return controller.showPreviousFindTerm();
    };
    return ShowPreviousFindTermAction;
}(MatchFindAction));
export { ShowPreviousFindTermAction };
registerEditorContribution(FindController);
registerEditorAction(StartFindAction);
registerEditorAction(StartFindWithSelectionAction);
registerEditorAction(NextMatchFindAction);
registerEditorAction(PreviousMatchFindAction);
registerEditorAction(NextSelectionMatchFindAction);
registerEditorAction(PreviousSelectionMatchFindAction);
registerEditorAction(StartFindReplaceAction);
registerEditorAction(ShowNextFindTermAction);
registerEditorAction(ShowPreviousFindTermAction);
var FindCommand = EditorCommand.bindToContribution(CommonFindController.get);
registerEditorCommand(new FindCommand({
    id: FIND_IDS.CloseFindWidgetCommand,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: function (x) { return x.closeFindWidget(); },
    kbOpts: {
        weight: KeybindingsRegistry.WEIGHT.editorContrib(5),
        kbExpr: EditorContextKeys.focus,
        primary: 9 /* Escape */,
        secondary: [1024 /* Shift */ | 9 /* Escape */]
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleCaseSensitiveCommand,
    precondition: null,
    handler: function (x) { return x.toggleCaseSensitive(); },
    kbOpts: {
        weight: KeybindingsRegistry.WEIGHT.editorContrib(5),
        kbExpr: EditorContextKeys.focus,
        primary: ToggleCaseSensitiveKeybinding.primary,
        mac: ToggleCaseSensitiveKeybinding.mac,
        win: ToggleCaseSensitiveKeybinding.win,
        linux: ToggleCaseSensitiveKeybinding.linux
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleWholeWordCommand,
    precondition: null,
    handler: function (x) { return x.toggleWholeWords(); },
    kbOpts: {
        weight: KeybindingsRegistry.WEIGHT.editorContrib(5),
        kbExpr: EditorContextKeys.focus,
        primary: ToggleWholeWordKeybinding.primary,
        mac: ToggleWholeWordKeybinding.mac,
        win: ToggleWholeWordKeybinding.win,
        linux: ToggleWholeWordKeybinding.linux
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleRegexCommand,
    precondition: null,
    handler: function (x) { return x.toggleRegex(); },
    kbOpts: {
        weight: KeybindingsRegistry.WEIGHT.editorContrib(5),
        kbExpr: EditorContextKeys.focus,
        primary: ToggleRegexKeybinding.primary,
        mac: ToggleRegexKeybinding.mac,
        win: ToggleRegexKeybinding.win,
        linux: ToggleRegexKeybinding.linux
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleSearchScopeCommand,
    precondition: null,
    handler: function (x) { return x.toggleSearchScope(); },
    kbOpts: {
        weight: KeybindingsRegistry.WEIGHT.editorContrib(5),
        kbExpr: EditorContextKeys.focus,
        primary: ToggleSearchScopeKeybinding.primary,
        mac: ToggleSearchScopeKeybinding.mac,
        win: ToggleSearchScopeKeybinding.win,
        linux: ToggleSearchScopeKeybinding.linux
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ReplaceOneAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: function (x) { return x.replace(); },
    kbOpts: {
        weight: KeybindingsRegistry.WEIGHT.editorContrib(5),
        kbExpr: EditorContextKeys.focus,
        primary: 2048 /* CtrlCmd */ | 1024 /* Shift */ | 22 /* KEY_1 */
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ReplaceAllAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: function (x) { return x.replaceAll(); },
    kbOpts: {
        weight: KeybindingsRegistry.WEIGHT.editorContrib(5),
        kbExpr: EditorContextKeys.focus,
        primary: 2048 /* CtrlCmd */ | 512 /* Alt */ | 3 /* Enter */
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.SelectAllMatchesAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: function (x) { return x.selectAllMatches(); },
    kbOpts: {
        weight: KeybindingsRegistry.WEIGHT.editorContrib(5),
        kbExpr: EditorContextKeys.focus,
        primary: 512 /* Alt */ | 3 /* Enter */
    }
}));
