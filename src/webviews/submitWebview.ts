import * as vscode from 'vscode';
import { DraftItem } from '../models/draftItem';

/**
 * Generates the HTML content for the Submit Plan Review webview panel.
 * Each draft card includes a collapsible code preview (capped by codePreviewMaxLines config).
 * Uses VS Code native CSS variables for consistent theming.
 */
export async function getSubmitWebviewContent(drafts: DraftItem[]): Promise<string> {
    const config = vscode.workspace.getConfiguration('copilotReview');
    const maxPreviewLines = config.get<number>('codePreviewMaxLines', 20);

    const draftsHtml = await getDraftsHtml(drafts, maxPreviewLines);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submit Draft Comments</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 30px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
            max-width: 800px;
            margin: 0 auto;
        }
        h2 {
            margin-top: 0;
            font-weight: 500;
            color: var(--vscode-foreground);
        }
        p {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 16px;
        }
        textarea {
            width: 100%;
            height: 120px;
            margin-bottom: 16px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, transparent));
            border-radius: 2px;
            padding: 8px 10px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size, 13px);
            resize: vertical;
            box-sizing: border-box;
            outline: none;
        }
        textarea:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
            border-color: transparent;
        }
        h3 {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
            margin-bottom: 8px;
        }
        .drafts-container {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 16px;
            border-radius: 2px;
            border: 1px solid var(--vscode-widget-border, transparent);
            padding: 8px;
            background: var(--vscode-editorWidget-background);
        }
        .draft-card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border, transparent);
            border-radius: 2px;
            padding: 10px;
            margin-bottom: 8px;
        }
        .draft-card:last-child {
            margin-bottom: 0;
        }
        .draft-header {
            font-size: 12px;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 6px;
            font-weight: 600;
        }
        .draft-body {
            font-size: 13px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: var(--vscode-foreground);
        }
        /* Code preview */
        .code-preview {
            margin-top: 8px;
            border: 1px solid var(--vscode-widget-border, transparent);
            border-radius: 2px;
            overflow: hidden;
        }
        .code-preview[open] .chevron-icon {
            transform: rotate(90deg);
        }
        .code-preview-toggle {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 8px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            background: var(--vscode-editorWidget-background);
            user-select: none;
            list-style: none;
        }
        .code-preview-toggle::-webkit-details-marker {
            display: none;
        }
        .chevron-icon {
            font-size: 8px;
            transition: transform 0.15s ease;
            display: inline-block;
        }
        .code-block {
            margin: 0;
            padding: 8px 10px;
            background: var(--vscode-textCodeBlock-background, var(--vscode-editor-background));
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.5;
            overflow-x: auto;
            border-top: 1px solid var(--vscode-widget-border, transparent);
        }
        .code-block code {
            white-space: pre;
            color: var(--vscode-editor-foreground);
        }
        /* Buttons */
        .button-group {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }
        button {
            padding: 6px 14px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 13px;
            font-family: var(--vscode-font-family);
            transition: opacity 0.15s;
        }
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <h2>Submit Draft Comments</h2>
    <p>Add your instructions or questions below. This summary will be sent to Copilot Chat along with all the selected code snippets.</p>
    <textarea id="summaryText" placeholder="Write your summary here..." autofocus></textarea>
    
    <div class="button-group">
        <button id="submitBtn" class="btn-primary">Submit to Copilot Chat</button>
        <button id="cancelBtn" class="btn-secondary">Cancel</button>
    </div>

    <h3>Draft Comments to Submit</h3>
    <div class="drafts-container" id="draftsContainer">
        ${draftsHtml}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        document.getElementById('submitBtn').addEventListener('click', () => {
            const text = document.getElementById('summaryText').value;
            vscode.postMessage({ command: 'submit', text: text });
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
        });

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'updateDraftsHtml') {
                document.getElementById('draftsContainer').innerHTML = message.html;
            }
        });
    </script>
</body>
</html>`;
}

export async function getDraftsHtml(drafts: DraftItem[], maxPreviewLines: number): Promise<string> {
    const draftEntries = await Promise.all(drafts.map(async draft => {
        const filePath = vscode.workspace.asRelativePath(draft.uri);
        const startLine = (draft.thread.range || draft.range).start.line + 1;
        const endLine = (draft.thread.range || draft.range).end.line + 1;

        let documentText = draft.documentText;
        try {
            const document = await vscode.workspace.openTextDocument(draft.uri);
            documentText = document.getText(draft.thread.range || draft.range);
        } catch (e) {
            // fallback to snapshot
        }

        let codePreviewHtml = '';
        if (maxPreviewLines > 0 && documentText) {
            const allLines = documentText.split('\n');
            const truncated = allLines.length > maxPreviewLines;
            const displayLines = truncated ? allLines.slice(0, maxPreviewLines) : allLines;
            const displayCode = escapeHtml(displayLines.join('\n'));
            const suffix = truncated ? `\n... (+${allLines.length - maxPreviewLines} lines)` : '';

            codePreviewHtml = `
            <details class="code-preview">
                <summary class="code-preview-toggle">
                    <span class="chevron-icon">&#9654;</span>
                    Code snippet (Lines ${startLine}-${endLine}, ${allLines.length} lines)
                </summary>
                <pre class="code-block"><code>${displayCode}${escapeHtml(suffix)}</code></pre>
            </details>`;
        }

        const bodyHtml = draft.text.trim() ? `<div class="draft-body">${escapeHtml(draft.text)}</div>` : '';

        return `<div class="draft-card">
            <div class="draft-header">${escapeHtml(filePath)} (Lines ${startLine}-${endLine})</div>
            ${bodyHtml}
            ${codePreviewHtml}
        </div>`;
    }));
    return draftEntries.join('');
}

function escapeHtml(unsafe: unknown): string {
    return (unsafe ? String(unsafe) : '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
