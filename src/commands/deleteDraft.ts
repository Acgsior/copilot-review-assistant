import * as vscode from 'vscode';
import { PlanReviewComment } from '../models/planReviewComment';
import { DraftStore } from '../state/draftStore';

/**
 * Deletes a draft by ID, cleaning up its associated comment thread.
 * Accepts a raw string ID, a CommentThread, a PlanReviewComment,
 * or any object with a draftId/id property (e.g. from the webview).
 */
export function deleteDraft(arg: unknown, store: DraftStore): void {
    let id: string | undefined;

    if (typeof arg === 'string') {
        id = arg;
    } else if (arg && typeof arg === 'object') {
        if ('comments' in arg) {
            // CommentThread – extract draftId from the first comment
            const thread = arg as vscode.CommentThread;
            if (thread.comments && thread.comments.length > 0) {
                id = (thread.comments[0] as PlanReviewComment).draftId;
            }
        } else if ('draftId' in arg) {
            // PlanReviewComment
            id = (arg as PlanReviewComment).draftId;
        } else {
            const obj = arg as Record<string, unknown>;
            id = (obj.id) as string | undefined;
        }
    }

    if (id) {
        store.removeDraft(id);
    }
}
