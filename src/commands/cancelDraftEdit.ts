import * as vscode from 'vscode';
import { PlanReviewComment } from '../models/planReviewComment';

/**
 * Cancels an in-progress edit on a draft comment.
 * Restores the comment body to its previously saved state and
 * switches it back to Preview mode.
 */
export function cancelDraftEdit(arg: unknown): void {
    let comment: PlanReviewComment | undefined;

    if (arg && typeof arg === 'object') {
        if ('mode' in arg && 'contextValue' in arg) {
            comment = arg as PlanReviewComment;
        } else if ('comments' in arg) {
            const thread = arg as vscode.CommentThread;
            if (thread.comments && thread.comments.length > 0) {
                comment = thread.comments[0] as PlanReviewComment;
            }
        }
    }

    if (comment) {
        // Restore to the previously saved body
        comment.body = comment.savedBody;
        comment.mode = vscode.CommentMode.Preview;
        comment.contextValue = 'draft';

        if (comment.parent) {
            comment.parent.label = 'Draft Comment';
            // Trigger UI refresh by reassigning comments array
            comment.parent.comments = [...comment.parent.comments];
        }
    }
}
