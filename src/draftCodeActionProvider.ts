import * as vscode from 'vscode';

export class DraftCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(_document: vscode.TextDocument, range: vscode.Range | vscode.Selection, _context: vscode.CodeActionContext, _token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        if (range.isEmpty) {
            return [];
        }

        const action = new vscode.CodeAction('Add Comment to Copilot', vscode.CodeActionKind.Refactor);
        action.command = {
            command: 'antigravity.createReviewThread',
            title: 'Add Comment to Copilot'
        };
        return [action];
    }
}
