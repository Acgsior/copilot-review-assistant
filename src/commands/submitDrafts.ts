import * as vscode from 'vscode';
import { DraftStore } from '../state/draftStore';
import { DraftItem } from '../models/draftItem';
import { getSubmitWebviewContent, getDraftsHtml } from '../webviews/submitWebview';

let activePanel: vscode.WebviewPanel | undefined = undefined;

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

    if (activePanel) {
        activePanel.reveal(vscode.ViewColumn.One);
        return;
    }

    const panel = vscode.window.createWebviewPanel(
        'submitPlanReview',
        'Submit Plan Review',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getSubmitWebviewContent(drafts);
    activePanel = panel;

    const disposable = store.onDidChange(() => {
        if (activePanel) {
            const currentDrafts = store.getAllDrafts();
            const config = vscode.workspace.getConfiguration('copilotReview');
            const maxPreviewLines = config.get<number>('codePreviewMaxLines', 20);
            activePanel.webview.postMessage({
                command: 'updateDraftsHtml',
                html: getDraftsHtml(currentDrafts, maxPreviewLines)
            });
        }
    });

    panel.webview.onDidReceiveMessage(async message => {
        if (message.command === 'submit') {
            const summary: string = message.text;
            const prompt = buildPrompt(summary, drafts);

            try {
                await vscode.commands.executeCommand('workbench.action.chat.open', {
                    query: prompt
                });

                store.clearDrafts();
                panel.dispose();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open Copilot Chat: ${error}`);
            }
        } else if (message.command === 'cancel') {
            panel.dispose();
        }
    });

    panel.onDidDispose(() => {
        activePanel = undefined;
        disposable.dispose();
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
        '- ${fileReference}\n  ${codeBlock}\n  ${comment}\n\n'
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
    let fileReference: string;
    
    if (lineCount > inlineThreshold) {
        fileReference = `${filePath}#L${startLine}~L${endLine}`;
        codeBlock = '';
    } else {
        fileReference = `\`${filePath}\` (Lines ${startLine}-${endLine})`;
        const indentedCode = draft.documentText.split('\n').join('\n  ');
        codeBlock = `\`\`\`${draft.documentLanguage}\n  ${indentedCode}\n  \`\`\``;
    }

    const commentStr = draft.text.trim() ? `${draft.text}` : '';

    let formattedEntry = template
        .replace('- `${filePath}` (Lines ${startLine}-${endLine})', '- ${fileReference}') // fallback for old custom templates
        .replace('${filePath}', filePath)
        .replace('${startLine}', String(startLine))
        .replace('${endLine}', String(endLine))
        .replace('${language}', draft.documentLanguage)
        .replace('${code}', draft.documentText)
        .replace('${fileReference}', fileReference)
        .replace('${codeBlock}', codeBlock)
        .replace('${comment}', commentStr)
        .replace(/\n[ \t]*\n[ \t]*\n/g, '\n\n') // clean up extra empty lines if codeBlock or comment is empty
        .replace(/[ \t]+\n/g, '\n'); // remove trailing whitespace on empty lines

    return formattedEntry;
}
