"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const draftWebviewProvider_1 = require("./draftWebviewProvider");
const draftCodeActionProvider_1 = require("./draftCodeActionProvider");
let commentId = 1;
let draftCounter = 1;
class PlanReviewComment {
    body;
    mode;
    author;
    parent;
    contextValue;
    draftId;
    id;
    label;
    savedBody;
    constructor(body, mode, author, parent, contextValue, draftId) {
        this.body = body;
        this.mode = mode;
        this.author = author;
        this.parent = parent;
        this.contextValue = contextValue;
        this.draftId = draftId;
        this.id = ++commentId;
        this.savedBody = this.body;
    }
}
function activate(context) {
    const draftsProvider = new draftWebviewProvider_1.DraftsWebviewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('copilotReview.draftsView', draftsProvider));
    const commentController = vscode.comments.createCommentController('copilot-review', 'Copilot Review Assistant');
    context.subscriptions.push(commentController);
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('*', new draftCodeActionProvider_1.DraftCodeActionProvider(), {
        providedCodeActionKinds: [vscode.CodeActionKind.Refactor]
    }));
    const createReviewThreadCmd = vscode.commands.registerCommand('copilotReview.createReviewThread', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage('Please select some code before starting a review.');
            return;
        }
        const thread = commentController.createCommentThread(editor.document.uri, selection, []);
        thread.canReply = true;
        thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
        thread.label = 'Draft Comment';
    });
    const addDraftCmd = vscode.commands.registerCommand('copilotReview.addDraft', async (reply) => {
        const userSuggestion = reply.text;
        const thread = reply.thread;
        const range = thread.range;
        const uri = thread.uri;
        if (!range) {
            vscode.window.showErrorMessage('Unable to determine the code range for this review.');
            return;
        }
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            let text = document.getText(range);
            const lines = text.split('\n');
            if (lines.length > 500) {
                text = lines.slice(0, 500).join('\n') + '\n\n... (code truncated due to length)';
            }
            const sequence = draftCounter++;
            const draftId = `draft-${Date.now()}`;
            const newComment = new PlanReviewComment(userSuggestion, vscode.CommentMode.Preview, { name: `📝 [DRAFT #${sequence}]` }, thread, 'draft', draftId);
            thread.comments = [...thread.comments, newComment];
            thread.canReply = false;
            const draftItem = {
                id: draftId,
                text: userSuggestion,
                uri: uri,
                range: range,
                documentLanguage: document.languageId,
                documentText: text,
                thread: thread,
                sequence: sequence
            };
            draftsProvider.addDraft(draftItem);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to add draft: ${error}`);
        }
    });
    const cancelDraftCmd = vscode.commands.registerCommand('copilotReview.cancelDraft', (reply) => {
        const thread = reply.thread || reply;
        if (thread) {
            thread.dispose();
        }
    });
    const submitDraftsCmd = vscode.commands.registerCommand('copilotReview.submitDrafts', async () => {
        const drafts = draftsProvider.getAllDrafts();
        if (drafts.length === 0) {
            vscode.window.showInformationMessage('No drafts to submit.');
            return;
        }
        const panel = vscode.window.createWebviewPanel('submitPlanReview', 'Submit Plan Review', vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = getWebviewContent(drafts);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'submit') {
                const summary = message.text;
                let prompt = summary ? `${summary}\n\n---\n\nComplete changes:\n\n` : `Complete changes:\n\n`;
                drafts.forEach((draft) => {
                    const filePath = vscode.workspace.asRelativePath(draft.uri);
                    const startLine = draft.range.start.line + 1;
                    const endLine = draft.range.end.line + 1;
                    prompt += `- \`${filePath}\` (Lines ${startLine}-${endLine})\n`;
                    prompt += `  \`\`\`${draft.documentLanguage}\n  ${draft.documentText.split('\\n').join('\\n  ')}\n  \`\`\`\n`;
                    prompt += `  ${draft.text}\n\n`;
                });
                try {
                    await vscode.commands.executeCommand('workbench.action.chat.open', {
                        query: prompt
                    });
                    draftsProvider.clearDrafts();
                    draftCounter = 1;
                    panel.dispose();
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Failed to open Copilot Chat: ${error}`);
                }
            }
            else if (message.command === 'cancel') {
                panel.dispose();
            }
        }, undefined, context.subscriptions);
    });
    const deleteDraftCmd = vscode.commands.registerCommand('copilotReview.deleteDraft', (arg) => {
        let id;
        if (typeof arg === 'string') {
            id = arg;
        }
        else if (arg && typeof arg === 'object') {
            id = arg.draftId || arg.id;
        }
        if (id) {
            draftsProvider.removeDraft(id);
        }
    });
    const editDraftCmd = vscode.commands.registerCommand('copilotReview.editDraft', (comment) => {
        comment.mode = vscode.CommentMode.Editing;
        comment.contextValue = 'draftEditing';
        if (comment.parent) {
            comment.parent.comments = [...comment.parent.comments];
        }
    });
    const saveDraftEditCmd = vscode.commands.registerCommand('copilotReview.saveDraftEdit', (comment, text) => {
        if (!comment.parent)
            return;
        comment.body = text;
        comment.savedBody = text;
        comment.mode = vscode.CommentMode.Preview;
        comment.contextValue = 'draft';
        // Update draftItem text
        const drafts = draftsProvider.getAllDrafts();
        const draft = drafts.find(d => d.id === comment.draftId);
        if (draft) {
            draft.text = text;
            draftsProvider.updateWebview();
        }
        comment.parent.comments = [...comment.parent.comments];
    });
    context.subscriptions.push(createReviewThreadCmd, addDraftCmd, cancelDraftCmd, submitDraftsCmd, deleteDraftCmd, editDraftCmd, saveDraftEditCmd);
}
function deactivate() { }
function getWebviewContent(drafts) {
    const escapeHtml = (unsafe) => (unsafe ? String(unsafe) : "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    const draftsHtml = drafts.map(draft => {
        const filePath = vscode.workspace.asRelativePath(draft.uri);
        const line = draft.range.start.line + 1;
        const sequenceStr = draft.sequence ? `#${draft.sequence} ` : '';
        return `<div class="draft-card">
            <div class="draft-header">${sequenceStr}${escapeHtml(filePath)}:${line}</div>
            <div class="draft-body">${escapeHtml(draft.text)}</div>
        </div>`;
    }).join('');
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submit Plan Review</title>
    <style>
        :root {
            --primary-color: #8e44ad;
            --primary-hover: #9b59b6;
            --bg-color: var(--vscode-editor-background);
            --text-color: var(--vscode-editor-foreground);
            --card-bg: var(--vscode-editorWidget-background);
            --border-color: var(--vscode-widget-border, #444);
        }
        body {
            font-family: var(--vscode-font-family);
            padding: 30px;
            color: var(--text-color);
            background-color: var(--bg-color);
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
            color: var(--primary-color);
        }
        p {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 20px;
        }
        textarea {
            width: 100%;
            height: 120px;
            margin-bottom: 20px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            padding: 12px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            resize: vertical;
            box-sizing: border-box;
            transition: border-color 0.3s;
        }
        textarea:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 2px rgba(142, 68, 173, 0.2);
        }
        .drafts-container {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 20px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
            padding: 10px;
            background: var(--vscode-editor-inactiveSelectionBackground);
        }
        .draft-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
        }
        .draft-card:last-child {
            margin-bottom: 0;
        }
        .draft-header {
            font-size: 12px;
            color: var(--primary-color);
            margin-bottom: 6px;
            font-weight: bold;
        }
        .draft-body {
            font-size: 13px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .button-group {
            display: flex;
            gap: 12px;
            margin-top: 10px;
        }
        button {
            padding: 12px 24px;
            background-color: var(--primary-color);
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s, transform 0.1s;
        }
        button:hover {
            background-color: var(--primary-hover);
        }
        button:active {
            transform: scale(0.98);
        }
        .btn-secondary {
            background-color: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-color);
        }
        .btn-secondary:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
    </style>
</head>
<body>
    <h2>Add a Summary Comment</h2>
    <p>This markdown text will be prepended to your drafted code reviews before sending to Copilot Chat.</p>
    <textarea id="summaryText" placeholder="Write your summary here..." autofocus></textarea>
    
    <h3>Draft Comments to Submit</h3>
    <div class="drafts-container">
        ${draftsHtml}
    </div>

    <div class="button-group">
        <button id="submitBtn">Submit to Copilot Chat</button>
        <button id="cancelBtn" class="btn-secondary">Cancel</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        document.getElementById('submitBtn').addEventListener('click', () => {
            const text = document.getElementById('summaryText').value;
            vscode.postMessage({
                command: 'submit',
                text: text
            });
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
        });
    </script>
</body>
</html>`;
}
//# sourceMappingURL=extension.js.map