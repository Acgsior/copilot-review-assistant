import * as vscode from 'vscode';
import { PlanReviewComment } from '../models/planReviewComment';
import { DraftItem } from '../models/draftItem';
import { DraftStore } from '../state/draftStore';

/**
 * Adds the user's comment as a draft review, capturing the selected code context.
 * Truncates code snippets exceeding 500 lines to avoid Copilot prompt limits.
 */
export async function addDraft(reply: vscode.CommentReply, store: DraftStore): Promise<void> {
    const userSuggestion = reply.text;
    const thread = reply.thread;
    if (!thread) {
        return;
    }
    const range = thread.range;
    const uri = thread.uri;

    if (!range) {
        vscode.window.showErrorMessage('Unable to determine the code range for this review.');
        return;
    }

    try {
        const document = await vscode.workspace.openTextDocument(uri);
        let text = document.getText(range);

        const lines = text.split('\n');
        if (lines.length > 500) {
            text = lines.slice(0, 500).join('\n') + '\n\n... (code truncated due to length)';
        }

        const draftId = `draft-${Date.now()}`;

        const comment = new PlanReviewComment(
            userSuggestion,
            vscode.CommentMode.Preview,
            { name: 'Draft' },
            thread,
            'draft',
            draftId
        );

        thread.comments = [comment];
        thread.contextValue = 'draft';
        thread.label = `$(comment-discussion) Draft Comment`;
        thread.canReply = false;

        const draftItem: DraftItem = {
            id: draftId,
            text: userSuggestion,
            uri: uri,
            range: range,
            documentLanguage: document.languageId,
            documentText: text,
            thread: thread
        };

        store.addDraft(draftItem);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to add draft: ${error}`);
    }
}
