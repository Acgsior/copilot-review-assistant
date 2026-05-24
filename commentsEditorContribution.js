"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveEditor = getActiveEditor;
const keyCodes_js_1 = require("../../../../base/common/keyCodes.js");
require("./media/review.css");
const editorBrowser_js_1 = require("../../../../editor/browser/editorBrowser.js");
const editorExtensions_js_1 = require("../../../../editor/browser/editorExtensions.js");
const codeEditorService_js_1 = require("../../../../editor/browser/services/codeEditorService.js");
const nls = require("../../../../nls.js");
const keybindingsRegistry_js_1 = require("../../../../platform/keybinding/common/keybindingsRegistry.js");
const commentService_js_1 = require("./commentService.js");
const simpleCommentEditor_js_1 = require("./simpleCommentEditor.js");
const editorService_js_1 = require("../../../services/editor/common/editorService.js");
const actions_js_1 = require("../../../../platform/actions/common/actions.js");
const editorContextKeys_js_1 = require("../../../../editor/common/editorContextKeys.js");
const commentsController_js_1 = require("./commentsController.js");
const range_js_1 = require("../../../../editor/common/core/range.js");
const notification_js_1 = require("../../../../platform/notification/common/notification.js");
const commentContextKeys_js_1 = require("../common/commentContextKeys.js");
const accessibility_js_1 = require("../../../../platform/accessibility/common/accessibility.js");
const contextkey_js_1 = require("../../../../platform/contextkey/common/contextkey.js");
const accessibilityConfiguration_js_1 = require("../../accessibility/browser/accessibilityConfiguration.js");
const commentCommandIds_js_1 = require("../common/commentCommandIds.js");
const contributions_js_1 = require("../../../common/contributions.js");
const commentsInputContentProvider_js_1 = require("./commentsInputContentProvider.js");
const accessibleView_js_1 = require("../../../../platform/accessibility/browser/accessibleView.js");
const commentThreadZoneWidget_js_1 = require("./commentThreadZoneWidget.js");
const keybinding_js_1 = require("../../../../platform/keybinding/common/keybinding.js");
const languages_js_1 = require("../../../../editor/common/languages.js");
(0, editorExtensions_js_1.registerEditorContribution)(commentsController_js_1.ID, commentsController_js_1.CommentController, editorExtensions_js_1.EditorContributionInstantiation.AfterFirstRender);
(0, contributions_js_1.registerWorkbenchContribution2)(commentsInputContentProvider_js_1.CommentsInputContentProvider.ID, commentsInputContentProvider_js_1.CommentsInputContentProvider, contributions_js_1.WorkbenchPhase.BlockRestore);
keybindingsRegistry_js_1.KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: commentCommandIds_js_1.CommentCommandId.NextThread,
    handler: async (accessor, args) => {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return Promise.resolve();
        }
        const controller = commentsController_js_1.CommentController.get(activeEditor);
        if (!controller) {
            return Promise.resolve();
        }
        controller.nextCommentThread(true);
    },
    weight: keybindingsRegistry_js_1.KeybindingWeight.EditorContrib,
    primary: keyCodes_js_1.KeyMod.Alt | keyCodes_js_1.KeyCode.F9,
});
keybindingsRegistry_js_1.KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: commentCommandIds_js_1.CommentCommandId.PreviousThread,
    handler: async (accessor, args) => {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return Promise.resolve();
        }
        const controller = commentsController_js_1.CommentController.get(activeEditor);
        if (!controller) {
            return Promise.resolve();
        }
        controller.previousCommentThread(true);
    },
    weight: keybindingsRegistry_js_1.KeybindingWeight.EditorContrib,
    primary: keyCodes_js_1.KeyMod.Shift | keyCodes_js_1.KeyMod.Alt | keyCodes_js_1.KeyCode.F9
});
(0, actions_js_1.registerAction2)(class extends actions_js_1.Action2 {
    constructor() {
        super({
            id: commentCommandIds_js_1.CommentCommandId.NextCommentedRange,
            title: {
                value: nls.localize('comments.NextCommentedRange', "Go to Next Commented Range"),
                original: 'Go to Next Commented Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: actions_js_1.MenuId.CommandPalette,
                    when: commentContextKeys_js_1.CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: keyCodes_js_1.KeyMod.Alt | keyCodes_js_1.KeyCode.F10,
                weight: keybindingsRegistry_js_1.KeybindingWeight.EditorContrib,
                when: commentContextKeys_js_1.CommentContextKeys.activeEditorHasCommentingRange
            }
        });
    }
    run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = commentsController_js_1.CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.nextCommentThread(false);
    }
});
(0, actions_js_1.registerAction2)(class extends actions_js_1.Action2 {
    constructor() {
        super({
            id: commentCommandIds_js_1.CommentCommandId.PreviousCommentedRange,
            title: {
                value: nls.localize('comments.previousCommentedRange', "Go to Previous Commented Range"),
                original: 'Go to Previous Commented Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: actions_js_1.MenuId.CommandPalette,
                    when: commentContextKeys_js_1.CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: keyCodes_js_1.KeyMod.Shift | keyCodes_js_1.KeyMod.Alt | keyCodes_js_1.KeyCode.F10,
                weight: keybindingsRegistry_js_1.KeybindingWeight.EditorContrib,
                when: commentContextKeys_js_1.CommentContextKeys.activeEditorHasCommentingRange
            }
        });
    }
    run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = commentsController_js_1.CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.previousCommentThread(false);
    }
});
(0, actions_js_1.registerAction2)(class extends actions_js_1.Action2 {
    constructor() {
        super({
            id: commentCommandIds_js_1.CommentCommandId.NextRange,
            title: {
                value: nls.localize('comments.nextCommentingRange', "Go to Next Commenting Range"),
                original: 'Go to Next Commenting Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: actions_js_1.MenuId.CommandPalette,
                    when: commentContextKeys_js_1.CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: (0, keyCodes_js_1.KeyChord)(keyCodes_js_1.KeyMod.CtrlCmd | keyCodes_js_1.KeyCode.KeyK, keyCodes_js_1.KeyMod.CtrlCmd | keyCodes_js_1.KeyMod.Alt | keyCodes_js_1.KeyCode.DownArrow),
                weight: keybindingsRegistry_js_1.KeybindingWeight.EditorContrib,
                when: contextkey_js_1.ContextKeyExpr.and(accessibility_js_1.CONTEXT_ACCESSIBILITY_MODE_ENABLED, contextkey_js_1.ContextKeyExpr.or(editorContextKeys_js_1.EditorContextKeys.focus, commentContextKeys_js_1.CommentContextKeys.commentFocused, contextkey_js_1.ContextKeyExpr.and(accessibilityConfiguration_js_1.accessibilityHelpIsShown, accessibilityConfiguration_js_1.accessibleViewCurrentProviderId.isEqualTo(accessibleView_js_1.AccessibleViewProviderId.Comments))))
            }
        });
    }
    run(accessor, args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = commentsController_js_1.CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.nextCommentingRange();
    }
});
(0, actions_js_1.registerAction2)(class extends actions_js_1.Action2 {
    constructor() {
        super({
            id: commentCommandIds_js_1.CommentCommandId.PreviousRange,
            title: {
                value: nls.localize('comments.previousCommentingRange', "Go to Previous Commenting Range"),
                original: 'Go to Previous Commenting Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: actions_js_1.MenuId.CommandPalette,
                    when: commentContextKeys_js_1.CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: (0, keyCodes_js_1.KeyChord)(keyCodes_js_1.KeyMod.CtrlCmd | keyCodes_js_1.KeyCode.KeyK, keyCodes_js_1.KeyMod.CtrlCmd | keyCodes_js_1.KeyMod.Alt | keyCodes_js_1.KeyCode.UpArrow),
                weight: keybindingsRegistry_js_1.KeybindingWeight.EditorContrib,
                when: contextkey_js_1.ContextKeyExpr.and(accessibility_js_1.CONTEXT_ACCESSIBILITY_MODE_ENABLED, contextkey_js_1.ContextKeyExpr.or(editorContextKeys_js_1.EditorContextKeys.focus, commentContextKeys_js_1.CommentContextKeys.commentFocused, contextkey_js_1.ContextKeyExpr.and(accessibilityConfiguration_js_1.accessibilityHelpIsShown, accessibilityConfiguration_js_1.accessibleViewCurrentProviderId.isEqualTo(accessibleView_js_1.AccessibleViewProviderId.Comments))))
            }
        });
    }
    async run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = commentsController_js_1.CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.previousCommentingRange();
    }
});
(0, actions_js_1.registerAction2)(class extends actions_js_1.Action2 {
    constructor() {
        super({
            id: commentCommandIds_js_1.CommentCommandId.ToggleCommenting,
            title: {
                value: nls.localize('comments.toggleCommenting', "Toggle Editor Commenting"),
                original: 'Toggle Editor Commenting'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: actions_js_1.MenuId.CommandPalette,
                    when: commentContextKeys_js_1.CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        const commentService = accessor.get(commentService_js_1.ICommentService);
        const enable = commentService.isCommentingEnabled;
        commentService.enableCommenting(!enable);
    }
});
(0, actions_js_1.registerAction2)(class extends actions_js_1.Action2 {
    constructor() {
        super({
            id: commentCommandIds_js_1.CommentCommandId.Add,
            title: {
                value: nls.localize('comments.addCommand', "Add Comment on Current Selection"),
                original: 'Add Comment on Current Selection'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: actions_js_1.MenuId.CommandPalette,
                    when: commentContextKeys_js_1.CommentContextKeys.activeCursorHasCommentingRange
                }],
            keybinding: {
                primary: (0, keyCodes_js_1.KeyChord)(keyCodes_js_1.KeyMod.CtrlCmd | keyCodes_js_1.KeyCode.KeyK, keyCodes_js_1.KeyMod.CtrlCmd | keyCodes_js_1.KeyMod.Alt | keyCodes_js_1.KeyCode.KeyC),
                weight: keybindingsRegistry_js_1.KeybindingWeight.EditorContrib,
                when: commentContextKeys_js_1.CommentContextKeys.activeCursorHasCommentingRange
            }
        });
    }
    async run(accessor, args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = commentsController_js_1.CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        const position = args?.range ? new range_js_1.Range(args.range.startLineNumber, args.range.startLineNumber, args.range.endLineNumber, args.range.endColumn)
            : (args?.fileComment ? undefined : activeEditor.getSelection());
        await controller.addOrToggleCommentAtLine(position, undefined);
    }
});
(0, actions_js_1.registerAction2)(class extends actions_js_1.Action2 {
    constructor() {
        super({
            id: commentCommandIds_js_1.CommentCommandId.FocusCommentOnCurrentLine,
            title: {
                value: nls.localize('comments.focusCommentOnCurrentLine', "Focus Comment on Current Line"),
                original: 'Focus Comment on Current Line'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            f1: true,
            precondition: commentContextKeys_js_1.CommentContextKeys.activeCursorHasComment,
        });
    }
    async run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = commentsController_js_1.CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        const position = activeEditor.getSelection();
        const notificationService = accessor.get(notification_js_1.INotificationService);
        let error = false;
        try {
            const commentAtLine = controller.getCommentsAtLine(position);
            if (commentAtLine.length === 0) {
                error = true;
            }
            else {
                await controller.revealCommentThread(commentAtLine[0].commentThread.threadId, undefined, false, commentThreadZoneWidget_js_1.CommentWidgetFocus.Widget);
            }
        }
        catch (e) {
            error = true;
        }
        if (error) {
            notificationService.error(nls.localize('comments.focusCommand.error', "The cursor must be on a line with a comment to focus the comment"));
        }
    }
});
function changeAllCollapseState(commentService, newState) {
    for (const resource of commentService.commentsModel.resourceCommentThreads) {
        for (const thread of resource.commentThreads) {
            thread.thread.collapsibleState = newState(thread.thread);
        }
    }
}
(0, actions_js_1.registerAction2)(class extends actions_js_1.Action2 {
    constructor() {
        super({
            id: commentCommandIds_js_1.CommentCommandId.CollapseAll,
            title: {
                value: nls.localize('comments.collapseAll', "Collapse All Comments"),
                original: 'Collapse All Comments'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: actions_js_1.MenuId.CommandPalette,
                    when: commentContextKeys_js_1.CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        const commentService = accessor.get(commentService_js_1.ICommentService);
        changeAllCollapseState(commentService, () => languages_js_1.CommentThreadCollapsibleState.Collapsed);
    }
});
(0, actions_js_1.registerAction2)(class extends actions_js_1.Action2 {
    constructor() {
        super({
            id: commentCommandIds_js_1.CommentCommandId.ExpandAll,
            title: {
                value: nls.localize('comments.expandAll', "Expand All Comments"),
                original: 'Expand All Comments'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: actions_js_1.MenuId.CommandPalette,
                    when: commentContextKeys_js_1.CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        const commentService = accessor.get(commentService_js_1.ICommentService);
        changeAllCollapseState(commentService, () => languages_js_1.CommentThreadCollapsibleState.Expanded);
    }
});
(0, actions_js_1.registerAction2)(class extends actions_js_1.Action2 {
    constructor() {
        super({
            id: commentCommandIds_js_1.CommentCommandId.ExpandUnresolved,
            title: {
                value: nls.localize('comments.expandUnresolved', "Expand Unresolved Comments"),
                original: 'Expand Unresolved Comments'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: actions_js_1.MenuId.CommandPalette,
                    when: commentContextKeys_js_1.CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        const commentService = accessor.get(commentService_js_1.ICommentService);
        changeAllCollapseState(commentService, (commentThread) => {
            return commentThread.state === languages_js_1.CommentThreadState.Unresolved ? languages_js_1.CommentThreadCollapsibleState.Expanded : languages_js_1.CommentThreadCollapsibleState.Collapsed;
        });
    }
});
keybindingsRegistry_js_1.KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: commentCommandIds_js_1.CommentCommandId.Submit,
    weight: keybindingsRegistry_js_1.KeybindingWeight.EditorContrib,
    primary: keyCodes_js_1.KeyMod.CtrlCmd | keyCodes_js_1.KeyCode.Enter,
    when: simpleCommentEditor_js_1.ctxCommentEditorFocused,
    handler: (accessor, args) => {
        const activeCodeEditor = accessor.get(codeEditorService_js_1.ICodeEditorService).getFocusedCodeEditor();
        if (activeCodeEditor instanceof simpleCommentEditor_js_1.SimpleCommentEditor) {
            activeCodeEditor.getParentThread().submitComment();
        }
    }
});
keybindingsRegistry_js_1.KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: commentCommandIds_js_1.CommentCommandId.Hide,
    weight: keybindingsRegistry_js_1.KeybindingWeight.EditorContrib,
    primary: keyCodes_js_1.KeyCode.Escape,
    secondary: [keyCodes_js_1.KeyMod.Shift | keyCodes_js_1.KeyCode.Escape],
    when: contextkey_js_1.ContextKeyExpr.or(simpleCommentEditor_js_1.ctxCommentEditorFocused, commentContextKeys_js_1.CommentContextKeys.commentFocused),
    handler: async (accessor, args) => {
        const activeCodeEditor = accessor.get(codeEditorService_js_1.ICodeEditorService).getFocusedCodeEditor();
        const keybindingService = accessor.get(keybinding_js_1.IKeybindingService);
        const notificationService = accessor.get(notification_js_1.INotificationService);
        const commentService = accessor.get(commentService_js_1.ICommentService);
        // Unfortunate, but collapsing the comment thread might cause a dialog to show
        // If we don't wait for the key up here, then the dialog will consume it and immediately close
        await keybindingService.enableKeybindingHoldMode(commentCommandIds_js_1.CommentCommandId.Hide);
        if (activeCodeEditor instanceof simpleCommentEditor_js_1.SimpleCommentEditor) {
            activeCodeEditor.getParentThread().collapse();
        }
        else if (activeCodeEditor) {
            const controller = commentsController_js_1.CommentController.get(activeCodeEditor);
            if (!controller) {
                return;
            }
            let error = false;
            try {
                const activeComment = commentService.lastActiveCommentcontroller?.activeComment;
                if (!activeComment) {
                    error = true;
                }
                else {
                    controller.collapseAndFocusRange(activeComment.thread.threadId);
                }
            }
            catch (e) {
                error = true;
            }
            if (error) {
                notificationService.error(nls.localize('comments.focusCommand.error', "The cursor must be on a line with a comment to focus the comment"));
            }
        }
    }
});
keybindingsRegistry_js_1.KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: commentCommandIds_js_1.CommentCommandId.Hide,
    weight: keybindingsRegistry_js_1.KeybindingWeight.EditorContrib,
    primary: keyCodes_js_1.KeyMod.CtrlCmd | keyCodes_js_1.KeyCode.Escape,
    win: { primary: keyCodes_js_1.KeyMod.Alt | keyCodes_js_1.KeyCode.Backspace },
    when: contextkey_js_1.ContextKeyExpr.and(editorContextKeys_js_1.EditorContextKeys.focus, commentContextKeys_js_1.CommentContextKeys.commentWidgetVisible),
    handler: async (accessor, args) => {
        const activeCodeEditor = accessor.get(codeEditorService_js_1.ICodeEditorService).getFocusedCodeEditor();
        const keybindingService = accessor.get(keybinding_js_1.IKeybindingService);
        // Unfortunate, but collapsing the comment thread might cause a dialog to show
        // If we don't wait for the key up here, then the dialog will consume it and immediately close
        await keybindingService.enableKeybindingHoldMode(commentCommandIds_js_1.CommentCommandId.Hide);
        if (activeCodeEditor) {
            const controller = commentsController_js_1.CommentController.get(activeCodeEditor);
            if (controller) {
                await controller.collapseVisibleComments();
            }
        }
    }
});
function getActiveEditor(accessor) {
    let activeTextEditorControl = accessor.get(editorService_js_1.IEditorService).activeTextEditorControl;
    if ((0, editorBrowser_js_1.isDiffEditor)(activeTextEditorControl)) {
        if (activeTextEditorControl.getOriginalEditor().hasTextFocus()) {
            activeTextEditorControl = activeTextEditorControl.getOriginalEditor();
        }
        else {
            activeTextEditorControl = activeTextEditorControl.getModifiedEditor();
        }
    }
    if (!(0, editorBrowser_js_1.isCodeEditor)(activeTextEditorControl) || !activeTextEditorControl.hasModel()) {
        return null;
    }
    return activeTextEditorControl;
}
//# sourceMappingURL=commentsEditorContribution.js.map