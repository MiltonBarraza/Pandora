import { describe, expect, it } from 'vitest';
import type { CombineColumnMapping, CombineOutputColumn, CombineSource } from '../../../types/combine';
import {
  applyCombineSettingsSnapshot,
  createCombineSettingsSnapshot,
  parseCombineSettingsSnapshotJson,
  type CombineSettingsSnapshot,
} from '../combineSettings';

const outputColumns: CombineOutputColumn[] = [
  { id: 'output-code', name: 'Código' },
  { id: 'output-description', name: 'Descripción' },
];
const originalSources: CombineSource[] = [
  source('old-source:0', 'ventas.xlsx', 'Datos', [
    { id: 'old-code', name: 'CODIGO', index: 0 },
    { id: 'old-description', name: 'Descripción', index: 1 },
  ], [{ id: 'private-row', values: { 'old-code': 'SECRETO', 'old-description': 'No guardar' } }]),
];
const mappings: CombineColumnMapping[] = [
  { sourceId: 'old-source:0', outputColumnId: 'output-code', sourceColumnId: 'old-code' },
  { sourceId: 'old-source:0', outputColumnId: 'output-description', sourceColumnId: null },
];

describe('createCombineSettingsSnapshot', () => {
  it('stores configuration and source metadata without rows or file data', () => {
    const snapshot = createSnapshot();

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      app: 'excel-sanitizer',
      feature: 'combine-files',
      outputFileName: 'Salida mensual',
      columnAssignmentMode: 'name',
      resultSort: { columnId: null, direction: 'asc' },
      sourceMetadataOptions: { includeFileName: false, includeSheetName: false },
      outputColumns: [
        { id: 'output-code', name: 'Código', index: 0 },
        { id: 'output-description', name: 'Descripción', index: 1 },
      ],
    });
    expect(snapshot.sourceMappings[0]).toMatchObject({
      sourceIndex: 0,
      fileName: 'ventas.xlsx',
      sheetName: 'Datos',
    });
    expect(JSON.stringify(snapshot)).not.toContain('SECRETO');
    expect(JSON.stringify(snapshot)).not.toContain('No guardar');
  });

  it('stores source column metadata and explicit null mappings', () => {
    const snapshot = createSnapshot();

    expect(snapshot.sourceMappings[0].mappings).toEqual([
      {
        outputColumnId: 'output-code',
        outputColumnName: 'Código',
        sourceColumnId: 'old-code',
        sourceColumnName: 'CODIGO',
        sourceColumnIndex: 0,
      },
      {
        outputColumnId: 'output-description',
        outputColumnName: 'Descripción',
        sourceColumnId: null,
        sourceColumnName: null,
        sourceColumnIndex: null,
      },
    ]);
  });
});

