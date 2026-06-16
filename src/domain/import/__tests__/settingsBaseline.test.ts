import { describe, expect, it, vi } from 'vitest';
import type { ExportedImportSettings } from '../../../types/import';
import {
  createSettingsComparisonKey,
  hasRelevantSettingsChanges,
  shouldDownloadAfterSaveChoice,
} from '../settingsBaseline';

describe('settingsBaseline', () => {
  it('does not prompt when current configuration matches a baseline', () => {
    const current = createSettingsComparisonKey(createSettings({ outputLabel: 'Cliente' }));

    expect(hasRelevantSettingsChanges(current, [current])).toBe(false);
  });

  it('prompts when current configuration differs from baselines', () => {
    const baseline = createSettingsComparisonKey(createSettings({ outputLabel: 'Cliente' }));
    const current = createSettingsComparisonKey(createSettings({ outputLabel: 'Razón social' }));

    expect(hasRelevantSettingsChanges(current, [baseline])).toBe(true);
  });

  it('compares serializable objects without depending on object property order', () => {
    const left = createSettingsComparisonKey(createSettings({
      fileNameSettings: { mode: 'custom', customName: 'salida', baseText: 'x', includeDate: true },
    }));
    const right = createSettingsComparisonKey(createSettings({
      fileNameSettings: { includeDate: true, baseText: 'x', customName: 'salida', mode: 'custom' },
    }));

    expect(left).toBe(right);
  });

  it('downloads after saving successfully', async () => {
    const save = vi.fn(() => true);

    await expect(shouldDownloadAfterSaveChoice('save', save)).resolves.toBe(true);
    expect(save).toHaveBeenCalledOnce();
  });

  it('downloads without saving when user skips save', async () => {
    const save = vi.fn(() => false);

    await expect(shouldDownloadAfterSaveChoice('skip', save)).resolves.toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not download when user cancels', async () => {
    const save = vi.fn(() => true);

    await expect(shouldDownloadAfterSaveChoice('cancel', save)).resolves.toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not download when save fails or is cancelled', async () => {
    const save = vi.fn(() => false);

    await expect(shouldDownloadAfterSaveChoice('save', save)).resolves.toBe(false);
  });
});

function createSettings({
  outputLabel = 'Cliente',
  fileNameSettings = {},
}: {
  outputLabel?: string;
  fileNameSettings?: Record<string, unknown>;
} = {}): ExportedImportSettings {
  return {
    schemaVersion: 1,
    app: 'excel-sanitizer',
    exportedAt: '2026-06-12T00:00:00.000Z',
    sourceSnapshot: {
      fileType: 'spreadsheet',
      rowCount: 1,
      headerRowIndex: null,
      startRowIndex: 0,
      columns: [],
    },
    config: {
      headerRowIndex: null,
      startRowIndex: 0,
      columnVisibility: [],
      inputColumnAliases: {},
      inputIgnoreRules: [],
      outputColumns: [{
        id: 'out-1',
        label: outputLabel,
        order: 0,
        enabled: true,
        recipe: { type: 'empty' },
      }],
      outputIgnoreRules: [],
      fileNameSettings: {
        mode: 'default',
        customName: '',
        baseText: '',
        includeBaseText: false,
        includeOriginalName: true,
        includeSheetName: true,
        includeDate: false,
        ...fileNameSettings,
      },
    },
  };
}
