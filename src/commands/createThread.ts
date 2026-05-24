import * as vscode from 'vscode';

/**
 * Creates a new inline comment thread on the current editor selection.
 * Ensures the editor is focused and the thread is expanded so the input
 * box is visible and ready for interaction.
 */
export async function createReviewThread(commentController: vscode.CommentController): Promise<void> {
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

    // Ensure the editor is focused before creating the thread.
    // Wrapped in try-catch because showTextDocument can be cancelled (e.g. rapid keypress).
    try {
        await vscode.window.showTextDocument(editor.document, {
            selection: selection,
            viewColumn: editor.viewColumn,
            preserveFocus: false
        });
    } catch {
        // Ignore cancellation – proceed to create the thread anyway
    }

    const thread = commentController.createCommentThread(editor.document.uri, selection, []);
    thread.canReply = true;
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    thread.contextValue = 'creating';
    thread.label = 'Draft Comment';
}
