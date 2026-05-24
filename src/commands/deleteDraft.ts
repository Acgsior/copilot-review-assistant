import { DraftStore } from '../state/draftStore';

/**
 * Deletes a draft by ID, cleaning up its associated comment thread.
 * Accepts either a raw string ID or an object with draftId/id property.
 */
export function deleteDraft(arg: unknown, store: DraftStore): void {
    let id: string | undefined;

    if (typeof arg === 'string') {
        id = arg;
    } else if (arg && typeof arg === 'object') {
        const obj = arg as Record<string, unknown>;
        id = (obj.draftId || obj.id) as string | undefined;
    }

    if (id) {
        store.removeDraft(id);
    }
}
