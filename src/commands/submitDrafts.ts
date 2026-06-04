import * as vscode from 'vscode';
import { DraftStore } from '../state/draftStore';
import { DraftItem } from '../models/draftItem';
import { getSubmitWebviewContent, getDraftsHtml } from '../webviews/submitWebview';
import { buildPrompt, PromptStyle } from '../promptBuilder';

let activePanel: vscode.WebviewPanel | undefined = undefined;

/**
 * Opens the Submit Plan Review webview panel, allowing the user to
 * reorder, select, and edit drafts before submitting to Copilot Chat.
 *
 * The panel uses a split layout with a live prompt preview that
 * supports both Markdown-rendered and raw-text views.
 */
export async function submitDrafts(store: DraftStore): Promise<void> {
    const drafts = store.getAllDrafts();
    if (drafts.length === 0) {
        vscode.window.showInformationMessage('No drafts to submit.');
        return;
    }

    const config = vscode.workspace.getConfiguration('copilotReview');
    const defaultStyle = config.get<string>('promptStyle', 'concise');

    if (activePanel) {
        activePanel.reveal(vscode.ViewColumn.One);
        const maxPreviewLines = config.get<number>('codePreviewMaxLines', 20);
        const currentDrafts = store.getAllDrafts();
        activePanel.webview.postMessage({
            command: 'updateDraftsHtml',
            html: await getDraftsHtml(currentDrafts, maxPreviewLines)
        });
        return;
    }

    const panel = vscode.window.createWebviewPanel(
        'submitDraftsReview',
        'Submit Drafts Review',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = await getSubmitWebviewContent(drafts, defaultStyle);
    activePanel = panel;

    const disposable = store.onDidChange(async () => {
        if (activePanel) {
            const currentDrafts = store.getAllDrafts();
            const maxPreviewLines = config.get<number>('codePreviewMaxLines', 20);
            activePanel.webview.postMessage({
                command: 'updateDraftsHtml',
                html: await getDraftsHtml(currentDrafts, maxPreviewLines)
            });
        }
    });

    panel.webview.onDidReceiveMessage(async message => {
        switch (message.command) {
            case 'submit': {
                const selectedIds: string[] = message.selectedIds || [];
                const currentDrafts = store.getAllDrafts();
                if (currentDrafts.length === 0) {
                    vscode.window.showWarningMessage('No drafts to submit. All drafts may have been deleted.');
                    return;
                }

                // Build prompt from only the selected drafts in the specified order
                const selectedDrafts = getOrderedSelectedDrafts(currentDrafts, selectedIds, message.orderedIds);
                if (selectedDrafts.length === 0) {
                    vscode.window.showWarningMessage('No drafts selected.');
                    return;
                }

                const style = (message.style || defaultStyle) as PromptStyle;
                const prompt = await buildPrompt(message.text || '', selectedDrafts, style);

                try {
                    await vscode.commands.executeCommand('workbench.action.chat.open', {
                        query: prompt
                    });

                    // Only clear the selected (submitted) drafts; keep unselected ones
                    store.removeSelectedDrafts(selectedIds);

                    // If all drafts were submitted, close the panel
                    if (store.getAllDrafts().length === 0) {
                        panel.dispose();
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to open Copilot Chat: ${error}`);
                }
                break;
            }

            case 'cancel':
                panel.dispose();
                break;

            case 'requestPreview': {
                const currentDrafts = store.getAllDrafts();
                const selectedIds: string[] = message.selectedIds || [];
                const orderedIds: string[] = message.orderedIds || [];
                const style = (message.style || defaultStyle) as PromptStyle;
                const summary: string = message.text || '';

                const selectedDrafts = getOrderedSelectedDrafts(currentDrafts, selectedIds, orderedIds);
                const raw = await buildPrompt(summary, selectedDrafts, style);
                const markdown = renderMarkdownToHtml(raw);

                panel.webview.postMessage({
                    command: 'previewResult',
                    markdown,
                    raw
                });
                break;
            }

            case 'updateDraftText': {
                const { id, text } = message;
                if (id) {
                    store.updateDraftText(id, text || '');
                }
                break;
            }

            case 'reorderDrafts': {
                const orderedIds: string[] = message.orderedIds || [];
                if (orderedIds.length > 0) {
                    store.reorderDrafts(orderedIds);
                }
                break;
            }
        }
    });

    panel.onDidDispose(() => {
        activePanel = undefined;
        disposable.dispose();
    });
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Resolve the subset of drafts that are selected, in the order
 * specified by orderedIds (falls back to the store order).
 */
function getOrderedSelectedDrafts(
    allDrafts: DraftItem[],
    selectedIds: string[],
    orderedIds?: string[]
): DraftItem[] {
    const draftMap = new Map(allDrafts.map(d => [d.id, d]));
    const selectedSet = new Set(selectedIds);

    // Use orderedIds if available; otherwise fall back to allDrafts order
    const order = orderedIds && orderedIds.length > 0
        ? orderedIds
        : allDrafts.map(d => d.id);

    return order
        .filter(id => selectedSet.has(id))
        .map(id => draftMap.get(id))
        .filter((d): d is DraftItem => d !== undefined);
}

/**
 * Very lightweight Markdown-to-HTML renderer for the preview panel.
 * Handles headings, bold, inline code, fenced code blocks, blockquotes,
 * ordered lists, horizontal rules, and paragraphs. This avoids pulling
 * in a full markdown library for the webview.
 */
function renderMarkdownToHtml(md: string): string {
    const lines = md.split('\n');
    const html: string[] = [];
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Fenced code blocks
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                html.push(`<pre><code>${escapeHtml(codeBlockLines.join('\n'))}</code></pre>`);
                codeBlockLines = [];
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
            }
            continue;
        }
        if (inCodeBlock) {
            codeBlockLines.push(line);
            continue;
        }

        // Close open list
        if (inList && !/^\d+\.\s/.test(line)) {
            html.push('</ol>');
            inList = false;
        }

        // Horizontal rule
        if (/^---+\s*$/.test(line)) {
            html.push('<hr>');
            continue;
        }

        // Headings
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            html.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
            continue;
        }

        // Blockquote
        if (line.startsWith('> ') || line === '>') {
            const content = line.startsWith('> ') ? line.slice(2) : '';
            html.push(`<blockquote>${inlineFormat(content)}</blockquote>`);
            continue;
        }

        // Ordered list
        const listMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (listMatch) {
            if (!inList) {
                html.push('<ol>');
                inList = true;
            }
            html.push(`<li>${inlineFormat(listMatch[2])}</li>`);
            continue;
        }

        // Empty line
        if (line.trim() === '') {
            continue;
        }

        // Paragraph
        html.push(`<p>${inlineFormat(line)}</p>`);
    }

    // Close any open blocks
    if (inCodeBlock) {
        html.push(`<pre><code>${escapeHtml(codeBlockLines.join('\n'))}</code></pre>`);
    }
    if (inList) {
        html.push('</ol>');
    }

    return html.join('\n');
}

function inlineFormat(text: string): string {
    let result = escapeHtml(text);
    // Bold: **text**
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Inline code: `text`
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    return result;
}

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
