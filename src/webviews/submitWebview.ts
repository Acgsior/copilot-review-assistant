import * as vscode from 'vscode';
import { DraftItem } from '../models/draftItem';

/**
 * Generates the full HTML for the Submit Plan Review webview panel.
 * Left-right split layout: left side is the editing panel (style selector,
 * draft cards with checkboxes / drag-and-drop / inline editing, summary
 * textarea, and action buttons); right side is the live prompt preview
 * with Markdown-rendered and raw-text toggle tabs.
 */
export async function getSubmitWebviewContent(
    drafts: DraftItem[],
    defaultStyle: string
): Promise<string> {
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
        /* ── Reset & base ─────────────────────────────────────── */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            height: 100vh;
            overflow: hidden;
        }

        /* ── Split layout ─────────────────────────────────────── */
        .split-container {
            display: flex;
            height: 100vh;
        }
        .left-panel {
            flex: 0 0 58%;
            display: flex;
            flex-direction: column;
            border-right: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
            overflow: hidden;
        }
        .right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: var(--vscode-sideBar-background, var(--vscode-editor-background));
        }

        /* ── Left panel header (style selector) ───────────────── */
        .panel-header {
            padding: 16px 20px 12px;
            border-bottom: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.15));
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
        }
        .panel-header h2 {
            font-size: 15px;
            font-weight: 600;
            color: var(--vscode-foreground);
            white-space: nowrap;
        }
        .style-selector {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-left: auto;
        }
        .style-selector label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            white-space: nowrap;
        }
        .style-selector select {
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, transparent));
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            font-family: var(--vscode-font-family);
            cursor: pointer;
            outline: none;
        }
        .style-selector select:focus {
            border-color: var(--vscode-focusBorder);
        }

        /* ── Draft list ───────────────────────────────────────── */
        .drafts-list {
            flex: 1;
            overflow-y: auto;
            padding: 12px 20px;
        }
        .select-all-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 0 10px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            border-bottom: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.1));
            margin-bottom: 8px;
        }
        .select-all-bar input[type="checkbox"] {
            accent-color: var(--vscode-button-background);
            cursor: pointer;
        }

        /* ── Draft card ───────────────────────────────────────── */
        .draft-card {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.15));
            border-radius: 6px;
            margin-bottom: 8px;
            transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            overflow: hidden;
            position: relative;
        }
        .draft-card:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .draft-card.dragging {
            opacity: 0.5;
            transform: scale(0.98);
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .draft-card.drag-over {
            border-top: 2px solid var(--vscode-button-background);
        }
        .draft-card.unchecked {
            opacity: 0.5;
        }

        .draft-card-inner {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px 12px;
        }

        .draft-checkbox {
            flex-shrink: 0;
            margin-top: 2px;
            accent-color: var(--vscode-button-background);
            cursor: pointer;
        }

        .drag-handle {
            flex-shrink: 0;
            cursor: grab;
            color: var(--vscode-icon-foreground);
            opacity: 0.45;
            font-size: 16px;
            line-height: 1;
            padding: 3px 2px;
            user-select: none;
            transition: all 0.15s ease;
            border-radius: 3px;
            letter-spacing: 1px;
        }
        .drag-handle:hover {
            opacity: 1;
            background: rgba(128,128,128,0.12);
            color: var(--vscode-foreground);
        }
        .drag-handle:active { cursor: grabbing; }

        .draft-content {
            flex: 1;
            min-width: 0;
        }
        .draft-file-header {
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            word-break: break-all;
            margin-bottom: 4px;
        }
        .draft-line-number {
            color: var(--vscode-textPreformat-foreground);
            font-weight: normal;
            font-size: 11px;
        }

        /* Draft comment text (editable) */
        .draft-comment {
            font-size: 12px;
            line-height: 1.5;
            color: var(--vscode-foreground);
            white-space: pre-wrap;
            word-wrap: break-word;
            padding: 4px 6px;
            border-radius: 3px;
            border: 1px solid transparent;
            transition: all 0.15s ease;
            cursor: text;
            min-height: 20px;
        }
        .draft-comment:hover {
            background: rgba(128,128,128,0.06);
            border-color: var(--vscode-widget-border, rgba(128,128,128,0.15));
        }
        .draft-comment:focus {
            outline: none;
            background: var(--vscode-input-background);
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 2px rgba(0,122,204,0.15);
        }
        .draft-comment-empty {
            color: var(--vscode-input-placeholderForeground);
            font-style: italic;
        }

        /* ── Code preview (collapsible) ───────────────────────── */
        .code-preview {
            margin: 4px 0 0;
            border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.12));
            border-radius: 4px;
            overflow: hidden;
            background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.04));
        }
        .code-preview[open] .chevron-icon { transform: rotate(90deg); }
        .code-preview-toggle {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 5px 8px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            background: transparent;
            user-select: none;
            list-style: none;
            font-weight: 500;
            transition: background-color 0.15s;
        }
        .code-preview-toggle:hover { background: rgba(128,128,128,0.08); }
        .code-preview-toggle::-webkit-details-marker { display: none; }
        .chevron-icon {
            font-size: 9px;
            transition: transform 0.2s ease;
            display: inline-block;
        }
        .code-block {
            margin: 0;
            padding: 8px 10px;
            background: transparent;
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            line-height: 1.4;
            overflow-x: auto;
            border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.12));
        }
        .code-block code {
            white-space: pre;
            color: var(--vscode-editor-foreground);
            font-size: 11px;
        }

        /* ── Bottom area (textarea + buttons) ─────────────────── */
        .bottom-area {
            padding: 12px 20px 16px;
            border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.15));
            flex-shrink: 0;
        }
        .summary-label {
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
            margin-bottom: 8px;
        }
        textarea {
            width: 100%;
            height: 100px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, transparent));
            border-radius: 6px;
            padding: 10px 12px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size, 13px);
            resize: vertical;
            outline: none;
            transition: all 0.2s ease;
        }
        textarea:focus {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 2px rgba(0,122,204,0.15);
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        button {
            padding: 7px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            font-family: var(--vscode-font-family);
            transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0,0,0,0.12);
        }
        .btn-primary:active { transform: translateY(0); }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .submit-info {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 6px;
        }

        /* ── Right panel (preview) ────────────────────────────── */
        .preview-header {
            display: flex;
            align-items: center;
            padding: 0 16px;
            border-bottom: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.15));
            flex-shrink: 0;
        }
        .preview-tab {
            padding: 12px 14px;
            font-size: 12px;
            font-weight: 500;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.15s;
            user-select: none;
        }
        .preview-tab:hover {
            color: var(--vscode-foreground);
        }
        .preview-tab.active {
            color: var(--vscode-foreground);
            border-bottom-color: var(--vscode-button-background);
        }
        .preview-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px 20px;
        }

        /* ── Markdown rendered preview ────────────────────────── */
        .preview-markdown h2 {
            font-size: 16px;
            font-weight: 600;
            margin: 16px 0 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.15));
        }
        .preview-markdown h3 {
            font-size: 14px;
            font-weight: 600;
            margin: 14px 0 8px;
        }
        .preview-markdown p, .preview-markdown li {
            font-size: 13px;
            line-height: 1.6;
            margin-bottom: 6px;
        }
        .preview-markdown ol {
            padding-left: 20px;
        }
        .preview-markdown blockquote {
            margin: 6px 0;
            padding: 6px 12px;
            border-left: 3px solid var(--vscode-textLink-foreground);
            background: rgba(128,128,128,0.05);
            border-radius: 0 4px 4px 0;
            font-size: 13px;
            color: var(--vscode-foreground);
        }
        .preview-markdown pre {
            margin: 8px 0;
            padding: 10px 12px;
            background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.05));
            border-radius: 4px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.45;
        }
        .preview-markdown code {
            font-family: var(--vscode-editor-font-family);
            color: var(--vscode-editor-foreground);
        }
        .preview-markdown code:not(pre code) {
            background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.05));
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 0.92em;
        }
        .preview-markdown strong {
            font-weight: 600;
        }
        .preview-markdown hr {
            border: none;
            border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
            margin: 12px 0;
        }

        /* Raw preview */
        .preview-raw {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.5;
            color: var(--vscode-editor-foreground);
        }

        /* ── Empty state ──────────────────────────────────────── */
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state-icon {
            font-size: 36px;
            margin-bottom: 10px;
            opacity: 0.4;
        }
        .preview-empty {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            font-style: italic;
            padding: 20px;
            text-align: center;
        }

        /* ── Animations ───────────────────────────────────────── */
        @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .draft-card { animation: fadeSlideIn 0.25s ease-out forwards; }
    </style>
