import * as vscode from 'vscode';

/**
 * A comment representing a draft review in the editor's inline comment UI.
 * Implements the VS Code Comment interface for integration with the Comments API.
 */
export class PlanReviewComment implements vscode.Comment {
    private static _idCounter = 0;

    readonly id: number;
    label: string | undefined;
    savedBody: string | vscode.MarkdownString;

    constructor(
        public body: string | vscode.MarkdownString,
        public mode: vscode.CommentMode,
        public author: vscode.CommentAuthorInformation,
        public parent?: vscode.CommentThread,
        public contextValue?: string,
        public draftId?: string
    ) {
        this.id = ++PlanReviewComment._idCounter;
        this.savedBody = this.body;
    }
}
