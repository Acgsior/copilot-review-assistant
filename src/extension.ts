import * as vscode from 'vscode';
import { DraftStore } from './state/draftStore';
import { DraftsWebviewProvider } from './providers/draftWebviewProvider';
import { DraftCodeActionProvider } from './providers/draftCodeActionProvider';
import { registerCommands } from './commands';

/**
 * Extension entry point.
 * Initializes the DraftStore (with persistence), registers all providers and commands,
 * then restores any previously saved drafts.
 */
export function activate(context: vscode.ExtensionContext) {
    // ── Core infrastructure ─────────────────────────────────────────
    const commentController = vscode.comments.createCommentController(
        'copilot-review',
        'Copilot Review Assistant'
    );

    const store = new DraftStore(context.workspaceState, commentController);

    // ── Providers ───────────────────────────────────────────────────
    const draftsProvider = new DraftsWebviewProvider(context.extensionUri, store);

    context.subscriptions.push(
        commentController,
        store,
        vscode.window.registerWebviewViewProvider('copilotReview.draftsView', draftsProvider),
        vscode.languages.registerCodeActionsProvider('*', new DraftCodeActionProvider(), {
            providedCodeActionKinds: [vscode.CodeActionKind.Refactor]
        }),
    );

    // ── Commands ────────────────────────────────────────────────────
    const commands = registerCommands(commentController, store, draftsProvider);
    context.subscriptions.push(...commands);

    // ── Restore persisted drafts ────────────────────────────────────
    store.restore();
}

export function deactivate() {}
