import * as vscode from 'vscode';

export interface DraftItem {
    id: string;
    text: string;
    uri: vscode.Uri;
    range: vscode.Range;
    documentLanguage: string;
    documentText: string;
    thread: vscode.CommentThread;
}

export class DraftsWebviewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private drafts: DraftItem[] = [];

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'deleteDraft':
                    vscode.commands.executeCommand('copilotReview.deleteDraft', data.id);
                    break;
                case 'openDraft':
                    const draft = this.drafts.find(d => d.id === data.id);
                    if (draft) {
                        vscode.window.showTextDocument(draft.uri, {
                            selection: draft.range
                        });
                    }
                    break;
            }
        });
        
        // Initial render
        this.updateWebview();
    }

    public addDraft(draft: DraftItem) {
        this.drafts.push(draft);
        this.updateWebview();
    }

    public removeDraft(id: string) {
        const draft = this.drafts.find(d => d.id === id);
        if (draft) {
            const comments = draft.thread.comments.filter(c => (c as any).draftId !== id);
            draft.thread.comments = comments;
            if (comments.length === 0) {
                draft.thread.dispose();
            }
        }

        this.drafts = this.drafts.filter(d => d.id !== id);
        this.updateWebview();
    }

    public clearDrafts() {
        for (const draft of this.drafts) {
            draft.thread.dispose();
        }
        this.drafts = [];
        this.updateWebview();
    }

    public getAllDrafts() {
        return this.drafts;
    }

    private updateWebview() {
        vscode.commands.executeCommand('setContext', 'copilotReview.hasDrafts', this.drafts.length > 0);
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateDrafts', drafts: this.drafts.map(d => ({
                id: d.id,
                text: d.text,
                filePath: vscode.workspace.asRelativePath(d.uri),
                line: d.range.start.line + 1
            })) });
        }
    }

    private _getHtmlForWebview(_webview: vscode.Webview) {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Drafts</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 10px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    .draft-card {
                        background-color: var(--vscode-editorWidget-background);
                        border: 1px solid var(--vscode-widget-border, transparent);
                        border-radius: 4px;
                        padding: 10px;
                        margin-bottom: 10px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    }
                    .draft-card:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    .draft-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                    }
                    .draft-file {
                        font-weight: 600;
                        color: var(--vscode-textLink-foreground);
                        word-break: break-all;
                    }
                    .draft-text {
                        font-size: 13px;
                        line-height: 1.5;
                        word-wrap: break-word;
                        white-space: pre-wrap;
                        color: var(--vscode-foreground);
                    }
                    .delete-btn {
                        background: none;
                        border: none;
                        color: var(--vscode-errorForeground);
                        cursor: pointer;
                        padding: 4px;
                        opacity: 0.7;
                    }
                    .delete-btn:hover {
                        opacity: 1;
                        background-color: var(--vscode-toolbar-hoverBackground);
                        border-radius: 3px;
                    }
                    .empty-state {
                        text-align: center;
                        padding: 20px;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                    }
                </style>
            </head>
            <body>
                <div id="drafts-container">
                    <div class="empty-state">No drafts yet. Select code to add a review comment.</div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const container = document.getElementById('drafts-container');

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'updateDrafts':
                                renderDrafts(message.drafts);
                                break;
                        }
                    });

                    function renderDrafts(drafts) {
                        if (drafts.length === 0) {
                            container.innerHTML = '<div class="empty-state">No drafts yet. Select code to add a review comment.</div>';
                            return;
                        }

                        container.innerHTML = '';
                        drafts.forEach(draft => {
                            const card = document.createElement('div');
                            card.className = 'draft-card';
                            card.onclick = (e) => {
                                if(e.target.tagName !== 'BUTTON') {
                                    vscode.postMessage({ type: 'openDraft', id: draft.id });
                                }
                            };

                            const header = document.createElement('div');
                            header.className = 'draft-header';
                            
                            const fileInfo = document.createElement('span');
                            fileInfo.className = 'draft-file';
                            fileInfo.textContent = draft.filePath + ':' + draft.line;

                            const deleteBtn = document.createElement('button');
                            deleteBtn.className = 'delete-btn';
                            deleteBtn.innerHTML = '🗑️';
                            deleteBtn.onclick = (e) => {
                                e.stopPropagation();
                                vscode.postMessage({ type: 'deleteDraft', id: draft.id });
                            };

                            header.appendChild(fileInfo);
                            header.appendChild(deleteBtn);

                            const text = document.createElement('div');
                            text.className = 'draft-text';
                            text.textContent = draft.text;

                            card.appendChild(header);
                            card.appendChild(text);
                            container.appendChild(card);
                        });
                    }
                </script>
            </body>
            </html>`;
    }
}
