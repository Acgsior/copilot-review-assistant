import * as vscode from 'vscode';
import { PlanReviewComment } from '../models/planReviewComment';

/**
 * Switches a draft comment back into editing mode.
 */
export function editDraft(arg: unknown): void {
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
        comment.mode = vscode.CommentMode.Editing;
        comment.contextValue = 'draftEditing';
        if (comment.parent) {
            // Trigger UI refresh by reassigning comments array
            comment.parent.comments = [...comment.parent.comments];
        }
    }
}
