import * as vscode from 'vscode';

/**
 * Represents a draft review comment with its associated code context.
 * Contains both the user's comment text and the code snippet being reviewed.
 */
export interface DraftItem {
    id: string;
    text: string;
    uri: vscode.Uri;
    range: vscode.Range;
    documentLanguage: string;
    documentText: string;
    thread: vscode.CommentThread;
    sequence: number;
}

/**
 * JSON-serializable version of DraftItem for persistence via workspaceState.
 * Excludes the live CommentThread reference which must be rebuilt on restore.
 */
export interface SerializedDraftItem {
    id: string;
    text: string;
    uri: string;
    range: {
        startLine: number;
        startCharacter: number;
        endLine: number;
        endCharacter: number;
    };
    documentLanguage: string;
    documentText: string;
    sequence: number;
}
