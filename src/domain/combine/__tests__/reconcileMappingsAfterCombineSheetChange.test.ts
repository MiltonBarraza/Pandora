import { describe, expect, it } from 'vitest';
import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSourceColumn,
} from '../../../types/combine';
import { reconcileMappingsAfterCombineSheetChange } from '../reconcileMappingsAfterCombineSheetChange';

describe('reconcileMappingsAfterCombineSheetChange', () => {
  it('keeps a mapping by previous column name when its positional id changes', () => {
    const result = reconcile({
      previousColumns: [column('col:0', 'Código', 0)],
      nextColumns: [column('col:0', 'Descripción', 0), column('col:1', ' codigo ', 1)],
      mappings: [mapping('source:1', 'output:code', 'col:0')],
    });

    expect(result[0].sourceColumnId).toBe('col:1');
  });

  it('does not keep col:N when the column name changed', () => {
    const result = reconcile({
      outputColumns: [output('output:other', 'Otra')],
      previousColumns: [column('col:0', 'Código', 0)],
      nextColumns: [column('col:0', 'Descripción', 0)],
      mappings: [mapping('source:1', 'output:other', 'col:0')],
    });

    expect(result[0].sourceColumnId).toBeNull();
  });

  it('falls back to exact normalized output column name', () => {
    const result = reconcile({
      outputColumns: [output('output:city', '  CIUDAD ')],
      previousColumns: [column('col:0', 'Localidad anterior', 0)],
      nextColumns: [column('col:2', 'Ciudád', 2)],
      mappings: [mapping('source:1', 'output:city', 'col:0')],
    });

    expect(result[0].sourceColumnId).toBe('col:2');
  });

  it('sets sourceColumnId to null when no column matches', () => {
    const result = reconcile({
      outputColumns: [output('output:code', 'Código')],
      previousColumns: [column('col:0', 'Código anterior', 0)],
      nextColumns: [column('col:0', 'Descripción', 0)],
      mappings: [mapping('source:1', 'output:code', 'col:0')],
    });

    expect(result[0].sourceColumnId).toBeNull();
  });

  it('does not affect mappings from other sources and keeps mapping order', () => {
    const mappings = [
      mapping('source:2', 'output:code', 'col:9'),
      mapping('source:1', 'output:code', 'col:0'),
      mapping('source:2', 'output:name', null),
    ];

    const result = reconcile({
      previousColumns: [column('col:0', 'Código', 0)],
      nextColumns: [column('col:3', 'Código', 3)],
      mappings,
    });

    expect(result.map((item) => [item.sourceId, item.outputColumnId])).toEqual(
      mappings.map((item) => [item.sourceId, item.outputColumnId]),
    );
    expect(result[0]).toBe(mappings[0]);
    expect(result[2]).toBe(mappings[2]);
  });

  it('does not use aliases', () => {
    const result = reconcile({
      outputColumns: [output('output:code', 'Código')],
      previousColumns: [],
      nextColumns: [column('col:0', 'Cod.', 0)],
      mappings: [mapping('source:1', 'output:code', null)],
    });

    expect(result[0].sourceColumnId).toBeNull();
  });

  it('does not mutate inputs', () => {
    const input = {
      sourceId: 'source:1',
      outputColumns: [output('output:code', 'Código')],
      previousMappings: [mapping('source:1', 'output:code', 'col:0')],
      previousSourceColumns: [column('col:0', 'Código', 0)],
      nextSourceColumns: [column('col:1', 'Código', 1)],
    };
    const snapshot = structuredClone(input);

    reconcileMappingsAfterCombineSheetChange(input);

    expect(input).toEqual(snapshot);
  });
});

function reconcile({
  outputColumns = [output('output:code', 'Código')],
  previousColumns,
  nextColumns,
  mappings,
}: {
  outputColumns?: CombineOutputColumn[];
  previousColumns: CombineSourceColumn[];
  nextColumns: CombineSourceColumn[];
  mappings: CombineColumnMapping[];
}) {
  return reconcileMappingsAfterCombineSheetChange({
    sourceId: 'source:1',
    outputColumns,
    previousMappings: mappings,
    previousSourceColumns: previousColumns,
    nextSourceColumns: nextColumns,
  });
}

function column(id: string, name: string, index: number): CombineSourceColumn {
  return { id, name, index };
}

function output(id: string, name: string): CombineOutputColumn {
  return { id, name };
}

function mapping(
  sourceId: string,
  outputColumnId: string,
  sourceColumnId: string | null,
): CombineColumnMapping {
  return { sourceId, outputColumnId, sourceColumnId };
}
