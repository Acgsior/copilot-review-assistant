import * as vscode from 'vscode';
import { DraftStore } from '../state/draftStore';
import { PlanReviewComment } from '../models/planReviewComment';

type ViewMode = 'flat' | 'grouped';

/**
 * Provides the sidebar webview for displaying and managing draft review comments.
 * Supports two view modes:
 *   - flat: ordered by creation time (default)
 *   - grouped: grouped by file path, sorted by line number within each group
 */
export class DraftsWebviewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _viewMode: ViewMode = 'flat';

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _store: DraftStore
    ) {
        this._store.onDidChange(() => {
            try { this._updateBadge(); } catch { /* view may be disposed */ }
            try { this._updateWebview(); } catch { /* webview may be disposed */ }
        });
        this._updateViewModeContext();
    }

    /**
     * Switch between flat and grouped view modes.
     * Updates the VS Code context for conditional menu icon display.
     */
    public setViewMode(mode: ViewMode): void {
        this._viewMode = mode;
        this._updateViewModeContext();
        this._sendViewMode();
        this._updateWebview();
    }

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

        webviewView.webview.html = this._getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'deleteDraft':
                    vscode.commands.executeCommand('copilotReview.deleteDraft', data.id);
                    break;
                case 'openDraft':
                    this._openDraft(data.id);
                    break;
                case 'editDraft':
                    this._editDraft(data.id);
                    break;
                case 'deleteAllDrafts':
                    vscode.commands.executeCommand('copilotReview.clearAllDrafts');
                    break;
                case 'webviewLoaded':
                    this._sendViewMode();
                    this._updateWebview();
                    this._updateBadge();
                    break;
            }
        });

        // Clean up _view reference when the webview view is disposed
        // so we don't try to set badge on a disposed view
        webviewView.onDidDispose(() => {
            this._view = undefined;
        });

        // Re-sync badge and content when the view becomes visible again
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._updateWebview();
                this._updateBadge();
            }
        });

        this._sendViewMode();
        this._updateWebview();
        this._updateBadge();
    }

    // ── Private helpers ─────────────────────────────────────────────

    private _updateBadge(): void {
        if (!this._view) {
            return;
        }
        try {
            const count = this._store.getAllDrafts().length;
            this._view.badge = {
                value: count,
                tooltip: count > 0 ? `${count} Draft Comments` : ''
            };
        } catch {
            // View may have been disposed between the check and the assignment
        }

        // Deferred fallback: re-apply badge after a short delay to work around
        // potential VS Code rendering timing issues where immediate badge
        // updates may not take effect on the Activity Bar icon.
        const view = this._view;
        setTimeout(() => {
            if (!view) {
                return;
            }
            try {
                const count = this._store.getAllDrafts().length;
                view.badge = {
                    value: count,
                    tooltip: count > 0 ? `${count} Draft Comments` : ''
                };
            } catch {
                // View may have been disposed
            }
        }, 150);
    }

    private _updateViewModeContext(): void {
        vscode.commands.executeCommand('setContext', 'copilotReview.viewGrouped', this._viewMode === 'grouped');
    }

    private _sendViewMode(): void {
        if (this._view) {
            this._view.webview.postMessage({ type: 'setViewMode', mode: this._viewMode });
        }
    }

    private _openDraft(id: string): void {
        const draft = this._store.getDraft(id);
        if (draft) {
            vscode.window.showTextDocument(draft.uri, { selection: draft.thread.range || draft.range });
        }
    }

    private _editDraft(id: string): void {
        const draft = this._store.getDraft(id);
        if (draft) {
            vscode.window.showTextDocument(draft.uri, { selection: draft.thread.range || draft.range }).then(() => {
                const comment = draft.thread.comments.find(
                    (c: vscode.Comment) => (c as PlanReviewComment).draftId === id
                );
                if (comment) {
                    vscode.commands.executeCommand('copilotReview.editDraft', comment);
                }
            });
        }
    }

    private _updateWebview(): void {
        if (!this._view) {
            return;
        }
        const drafts = this._store.getAllDrafts();
        this._view.webview.postMessage({
            type: 'updateDrafts',
            drafts: drafts.map(d => {
                let line = d.range.start.line + 1;
                let endLine = d.range.end.line + 1;
                try {
                    const threadRange = d.thread.range;
                    if (threadRange) {
                        line = threadRange.start.line + 1;
                        endLine = threadRange.end.line + 1;
                    }
                } catch {
                    // Thread may be disposed, fall back to stored range
                }

                // Extract first 3 lines of code as preview summary
                let codePreview = '';
                if (d.documentText) {
                    const previewLines = d.documentText.split('\n').slice(0, 3);
                    codePreview = previewLines.join('\n');
                    if (d.documentText.split('\n').length > 3) {
                        codePreview += '\n…';
                    }
                }

                return {
                    id: d.id,
                    text: d.text,
                    filePath: vscode.workspace.asRelativePath(d.uri),
                    line,
                    endLine,
                    codePreview
                };
            })
        });
    }

    // ── Webview HTML ────────────────────────────────────────────────

    private _getHtmlForWebview(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Drafts</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family);
            padding: 6px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background, var(--vscode-editor-background));
        }

        /* ── Draft card ─────────────────────── */
        .draft-card {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.12));
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 6px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            border-left: 3px solid var(--vscode-textLink-foreground);
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
            opacity: 0;
            animation: cardSlideIn 0.3s ease-out forwards;
        }
        .draft-card:hover {
            background: var(--vscode-list-hoverBackground);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .draft-card:active {
            transform: translateY(0);
        }

        .draft-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        .draft-file {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            word-break: break-all;
            font-size: 11.5px;
        }
        .draft-line-number {
            color: var(--vscode-textPreformat-foreground);
            font-weight: normal;
            font-size: 10.5px;
        }
        .draft-text {
            font-size: 12px;
            line-height: 1.45;
            word-wrap: break-word;
            white-space: pre-wrap;
            color: var(--vscode-foreground);
        }
        .draft-text:empty {
            display: none;
        }

        /* ── Code preview summary ───────────── */
        .draft-code-preview {
            font-family: var(--vscode-editor-font-family);
            font-size: 10.5px;
            line-height: 1.4;
            color: var(--vscode-descriptionForeground);
            background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.04));
            border-radius: 3px;
            padding: 4px 6px;
            overflow: hidden;
            white-space: pre;
            text-overflow: ellipsis;
            max-height: 52px;
            opacity: 0.8;
            transition: opacity 0.15s;
            margin-top: 2px;
        }
        .draft-card:hover .draft-code-preview {
            opacity: 1;
        }

        /* ── Action buttons ──────────────────── */
        .draft-actions {
            display: flex;
            gap: 2px;
            opacity: 0;
            transition: opacity 0.15s ease;
        }
        .draft-card:hover .draft-actions {
            opacity: 1;
        }
        .icon-btn {
            background: transparent;
            border: none;
            color: var(--vscode-icon-foreground);
            cursor: pointer;
            padding: 3px;
            opacity: 0.7;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.15s ease;
        }
        .icon-btn:hover {
            opacity: 1;
            background: var(--vscode-toolbar-hoverBackground);
        }

        /* ── Empty state ─────────────────────── */
        .empty-state {
            text-align: center;
            padding: 36px 20px;
            color: var(--vscode-descriptionForeground);
            animation: fadeIn 0.4s ease-out forwards;
        }
        .empty-state-icon {
            font-size: 32px;
            margin-bottom: 8px;
            opacity: 0.35;
        }
        .empty-state-text {
            font-size: 12px;
            line-height: 1.6;
        }
        .empty-state-hint {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            opacity: 0.7;
            margin-top: 6px;
        }

        /* ── Grouped view styles ─────────────── */
        .file-group {
            margin-bottom: 4px;
        }
        .file-group-header {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 5px 8px;
            cursor: pointer;
            user-select: none;
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-foreground);
            border-radius: 4px;
            transition: background-color 0.15s;
        }
        .file-group-header:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .file-group-chevron {
            font-size: 7px;
            transition: transform 0.2s ease;
            display: inline-block;
            margin-top: 1px;
        }
        .file-group.collapsed .file-group-chevron {
            transform: rotate(0deg);
        }
        .file-group:not(.collapsed) .file-group-chevron {
            transform: rotate(90deg);
        }
        .file-group-name {
            flex: 1;
            word-break: break-all;
            color: var(--vscode-textLink-foreground);
        }
        .file-group-badge {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            font-size: 10px;
            font-weight: 600;
            padding: 1px 6px;
            border-radius: 10px;
            min-width: 16px;
            text-align: center;
        }
        .file-group-items {
            padding-left: 10px;
            margin-top: 4px;
            border-left: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.1));
            margin-left: 8px;
        }
        .file-group.collapsed .file-group-items {
            display: none;
        }
        .file-group .draft-file {
            color: var(--vscode-descriptionForeground);
        }
        .file-group + .file-group {
            margin-top: 2px;
        }

        /* ── Animations ──────────────────────── */
        @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        @keyframes cardSlideIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div id="drafts-container">
        <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <div class="empty-state-text">No drafts yet</div>
            <div class="empty-state-hint">Select code and right-click → "Add Comment to Copilot"</div>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const container = document.getElementById('drafts-container');
        let currentViewMode = 'flat';
        let currentDrafts = [];

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updateDrafts':
                    currentDrafts = message.drafts;
                    render();
                    break;
                case 'setViewMode':
                    currentViewMode = message.mode;
                    render();
                    break;
            }
        });

        vscode.postMessage({ type: 'webviewLoaded' });

        function render() {
            if (currentDrafts.length === 0) {
                container.innerHTML = '<div class="empty-state">' +
                    '<div class="empty-state-icon">💬</div>' +
                    '<div class="empty-state-text">No drafts yet</div>' +
                    '<div class="empty-state-hint">Select code and right-click → \"Add Comment to Copilot\"</div>' +
                    '</div>';
                return;
            }
            container.innerHTML = '';
            if (currentViewMode === 'grouped') {
                renderGrouped(currentDrafts);
            } else {
                renderFlat(currentDrafts);
            }
        }

        // ── Flat view (default) ─────────────────────────────────────

        function renderFlat(drafts) {
            drafts.forEach((draft, idx) => {
                const lineInfo = draft.line === draft.endLine ? 'Line ' + draft.line : 'Lines ' + draft.line + '-' + draft.endLine;
                const label = escapeHtml(draft.filePath) + ' <span class="draft-line-number">(' + lineInfo + ')</span>';
                const card = createDraftCard(draft, label);
                card.style.animationDelay = (idx * 0.04) + 's';
                container.appendChild(card);
            });
        }

        // ── Grouped view (by file) ──────────────────────────────────

        function renderGrouped(drafts) {
            const groups = {};
            const groupOrder = [];
            drafts.forEach(draft => {
                if (!groups[draft.filePath]) {
                    groups[draft.filePath] = [];
                    groupOrder.push(draft.filePath);
                }
                groups[draft.filePath].push(draft);
            });

            let cardIdx = 0;
            groupOrder.forEach(filePath => {
                const items = groups[filePath].sort((a, b) => a.line - b.line);
                const group = document.createElement('div');
                group.className = 'file-group';

                const header = document.createElement('div');
                header.className = 'file-group-header';
                header.innerHTML =
                    '<span class="file-group-chevron">&#9654;</span>' +
                    '<span class="file-group-name">' + escapeHtml(filePath) + '</span>' +
                    '<span class="file-group-badge">' + items.length + '</span>';
                header.onclick = () => group.classList.toggle('collapsed');

                const itemsContainer = document.createElement('div');
                itemsContainer.className = 'file-group-items';
                items.forEach(draft => {
                    const lineInfo = draft.line === draft.endLine ? 'Line ' + draft.line : 'Lines ' + draft.line + '-' + draft.endLine;
                    const label = '<span class="draft-line-number">' + lineInfo + '</span>';
                    const card = createDraftCard(draft, label);
                    card.style.animationDelay = (cardIdx * 0.04) + 's';
                    cardIdx++;
                    itemsContainer.appendChild(card);
                });

                group.appendChild(header);
                group.appendChild(itemsContainer);
                container.appendChild(group);
            });
        }

        // ── Shared card builder ─────────────────────────────────────

        function createDraftCard(draft, headerLabel) {
            const card = document.createElement('div');
            card.className = 'draft-card';
            card.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                    vscode.postMessage({ type: 'openDraft', id: draft.id });
                }
            };

            const header = document.createElement('div');
            header.className = 'draft-header';

            const fileInfo = document.createElement('span');
            fileInfo.className = 'draft-file';
            fileInfo.innerHTML = headerLabel;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'draft-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'icon-btn';
            editBtn.title = 'Edit Draft';
            editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM2.41 13.59l1.51-3 1.48 1.48-2.99 1.52zm1.88-3.7l7.57-7.57 1.84 1.84-7.57 7.57-1.84-1.84zM14 3.47l-1.45-1.45.71-.71L14.71 2.76 14 3.47z"/></svg>';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                vscode.postMessage({ type: 'editDraft', id: draft.id });
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'icon-btn';
            deleteBtn.title = 'Delete Draft';
            deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 3h3v1h-1v9l-1 1H5l-1-1V4H3V3h3V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1zM9 2H7v1h2V2zM5 4v9h6V4H5zm1 2h1v5H6V6zm3 0h1v5H9V6z"/></svg>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                vscode.postMessage({ type: 'deleteDraft', id: draft.id });
            };

            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            header.appendChild(fileInfo);
            header.appendChild(actionsDiv);

            card.appendChild(header);

            // Comment text
            if (draft.text && draft.text.trim()) {
                const text = document.createElement('div');
                text.className = 'draft-text';
                text.textContent = draft.text;
                card.appendChild(text);
            }

            // Code preview summary (first 3 lines)
            if (draft.codePreview) {
                const codeEl = document.createElement('div');
                codeEl.className = 'draft-code-preview';
                codeEl.textContent = draft.codePreview;
                card.appendChild(codeEl);
            }

            return card;
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    </script>
</body>
</html>`;
    }
}
