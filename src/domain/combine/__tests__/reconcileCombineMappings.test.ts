import { describe, expect, it } from 'vitest';
import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
} from '../../../types/combine';
import { reconcileCombineMappings } from '../reconcileCombineMappings';

const outputCode: CombineOutputColumn = { id: 'output-code', name: 'Código' };
const outputDescription: CombineOutputColumn = { id: 'output-description', name: 'Descripción' };
const sourceA = source('source-a', [
  { id: 'a-code', name: 'codigo', index: 0 },
  { id: 'a-description', name: 'DESCRIPCION', index: 1 },
]);
const sourceB = source('source-b', [
  { id: 'b-code', name: ' CÓDIGO ', index: 0 },
  { id: 'b-product', name: 'Producto', index: 1 },
]);

describe('reconcileCombineMappings', () => {
  it('preserves valid previous mappings, including explicit null mappings', () => {
    const previousMappings: CombineColumnMapping[] = [
      mapping('source-a', 'output-code', 'a-description'),
      mapping('source-a', 'output-description', null),
    ];

    expect(reconcile([sourceA], [outputCode, outputDescription], previousMappings)).toEqual(previousMappings);
  });

  it('removes mappings from deleted sources', () => {
    const result = reconcile([sourceA], [outputCode], [
      mapping('source-a', 'output-code', 'a-code'),
      mapping('source-b', 'output-code', 'b-code'),
    ]);

    expect(result).toEqual([mapping('source-a', 'output-code', 'a-code')]);
  });

  it('removes mappings from deleted output columns', () => {
    const result = reconcile([sourceA], [outputCode], [
      mapping('source-a', 'output-code', 'a-code'),
      mapping('source-a', 'output-description', 'a-description'),
    ]);

    expect(result).toEqual([mapping('source-a', 'output-code', 'a-code')]);
  });

  it('replaces missing source column references with null', () => {
    const result = reconcile([sourceA], [outputCode], [
      mapping('source-a', 'output-code', 'removed-column'),
    ]);

    expect(result).toEqual([mapping('source-a', 'output-code', null)]);
  });

  it('creates mappings for a new source', () => {
    const result = reconcile([sourceA, sourceB], [outputCode], [
      mapping('source-a', 'output-code', 'a-description'),
    ]);

    expect(result).toEqual([
      mapping('source-a', 'output-code', 'a-description'),
      mapping('source-b', 'output-code', 'b-code'),
    ]);
  });

  it('creates mappings for a new output column', () => {
    const result = reconcile([sourceA], [outputCode, outputDescription], [
      mapping('source-a', 'output-code', 'a-code'),
    ]);

    expect(result).toEqual([
      mapping('source-a', 'output-code', 'a-code'),
      mapping('source-a', 'output-description', 'a-description'),
    ]);
  });

  it('uses exact normalized names for new mappings', () => {
    const result = reconcile([sourceA, sourceB], [outputCode, outputDescription], []);

    expect(result).toContainEqual(mapping('source-a', 'output-code', 'a-code'));
    expect(result).toContainEqual(mapping('source-a', 'output-description', 'a-description'));
    expect(result).toContainEqual(mapping('source-b', 'output-code', 'b-code'));
    expect(result).toContainEqual(mapping('source-b', 'output-description', null));
  });

  it('does not match abbreviations or aliases', () => {
    const shortCodeOutput = { id: 'output-short-code', name: 'Cod.' };

    expect(reconcile([sourceA], [shortCodeOutput], [])).toEqual([
      mapping('source-a', 'output-short-code', null),
    ]);
  });

  it('keeps source and output column order', () => {
    const result = reconcile(
      [sourceB, sourceA],
      [outputDescription, outputCode],
      [mapping('source-a', 'output-code', 'a-code')],
    );

    expect(result.map(({ sourceId, outputColumnId }) => `${sourceId}:${outputColumnId}`)).toEqual([
      'source-b:output-description',
      'source-b:output-code',
      'source-a:output-description',
      'source-a:output-code',
    ]);
  });
});

function reconcile(
  sources: CombineSource[],
  outputColumns: CombineOutputColumn[],
  previousMappings: CombineColumnMapping[],
) {
  return reconcileCombineMappings({ sources, outputColumns, previousMappings });
}

function source(id: string, columns: CombineSource['columns']): CombineSource {
  return { id, fileName: `${id}.xlsx`, columns, rows: [] };
}

function mapping(
  sourceId: string,
  outputColumnId: string,
  sourceColumnId: string | null,
): CombineColumnMapping {
  return { sourceId, outputColumnId, sourceColumnId };
}
