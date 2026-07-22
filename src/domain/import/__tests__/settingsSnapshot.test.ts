import { describe, expect, it } from 'vitest';
import type { ColumnAnalysis, FileNameSettings, IgnoreRule, OutputColumn, RawRow } from '../../../types/import';
import { createColumnFingerprint, createSourceSnapshot, exportSettingsFromWizardState } from '../settingsSnapshot';

const columnAnalysis: ColumnAnalysis[] = [
  {
    columnIndex: 0,
    columnLetter: 'A',
    header: ' Codigo ',
    alias: 'SKU',
    sampleValues: [' ABC ', '', 'DEF', 'GHI', 'JKL', 'MNO'],
    nonEmptyCount: 20,
    isEmpty: false,
    ignored: false,
    autoIgnored: false,
  },
  {
    columnIndex: 1,
    columnLetter: 'B',
    header: 'Descripcion',
    sampleValues: ['Pintura', 'Rodillo'],
    nonEmptyCount: 2,
    isEmpty: false,
    ignored: true,
    ignoredReason: 'manual',
    autoIgnored: false,
  },
];

const rows: RawRow[] = [
  ['Codigo', 'Descripcion'],
  ['ABC', 'Pintura'],
  ['DEF', 'Rodillo'],
];

const inputIgnoreRules: IgnoreRule[] = [
  { id: 'input-rule', target: 'input', columnId: 'input-0', operator: 'isNotEmpty' },
];

const outputIgnoreRules: IgnoreRule[] = [
  { id: 'output-rule', target: 'output', columnId: 'output-code', operator: 'contains', value: 'X' },
];

const outputColumns: OutputColumn[] = [
  {
    id: 'output-code',
    label: 'Codigo',
    order: 0,
    enabled: true,
    recipe: {
      type: 'direct',
      inputColumnId: 'input-0',
    },
  },
  {
    id: 'output-description',
    label: 'Descripcion',
    order: 1,
    enabled: true,
    recipe: {
      type: 'combine',
      parts: [],
      steps: [
        {
          id: 'concat',
          mode: 'text',
          type: 'concat',
          parts: [
            {
              id: 'part-1',
              source: { type: 'input', inputColumnId: 'input-0' },
            },
          ],
        },
      ],
      customMode: 'concat',
    },
  },
];

const fileNameSettings: FileNameSettings = {
  mode: 'default',
  customName: '',
  baseText: 'Archivo sanitizado',
  includeBaseText: true,
  includeOriginalName: true,
  includeSheetName: true,
  includeDate: false,
};

