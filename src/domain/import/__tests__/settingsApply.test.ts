import { describe, expect, it } from 'vitest';
import type { ColumnAnalysis, ExportedImportSettings, FileNameSettings } from '../../../types/import';
import { applyColumnVisibilitySettings, createApplyPayloadFromSettings, resolveImportedPreviewSettings } from '../settingsApply';

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
    sourceSnapshot: {
      fileType: 'spreadsheet',
      sheetName: 'Hoja 1',
      rowCount: 10,
      headerRowIndex: 0,
      startRowIndex: 1,
      columns: [],
    },
    config: {
      selectedSheet: 'Hoja 1',
      headerRowIndex: 0,
      startRowIndex: 1,
      showRawPreviewFromDataStart: false,
      showAllRawPreviewColumns: true,
      columnVisibility: [
        {
          inputColumnId: 'input-0',
          columnIndex: 0,
          columnLetter: 'A',
          header: 'Codigo',
          active: true,
        },
      ],
      inputColumnAliases: { 'input-0': 'Codigo' },
      inputIgnoreRules: [
        { id: 'input-rule', target: 'input', columnId: 'input-0', operator: 'isNotEmpty' },
      ],
      outputColumns: [
        {
          id: 'output-code',
          label: 'Codigo',
          order: 0,
          enabled: true,
          recipe: { type: 'direct', inputColumnId: 'input-0' },
        },
      ],
      outputIgnoreRules: [
        { id: 'output-rule', target: 'output', columnId: 'output-code', operator: 'contains', value: 'X' },
      ],
      fileNameSettings,
    },
    ...partial,
  };
}

