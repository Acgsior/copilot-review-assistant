import * as vscode from 'vscode';

/**
 * Provides a Code Action (lightbulb menu) for "Add Comment to Copilot"
 * when the user has selected code in the editor.
 */
export class DraftCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(
        _document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        _context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        if (range.isEmpty) {
            return [];
        }

        const action = new vscode.CodeAction('Add Comment to Copilot', vscode.CodeActionKind.Refactor);
        action.command = {
            command: 'copilotReview.createReviewThread',
            title: 'Add Comment to Copilot'
        };
        return [action];
    }
}
