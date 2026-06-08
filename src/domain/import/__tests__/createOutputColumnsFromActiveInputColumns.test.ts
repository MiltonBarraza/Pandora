import { describe, expect, it } from 'vitest';
import type { InputColumn, OutputColumn } from '../../../types/import';
import { createOutputColumnsFromActiveInputColumns } from '../createOutputColumnsFromActiveInputColumns';

function inputColumn(partial: Partial<InputColumn> & Pick<InputColumn, 'id' | 'columnIndex' | 'columnLetter'>): InputColumn {
  return {
    label: partial.columnLetter,
    active: true,
    sampleValues: [],
    nonEmptyCount: 0,
    ...partial,
  };
}

function outputColumn(partial: Partial<OutputColumn> & Pick<OutputColumn, 'id'>): OutputColumn {
  return {
    label: 'Salida',
    order: 0,
    enabled: true,
    recipe: { type: 'empty' },
    ...partial,
  };
}

function idFactory() {
  let nextId = 1;
  return () => `created-${nextId++}`;
}

describe('createOutputColumnsFromActiveInputColumns', () => {
  it('creates direct output columns only from active input columns', () => {
    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: 'Codigo' }),
        inputColumn({ id: 'input-b', columnIndex: 1, columnLetter: 'B', header: 'Nombre' }),
        inputColumn({ id: 'input-c', columnIndex: 2, columnLetter: 'C', active: false, header: 'Ignorada' }),
      ],
      [],
      { idFactory: idFactory() },
    );

    expect(result).toMatchObject({
      activeCount: 2,
      createdCount: 2,
      skippedExistingCount: 0,
    });
    expect(result.columns).toEqual([
      outputColumn({ id: 'created-1', label: 'Codigo', order: 0, recipe: { type: 'direct', inputColumnId: 'input-a' } }),
      outputColumn({ id: 'created-2', label: 'Nombre', order: 1, recipe: { type: 'direct', inputColumnId: 'input-b' } }),
    ]);
  });

  it('uses fallback names when alias and header are empty', () => {
    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: '  ', header: '' }),
        inputColumn({ id: 'input-b', columnIndex: 1, columnLetter: 'B' }),
      ],
      [outputColumn({ id: 'existing', order: 4 })],
      { idFactory: idFactory() },
    );

    expect(result.columns.slice(1)).toEqual([
      outputColumn({ id: 'created-1', label: 'Nueva columna 1', order: 5, recipe: { type: 'direct', inputColumnId: 'input-a' } }),
      outputColumn({ id: 'created-2', label: 'Nueva columna 2', order: 6, recipe: { type: 'direct', inputColumnId: 'input-b' } }),
    ]);
  });

  it('skips existing direct columns without replacing custom columns', () => {
    const customColumn = outputColumn({
      id: 'custom',
      label: 'Personalizada',
      order: 0,
      recipe: { type: 'combine', parts: [], separator: '' },
    });
    const directColumn = outputColumn({
      id: 'direct-a',
      label: 'Codigo',
      order: 1,
      recipe: { type: 'direct', inputColumnId: 'input-a' },
    });

    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: 'Codigo' }),
        inputColumn({ id: 'input-b', columnIndex: 1, columnLetter: 'B', header: 'Nombre' }),
      ],
      [customColumn, directColumn],
      { idFactory: idFactory() },
    );

    expect(result).toMatchObject({
      activeCount: 2,
      createdCount: 1,
      skippedExistingCount: 1,
    });
    expect(result.columns).toEqual([
      customColumn,
      directColumn,
      outputColumn({ id: 'created-1', label: 'Nombre', order: 2, recipe: { type: 'direct', inputColumnId: 'input-b' } }),
    ]);
  });

  it('reports no changes when every active input already has a direct output column', () => {
    const existingColumns = [
      outputColumn({ id: 'direct-a', recipe: { type: 'direct', inputColumnId: 'input-a' } }),
    ];

    const result = createOutputColumnsFromActiveInputColumns(
      [inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A' })],
      existingColumns,
      { idFactory: idFactory() },
    );

    expect(result.columns).toEqual(existingColumns);
    expect(result.createdCount).toBe(0);
    expect(result.skippedExistingCount).toBe(1);
  });
});