</head>
<body>
    <div class="split-container">
        <!-- ═══ Left Panel ═══ -->
        <div class="left-panel">
            <div class="panel-header">
                <h2>Submit Draft Comments</h2>
                <div class="style-selector">
                    <label for="styleSelect">Prompt Style</label>
                    <select id="styleSelect">
                        <option value="concise"${defaultStyle === 'concise' ? ' selected' : ''}>Concise</option>
                        <option value="detailed"${defaultStyle === 'detailed' ? ' selected' : ''}>Detailed</option>
                    </select>
                </div>
            </div>

            <div class="drafts-list" id="draftsList">
                <div class="select-all-bar">
                    <input type="checkbox" id="selectAll" checked>
                    <span id="selectAllLabel">All selected (${drafts.length})</span>
                </div>
                <div id="draftsContainer">
                    ${draftsHtml}
                </div>
            </div>

            <div class="bottom-area">
                <div class="summary-label">Instructions / Summary</div>
                <textarea id="summaryText" placeholder="Write your instructions or questions here..." autofocus></textarea>
                <div class="button-group">
                    <button id="submitBtn" class="btn-primary">Submit to Copilot Chat</button>
                    <button id="cancelBtn" class="btn-secondary">Cancel</button>
                </div>
                <div class="submit-info" id="submitInfo"></div>
            </div>
        </div>

        <!-- ═══ Right Panel (Preview) ═══ -->
        <div class="right-panel">
            <div class="preview-header">
                <div class="preview-tab active" data-tab="rendered">Preview</div>
                <div class="preview-tab" data-tab="raw">Raw</div>
            </div>
            <div class="preview-content" id="previewContent">
                <div class="preview-empty">Edit drafts or type a summary to see the prompt preview…</div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentTab = 'rendered';
        let lastMarkdown = '';
        let lastRaw = '';

        // ── Elements ────────────────────────────────────────────
        const styleSelect = document.getElementById('styleSelect');
        const summaryText = document.getElementById('summaryText');
        const selectAllCb = document.getElementById('selectAll');
        const selectAllLabel = document.getElementById('selectAllLabel');
        const draftsContainer = document.getElementById('draftsContainer');
        const previewContent = document.getElementById('previewContent');
        const submitInfo = document.getElementById('submitInfo');

        // ── Style selector ──────────────────────────────────────
        styleSelect.addEventListener('change', () => requestPreview());

        // ── Summary textarea ────────────────────────────────────
        let debounceTimer = null;
        summaryText.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => requestPreview(), 300);
        });

        // ── Select All ──────────────────────────────────────────
        selectAllCb.addEventListener('change', () => {
            const cards = draftsContainer.querySelectorAll('.draft-card');
            cards.forEach(card => {
                const cb = card.querySelector('.draft-checkbox');
                cb.checked = selectAllCb.checked;
                card.classList.toggle('unchecked', !cb.checked);
            });
            updateSelectLabel();
            requestPreview();
        });

        // ── Preview tabs ────────────────────────────────────────
        document.querySelectorAll('.preview-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentTab = tab.dataset.tab;
                renderPreview();
            });
        });

        // ── Buttons ─────────────────────────────────────────────
        document.getElementById('submitBtn').addEventListener('click', () => {
            const selectedIds = getSelectedIds();
            if (selectedIds.length === 0) {
                submitInfo.textContent = '⚠ No drafts selected.';
                submitInfo.style.color = 'var(--vscode-errorForeground)';
                return;
            }
            vscode.postMessage({
                command: 'submit',
                text: summaryText.value,
                selectedIds: selectedIds,
                style: styleSelect.value
            });
        });



        document.getElementById('cancelBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
        });

        // ── Drag and Drop ───────────────────────────────────────
        let draggedCard = null;

        function initDragDrop() {
            const cards = draftsContainer.querySelectorAll('.draft-card');
            cards.forEach(card => {
                const handle = card.querySelector('.drag-handle');
                if (!handle) return;

                handle.addEventListener('mousedown', () => {
                    card.setAttribute('draggable', 'true');
                });

                card.addEventListener('dragstart', (e) => {
                    draggedCard = card;
                    card.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', card.dataset.id);
                });

                card.addEventListener('dragend', () => {
                    card.classList.remove('dragging');
                    card.setAttribute('draggable', 'false');
                    draftsContainer.querySelectorAll('.draft-card').forEach(c => c.classList.remove('drag-over'));
                    draggedCard = null;

                    // Notify extension of new order
                    const orderedIds = getOrderedIds();
                    vscode.postMessage({ command: 'reorderDrafts', orderedIds });
                    requestPreview();
                });

                card.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (card !== draggedCard) {
                        card.classList.add('drag-over');
                    }
                });

                card.addEventListener('dragleave', () => {
                    card.classList.remove('drag-over');
                });

                card.addEventListener('drop', (e) => {
                    e.preventDefault();
                    card.classList.remove('drag-over');
                    if (draggedCard && draggedCard !== card) {
                        const allCards = [...draftsContainer.querySelectorAll('.draft-card')];
                        const draggedIdx = allCards.indexOf(draggedCard);
                        const targetIdx = allCards.indexOf(card);
                        if (draggedIdx < targetIdx) {
                            card.after(draggedCard);
                        } else {
                            card.before(draggedCard);
                        }
                    }
                });
            });
        }

        // ── Inline editing ──────────────────────────────────────
        function initInlineEditing() {
            const comments = draftsContainer.querySelectorAll('.draft-comment');
            comments.forEach(el => {
                el.addEventListener('focus', () => {
                    el.classList.remove('draft-comment-empty');
                    if (el.dataset.empty === 'true') {
                        el.textContent = '';
                    }
                });
                el.addEventListener('blur', () => {
                    const id = el.closest('.draft-card').dataset.id;
                    const text = el.innerText.trim();
                    if (!text) {
                        el.innerText = 'Click to add comment...';
                        el.classList.add('draft-comment-empty');
                        el.dataset.empty = 'true';
                    } else {
                        el.dataset.empty = 'false';
                    }
                    vscode.postMessage({ command: 'updateDraftText', id, text });
                    requestPreview();
                });
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        el.blur();
                    } else if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        el.blur();
                    }
                });
            });
        }

        // ── Checkbox events ─────────────────────────────────────
        function initCheckboxes() {
            const checkboxes = draftsContainer.querySelectorAll('.draft-checkbox');
            checkboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    const card = cb.closest('.draft-card');
                    card.classList.toggle('unchecked', !cb.checked);
                    updateSelectLabel();
                    requestPreview();
                });
            });
        }

        // ── Helpers ─────────────────────────────────────────────
        function getSelectedIds() {
            const ids = [];
            draftsContainer.querySelectorAll('.draft-card').forEach(card => {
                const cb = card.querySelector('.draft-checkbox');
                if (cb && cb.checked) ids.push(card.dataset.id);
            });
            return ids;
        }

        function getOrderedIds() {
            const ids = [];
            draftsContainer.querySelectorAll('.draft-card').forEach(card => {
                ids.push(card.dataset.id);
            });
            return ids;
        }

        function updateSelectLabel() {
            const total = draftsContainer.querySelectorAll('.draft-card').length;
            const selected = draftsContainer.querySelectorAll('.draft-checkbox:checked').length;
            selectAllLabel.textContent = selected === total
                ? 'All selected (' + total + ')'
                : selected + ' of ' + total + ' selected';
            selectAllCb.checked = selected === total;
            selectAllCb.indeterminate = selected > 0 && selected < total;
        }

        function requestPreview() {
            vscode.postMessage({
                command: 'requestPreview',
                text: summaryText.value,
                selectedIds: getSelectedIds(),
                orderedIds: getOrderedIds(),
                style: styleSelect.value
            });
        }

        // ── Preview rendering ───────────────────────────────────
        function renderPreview() {
            if (!lastRaw && !lastMarkdown) {
                previewContent.innerHTML = '<div class="preview-empty">Edit drafts or type a summary to see the prompt preview…</div>';
                return;
            }
            if (currentTab === 'raw') {
                previewContent.innerHTML = '<pre class="preview-raw">' + escapeHtml(lastRaw) + '</pre>';
            } else {
                previewContent.innerHTML = '<div class="preview-markdown">' + lastMarkdown + '</div>';
            }
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // ── Message handling ────────────────────────────────────
        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.command === 'previewResult') {
                lastMarkdown = msg.markdown;
                lastRaw = msg.raw;
                renderPreview();
            } else if (msg.command === 'updateDraftsHtml') {
                draftsContainer.innerHTML = msg.html;
                initDragDrop();
                initInlineEditing();
                initCheckboxes();
                updateSelectLabel();
                requestPreview();
            }
        });

        // ── Init ────────────────────────────────────────────────
        initDragDrop();
        initInlineEditing();
        initCheckboxes();
        // Initial preview request
        setTimeout(() => requestPreview(), 100);
    </script>