describe('settingsApply', () => {
  it('creates an apply payload from valid settings', () => {
    const result = createApplyPayloadFromSettings(buildSettings());

    expect(result).toEqual({
      ok: true,
      payload: {
        selectedSheet: 'Hoja 1',
        headerRowIndex: 0,
        startRowIndex: 1,
        showRawPreviewFromDataStart: false,
        columnVisibility: [
          {
            inputColumnId: 'input-0',
            columnIndex: 0,
            columnLetter: 'A',
            header: 'Codigo',
            active: true,
          },
        ],
        inputColumnAliases: { 'input-0': 'Codigo' },
        inputIgnoreRules: [
          { id: 'input-rule', target: 'input', columnId: 'input-0', operator: 'isNotEmpty' },
        ],
        outputColumns: [
          {
            id: 'output-code',
            label: 'Codigo',
            order: 0,
            enabled: true,
            recipe: { type: 'direct', inputColumnId: 'input-0' },
          },
        ],
        outputIgnoreRules: [
          { id: 'output-rule', target: 'output', columnId: 'output-code', operator: 'contains', value: 'X' },
        ],
        fileNameSettings,
      },
    });
  });

  it('does not include sourceSnapshot or transient data in the apply payload', () => {
    const result = createApplyPayloadFromSettings(buildSettings());

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.payload).not.toHaveProperty('sourceSnapshot');
    expect(result.payload).not.toHaveProperty('workbook');
    expect(result.payload).not.toHaveProperty('rows');
    expect(result.payload).not.toHaveProperty('processedRows');
    expect(result.payload).not.toHaveProperty('auditRows');
    expect(result.payload).not.toHaveProperty('rowOverrides');
  });

  it('preserves date recipes in the apply payload', () => {
    const settings = buildSettings({
      config: {
        ...buildSettings().config,
        outputColumns: [
          {
            id: 'output-date',
            label: 'Fecha',
            order: 0,
            enabled: true,
            recipe: {
              type: 'combine',
              customMode: 'text',
              parts: [{ id: 'date-part', type: 'input', inputColumnId: 'input-0' }],
              steps: [{
                id: 'format-date',
                mode: 'date',
                type: 'formatDate',
                dateInputFormat: 'DD/MM/YYYY',
                dateOutputFormat: 'YYYY-MM-DD',
                dateInvalidFallback: 'original',
              }],
            },
          },
        ],
      },
    });

    const result = createApplyPayloadFromSettings(settings);

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.payload.outputColumns[0].recipe).toMatchObject({
      type: 'combine',
      steps: [{
        id: 'format-date',
        mode: 'date',
        type: 'formatDate',
        dateInputFormat: 'DD/MM/YYYY',
        dateOutputFormat: 'YYYY-MM-DD',
        dateInvalidFallback: 'original',
      }],
    });
  });

  it('preserves manual range valueSource recipes in the apply payload', () => {
    const manualRangeRecipe = {
      type: 'manualRange' as const,
      ranges: [
        {
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueSource: { type: 'fixedText' as const, value: 'Cerda china mango amarillo' },
        },
      ],
      condition: { inputColumnId: 'input-1', operator: 'isNotEmpty' as const },
    };
    const settings = buildSettings({
      config: {
        ...buildSettings().config,
        outputColumns: [
          {
            id: 'output-comment',
            label: 'Comentario',
            order: 0,
            enabled: true,
            recipe: manualRangeRecipe,
          },
        ],
      },
    });

    const result = createApplyPayloadFromSettings(settings);

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.payload.outputColumns[0].recipe).toEqual(manualRangeRecipe);
  });

  it('preserves manual range rangeText sources in the apply payload', () => {
    const manualRangeRecipe = {
      type: 'manualRange' as const,
      ranges: [
        {
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueSource: { type: 'rangeText' as const, inputColumnId: 'input-brand', selectedText: 'Sinteplast' },
        },
      ],
    };
    const settings = buildSettings({
      config: {
        ...buildSettings().config,
        outputColumns: [
          {
            id: 'output-comment',
            label: 'Comentario',
            order: 0,
            enabled: true,
            recipe: manualRangeRecipe,
          },
        ],
      },
    });

    const result = createApplyPayloadFromSettings(settings);

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.payload.outputColumns[0].recipe).toEqual(manualRangeRecipe);
  });

  it('preserves manual range value recipes in the apply payload', () => {
    const manualRangeRecipe = {
      type: 'manualRange' as const,
      ranges: [
        {
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'input' as const, inputColumnId: 'input-brand' },
            steps: [{
              id: 'concat',
              type: 'concat' as const,
              parts: [
                { id: 'brand', source: { type: 'input' as const, inputColumnId: 'input-brand' } },
                { id: 'fixed', source: { type: 'fixedText' as const, value: 'OK' }, separatorBefore: ' - ' },
              ],
            }],
          },
        },
      ],
    };
    const settings = buildSettings({
      config: {
        ...buildSettings().config,
        outputColumns: [
          {
            id: 'output-comment',
            label: 'Comentario',
            order: 0,
            enabled: true,
            recipe: manualRangeRecipe,
          },
        ],
      },
    });

    const result = createApplyPayloadFromSettings(settings);

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.payload.outputColumns[0].recipe).toEqual(manualRangeRecipe);
    expect(result.payload.outputColumns[0].recipe).not.toBe(manualRangeRecipe);
  });

  it('preserves manual range valueSource and valueRecipe together in the apply payload', () => {
    const manualRangeRecipe = {
      type: 'manualRange' as const,
      ranges: [
        {
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueSource: { type: 'rangeText' as const, inputColumnId: 'input-legacy', selectedText: 'Legacy' },
          valueRecipe: {
            source: { type: 'input' as const, inputColumnId: 'input-brand' },
            steps: [{ id: 'trim', type: 'trim' as const }],
          },
        },
      ],
    };
    const settings = buildSettings({
      config: {
        ...buildSettings().config,
        outputColumns: [
          {
            id: 'output-comment',
            label: 'Comentario',
            order: 0,
            enabled: true,
            recipe: manualRangeRecipe,
          },
        ],
      },
    });

    const result = createApplyPayloadFromSettings(settings);

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.payload.outputColumns[0].recipe).toEqual(manualRangeRecipe);
  });

  it('preserves legacy manual range values in the apply payload', () => {
    const manualRangeRecipe = {
      type: 'manualRange' as const,
      ranges: [
        { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Cerda china mango amarillo' },
      ],
      condition: { inputColumnId: 'input-1', operator: 'isNotEmpty' as const },
    };
    const settings = buildSettings({
      config: {
        ...buildSettings().config,
        outputColumns: [
          {
            id: 'output-comment',
            label: 'Comentario',
            order: 0,
            enabled: true,
            recipe: manualRangeRecipe,
          },
        ],
      },
    });

    const result = createApplyPayloadFromSettings(settings);

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.payload.outputColumns[0].recipe).toEqual(manualRangeRecipe);
  });

  it('does not mutate settings and clones arrays and objects defensively', () => {
    const settings = buildSettings();
    const before = JSON.stringify(settings);
    const result = createApplyPayloadFromSettings(settings);

    if (!result.ok) {
      throw new Error(result.error);
    }

    result.payload.outputColumns[0].label = 'Mutada';
    result.payload.inputIgnoreRules[0].columnId = 'input-mutated';
    result.payload.inputColumnAliases['input-0'] = 'Mutado';
    result.payload.fileNameSettings.baseText = 'Mutado';

    expect(JSON.stringify(settings)).toBe(before);
    expect(settings.config.outputColumns[0].label).toBe('Codigo');
    expect(settings.config.inputIgnoreRules[0].columnId).toBe('input-0');
    expect(settings.config.inputColumnAliases['input-0']).toBe('Codigo');
    expect(settings.config.fileNameSettings.baseText).toBe('Archivo sanitizado');
  });

  it('keeps optional preview settings absent for older exported settings', () => {
    const settings = buildSettings();
    delete settings.config.showRawPreviewFromDataStart;
    delete settings.config.showAllRawPreviewColumns;

    const result = createApplyPayloadFromSettings(settings);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).not.toHaveProperty('showRawPreviewFromDataStart');
      expect(result.payload).not.toHaveProperty('showAllRawPreviewColumns');
    }
  });

  it('preserves explicit false preview start and ignores obsolete all-columns preview setting', () => {
    const settings = buildSettings();
    settings.config.showRawPreviewFromDataStart = false;
    settings.config.showAllRawPreviewColumns = false;

    const result = createApplyPayloadFromSettings(settings);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.showRawPreviewFromDataStart).toBe(false);
      expect(result.payload).not.toHaveProperty('showAllRawPreviewColumns');
    }
  });

  it('resolves imported preview settings without confusing undefined and false', () => {
    expect(resolveImportedPreviewSettings(
      { showRawPreviewFromDataStart: true },
      { showRawPreviewFromDataStart: false, showAllRawPreviewColumns: false },
    )).toEqual({
      showRawPreviewFromDataStart: false,
    });

    expect(resolveImportedPreviewSettings(
      { showRawPreviewFromDataStart: false },
      {},
    )).toEqual({
      showRawPreviewFromDataStart: false,
    });
  });

  it('applies saved active state and ignored reason to current columns', () => {
    const columns: ColumnAnalysis[] = [
      {
        columnIndex: 0,
        columnLetter: 'A',
        sampleValues: ['001'],
        nonEmptyCount: 1,
        isEmpty: false,
        ignored: false,
        autoIgnored: false,
      },
      {
        columnIndex: 1,
        columnLetter: 'B',
        sampleValues: [],
        nonEmptyCount: 0,
        isEmpty: true,
        ignored: true,
        ignoredReason: 'empty',
        autoIgnored: true,
        autoIgnoredReason: 'empty',
      },
    ];

    const result = applyColumnVisibilitySettings(columns, {
      inputColumnAliases: { 'input-0': 'Codigo' },
      columnVisibility: [
        { inputColumnId: 'input-0', columnIndex: 0, columnLetter: 'A', active: false, ignoredReason: 'manual' },
        { inputColumnId: 'input-1', columnIndex: 1, columnLetter: 'B', active: true },
      ],
    });

    expect(result[0]).toMatchObject({ alias: 'Codigo', ignored: true, ignoredReason: 'manual' });
    expect(result[0].ignoredReasons).toEqual(['manual']);
    expect(result[1]).toMatchObject({ ignored: false });
    expect(result[1].ignoredReason).toBeUndefined();
    expect(result[1].ignoredReasons).toBeUndefined();
    expect(columns[0].ignored).toBe(false);
    expect(columns[1].ignored).toBe(true);
  });

  it('restores multiple ignored reasons and automatic reasons from saved visibility', () => {
    const columns: ColumnAnalysis[] = [
      {
        columnIndex: 0,
        columnLetter: 'A',
        sampleValues: [],
        nonEmptyCount: 0,
        isEmpty: true,
        isHidden: true,
        ignored: false,
        autoIgnored: true,
        autoIgnoredReason: 'hidden',
        autoIgnoredReasons: ['hidden', 'empty'],
      },
    ];

    const result = applyColumnVisibilitySettings(columns, {
      inputColumnAliases: { 'input-0': 'Codigo' },
      columnVisibility: [
        {
          inputColumnId: 'input-0',
          columnIndex: 0,
          columnLetter: 'A',
          active: false,
          ignoredReason: 'hidden',
          ignoredReasons: ['hidden', 'empty', 'hidden'],
          autoIgnoredReason: 'hidden',
          autoIgnoredReasons: ['hidden', 'empty', 'hidden'],
        },
      ],
    });

    expect(result[0]).toMatchObject({
      alias: 'Codigo',
      ignored: true,
      ignoredReason: 'hidden',
      ignoredReasons: ['hidden', 'empty'],
      autoIgnoredReason: 'hidden',
      autoIgnoredReasons: ['hidden', 'empty'],
    });
  });

  it('preserves current visibility when older column settings do not include active', () => {
    const columns: ColumnAnalysis[] = [
      {
        columnIndex: 0,
        columnLetter: 'A',
        sampleValues: [],
        nonEmptyCount: 0,
        isEmpty: true,
        ignored: true,
        ignoredReason: 'empty',
        autoIgnored: true,
        autoIgnoredReason: 'empty',
      },
    ];

    const result = applyColumnVisibilitySettings(columns, {
      inputColumnAliases: {},
      columnVisibility: [
        { inputColumnId: 'input-0', columnIndex: 0, columnLetter: 'A' } as ExportedImportSettings['config']['columnVisibility'][number],
      ],
    });

    expect(result[0].ignored).toBe(true);
    expect(result[0].ignoredReason).toBe('empty');
  });

  it('rejects invalid settings using the shared imported settings validation', () => {
    const result = createApplyPayloadFromSettings({
      ...buildSettings(),
      app: 'other-app' as 'excel-sanitizer',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('excel-sanitizer');
    }
  });
});
