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
            background: linear-gradient(180deg, var(--vscode-editor-background) 0%, var(--vscode-sideBar-background) 100%);
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
            max-width: 800px;
            margin: 0 auto;
        }
        h2 {
            margin-top: 0;
            font-weight: 600;
            color: var(--vscode-foreground);
            letter-spacing: -0.5px;
        }
        p {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 20px;
        }
        textarea {
            width: 100%;
            height: 140px;
            margin-bottom: 20px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, transparent));
            border-radius: 6px;
            padding: 12px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size, 13px);
            resize: vertical;
            box-sizing: border-box;
            outline: none;
            transition: all 0.2s ease;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        textarea:focus {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        h3 {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
            margin-bottom: 12px;
            margin-top: 10px;
        }
        .drafts-container {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 20px;
            border-radius: 6px;
            border: 1px solid var(--vscode-widget-border, transparent);
            padding: 12px;
            background: var(--vscode-editorWidget-background);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .draft-card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border, transparent);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 12px;
            transition: all 0.2s ease;
        }
        .draft-card:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            transform: translateY(-1px);
        }
        .draft-card:last-child {
            margin-bottom: 0;
        }
        .draft-header {
            font-size: 13px;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 8px;
            font-weight: 600;
        }
        .draft-body {
            font-size: 13px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: var(--vscode-foreground);
        }
        /* Code preview */
        .code-preview {
            margin-top: 12px;
            border: 1px solid var(--vscode-widget-border, transparent);
            border-radius: 4px;
            overflow: hidden;
            background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.05));
        }
        .code-preview[open] .chevron-icon {
            transform: rotate(90deg);
        }
        .code-preview-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            background: rgba(128, 128, 128, 0.05);
            user-select: none;
            list-style: none;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        .code-preview-toggle:hover {
            background: rgba(128, 128, 128, 0.1);
        }
        .code-preview-toggle::-webkit-details-marker {
            display: none;
        }
        .chevron-icon {
            font-size: 10px;
            transition: transform 0.2s ease;
            display: inline-block;
        }
        .code-block {
            margin: 0;
            padding: 12px;
            background: transparent;
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
            gap: 12px;
            margin-top: 10px;
            margin-bottom: 10px;
        }
        button {
            padding: 8px 18px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            font-family: var(--vscode-font-family);
            transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .btn-primary {
            background: linear-gradient(135deg, var(--vscode-button-background) 0%, rgba(0, 122, 204, 0.8) 100%);
            color: var(--vscode-button-foreground);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            filter: brightness(1.1);
        }
        .btn-primary:active {
            transform: translateY(0);
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
