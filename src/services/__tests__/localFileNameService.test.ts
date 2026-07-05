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

describe('localFileNameService', () => {
  it('defaults includeTime to false', async () => {
    const { defaultFileNameSettings } = await import('../localFileNameService');

    expect(defaultFileNameSettings()).toMatchObject({
      baseText: 'Archivo preparado',
      includeDate: false,
      includeTime: false,
    });
  });

  it('normalizes older settings without includeTime', async () => {
    const { normalizeFileNameSettings } = await import('../localFileNameService');

    expect(normalizeFileNameSettings({
      mode: 'default',
      customName: '',
      baseText: 'Archivo sanitizado',
      includeBaseText: true,
      includeOriginalName: true,
      includeSheetName: true,
      includeDate: true,
    })).toMatchObject({
      includeDate: true,
      includeTime: false,
    });
  });

  it('turns includeTime off when includeDate is disabled', async () => {
    const { normalizeFileNameSettings } = await import('../localFileNameService');

    expect(normalizeFileNameSettings({
      includeDate: false,
      includeTime: true,
    })).toMatchObject({
      includeDate: false,
      includeTime: false,
    });
  });

  it('loads old saved settings with includeTime defaulted to false', async () => {
    const { loadFileNameSettings } = await import('../localFileNameService');
    storage.set('excel-sanitizer:file-name-settings', JSON.stringify({
      mode: 'default',
      customName: '',
      baseText: 'Archivo sanitizado',
      includeBaseText: true,
      includeOriginalName: true,
      includeSheetName: true,
      includeDate: true,
    }));

    expect(loadFileNameSettings()).toMatchObject({
      includeDate: true,
      includeTime: false,
    });
  });
});
