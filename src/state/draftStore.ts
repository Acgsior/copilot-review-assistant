import * as vscode from 'vscode';
import { DraftItem, SerializedDraftItem } from '../models/draftItem';
import { PlanReviewComment } from '../models/planReviewComment';

const STORAGE_KEY_DRAFTS = 'copilotReview.drafts';

/**
 * Centralized state manager for draft review comments.
 * Handles CRUD operations, event emission, and workspaceState persistence.
 */
export class DraftStore implements vscode.Disposable {
    private drafts: DraftItem[] = [];

    private readonly _onDidChange = new vscode.EventEmitter<DraftItem[]>();
    readonly onDidChange = this._onDidChange.event;

    constructor(
        private readonly workspaceState: vscode.Memento,
        private readonly commentController: vscode.CommentController
    ) {}

    // ── CRUD operations ─────────────────────────────────────────────

    addDraft(draft: DraftItem): void {
        this.drafts.push(draft);
        this._fireChange();
    }

    /**
     * Remove a draft by ID and clean up its associated CommentThread.
     * If the thread has no remaining comments, it is disposed.
     */
    removeDraft(id: string): void {
        const draft = this.drafts.find(d => d.id === id);
        if (draft) {
            try {
                const comments = draft.thread.comments.filter(
                    c => (c as PlanReviewComment).draftId !== id
                );
                draft.thread.comments = comments;
                if (comments.length === 0) {
                    draft.thread.dispose();
                }
            } catch {
                // Thread may already be disposed
            }
        }
        this.drafts = this.drafts.filter(d => d.id !== id);
        this._fireChange();
    }

    /**
     * Remove a draft from the data store only, without touching the CommentThread.
     * Used when the thread is being disposed externally (e.g., by cancelDraft).
     */
    removeDraftData(id: string): void {
        this.drafts = this.drafts.filter(d => d.id !== id);
        this._fireChange();
    }

    updateDraftText(id: string, text: string): void {
        const draft = this.drafts.find(d => d.id === id);
        if (draft) {
            draft.text = text;
            this._fireChange();
        }
    }

    clearDrafts(): void {
        for (const draft of this.drafts) {
            try {
                draft.thread.dispose();
            } catch {
                // Thread may already be disposed
            }
        }
        this.drafts = [];
        this._fireChange();
    }

    getAllDrafts(): DraftItem[] {
        return [...this.drafts];
    }

    getDraft(id: string): DraftItem | undefined {
        return this.drafts.find(d => d.id === id);
    }

    get hasDrafts(): boolean {
        return this.drafts.length > 0;
    }

    // ── Persistence ─────────────────────────────────────────────────

    /**
     * Restore drafts from workspaceState.
     * Rebuilds CommentThread and PlanReviewComment objects for each saved draft.
     */
    async restore(): Promise<void> {
        const serialized = this.workspaceState.get<SerializedDraftItem[]>(STORAGE_KEY_DRAFTS, []);

        for (const item of serialized) {
            try {
                const uri = vscode.Uri.parse(item.uri);
                const range = new vscode.Range(
                    item.range.startLine,
                    item.range.startCharacter,
                    item.range.endLine,
                    item.range.endCharacter
                );

                // Recreate the comment thread in the editor
                const thread = this.commentController.createCommentThread(uri, range, []);
                thread.contextValue = 'draft';
                thread.canReply = false;
                thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
                thread.label = `$(comment-discussion) Draft Comment`;

                // Recreate the comment inside the thread
                const comment = new PlanReviewComment(
                    item.text,
                    vscode.CommentMode.Preview,
                    { name: '' },
                    thread,
                    'draft',
                    item.id
                );
                thread.comments = [comment];

                this.drafts.push({
                    id: item.id,
                    text: item.text,
                    uri,
                    range,
                    documentLanguage: item.documentLanguage,
                    documentText: item.documentText,
                    thread
                });
            } catch (error) {
                console.warn(`[CopilotReview] Failed to restore draft ${item.id}:`, error);
            }
        }

        this._updateContext();
        this._onDidChange.fire([...this.drafts]);
    }

    // ── Internal helpers ────────────────────────────────────────────

    private _fireChange(): void {
        this._updateContext();
        this._onDidChange.fire([...this.drafts]);
        this._persist();
    }

    private _updateContext(): void {
        vscode.commands.executeCommand('setContext', 'copilotReview.hasDrafts', this.hasDrafts);
    }

    private _persist(): void {
        const serialized: SerializedDraftItem[] = this.drafts.map(d => ({
            id: d.id,
            text: d.text,
            uri: d.uri.toString(),
            range: {
                startLine: (d.thread.range || d.range).start.line,
                startCharacter: (d.thread.range || d.range).start.character,
                endLine: (d.thread.range || d.range).end.line,
                endCharacter: (d.thread.range || d.range).end.character,
            },
            documentLanguage: d.documentLanguage,
            documentText: d.documentText
        }));
        this.workspaceState.update(STORAGE_KEY_DRAFTS, serialized);
    }

    dispose(): void {
        this._onDidChange.dispose();
    }
}
