import * as vscode from 'vscode';
import { DraftStore } from '../state/draftStore';
import { DraftsWebviewProvider } from '../providers/draftWebviewProvider';
import { PlanReviewComment } from '../models/planReviewComment';
import { createReviewThread } from './createThread';
import { addDraft } from './addDraft';
import { cancelDraft } from './cancelDraft';
import { deleteDraft } from './deleteDraft';
import { editDraft } from './editDraft';
import { saveDraftEdit } from './saveDraftEdit';
import { submitDrafts } from './submitDrafts';

/**
 * Registers all extension commands and returns them as disposables.
 */
export function registerCommands(
    commentController: vscode.CommentController,
    store: DraftStore,
    draftsProvider: DraftsWebviewProvider
): vscode.Disposable[] {
    return [
        vscode.commands.registerCommand('copilotReview.createReviewThread', () => {
            createReviewThread(commentController);
        }),

        vscode.commands.registerCommand('copilotReview.addDraft', (comment: PlanReviewComment) => {
            addDraft(comment, store);
        }),

        vscode.commands.registerCommand('copilotReview.cancelDraft', (arg: unknown) => {
            cancelDraft(arg, store);
        }),

        vscode.commands.registerCommand('copilotReview.submitDrafts', () => {
            submitDrafts(store);
        }),

        vscode.commands.registerCommand('copilotReview.deleteDraft', (arg: unknown) => {
            deleteDraft(arg, store);
        }),

        vscode.commands.registerCommand('copilotReview.editDraft', (arg: unknown) => {
            editDraft(arg);
        }),

        vscode.commands.registerCommand('copilotReview.saveDraftEdit', (comment: PlanReviewComment) => {
            saveDraftEdit(comment, store);
        }),

        vscode.commands.registerCommand('copilotReview.toggleViewGrouped', () => {
            draftsProvider.setViewMode('grouped');
        }),

        vscode.commands.registerCommand('copilotReview.toggleViewFlat', () => {
            draftsProvider.setViewMode('flat');
        }),
    ];
}

