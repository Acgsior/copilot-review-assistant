import * as vscode from 'vscode';
import { PlanReviewComment } from '../models/planReviewComment';
import { DraftStore } from '../state/draftStore';

/**
 * Cancels/closes an inline comment thread.
 * If the thread contains draft comments, they are also removed from the store.
 */
export function cancelDraft(arg: vscode.CommentReply | vscode.CommentThread, store: DraftStore): void {
    const thread = (arg as vscode.CommentReply).thread || arg as vscode.CommentThread;
    if (!thread) {
        return;
    }

    // Clean up any drafts associated with this thread before disposing
    for (const comment of thread.comments) {
        const draftId = (comment as PlanReviewComment).draftId;
        if (draftId) {
            store.removeDraftData(draftId);
        }
    }

    thread.dispose();
}
