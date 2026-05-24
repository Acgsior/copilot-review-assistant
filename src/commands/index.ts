import * as vscode from 'vscode';
import { DraftStore } from '../state/draftStore';
import { DraftsWebviewProvider } from '../providers/draftWebviewProvider';
import { PlanReviewComment } from '../models/planReviewComment';
import { createReviewThread } from './createThread';
import { addDraft } from './addDraft';
import { cancelDraft } from './cancelDraft';
import { cancelDraftEdit } from './cancelDraftEdit';
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

        vscode.commands.registerCommand('copilotReview.addDraft', (reply: vscode.CommentReply) => {
            addDraft(reply, store);
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

        vscode.commands.registerCommand('copilotReview.cancelDraftEdit', (arg: unknown) => {
            cancelDraftEdit(arg);
        }),

        vscode.commands.registerCommand('copilotReview.clearAllDrafts', async () => {
            const drafts = store.getAllDrafts();
            if (drafts.length === 0) {
                vscode.window.showInformationMessage('No drafts to delete.');
                return;
            }
            const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to delete all ${drafts.length} draft(s)?`,
                { modal: true },
                'Delete All'
            );
            if (answer === 'Delete All') {
                store.clearDrafts();
            }
        }),
    ];
}

