import { describe, expect, it } from 'vitest';
import type { ColumnAnalysis, ExportedImportSettings, FileNameSettings, SourceColumnSnapshot, SourceSnapshot } from '../../../types/import';
import {
  calculateColumnSimilarity,
  compareSettingsToCurrentSnapshot,
  findColumnMatches,
  normalizeColumnName,
} from '../settingsCompatibility';
import { createSourceSnapshot } from '../settingsSnapshot';

const fileNameSettings: FileNameSettings = {
  mode: 'default',
  customName: '',
  baseText: 'Archivo sanitizado',
  includeBaseText: true,
  includeOriginalName: true,
  includeSheetName: true,
  includeDate: false,
};

function column(partial: Partial<SourceColumnSnapshot> & { columnIndex: number; columnLetter: string; header?: string }): SourceColumnSnapshot {
  return {
    inputColumnId: partial.inputColumnId ?? `input-${partial.columnIndex}`,
    columnIndex: partial.columnIndex,
    columnLetter: partial.columnLetter,
    header: partial.header,
    alias: partial.alias,
    active: partial.active ?? true,
    ignoredReason: partial.ignoredReason,
    sampleValues: partial.sampleValues ?? [],
    nonEmptyCount: partial.nonEmptyCount ?? 0,
    fingerprint: partial.fingerprint ?? `h:${normalizeColumnName(partial.header ?? '')};n:${partial.nonEmptyCount ?? 0};s:${(partial.sampleValues ?? []).join('|')}`,
  };
}

function snapshot(partial: Partial<SourceSnapshot> & { columns: SourceColumnSnapshot[] }): SourceSnapshot {
  return {
    fileType: 'spreadsheet',
    sheetName: 'Productos',
    sheetNames: ['Productos'],
    rowCount: 10,
    headerRowIndex: 0,
    startRowIndex: 1,
    ...partial,
  };
}

