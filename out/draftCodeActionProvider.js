"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraftCodeActionProvider = void 0;
const vscode = require("vscode");
class DraftCodeActionProvider {
    provideCodeActions(_document, range, _context, _token) {
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
exports.DraftCodeActionProvider = DraftCodeActionProvider;
//# sourceMappingURL=draftCodeActionProvider.js.map