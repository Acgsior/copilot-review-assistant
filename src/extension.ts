import * as vscode from 'vscode';
import { DraftsWebviewProvider, DraftItem } from './draftWebviewProvider';
import { DraftCodeActionProvider } from './draftCodeActionProvider';

let commentId = 1;

class PlanReviewComment implements vscode.Comment {
    id: number;
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
        this.id = ++commentId;
        this.savedBody = this.body;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const draftsProvider = new DraftsWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('copilotReview.draftsView', draftsProvider)
    );

    const commentController = vscode.comments.createCommentController('copilot-review', 'Copilot Review Assistant');
    context.subscriptions.push(commentController);

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider('*', new DraftCodeActionProvider(), {
            providedCodeActionKinds: [vscode.CodeActionKind.Refactor]
        })
    );

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

    const addDraftCmd = vscode.commands.registerCommand('copilotReview.addDraft', async (reply: vscode.CommentReply) => {
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

            const draftId = `draft-${Date.now()}`;
            
            const newComment = new PlanReviewComment(
                userSuggestion,
                vscode.CommentMode.Preview,
                { name: '📝 [DRAFT]' },
                thread,
                'draft',
                draftId
            );
            
            thread.comments = [...thread.comments, newComment];
            thread.canReply = false;

            const draftItem: DraftItem = {
                id: draftId,
                text: userSuggestion,
                uri: uri,
                range: range,
                documentLanguage: document.languageId,
                documentText: text,
                thread: thread
            };
            
            draftsProvider.addDraft(draftItem);

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add draft: ${error}`);
        }
    });

    const submitDraftsCmd = vscode.commands.registerCommand('copilotReview.submitDrafts', async () => {
        const drafts = draftsProvider.getAllDrafts();
        if (drafts.length === 0) {
            vscode.window.showInformationMessage('No drafts to submit.');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'submitPlanReview',
            'Submit Plan Review',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = getWebviewContent(drafts);

        panel.webview.onDidReceiveMessage(
            async message => {
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
                        panel.dispose();
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to open Copilot Chat: ${error}`);
                    }
                }
            },
            undefined,
            context.subscriptions
        );
    });

    const deleteDraftCmd = vscode.commands.registerCommand('copilotReview.deleteDraft', (draftId: string) => {
        if (draftId) {
            draftsProvider.removeDraft(draftId);
        } else {
            // fallback if called with context from treeview
            const id = (arguments[0] as any)?.id;
            if (id) {
                 draftsProvider.removeDraft(id);
            }
        }
    });

    context.subscriptions.push(
        createReviewThreadCmd, 
        addDraftCmd, 
        submitDraftsCmd,
        deleteDraftCmd
    );
}

export function deactivate() {}

function getWebviewContent(drafts: DraftItem[]) {
    const escapeHtml = (unsafe: string) => unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");

    const draftsHtml = drafts.map(draft => {
        const filePath = vscode.workspace.asRelativePath(draft.uri);
        const line = draft.range.start.line + 1;
        return `<div class="draft-card">
            <div class="draft-header">${escapeHtml(filePath)}:${line}</div>
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
        button {
            padding: 12px 24px;
            background-color: var(--primary-color);
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            align-self: flex-start;
            transition: background-color 0.2s, transform 0.1s;
        }
        button:hover {
            background-color: var(--primary-hover);
        }
        button:active {
            transform: scale(0.98);
        }
    </style>
</head>
<body>
    <h2>Add a Summary Comment</h2>
    <p>This markdown text will be prepended to your drafted code reviews before sending to Copilot Chat.</p>
    <textarea id="summaryText" placeholder="Write your summary here..."></textarea>
    
    <h3>Draft Comments to Submit</h3>
    <div class="drafts-container">
        ${draftsHtml}
    </div>

    <button id="submitBtn">Submit to Copilot Chat</button>

    <script>
        const vscode = acquireVsCodeApi();
        
        document.getElementById('submitBtn').addEventListener('click', () => {
            const text = document.getElementById('summaryText').value;
            vscode.postMessage({
                command: 'submit',
                text: text
            });
        });
    </script>
</body>
</html>`;
}
