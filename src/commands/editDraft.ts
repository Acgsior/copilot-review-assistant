import * as vscode from 'vscode';
import { PlanReviewComment } from '../models/planReviewComment';

/**
 * Switches a draft comment back into editing mode.
 */
export function editDraft(comment: PlanReviewComment): void {
    comment.mode = vscode.CommentMode.Editing;
    comment.contextValue = 'draftEditing';
    if (comment.parent) {
        // Trigger UI refresh by reassigning comments array
        comment.parent.comments = [...comment.parent.comments];
    }
}