</body>
</html>`;
}

// ── Draft card HTML builder ─────────────────────────────────────────

export async function getDraftsHtml(drafts: DraftItem[], maxPreviewLines: number): Promise<string> {
    const draftEntries = await Promise.all(drafts.map(async (draft, index) => {
        const filePath = vscode.workspace.asRelativePath(draft.uri);
        const startLine = (draft.thread.range || draft.range).start.line + 1;
        const endLine = (draft.thread.range || draft.range).end.line + 1;

        let documentText = draft.documentText;
        try {
            const document = await vscode.workspace.openTextDocument(draft.uri);
            documentText = document.getText(draft.thread.range || draft.range);
        } catch {
            // fallback to snapshot
        }

        // Code preview
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
                    Code <span class="draft-line-number">(${allLines.length} ${allLines.length === 1 ? 'line' : 'lines'})</span>
                </summary>
                <pre class="code-block"><code>${displayCode}${escapeHtml(suffix)}</code></pre>
            </details>`;
        }

        const lineInfo = startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`;
        const commentText = draft.text.trim();
        const isEmpty = !commentText;
        const commentDisplay = isEmpty ? 'Click to add comment...' : escapeHtml(commentText);
        const emptyClass = isEmpty ? ' draft-comment-empty' : '';

        const animDelay = `animation-delay: ${index * 0.04}s;`;

        return `<div class="draft-card" data-id="${escapeHtml(draft.id)}" style="${animDelay}">
            <div class="draft-card-inner">
                <input type="checkbox" class="draft-checkbox" checked>
                <span class="drag-handle" title="Drag to reorder">⠿</span>
                <div class="draft-content">
                    <div class="draft-file-header">${escapeHtml(filePath)} <span class="draft-line-number">(${lineInfo})</span></div>
                    <div class="draft-comment${emptyClass}" contenteditable="true" data-empty="${isEmpty}" spellcheck="false">${commentDisplay}</div>
                    ${codePreviewHtml}
                </div>
            </div>
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