function settings(sourceSnapshot: SourceSnapshot, partial?: Partial<ExportedImportSettings>): ExportedImportSettings {
  return {
    schemaVersion: 1,
    app: 'excel-sanitizer',
    exportedAt: '2026-06-04T13:00:00.000Z',
    sourceSnapshot,
    config: {
      selectedSheet: sourceSnapshot.sheetName,
      headerRowIndex: sourceSnapshot.headerRowIndex,
      startRowIndex: sourceSnapshot.startRowIndex,
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

function settingsWithOutputColumns(sourceSnapshot: SourceSnapshot, outputColumns: ExportedImportSettings['config']['outputColumns']) {
  const baseSettings = settings(sourceSnapshot);
  return {
    ...baseSettings,
    config: {
      ...baseSettings.config,
      outputColumns,
    },
  };
}

const savedColumns = [
  column({ columnIndex: 0, columnLetter: 'A', header: 'Codigo', sampleValues: ['ABC'], nonEmptyCount: 1 }),
  column({ columnIndex: 1, columnLetter: 'B', header: 'Descripcion', sampleValues: ['Pintura'], nonEmptyCount: 1 }),
];

describe('settingsCompatibility', () => {
  it('is compatible when sheet and columns match exactly', () => {
    const savedSnapshot = snapshot({ columns: savedColumns });
    const result = compareSettingsToCurrentSnapshot(settings(savedSnapshot), snapshot({ columns: savedColumns }));

    expect(result.status).toBe('compatible');
    expect(result.sheet.exists).toBe(true);
    expect(result.summary).toMatchObject({
      exactMatches: 2,
      strongMatches: 0,
      missingColumns: 0,
      addedColumns: 0,
    });
  });

  it('is compatible when the same headerless snapshot is reconstructed', () => {
    const headerlessAnalysis: ColumnAnalysis[] = [
      {
        columnIndex: 0,
        columnLetter: 'A',
        sampleValues: ['001'],
        nonEmptyCount: 8,
        isEmpty: false,
        ignored: false,
        autoIgnored: false,
      },
      {
        columnIndex: 1,
        columnLetter: 'B',
        sampleValues: ['Producto'],
        nonEmptyCount: 8,
        isEmpty: false,
        ignored: false,
        autoIgnored: false,
      },
      {
        columnIndex: 2,
        columnLetter: 'C',
        sampleValues: [],
        nonEmptyCount: 0,
        isEmpty: true,
        ignored: true,
        autoIgnored: true,
      },
    ];
    const createHeaderlessSnapshot = () => createSourceSnapshot({
      fileType: 'spreadsheet',
      sheetName: 'Productos',
      sheetNames: ['Productos'],
      rowCount: 10,
      headerRowIndex: null,
      startRowIndex: 0,
      columnAnalysis: headerlessAnalysis.map((analysis) => ({ ...analysis })),
    });
    const savedSnapshot = createHeaderlessSnapshot();
    const currentSnapshot = createHeaderlessSnapshot();

    const result = compareSettingsToCurrentSnapshot(settings(savedSnapshot), currentSnapshot);

    expect(result.status).toBe('compatible');
    expect(result.summary).toMatchObject({
      exactMatches: 3,
      strongMatches: 0,
      mediumMatches: 0,
      addedColumns: 0,
      ambiguousMatches: 0,
    });
  });

  it('warns when current snapshot has added columns but saved columns match', () => {
    const result = compareSettingsToCurrentSnapshot(
      settings(snapshot({ columns: savedColumns })),
      snapshot({
        columns: [
          ...savedColumns,
          column({ columnIndex: 2, columnLetter: 'C', header: 'Precio' }),
        ],
      }),
    );

    expect(result.status).toBe('warning');
    expect(result.columns.added).toHaveLength(1);
    expect(result.summary.addedColumns).toBe(1);
  });

  it('warns when a missing saved column is not used', () => {
    const result = compareSettingsToCurrentSnapshot(
      settings(snapshot({ columns: savedColumns })),
      snapshot({ columns: [savedColumns[0]] }),
    );

    expect(result.status).toBe('warning');
    expect(result.columns.missing).toEqual([savedColumns[1]]);
    expect(result.columns.unusedMissing).toEqual([savedColumns[1]]);
    expect(result.columns.usedMissing).toEqual([]);
    expect(result.summary.missingColumns).toBe(1);
    expect(result.summary.unusedMissingColumns).toBe(1);
  });

  it('is blocked when app does not match', () => {
    const result = compareSettingsToCurrentSnapshot(
      { ...settings(snapshot({ columns: savedColumns })), app: 'other-app' as 'excel-sanitizer' },
      snapshot({ columns: savedColumns }),
    );

    expect(result.status).toBe('blocked');
    expect(result.messages[0]).toContain('excel-sanitizer');
  });

  it('is blocked when schema version does not match', () => {
    const result = compareSettingsToCurrentSnapshot(
      { ...settings(snapshot({ columns: savedColumns })), schemaVersion: 2 as 1 },
      snapshot({ columns: savedColumns }),
    );

    expect(result.status).toBe('blocked');
    expect(result.messages[0]).toContain('version');
  });

  it('is blocked when expected sheet does not exist and no reasonable suggestion exists', () => {
    const result = compareSettingsToCurrentSnapshot(
      settings(snapshot({ sheetName: 'Productos', sheetNames: ['Productos'], columns: savedColumns })),
      snapshot({ sheetName: 'Ventas', sheetNames: ['Ventas'], columns: savedColumns }),
    );

    expect(result.status).toBe('blocked');
    expect(result.sheet.exists).toBe(false);
    expect(result.sheet.suggestedSheet).toBeUndefined();
  });

  it('suggests a similar sheet name when expected sheet is not present', () => {
    const result = compareSettingsToCurrentSnapshot(
      settings(snapshot({ sheetName: 'Productos', sheetNames: ['Productos'], columns: savedColumns })),
      snapshot({ sheetName: 'Producto', sheetNames: ['Producto'], columns: savedColumns }),
    );

    expect(result.status).toBe('blocked');
    expect(result.sheet.suggestedSheet).toBe('Producto');
    expect(result.messages[0]).toContain('Producto');
  });

  it('matches by normalized header when column order changes', () => {
    const currentColumns = [
      column({ columnIndex: 0, columnLetter: 'A', header: 'Descripcion' }),
      column({ columnIndex: 1, columnLetter: 'B', header: 'Codigo' }),
    ];
    const result = compareSettingsToCurrentSnapshot(settings(snapshot({ columns: savedColumns })), snapshot({ columns: currentColumns }));

    expect(result.status).toBe('compatible');
    expect(result.summary.strongMatches).toBe(2);
    expect(result.columns.matches[0].reason).toContain('otra posicion');
  });

  it('detects weak matches by same index with different header', () => {
    const result = compareSettingsToCurrentSnapshot(
      settings(snapshot({ columns: [savedColumns[0]] })),
      snapshot({ columns: [column({ columnIndex: 0, columnLetter: 'A', header: 'SKU proveedor' })] }),
    );

    expect(result.status).toBe('warning');
    expect(result.columns.matches[0].confidence).toBe('weak');
    expect(result.summary.weakMatches).toBe(1);
  });

  it('needs remap when a missing saved column is used by settings references', () => {
    const result = compareSettingsToCurrentSnapshot(
      settingsWithOutputColumns(snapshot({ columns: savedColumns }), [
        {
          id: 'output-description',
          label: 'Descripcion',
          order: 0,
          enabled: true,
          recipe: { type: 'direct', inputColumnId: 'input-1' },
        },
      ]),
      snapshot({ columns: [savedColumns[0]] }),
    );

    expect(result.status).toBe('needsRemap');
    expect(result.columns.usedMissing).toEqual([savedColumns[1]]);
    expect(result.columns.unusedMissing).toEqual([]);
    expect(result.summary.usedMissingColumns).toBe(1);
    expect(result.messages[0]).toContain('esta usada');
  });

  it('keeps used exact and strong matches compatible', () => {
    const result = compareSettingsToCurrentSnapshot(
      settingsWithOutputColumns(snapshot({ columns: savedColumns }), [
        {
          id: 'output-code',
          label: 'Codigo',
          order: 0,
          enabled: true,
          recipe: { type: 'direct', inputColumnId: 'input-0' },
        },
        {
          id: 'output-description',
          label: 'Descripcion',
          order: 1,
          enabled: true,
          recipe: { type: 'direct', inputColumnId: 'input-1' },
        },
      ]),
      snapshot({
        columns: [
          column({ columnIndex: 0, columnLetter: 'A', header: 'Descripcion' }),
          column({ columnIndex: 1, columnLetter: 'B', header: 'Codigo' }),
        ],
      }),
    );

    expect(result.status).toBe('compatible');
    expect(result.columns.matches.every((match) => match.isUsed)).toBe(true);
    expect(result.columns.matches[0].references).toHaveLength(1);
  });

  it('needs remap when a used column only has a weak match', () => {
    const result = compareSettingsToCurrentSnapshot(
      settingsWithOutputColumns(snapshot({ columns: [savedColumns[0]] }), [
        {
          id: 'output-code',
          label: 'Codigo',
          order: 0,
          enabled: true,
          recipe: { type: 'direct', inputColumnId: 'input-0' },
        },
      ]),
      snapshot({ columns: [column({ columnIndex: 0, columnLetter: 'A', header: 'SKU proveedor' })] }),
    );

    expect(result.status).toBe('needsRemap');
    expect(result.columns.weakUsedMatches).toHaveLength(1);
    expect(result.summary.weakUsedMatches).toBe(1);
    expect(result.messages[0]).toContain('match debil');
  });

  it('needs remap when a used column has ambiguous matches', () => {
    const saved = [column({ columnIndex: 0, columnLetter: 'A', header: 'Codigo' })];
    const result = compareSettingsToCurrentSnapshot(
      settingsWithOutputColumns(snapshot({ columns: saved }), [
        {
          id: 'output-code',
          label: 'Codigo',
          order: 0,
          enabled: true,
          recipe: { type: 'direct', inputColumnId: 'input-0' },
        },
      ]),
      snapshot({
        columns: [
          column({ columnIndex: 1, columnLetter: 'B', header: 'Codigo' }),
          column({ columnIndex: 2, columnLetter: 'C', header: 'Codigo' }),
        ],
      }),
    );

    expect(result.status).toBe('needsRemap');
    expect(result.columns.ambiguous[0].isUsed).toBe(true);
    expect(result.columns.ambiguous[0].references).toHaveLength(1);
  });

  it('detects added and missing columns through findColumnMatches', () => {
    const currentColumns = [
      savedColumns[0],
      column({ columnIndex: 2, columnLetter: 'C', header: 'Precio' }),
    ];
    const result = findColumnMatches(savedColumns, currentColumns);

    expect(result.missing).toEqual([savedColumns[1]]);
    expect(result.added).toEqual([currentColumns[1]]);
  });

  it('detects ambiguous matches when two current columns can match the same saved column', () => {
    const saved = [column({ columnIndex: 0, columnLetter: 'A', header: 'Codigo' })];
    const current = [
      column({ columnIndex: 1, columnLetter: 'B', header: 'Codigo' }),
      column({ columnIndex: 2, columnLetter: 'C', header: 'Codigo' }),
    ];
    const result = findColumnMatches(saved, current);

    expect(result.ambiguous).toHaveLength(1);
    expect(result.matches[0].confidence).toBe('strong');
  });

  it('matches the same index and normalized header as exact', () => {
    const saved = column({ columnIndex: 0, columnLetter: 'A', header: ' Código ' });
    const current = column({ columnIndex: 0, columnLetter: 'A', header: 'codigo' });

    const result = findColumnMatches([saved], [current]);

    expect(result.matches[0].confidence).toBe('exact');
  });

  it('matches the same normalized header at another index as strong', () => {
    const saved = column({ columnIndex: 0, columnLetter: 'A', header: ' Código ' });
    const current = column({ columnIndex: 2, columnLetter: 'C', header: 'codigo' });

    const result = findColumnMatches([saved], [current]);

    expect(result.matches[0].confidence).toBe('strong');
  });

  it('does not mark an exact winner as ambiguous when another candidate shares its fingerprint', () => {
    const sharedFingerprint = 'h:;n:0;s:';
    const saved = column({ columnIndex: 0, columnLetter: 'A', fingerprint: sharedFingerprint });
    const exact = column({ columnIndex: 0, columnLetter: 'A', fingerprint: sharedFingerprint });
    const fingerprintOnly = column({ columnIndex: 1, columnLetter: 'B', fingerprint: sharedFingerprint });

    const result = findColumnMatches([saved], [fingerprintOnly, exact]);

    expect(result.matches[0].confidence).toBe('exact');
    expect(result.matches[0].currentColumn).toBe(exact);
    expect(result.ambiguous).toEqual([]);
  });

  it('normalizes column names ignoring case, extra spaces and accents', () => {
    expect(normalizeColumnName('  CÓDIGO   Producto ')).toBe('codigo producto');
    expect(calculateColumnSimilarity(' CÓDIGO ', 'codigo')).toBe(1);
  });
});