describe('applyCombineSettingsSnapshot', () => {
  it('restores output filename and output column order', () => {
    const snapshot = createSnapshot();
    snapshot.outputColumns.reverse();

    const result = applyCombineSettingsSnapshot({ snapshot, sources: [] });

    expect(result.outputFileName).toBe('Salida mensual');
    expect(result.outputColumns).toEqual(outputColumns);
  });

  it('applies columns and filename without sources and warns about mappings', () => {
    const result = applyCombineSettingsSnapshot({ snapshot: createSnapshot(), sources: [] });

    expect(result.outputFileName).toBe('Salida mensual');
    expect(result.outputColumns).toEqual(outputColumns);
    expect(result.mappings).toEqual([]);
    expect(result.warnings).toContain(
      'Para restaurar mapeos, cargá los archivos correspondientes y volvé a importar la configuración.',
    );
  });

  it('persists and restores position assignment mode', () => {
    const snapshot = createCombineSettingsSnapshot({
      sources: originalSources,
      outputColumns,
      mappings,
      outputFileName: 'Posicional',
      columnAssignmentMode: 'position',
    });

    expect(snapshot.columnAssignmentMode).toBe('position');
    expect(applyCombineSettingsSnapshot({ snapshot, sources: originalSources }).columnAssignmentMode).toBe('position');
  });

  it('persists and restores result sorting', () => {
    const snapshot = createCombineSettingsSnapshot({
      sources: originalSources,
      outputColumns,
      mappings,
      outputFileName: 'Ordenado',
      resultSort: { columnId: 'output-description', direction: 'desc' },
    });

    expect(snapshot.resultSort).toEqual({ columnId: 'output-description', direction: 'desc' });
    expect(applyCombineSettingsSnapshot({ snapshot, sources: originalSources }).resultSort).toEqual({
      columnId: 'output-description',
      direction: 'desc',
    });
  });

  it('persists metadata options and sorting by a metadata column', () => {
    const snapshot = createCombineSettingsSnapshot({
      sources: originalSources,
      outputColumns,
      mappings,
      outputFileName: 'Con origen',
      sourceMetadataOptions: { includeFileName: true, includeSheetName: true },
      resultSort: { columnId: 'metadata:fileName', direction: 'asc' },
    });
    const applied = applyCombineSettingsSnapshot({ snapshot, sources: originalSources });

    expect(snapshot.sourceMetadataOptions).toEqual({ includeFileName: true, includeSheetName: true });
    expect(applied.sourceMetadataOptions).toEqual({ includeFileName: true, includeSheetName: true });
    expect(applied.resultSort).toEqual({ columnId: 'metadata:fileName', direction: 'asc' });
  });

  it('safely disables saved sorting when its output column no longer exists', () => {
    const snapshot = createSnapshot();
    snapshot.resultSort = { columnId: 'missing', direction: 'desc' };

    expect(applyCombineSettingsSnapshot({ snapshot, sources: originalSources }).resultSort).toEqual({
      columnId: null,
      direction: 'desc',
    });
  });

  it('applies mappings to current source ids without depending on saved source ids', () => {
    const currentSources = [source('source:9', 'ventas.xlsx', 'Datos', [
      { id: 'col:0', name: 'codigo', index: 0 },
      { id: 'col:1', name: 'DESCRIPCION', index: 1 },
    ])];

    const result = applyCombineSettingsSnapshot({ snapshot: createSnapshot(), sources: currentSources });

    expect(result.mappings).toEqual([
      { sourceId: 'source:9', outputColumnId: 'output-code', sourceColumnId: 'col:0' },
      { sourceId: 'source:9', outputColumnId: 'output-description', sourceColumnId: null },
    ]);
  });

  it('finds matching sources and columns after their order changes', () => {
    const secondSource = source('old-source:1', 'stock.csv', undefined, [
      { id: 'old-stock-code', name: 'Código', index: 0 },
      { id: 'old-stock-description', name: 'Descripción', index: 1 },
    ]);
    const snapshot = createCombineSettingsSnapshot({
      sources: [...originalSources, secondSource],
      outputColumns,
      mappings: [
        ...mappings,
        { sourceId: 'old-source:1', outputColumnId: 'output-code', sourceColumnId: 'old-stock-code' },
        { sourceId: 'old-source:1', outputColumnId: 'output-description', sourceColumnId: 'old-stock-description' },
      ],
      outputFileName: 'Salida',
    });
    const currentSources = [
      source('new-stock', 'stock.csv', undefined, [
        { id: 'new-stock-description', name: 'DESCRIPCION', index: 0 },
        { id: 'new-stock-code', name: 'codigo', index: 1 },
      ]),
      source('new-sales', 'ventas.xlsx', 'Datos', [
        { id: 'new-sales-code', name: 'Código', index: 0 },
      ]),
    ];

    const result = applyCombineSettingsSnapshot({ snapshot, sources: currentSources });

    expect(result.mappings).toEqual([
      { sourceId: 'new-stock', outputColumnId: 'output-code', sourceColumnId: 'new-stock-code' },
      { sourceId: 'new-stock', outputColumnId: 'output-description', sourceColumnId: 'new-stock-description' },
      { sourceId: 'new-sales', outputColumnId: 'output-code', sourceColumnId: 'new-sales-code' },
      { sourceId: 'new-sales', outputColumnId: 'output-description', sourceColumnId: null },
    ]);
  });

  it('uses exact normalized automapping for a newly loaded source', () => {
    const newSource = source('new-source', 'nuevo.csv', undefined, [
      { id: 'new-code', name: ' CÓDIGO ', index: 0 },
      { id: 'new-short-code', name: 'Cod.', index: 1 },
    ]);

    const result = applyCombineSettingsSnapshot({ snapshot: createSnapshot(), sources: [newSource] });

    expect(result.mappings).toEqual([
      { sourceId: 'new-source', outputColumnId: 'output-code', sourceColumnId: 'new-code' },
      { sourceId: 'new-source', outputColumnId: 'output-description', sourceColumnId: null },
    ]);
  });

  it('does not mutate snapshot or current sources', () => {
    const snapshot = createSnapshot();
    const currentSources = [source('source:2', 'ventas.xlsx', 'Datos', [
      { id: 'current-code', name: 'Código', index: 0 },
    ])];
    const snapshotBefore = structuredClone(snapshot);
    const sourcesBefore = structuredClone(currentSources);

    applyCombineSettingsSnapshot({ snapshot, sources: currentSources });

    expect(snapshot).toEqual(snapshotBefore);
    expect(currentSources).toEqual(sourcesBefore);
  });
});

