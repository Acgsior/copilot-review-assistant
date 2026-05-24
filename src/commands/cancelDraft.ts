import * as vscode from 'vscode';
import { PlanReviewComment } from '../models/planReviewComment';
import { DraftStore } from '../state/draftStore';

/**
 * Cancels/closes an inline comment thread.
 * If the thread contains draft comments, they are also removed from the store.
 */
export function cancelDraft(arg: unknown, store: DraftStore): void {
    let thread: vscode.CommentThread | undefined;

    if (arg && typeof arg === 'object') {
        if ('comments' in arg) {
            thread = arg as vscode.CommentThread;
        } else if ('parent' in arg) {
            thread = (arg as PlanReviewComment).parent;
        } else if ('thread' in arg) {
            thread = (arg as vscode.CommentReply).thread;
        }
    }

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

    try {
        thread.dispose();
    } catch {
        // Thread may already be disposed
    }
}
