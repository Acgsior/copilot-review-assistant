import * as vscode from 'vscode';
import { DraftStore } from '../state/draftStore';
import { DraftItem } from '../models/draftItem';
import { getSubmitWebviewContent } from '../webviews/submitWebview';

/**
 * Opens the Submit Plan Review webview panel, allowing the user to write
 * a summary and submit all drafts to Copilot Chat.
 *
 * Uses configurable prompt/draft templates and an inline code threshold:
 * - Code snippets longer than `inlineCodeThreshold` are referenced by
 *   file path and line range (e.g. `README.md#L10~L35`) instead of inlined.
 */
export async function submitDrafts(store: DraftStore): Promise<void> {
    const drafts = store.getAllDrafts();
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

    panel.webview.html = getSubmitWebviewContent(drafts);

    panel.webview.onDidReceiveMessage(async message => {
        if (message.command === 'submit') {
            const summary: string = message.text;
            const prompt = buildPrompt(summary, drafts);

            try {
                await vscode.commands.executeCommand('workbench.action.chat.open', {
                    query: prompt
                });

                store.clearDrafts();
                store.resetCounter();
                panel.dispose();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open Copilot Chat: ${error}`);
            }
        } else if (message.command === 'cancel') {
            panel.dispose();
        }
    });
}

// ── Prompt building ─────────────────────────────────────────────────

function buildPrompt(summary: string, drafts: DraftItem[]): string {
    const config = vscode.workspace.getConfiguration('copilotReview');
    const promptTemplate = config.get<string>(
        'promptTemplate',
        '${summary}\n\n---\n\nComplete changes:\n\n${drafts}'
    );
    const draftTemplate = config.get<string>(
        'draftTemplate',
        '- `${filePath}` (Lines ${startLine}-${endLine})\n  ${codeBlock}\n  ${comment}\n\n'
    );
    const inlineThreshold = config.get<number>('inlineCodeThreshold', 10);

    const draftsStr = drafts.map(draft => buildDraftEntry(draft, draftTemplate, inlineThreshold)).join('');

    let result = promptTemplate
        .replace('${summary}', summary || '')
        .replace('${drafts}', draftsStr);

    // Clean up: if no summary was provided, remove the leading separator
    if (!summary) {
        result = result.replace(/^\s*\n*---\n*/m, '').trimStart();
    }

    return result;
}

function buildDraftEntry(draft: DraftItem, template: string, inlineThreshold: number): string {
    const filePath = vscode.workspace.asRelativePath(draft.uri);
    const startLine = draft.range.start.line + 1;
    const endLine = draft.range.end.line + 1;
    const lineCount = draft.documentText.split('\n').length;

    let codeBlock: string;
    if (lineCount > inlineThreshold) {
        // Reference by file path + line range instead of inlining
        codeBlock = `\`${filePath}#L${startLine}~L${endLine}\``;
    } else {
        // Inline the code in a fenced code block
        const indentedCode = draft.documentText.split('\n').join('\n  ');
        codeBlock = `\`\`\`${draft.documentLanguage}\n  ${indentedCode}\n  \`\`\``;
    }

    return template
        .replace('${filePath}', filePath)
        .replace('${startLine}', String(startLine))
        .replace('${endLine}', String(endLine))
        .replace('${language}', draft.documentLanguage)
        .replace('${code}', draft.documentText)
        .replace('${codeBlock}', codeBlock)
        .replace('${comment}', draft.text);
}
