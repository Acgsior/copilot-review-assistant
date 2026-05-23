"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraftsTreeDataProvider = exports.DraftItem = void 0;
const vscode = require("vscode");
const path = require("path");
class DraftItem extends vscode.TreeItem {
    id;
    text;
    uri;
    range;
    documentLanguage;
    documentText;
    thread;
    constructor(id, text, uri, range, documentLanguage, documentText, thread) {
        const filePath = vscode.workspace.asRelativePath(uri);
        const line = range.start.line + 1;
        super(`${path.basename(filePath)}:${line}`, vscode.TreeItemCollapsibleState.None);
        this.id = id;
        this.text = text;
        this.uri = uri;
        this.range = range;
        this.documentLanguage = documentLanguage;
        this.documentText = documentText;
        this.thread = thread;
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
exports.DraftItem = DraftItem;
class DraftsTreeDataProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    drafts = [];
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.drafts);
    }
    addDraft(draft) {
        this.drafts.push(draft);
        this.refresh();
    }
    removeDraft(id) {
        const draft = this.drafts.find(d => d.id === id);
        if (draft) {
            // Also remove the comment from the thread
            const comments = draft.thread.comments.filter(c => c.draftId !== id);
            draft.thread.comments = comments;
            if (comments.length === 0) {
                draft.thread.dispose();
            }
        }
        this.drafts = this.drafts.filter(d => d.id !== id);
        this.refresh();
    }
    clearDrafts() {
        // Dispose all draft threads
        for (const draft of this.drafts) {
            draft.thread.dispose();
        }
        this.drafts = [];
        this.refresh();
    }
    getAllDrafts() {
        return this.drafts;
    }
}
exports.DraftsTreeDataProvider = DraftsTreeDataProvider;
//# sourceMappingURL=draftProvider.js.map