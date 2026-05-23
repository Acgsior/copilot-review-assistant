import * as vscode from 'vscode';
import * as path from 'path';

export class DraftItem extends vscode.TreeItem {
    constructor(
        public readonly id: string,
        public readonly text: string,
        public readonly uri: vscode.Uri,
        public readonly range: vscode.Range,
        public readonly documentLanguage: string,
        public readonly documentText: string,
        public readonly thread: vscode.CommentThread
    ) {
        const filePath = vscode.workspace.asRelativePath(uri);
        const line = range.start.line + 1;
        super(`${path.basename(filePath)}:${line}`, vscode.TreeItemCollapsibleState.None);

        this.description = text;
        this.tooltip = `Draft in ${filePath} on line ${line}\n\n${text}`;
        
        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [
                uri,
                {
                    selection: range
                }
            ]
        };
        
        this.contextValue = 'draftItem';
    }
}

export class DraftsTreeDataProvider implements vscode.TreeDataProvider<DraftItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DraftItem | undefined | null | void> = new vscode.EventEmitter<DraftItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DraftItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private drafts: DraftItem[] = [];

    refresh(): void {
        this._onDidChangeTreeData.fire();
        vscode.commands.executeCommand('setContext', 'antigravity.hasDrafts', this.drafts.length > 0);
    }

    getTreeItem(element: DraftItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DraftItem): Thenable<DraftItem[]> {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.drafts);
    }

    addDraft(draft: DraftItem): void {
        this.drafts.push(draft);
        this.refresh();
    }

    removeDraft(id: string): void {
        const draft = this.drafts.find(d => d.id === id);
        if (draft) {
            // Also remove the comment from the thread
            const comments = draft.thread.comments.filter(c => (c as any).draftId !== id);
            draft.thread.comments = comments;
            if (comments.length === 0) {
                draft.thread.dispose();
            }
        }

        this.drafts = this.drafts.filter(d => d.id !== id);
        this.refresh();
    }

    clearDrafts(): void {
        // Dispose all draft threads
        for (const draft of this.drafts) {
            draft.thread.dispose();
        }
        this.drafts = [];
        this.refresh();
    }

    getAllDrafts(): DraftItem[] {
        return this.drafts;
    }
}
