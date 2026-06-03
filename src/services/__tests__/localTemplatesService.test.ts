import { afterEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
});

afterEach(() => {
  storage.clear();
});

describe('localTemplatesService', () => {
  it('splits legacy ignoreRules into input and output rules', async () => {
    const { loadPersistedSettings } = await import('../localTemplatesService');

    storage.set(
      'excel-sanitizer:generic-settings',
      JSON.stringify({
        ignoreRules: [
          { id: 'input-rule', target: 'input', columnId: 'input-0', operator: 'isEmpty' },
          { id: 'output-rule', target: 'output', columnId: 'code', operator: 'contains', value: 'X' },
        ],
      }),
    );

    expect(loadPersistedSettings()).toMatchObject({
      inputIgnoreRules: [{ id: 'input-rule', target: 'input', columnId: 'input-0', operator: 'isEmpty' }],
      outputIgnoreRules: [{ id: 'output-rule', target: 'output', columnId: 'code', operator: 'contains', value: 'X' }],
    });
  });

  it('prefers current split ignore rules over legacy mixed rules', async () => {
    const { loadPersistedSettings } = await import('../localTemplatesService');

    storage.set(
      'excel-sanitizer:generic-settings',
      JSON.stringify({
        ignoreRules: [{ id: 'legacy', target: 'input', columnId: 'input-0', operator: 'isEmpty' }],
        inputIgnoreRules: [{ id: 'current-input', target: 'input', columnId: 'input-1', operator: 'isNotEmpty' }],
        outputIgnoreRules: [{ id: 'current-output', target: 'output', columnId: 'name', operator: 'isEmpty' }],
      }),
    );

    expect(loadPersistedSettings()).toMatchObject({
      inputIgnoreRules: [{ id: 'current-input', target: 'input', columnId: 'input-1', operator: 'isNotEmpty' }],
      outputIgnoreRules: [{ id: 'current-output', target: 'output', columnId: 'name', operator: 'isEmpty' }],
    });
  });
});
