import { describe, expect, it, vi } from 'vitest';
import type { ExportedImportSettings, FileNameSettings } from '../../types/import';
import {
  downloadImportSettingsFile,
  getImportSettingsFileName,
  parseImportSettingsJson,
  serializeImportSettings,
  validateImportedSettings,
} from '../settingsFileService';

const fileNameSettings: FileNameSettings = {
  mode: 'default',
  customName: '',
  baseText: 'Archivo sanitizado',
  includeBaseText: true,
  includeOriginalName: true,
  includeSheetName: true,
  includeDate: false,
};

function buildSettings(partial: Partial<ExportedImportSettings> = {}): ExportedImportSettings {
  return {
    schemaVersion: 1,
    app: 'excel-sanitizer',
    exportedAt: '2026-06-04T13:00:00.000Z',
    name: 'Proveedor Ñandú / Lista #1',
    sourceSnapshot: {
      fileType: 'spreadsheet',
      sheetName: 'Hoja Principal',
      sheetNames: ['Hoja Principal'],
      rowCount: 10,
      headerRowIndex: 0,
      startRowIndex: 1,
      columns: [],
    },
    config: {
      selectedSheet: 'Hoja Principal',
      headerRowIndex: 0,
      startRowIndex: 1,
      columnVisibility: [],
      inputColumnAliases: {},
      inputIgnoreRules: [],
      outputColumns: [],
      outputIgnoreRules: [],
      fileNameSettings,
    },
    ...partial,
  };
}

describe('settingsFileService', () => {
  it('serializes import settings as readable JSON without mutating the original object', () => {
    const settings = buildSettings();
    const before = JSON.stringify(settings);
    const json = serializeImportSettings(settings);

    expect(json).toContain('\n  "schemaVersion": 1');
    expect(JSON.parse(json)).toMatchObject({
      schemaVersion: 1,
      app: 'excel-sanitizer',
      exportedAt: '2026-06-04T13:00:00.000Z',
      sourceSnapshot: settings.sourceSnapshot,
      config: settings.config,
    });
    expect(JSON.stringify(settings)).toBe(before);
  });

  it('parses valid settings JSON', () => {
    const settings = buildSettings();
    const result = parseImportSettingsJson(serializeImportSettings(settings));

    expect(result).toEqual({
      ok: true,
      settings,
    });
  });

  it('returns a controlled error for invalid JSON', () => {
    const result = parseImportSettingsJson('{invalid');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('JSON valido');
    }
  });

  it('rejects settings from another app', () => {
    const result = validateImportedSettings({ ...buildSettings(), app: 'other-app' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('excel-sanitizer');
    }
  });

  it('rejects unsupported schema versions', () => {
    const result = validateImportedSettings({ ...buildSettings(), schemaVersion: 2 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('version');
    }
  });

  it('rejects missing sourceSnapshot and config', () => {
    const { sourceSnapshot: _sourceSnapshot, ...withoutSnapshot } = buildSettings();
    const { config: _config, ...withoutConfig } = buildSettings();

    const snapshotResult = validateImportedSettings(withoutSnapshot);
    const configResult = validateImportedSettings(withoutConfig);

    expect(snapshotResult.ok).toBe(false);
    expect(configResult.ok).toBe(false);
    if (!snapshotResult.ok) {
      expect(snapshotResult.error).toContain('snapshot');
    }
    if (!configResult.ok) {
      expect(configResult.error).toContain('configuracion');
    }
  });

  it('validates the minimum config structure', () => {
    const settings = buildSettings({
      config: {
        ...buildSettings().config,
        outputColumns: undefined as unknown as ExportedImportSettings['config']['outputColumns'],
      },
    });

    const result = validateImportedSettings(settings);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('config.outputColumns');
    }
  });

  it('generates safe JSON file names from name or sheet fallback', () => {
    expect(getImportSettingsFileName(buildSettings())).toBe('excel-sanitizer-settings-proveedor-nandu-lista-1-2026-06-04.json');
    expect(getImportSettingsFileName(buildSettings({ name: undefined }))).toBe('excel-sanitizer-settings-hoja-principal-2026-06-04.json');
  });

  it('downloads a JSON blob with application/json content type', async () => {
    const settings = buildSettings();
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:settings');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.fn();
    const link = {
      href: '',
      download: '',
      click,
    };
    const previousDocument = globalThis.document;
    vi.stubGlobal('document', {
      createElement: vi.fn(() => link),
    });

    try {
      downloadImportSettingsFile(settings);

      expect(createObjectUrl).toHaveBeenCalledTimes(1);
      const blob = createObjectUrl.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('application/json;charset=utf-8');
      expect(JSON.parse(await blob.text())).toMatchObject({ app: 'excel-sanitizer' });
      expect(click).toHaveBeenCalledTimes(1);
      expect(link.href).toBe('blob:settings');
      expect(link.download).toBe('excel-sanitizer-settings-proveedor-nandu-lista-1-2026-06-04.json');
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:settings');
    } finally {
      createObjectUrl.mockRestore();
      revokeObjectUrl.mockRestore();
      vi.stubGlobal('document', previousDocument);
    }
  });
});
