import * as vscode from 'vscode';

/**
 * Creates a new inline comment thread on the current editor selection.
 */
export function createReviewThread(commentController: vscode.CommentController): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showWarningMessage('Please select some code before starting a review.');
        return;
    }

    const thread = commentController.createCommentThread(editor.document.uri, selection, []);
    thread.canReply = true;
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    thread.label = 'Draft Comment';
}
