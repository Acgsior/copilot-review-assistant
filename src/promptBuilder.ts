import * as vscode from 'vscode';
import { DraftItem } from './models/draftItem';

export type PromptStyle = 'concise' | 'detailed';

/**
 * Build the final prompt string from a summary, selected drafts, and style.
 * The prompt is structured as a review document with numbered entries.
 */
export async function buildPrompt(
    summary: string,
    drafts: DraftItem[],
    style: PromptStyle
): Promise<string> {
    if (drafts.length === 0) {
        return summary || '';
    }

    const entries = await Promise.all(
        drafts.map((draft, index) => buildDraftEntry(draft, style, index + 1))
    );

    const parts: string[] = [];

    if (summary.trim()) {
        parts.push(summary.trim());
        parts.push('\n\n');
    }

    parts.push('\n## Review Comments\n');
    parts.push(entries.join('\n'));

    return parts.join('');
}

// ── Entry builders per style ────────────────────────────────────────

async function buildDraftEntry(
    draft: DraftItem,
    style: PromptStyle,
    index: number
): Promise<string> {
    const filePath = vscode.workspace.asRelativePath(draft.uri);
    const startLine = (draft.thread.range || draft.range).start.line + 1;
    const endLine = (draft.thread.range || draft.range).end.line + 1;

    const lineRef = startLine === endLine
        ? `Line ${startLine}`
        : `Lines ${startLine}-${endLine}`;

    // Try to get the latest document text; fall back to the stored snapshot
    let documentText = draft.documentText;
    try {
        const document = await vscode.workspace.openTextDocument(draft.uri);
        documentText = document.getText(draft.thread.range || draft.range);
    } catch {
        // fallback to snapshot
    }

    const comment = draft.text.trim();

    if (style === 'detailed') {
        return buildDetailedEntry(filePath, lineRef, documentText, draft.documentLanguage, comment, index);
    }
    return buildConciseEntry(filePath, lineRef, comment, index);
}

function buildConciseEntry(
    filePath: string,
    lineRef: string,
    comment: string,
    index: number
): string {
    const lines: string[] = [];
    lines.push(`${index}. **\`${filePath}\`** (${lineRef})`);
    if (comment) {
        lines.push(`   > ${comment.split('\n').join('\n   > ')}`);
    }
    lines.push('');
    return lines.join('\n');
}

function buildDetailedEntry(
    filePath: string,
    lineRef: string,
    code: string,
    language: string,
    comment: string,
    index: number
): string {
    const lines: string[] = [];
    lines.push(`### ${index}. \`${filePath}\` (${lineRef})\n`);

    if (code.trim()) {
        lines.push(`\`\`\`${language}`);
        lines.push(code);
        lines.push('```\n');
    }

    if (comment) {
        lines.push(`> ${comment.split('\n').join('\n> ')}`);
    }

    lines.push('');
    return lines.join('\n');
}
