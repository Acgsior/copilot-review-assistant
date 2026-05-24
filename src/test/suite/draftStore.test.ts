import * as assert from 'assert';
import * as vscode from 'vscode';
import { DraftStore } from '../../state/draftStore';
import { DraftItem } from '../../models/draftItem';

/**
 * Mock implementation of vscode.Memento for testing persistence.
 */
class MockMemento implements vscode.Memento {
    private storage = new Map<string, unknown>();

    keys(): readonly string[] {
        return [...this.storage.keys()];
    }

    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get<T>(key: string, defaultValue?: T): T | undefined {
        const value = this.storage.get(key);
        return value !== undefined ? value as T : defaultValue;
    }

    async update(key: string, value: unknown): Promise<void> {
        this.storage.set(key, value);
    }
}

suite('DraftStore Test Suite', () => {
    let store: DraftStore;
    let memento: MockMemento;
    let commentController: vscode.CommentController;

    setup(() => {
        memento = new MockMemento();
        commentController = vscode.comments.createCommentController('test-controller', 'Test');
        store = new DraftStore(memento, commentController);
    });

    teardown(() => {
        store.dispose();
        commentController.dispose();
    });

    // ── Helper ──────────────────────────────────────────────────────

    function createMockDraft(id?: string): DraftItem {
        const uri = vscode.Uri.parse('untitled:test.ts');
        const range = new vscode.Range(0, 0, 5, 0);
        const thread = commentController.createCommentThread(uri, range, []);

        return {
            id: id || `draft-${Date.now()}`,
            text: 'Fix this bug',
            uri,
            range,
            documentLanguage: 'typescript',
            documentText: 'const x = 1;',
            thread
        };
    }

    // ── CRUD tests ──────────────────────────────────────────────────

    test('addDraft should increase draft count', () => {
        assert.strictEqual(store.getAllDrafts().length, 0);
        assert.strictEqual(store.hasDrafts, false);

        store.addDraft(createMockDraft('d1'));

        assert.strictEqual(store.getAllDrafts().length, 1);
        assert.strictEqual(store.hasDrafts, true);
    });

    test('getDraft should return draft by id', () => {
        store.addDraft(createMockDraft('d1'));
        store.addDraft(createMockDraft('d2'));

        const draft = store.getDraft('d1');
        assert.ok(draft);
        assert.strictEqual(draft.id, 'd1');
    });

    test('getDraft should return undefined for non-existent id', () => {
        const draft = store.getDraft('nonexistent');
        assert.strictEqual(draft, undefined);
    });

    test('removeDraft should decrease draft count', () => {
        store.addDraft(createMockDraft('d1'));
        store.addDraft(createMockDraft('d2'));
        assert.strictEqual(store.getAllDrafts().length, 2);

        store.removeDraft('d1');

        assert.strictEqual(store.getAllDrafts().length, 1);
        assert.strictEqual(store.getDraft('d1'), undefined);
        assert.ok(store.getDraft('d2'));
    });

    test('removeDraft should handle non-existent id gracefully', () => {
        store.addDraft(createMockDraft('d1'));
        store.removeDraft('nonexistent');
        assert.strictEqual(store.getAllDrafts().length, 1);
    });

    test('removeDraftData should only remove from data store', () => {
        const draft = createMockDraft('d1');
        store.addDraft(draft);

        store.removeDraftData('d1');

        assert.strictEqual(store.getAllDrafts().length, 0);
    });

    test('updateDraftText should change the draft text', () => {
        store.addDraft(createMockDraft('d1'));

        store.updateDraftText('d1', 'Updated text');

        const draft = store.getDraft('d1');
        assert.ok(draft);
        assert.strictEqual(draft.text, 'Updated text');
    });

    test('clearDrafts should remove all drafts', () => {
        store.addDraft(createMockDraft('d1'));
        store.addDraft(createMockDraft('d2'));
        store.addDraft(createMockDraft('d3'));

        store.clearDrafts();

        assert.strictEqual(store.getAllDrafts().length, 0);
        assert.strictEqual(store.hasDrafts, false);
    });

    // ── Event tests ─────────────────────────────────────────────────

    test('onDidChange should fire on addDraft', (done) => {
        store.onDidChange(drafts => {
            assert.strictEqual(drafts.length, 1);
            done();
        });

        store.addDraft(createMockDraft('d1'));
    });

    test('onDidChange should fire on removeDraft', (done) => {
        store.addDraft(createMockDraft('d1'));

        let callCount = 0;
        store.onDidChange(drafts => {
            callCount++;
            if (callCount === 1) {
                assert.strictEqual(drafts.length, 0);
                done();
            }
        });

        store.removeDraft('d1');
    });

    test('onDidChange should fire on clearDrafts', (done) => {
        store.addDraft(createMockDraft('d1'));
        store.addDraft(createMockDraft('d2'));

        let callCount = 0;
        store.onDidChange(drafts => {
            callCount++;
            if (callCount === 1) {
                assert.strictEqual(drafts.length, 0);
                done();
            }
        });

        store.clearDrafts();
    });

    // ── Persistence tests ───────────────────────────────────────────

    test('persistence: drafts should survive store recreation', async () => {
        store.addDraft(createMockDraft('d1'));
        store.addDraft(createMockDraft('d2'));

        // Create a new store with the same memento
        const newController = vscode.comments.createCommentController('test-controller-2', 'Test 2');
        const newStore = new DraftStore(memento, newController);

        await newStore.restore();

        assert.strictEqual(newStore.getAllDrafts().length, 2);
        assert.ok(newStore.getDraft('d1'));
        assert.ok(newStore.getDraft('d2'));

        newStore.dispose();
        newController.dispose();
    });

    test('persistence: restored drafts should have valid ranges', async () => {
        const draft = createMockDraft('d1');
        store.addDraft(draft);

        const newController = vscode.comments.createCommentController('test-controller-4', 'Test 4');
        const newStore = new DraftStore(memento, newController);

        await newStore.restore();

        const restored = newStore.getDraft('d1');
        assert.ok(restored);
        assert.strictEqual(restored.range.start.line, 0);
        assert.strictEqual(restored.range.end.line, 5);
        assert.strictEqual(restored.documentLanguage, 'typescript');
        assert.strictEqual(restored.text, 'Fix this bug');

        newStore.dispose();
        newController.dispose();
    });

    // ── Immutability tests ──────────────────────────────────────────

    test('getAllDrafts should return a copy', () => {
        store.addDraft(createMockDraft('d1'));

        const drafts1 = store.getAllDrafts();
        const drafts2 = store.getAllDrafts();

        assert.notStrictEqual(drafts1, drafts2);
        assert.deepStrictEqual(drafts1.map(d => d.id), drafts2.map(d => d.id));
    });
});