describe('settingsSnapshot', () => {
  it('creates a source snapshot with column metadata and deterministic fingerprints', () => {
    const snapshot = createSourceSnapshot({
      fileType: 'spreadsheet',
      sheetName: 'Hoja 1',
      sheetNames: ['Hoja 1', 'Hoja 2'],
      rows,
      headerRowIndex: 0,
      startRowIndex: 1,
      columnAnalysis,
      sampleLimit: 3,
    });

    expect(snapshot).toMatchObject({
      fileType: 'spreadsheet',
      sheetName: 'Hoja 1',
      sheetNames: ['Hoja 1', 'Hoja 2'],
      rowCount: 3,
      headerRowIndex: 0,
      startRowIndex: 1,
    });
    expect(snapshot.columns[0]).toEqual({
      inputColumnId: 'input-0',
      columnIndex: 0,
      columnLetter: 'A',
      header: ' Codigo ',
      alias: 'SKU',
      active: true,
      sampleValues: ['ABC', 'DEF', 'GHI'],
      nonEmptyCount: 20,
      fingerprint: createColumnFingerprint(columnAnalysis[0], 3),
    });
    expect(snapshot.columns[1]).toMatchObject({
      inputColumnId: 'input-1',
      columnIndex: 1,
      columnLetter: 'B',
      header: 'Descripcion',
      active: false,
      ignoredReason: 'manual',
    });
  });

  it('builds stable fingerprints from normalized header, samples and non-empty count', () => {
    const first = createColumnFingerprint({
      header: ' Código ',
      sampleValues: [' ABC ', '', 'Def'],
      nonEmptyCount: 2,
    });
    const second = createColumnFingerprint({
      header: 'codigo',
      sampleValues: ['ABC', 'Def'],
      nonEmptyCount: 2,
    });

    expect(first).toBe(second);
    expect(first).toBe('h:codigo;n:2;s:abc|def');
  });

  it('exports wizard settings without workbook, raw rows or derived processing state', () => {
    const settings = exportSettingsFromWizardState({
      name: 'Proveedor A',
      exportedAt: '2026-06-04T13:00:00.000Z',
      fileType: 'spreadsheet',
      selectedSheet: 'Hoja 1',
      sheetNames: ['Hoja 1'],
      rows,
      headerRowIndex: 0,
      startRowIndex: 1,
      showRawPreviewFromDataStart: false,
      columnAnalysis,
      inputColumnAliases: { 'input-0': 'SKU' },
      inputIgnoreRules,
      outputColumns,
      outputIgnoreRules,
      fileNameSettings,
      sampleLimit: 2,
    });

    expect(settings).toMatchObject({
      schemaVersion: 1,
      app: 'excel-sanitizer',
      exportedAt: '2026-06-04T13:00:00.000Z',
      name: 'Proveedor A',
      sourceSnapshot: {
        sheetName: 'Hoja 1',
        rowCount: 3,
        headerRowIndex: 0,
        startRowIndex: 1,
      },
      config: {
        selectedSheet: 'Hoja 1',
        headerRowIndex: 0,
        startRowIndex: 1,
        showRawPreviewFromDataStart: false,
        inputColumnAliases: { 'input-0': 'SKU' },
        inputIgnoreRules,
        outputColumns,
        outputIgnoreRules,
        fileNameSettings,
      },
    });
    expect(settings.sourceSnapshot.columns[0].sampleValues).toEqual(['ABC', 'DEF']);
    expect(settings.config.columnVisibility).toEqual([
      {
        inputColumnId: 'input-0',
        columnIndex: 0,
        columnLetter: 'A',
        header: ' Codigo ',
        alias: 'SKU',
        active: true,
      },
      {
        inputColumnId: 'input-1',
        columnIndex: 1,
        columnLetter: 'B',
        header: 'Descripcion',
        active: false,
        ignoredReason: 'manual',
      },
    ]);

    expect(settings).not.toHaveProperty('workbook');
    expect(settings).not.toHaveProperty('rows');
    expect(settings).not.toHaveProperty('processedRows');
    expect(settings).not.toHaveProperty('auditRows');
    expect(settings).not.toHaveProperty('rowOverrides');
  });

  it('exports multiple ignored reasons while keeping legacy reason fields', () => {
    const settings = exportSettingsFromWizardState({
      fileType: 'spreadsheet',
      selectedSheet: 'Hoja 1',
      rows,
      headerRowIndex: 0,
      startRowIndex: 1,
      columnAnalysis: [
        {
          columnIndex: 2,
          columnLetter: 'C',
          header: 'Extra',
          sampleValues: [],
          nonEmptyCount: 0,
          isEmpty: true,
          isHidden: true,
          ignored: true,
          ignoredReason: 'hidden',
          ignoredReasons: ['hidden', 'empty', 'hidden'],
          autoIgnored: true,
          autoIgnoredReason: 'hidden',
          autoIgnoredReasons: ['hidden', 'empty', 'hidden'],
        },
      ],
      inputColumnAliases: {},
      inputIgnoreRules,
      outputColumns,
      outputIgnoreRules,
      fileNameSettings,
    });

    expect(settings.sourceSnapshot.columns[0]).toMatchObject({
      ignoredReason: 'hidden',
      ignoredReasons: ['hidden', 'empty'],
      autoIgnoredReason: 'hidden',
      autoIgnoredReasons: ['hidden', 'empty'],
    });
    expect(settings.config.columnVisibility[0]).toMatchObject({
      ignoredReason: 'hidden',
      ignoredReasons: ['hidden', 'empty'],
      autoIgnoredReason: 'hidden',
      autoIgnoredReasons: ['hidden', 'empty'],
    });
  });

  it('exports output columns with date recipe fields intact', () => {
    const settings = exportSettingsFromWizardState({
      fileType: 'spreadsheet',
      selectedSheet: 'Hoja 1',
      rows,
      headerRowIndex: 0,
      startRowIndex: 1,
      columnAnalysis,
      inputColumnAliases: {},
      inputIgnoreRules: [],
      outputColumns: [{
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
            dateInvalidFallback: 'fixedText',
            dateInvalidFallbackText: 'SIN FECHA',
          }],
        },
      }],
      outputIgnoreRules: [],
      fileNameSettings,
    });

    expect(settings.config.outputColumns[0].recipe).toMatchObject({
      type: 'combine',
      steps: [{
        id: 'format-date',
        mode: 'date',
        type: 'formatDate',
        dateInputFormat: 'DD/MM/YYYY',
        dateOutputFormat: 'YYYY-MM-DD',
        dateInvalidFallback: 'fixedText',
        dateInvalidFallbackText: 'SIN FECHA',
      }],
    });
  });

  it('exports output columns with manual range recipe fields intact', () => {
    const manualRangeColumn: OutputColumn = {
      id: 'output-comment',
      label: 'Comentario',
      order: 0,
      enabled: true,
      recipe: {
        type: 'manualRange',
        ranges: [
          { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Cerda china mango amarillo' },
        ],
        condition: { inputColumnId: 'input-1', operator: 'isNotEmpty' },
      },
    };
    const settings = exportSettingsFromWizardState({
      fileType: 'spreadsheet',
      selectedSheet: 'Hoja 1',
      rows,
      headerRowIndex: 0,
      startRowIndex: 1,
      columnAnalysis,
      inputColumnAliases: {},
      inputIgnoreRules: [],
      outputColumns: [manualRangeColumn],
      outputIgnoreRules: [],
      fileNameSettings,
    });

    expect(settings.config.outputColumns[0]).toEqual(manualRangeColumn);
  });

  it('exports manual range value recipes intact', () => {
    const manualRangeColumn: OutputColumn = {
      id: 'output-comment',
      label: 'Comentario',
      order: 0,
      enabled: true,
      recipe: {
        type: 'manualRange',
        ranges: [
          {
            id: 'range-8-13',
            startRowNumber: 8,
            endRowNumber: 13,
            valueRecipe: {
              source: { type: 'input', inputColumnId: 'input-name' },
              steps: [{ id: 'upper', type: 'uppercase' }],
            },
          },
        ],
      },
    };
    const settings = exportSettingsFromWizardState({
      fileType: 'spreadsheet',
      selectedSheet: 'Hoja 1',
      rows,
      headerRowIndex: 0,
      startRowIndex: 1,
      columnAnalysis,
      inputColumnAliases: {},
      inputIgnoreRules: [],
      outputColumns: [manualRangeColumn],
      outputIgnoreRules: [],
      fileNameSettings,
    });

    expect(settings.config.outputColumns[0]).toEqual(manualRangeColumn);
  });

  it('does not mutate or share configurable arrays with the exported settings', () => {
    const inputRules: IgnoreRule[] = [{ ...inputIgnoreRules[0] }];
    const columns: OutputColumn[] = JSON.parse(JSON.stringify(outputColumns)) as OutputColumn[];
    const settings = exportSettingsFromWizardState({
      fileType: 'csv',
      headerRowIndex: null,
      startRowIndex: 0,
      columnAnalysis,
      inputColumnAliases: {},
      inputIgnoreRules: inputRules,
      outputColumns: columns,
      outputIgnoreRules,
      fileNameSettings,
    });

    inputRules[0].columnId = 'changed-input';
    columns[0].label = 'Changed';

    expect(settings.config.inputIgnoreRules[0].columnId).toBe('input-0');
    expect(settings.config.outputColumns[0].label).toBe('Codigo');
    expect(settings.sourceSnapshot.fileType).toBe('csv');
    expect(settings.config.headerRowIndex).toBeNull();
    expect(settings.config.startRowIndex).toBe(0);
  });

  it.each([true, false])('exports the data-start preview checkbox when set to %s', (showRawPreviewFromDataStart) => {
    const settings = exportSettingsFromWizardState({
      fileType: 'csv',
      headerRowIndex: null,
      startRowIndex: 0,
      showRawPreviewFromDataStart,
      columnAnalysis,
      inputColumnAliases: {},
      inputIgnoreRules,
      outputColumns,
      outputIgnoreRules,
      fileNameSettings,
    });

    expect(settings.config.showRawPreviewFromDataStart).toBe(showRawPreviewFromDataStart);
    expect(settings.config).not.toHaveProperty('showAllRawPreviewColumns');
  });
});
