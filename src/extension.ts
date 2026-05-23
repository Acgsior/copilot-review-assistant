import * as vscode from 'vscode';
import { DraftsTreeDataProvider, DraftItem } from './draftProvider';
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
    const draftsProvider = new DraftsTreeDataProvider();
    vscode.window.registerTreeDataProvider('antigravity.draftsView', draftsProvider);

    const commentController = vscode.comments.createCommentController('antigravity-review', 'Antigravity Plan Review');
    context.subscriptions.push(commentController);

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider('*', new DraftCodeActionProvider(), {
            providedCodeActionKinds: [vscode.CodeActionKind.Refactor]
        })
    );

    const createReviewThreadCmd = vscode.commands.registerCommand('antigravity.createReviewThread', () => {
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

    const addDraftCmd = vscode.commands.registerCommand('antigravity.addDraft', async (reply: vscode.CommentReply) => {
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

            const draftItem = new DraftItem(
                draftId,
                userSuggestion,
                uri,
                range,
                document.languageId,
                text,
                thread
            );
            draftsProvider.addDraft(draftItem);

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add draft: ${error}`);
        }
    });

    const submitDraftsCmd = vscode.commands.registerCommand('antigravity.submitDrafts', async () => {
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

        panel.webview.html = getWebviewContent();

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

    const deleteDraftCmd = vscode.commands.registerCommand('antigravity.deleteDraft', (draftItem: DraftItem) => {
        if (draftItem && draftItem.id) {
            draftsProvider.removeDraft(draftItem.id);
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

function getWebviewContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submit Plan Review</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
        }
        h2 {
            margin-top: 0;
            font-weight: 500;
        }
        textarea {
            flex: 1;
            width: 100%;
            margin-bottom: 20px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 10px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            resize: none;
            box-sizing: border-box;
        }
        textarea:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }
        button {
            padding: 10px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
            font-size: 14px;
            align-self: flex-start;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <h2>Add a Summary Comment</h2>
    <p>This markdown text will be prepended to your drafted code reviews before sending to Copilot Chat.</p>
    <textarea id="summaryText" placeholder="Write your summary here..."></textarea>
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
