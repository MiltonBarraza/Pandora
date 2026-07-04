import { describe, expect, it } from 'vitest';
import type { CombineDraft } from '../combineDraft';
import {
  clearCombineDraft,
  combineDraftStorageKey,
  loadCombineDraft,
  normalizeCombineDraft,
  restoreCombineDraft,
  saveCombineDraft,
} from '../combineDraft';

describe('combine draft storage', () => {
  it('saves, loads and clears a valid draft', () => {
    const storage = memoryStorage();
    const draft = createDraft();

    saveCombineDraft(draft, storage);
    expect(loadCombineDraft(storage)).toEqual(draft);

    clearCombineDraft(storage);
    expect(storage.getItem(combineDraftStorageKey)).toBeNull();
  });

  it('ignores invalid JSON and unsupported schemas', () => {
    const storage = memoryStorage();
    storage.setItem(combineDraftStorageKey, '{invalid');
    expect(loadCombineDraft(storage)).toBeNull();

    expect(normalizeCombineDraft({ ...createDraft(), schemaVersion: 2 })).toBeNull();
    expect(normalizeCombineDraft({ ...createDraft(), resultSort: { columnId: null, direction: 'sideways' } })).toBeNull();
    expect(normalizeCombineDraft({
      ...createDraft(),
      outputColumns: [
        { id: 'duplicate', name: 'Uno' },
        { id: 'duplicate', name: 'Dos' },
      ],
    })).toBeNull();
    expect(normalizeCombineDraft({
      ...createDraft(),
      sourceOrder: ['basket:1', 'basket:1'],
    })).toBeNull();
    expect(normalizeCombineDraft({
      ...createDraft(),
      mappings: [
        ...createDraft().mappings,
        ...createDraft().mappings,
      ],
    })).toBeNull();
    expect(normalizeCombineDraft({
      ...createDraft(),
      outputColumns: [{ id: 'metadata:fileName', name: 'Reserved' }],
    })).toBeNull();
  });

  it('stays non-blocking when session storage is unavailable', () => {
    const unavailable = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    } as unknown as Storage;

    expect(() => saveCombineDraft(createDraft(), unavailable)).not.toThrow();
    expect(loadCombineDraft(unavailable)).toBeNull();
    expect(() => clearCombineDraft(unavailable)).not.toThrow();
  });
});

describe('restoreCombineDraft', () => {
  it('restores compatible source order, mappings and configuration', () => {
    const restored = restoreCombineDraft(createDraft(), [source('basket:2'), source('basket:1')]);

    expect(restored).toMatchObject({
      hasDraft: true,
      hasDiscardedSourceState: false,
      columnAssignmentMode: 'position',
      outputFileName: 'Reporte',
      sourceOrder: ['basket:1', 'basket:2'],
      mappings: [{ sourceId: 'basket:1', outputColumnId: 'code', sourceColumnId: 'col:0' }],
    });
  });

  it('drops source-dependent state safely when sources are missing', () => {
    const restored = restoreCombineDraft(createDraft(), [source('basket:2')]);

    expect(restored.hasDraft).toBe(true);
    expect(restored.hasDiscardedSourceState).toBe(true);
    expect(restored.sourceOrder).toEqual(['basket:2']);
    expect(restored.mappings).toEqual([]);
    expect(restored.outputColumns).toEqual([{ id: 'code', name: 'Código' }]);
  });

  it('disables sorting when its saved column no longer exists', () => {
    const draft = createDraft();
    draft.resultSort = { columnId: 'missing', direction: 'desc' };

    expect(restoreCombineDraft(draft, []).resultSort).toEqual({ columnId: null, direction: 'desc' });
  });
});

function createDraft(): CombineDraft {
  return {
    schemaVersion: 1,
    columnAssignmentMode: 'position',
    outputColumns: [{ id: 'code', name: 'Código' }],
    mappings: [{ sourceId: 'basket:1', outputColumnId: 'code', sourceColumnId: 'col:0' }],
    sourceMetadataOptions: { includeFileName: true, includeSheetName: false },
    resultSort: { columnId: 'code', direction: 'desc' },
    outputFileName: 'Reporte',
    sourceOrder: ['basket:1', 'basket:2'],
    sourceIds: ['basket:1', 'basket:2'],
    sourceSheets: [],
  };
}

function source(id: string) {
  return {
    id,
    fileName: `${id}.xlsx`,
    sheetName: 'Datos',
    columns: [{ id: 'col:0', name: 'Código', index: 0 }],
    rows: [],
  };
}

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}
