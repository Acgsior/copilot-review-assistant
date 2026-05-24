import * as assert from 'assert';
import * as vscode from 'vscode';
import { DraftStore } from '../../state/draftStore';
import { submitDrafts } from '../../commands/submitDrafts';

// Mock Webview Panel
class MockWebviewPanel implements vscode.WebviewPanel {
    viewType = 'submitDraftsReview';
    title = 'Submit Plan Review';
    iconPath?: vscode.Uri | { light: vscode.Uri; dark: vscode.Uri; } | vscode.ThemeIcon | undefined;
    webview = {
        options: {},
        html: '',
        onDidReceiveMessage: new vscode.EventEmitter<any>().event,
        postMessage: async (message: any) => {
            this.postedMessages.push(message);
            return true;
        },
        asWebviewUri: (uri: vscode.Uri) => uri,
        cspSource: ''
    };
    options: vscode.WebviewPanelOptions = {};
    viewColumn = vscode.ViewColumn.One;
    active = true;
    visible = true;

    private _onDidDispose = new vscode.EventEmitter<void>();
    onDidDispose = this._onDidDispose.event;
    private _onDidChangeViewState = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();
    onDidChangeViewState = this._onDidChangeViewState.event;

    // Custom for tracking
    revealed = false;
    postedMessages: any[] = [];

    reveal(_viewColumn?: vscode.ViewColumn, _preserveFocus?: boolean): void {
        this.revealed = true;
    }
    dispose(): void {
        this._onDidDispose.fire();
    }
}

suite('SubmitDrafts Test Suite', () => {
    let store: DraftStore;
    let commentController: vscode.CommentController;
    let originalCreateWebviewPanel: any;
    let mockPanels: MockWebviewPanel[] = [];

    setup(() => {
        const memento = {
            keys: () => [],
            get: (_key: string, defaultValue?: any) => defaultValue,
            update: async () => { }
        } as unknown as vscode.Memento;

        commentController = vscode.comments.createCommentController('test-controller', 'Test');
        store = new DraftStore(memento, commentController);

        // Override VS Code's createWebviewPanel
        originalCreateWebviewPanel = vscode.window.createWebviewPanel;
        vscode.window.createWebviewPanel = () => {
            const panel = new MockWebviewPanel();
            mockPanels.push(panel);
            return panel as any;
        };
        mockPanels = [];
    });

    teardown(() => {
        store.dispose();
        commentController.dispose();
        vscode.window.createWebviewPanel = originalCreateWebviewPanel;

        // Ensure panels are disposed to reset module-level singleton state
        for (const panel of mockPanels) {
            panel.dispose();
        }
    });

    test('submitDrafts should create a singleton panel', async () => {
        // Add a draft to trigger opening
        const uri = vscode.Uri.parse('untitled:test.ts');
        const range = new vscode.Range(0, 0, 5, 0);
        store.addDraft({
            id: 'd1',
            text: 'test',
            uri,
            range,
            documentLanguage: 'ts',
            documentText: 'console.log()',
            thread: commentController.createCommentThread(uri, range, [])
        });

        await submitDrafts(store);
        assert.strictEqual(mockPanels.length, 1, 'First call creates one panel');

        await submitDrafts(store);
        assert.strictEqual(mockPanels.length, 1, 'Second call should not create another panel');
        assert.ok(mockPanels[0].revealed, 'Second call should reveal the existing panel');
    });

    test('submitDrafts should sync data when drafts change', async () => {
        const uri = vscode.Uri.parse('untitled:test.ts');
        const range = new vscode.Range(0, 0, 5, 0);
        store.addDraft({
            id: 'd1',
            text: 'test',
            uri,
            range,
            documentLanguage: 'ts',
            documentText: 'console.log()',
            thread: commentController.createCommentThread(uri, range, [])
        });

        await submitDrafts(store);
        const panel = mockPanels[0];

        // Add a new draft
        store.addDraft({
            id: 'd2',
            text: 'another test',
            uri,
            range,
            documentLanguage: 'ts',
            documentText: 'let x = 1;',
            thread: commentController.createCommentThread(uri, range, [])
        });

        // The listener is synchronous, but let's allow microtasks just in case
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.strictEqual(panel.postedMessages.length, 1, 'Should have posted exactly one update message');
        assert.strictEqual(panel.postedMessages[0].command, 'updateDraftsHtml');
        assert.ok(panel.postedMessages[0].html.includes('another test'), 'Update message should contain new draft');
    });
});
