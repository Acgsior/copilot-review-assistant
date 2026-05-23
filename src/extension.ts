import * as vscode from 'vscode';
import { DraftsTreeDataProvider, DraftItem } from './draftProvider';

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
        thread.label = 'Draft Plan Review';
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
            
            const formattedComment = `**📝 [DRAFT]**\n\n${userSuggestion}`;

            const newComment = new PlanReviewComment(
                formattedComment,
                vscode.CommentMode.Preview,
                { name: 'You' },
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

        let prompt = `I have some feedback and suggestions for the following code sections:\n\n`;
        
        drafts.forEach((draft) => {
            const filePath = vscode.workspace.asRelativePath(draft.uri);
            const startLine = draft.range.start.line + 1;
            const endLine = draft.range.end.line + 1;
            
            prompt += `- \`${filePath}\` (Lines ${startLine}-${endLine})\n`;
            prompt += `  \`\`\`${draft.documentLanguage}\n  ${draft.documentText.split('\\n').join('\\n  ')}\n  \`\`\`\n`;
            prompt += `  **Suggestion:** ${draft.text}\n\n`;
        });

        prompt += `Please review these suggestions and provide feedback.`;

        try {
            await vscode.commands.executeCommand('workbench.action.chat.open', { 
                query: prompt 
            });

            draftsProvider.clearDrafts();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open Copilot Chat: ${error}`);
        }
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