describe('parseCombineSettingsSnapshotJson', () => {
  it('accepts a valid snapshot', () => {
    const snapshot = createSnapshot();

    expect(parseCombineSettingsSnapshotJson(JSON.stringify(snapshot))).toEqual({ ok: true, snapshot });
  });

  it('rejects invalid JSON', () => {
    expect(parseCombineSettingsSnapshotJson('{invalid')).toEqual({
      ok: false,
      error: 'El archivo no contiene un JSON válido.',
    });
  });

  it('rejects an incorrect app', () => {
    expect(parseSnapshotChange({ app: 'otra-app' })).toMatchObject({ ok: false });
  });

  it('rejects an incorrect feature', () => {
    expect(parseSnapshotChange({ feature: 'sanitize' })).toMatchObject({ ok: false });
  });

  it('rejects an unsupported schema version', () => {
    expect(parseSnapshotChange({ schemaVersion: 2 })).toMatchObject({ ok: false });
  });

  it('rejects duplicate or reserved output column identities', () => {
    const duplicateIds = createSnapshot();
    duplicateIds.outputColumns[1].id = duplicateIds.outputColumns[0].id;
    expect(parseCombineSettingsSnapshotJson(JSON.stringify(duplicateIds))).toMatchObject({ ok: false });

    const duplicateIndexes = createSnapshot();
    duplicateIndexes.outputColumns[1].index = duplicateIndexes.outputColumns[0].index;
    expect(parseCombineSettingsSnapshotJson(JSON.stringify(duplicateIndexes))).toMatchObject({ ok: false });

    const reservedId = createSnapshot();
    reservedId.outputColumns[0].id = 'metadata:fileName';
    expect(parseCombineSettingsSnapshotJson(JSON.stringify(reservedId))).toMatchObject({ ok: false });
  });

  it('rejects duplicate source and mapping identities', () => {
    const duplicateSources = createSnapshot();
    duplicateSources.sourceMappings.push(structuredClone(duplicateSources.sourceMappings[0]));
    expect(parseCombineSettingsSnapshotJson(JSON.stringify(duplicateSources))).toMatchObject({ ok: false });

    const duplicateMappings = createSnapshot();
    duplicateMappings.sourceMappings[0].mappings.push(
      structuredClone(duplicateMappings.sourceMappings[0].mappings[0]),
    );
    expect(parseCombineSettingsSnapshotJson(JSON.stringify(duplicateMappings))).toMatchObject({ ok: false });
  });

  it('uses a fallback when output filename is missing', () => {
    const snapshot = { ...createSnapshot(), outputFileName: undefined };
    const parsed = parseCombineSettingsSnapshotJson(JSON.stringify(snapshot));

    expect(parsed.ok && parsed.snapshot.outputFileName).toBe('Archivo combinado');
  });

  it('loads legacy settings without assignment mode as name mode', () => {
    const { columnAssignmentMode: _removed, ...legacySnapshot } = createSnapshot();
    const parsed = parseCombineSettingsSnapshotJson(JSON.stringify(legacySnapshot));

    expect(parsed.ok && parsed.snapshot.columnAssignmentMode).toBe('name');
  });

  it('loads legacy settings without result sorting as unsorted', () => {
    const { resultSort: _removed, ...legacySnapshot } = createSnapshot();
    const parsed = parseCombineSettingsSnapshotJson(JSON.stringify(legacySnapshot));

    expect(parsed.ok && parsed.snapshot.resultSort).toEqual({ columnId: null, direction: 'asc' });
  });

  it('loads legacy settings without source metadata as disabled', () => {
    const { sourceMetadataOptions: _removed, ...legacySnapshot } = createSnapshot();
    const parsed = parseCombineSettingsSnapshotJson(JSON.stringify(legacySnapshot));

    expect(parsed.ok && parsed.snapshot.sourceMetadataOptions).toEqual({
      includeFileName: false,
      includeSheetName: false,
    });
  });
});

function createSnapshot(): CombineSettingsSnapshot {
  return createCombineSettingsSnapshot({
    sources: originalSources,
    outputColumns,
    mappings,
    outputFileName: 'Salida mensual',
  });
}

function parseSnapshotChange(change: Record<string, unknown>) {
  return parseCombineSettingsSnapshotJson(JSON.stringify({ ...createSnapshot(), ...change }));
}

function source(
  id: string,
  fileName: string,
  sheetName: string | undefined,
  columns: CombineSource['columns'],
  rows: CombineSource['rows'] = [],
): CombineSource {
  return { id, fileName, sheetName, columns, rows };
}
