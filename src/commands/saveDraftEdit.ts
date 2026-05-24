import * as vscode from 'vscode';
import { PlanReviewComment } from '../models/planReviewComment';
import { DraftStore } from '../state/draftStore';

/**
 * Saves an edited draft comment back to preview mode.
 * Reads the updated text from comment.body (set by VS Code Comments API)
 * and syncs it to the DraftStore.
 */
export function saveDraftEdit(comment: PlanReviewComment, store: DraftStore): void {
    if (!comment.parent) {
        return;
    }

    // VS Code updates comment.body with the edited text before invoking this command
    const newText = typeof comment.body === 'string'
        ? comment.body
        : comment.body.value;

    comment.savedBody = comment.body;
    comment.mode = vscode.CommentMode.Preview;
    comment.contextValue = 'draft';

    // Sync updated text to the store (and persist)
    if (comment.draftId) {
        store.updateDraftText(comment.draftId, newText);
    }

    // Trigger UI refresh
    comment.parent.comments = [...comment.parent.comments];
}
