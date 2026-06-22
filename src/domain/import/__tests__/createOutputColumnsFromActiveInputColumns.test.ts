import { describe, expect, it } from 'vitest';
import type { InputColumn, OutputColumn } from '../../../types/import';
import {
  createOutputColumnsFromActiveInputColumns,
  hasGeneratedOutputColumnManualChanges,
  resolveGeneratedColumnsRegeneration,
} from '../createOutputColumnsFromActiveInputColumns';

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
  it('regenerates direct output columns from active input columns', () => {
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
      removedObsoleteCount: 0,
    });
    expect(result.columns).toEqual([
      outputColumn({
        id: 'created-1',
        label: 'Codigo',
        order: 0,
        generatedFromInputColumnId: 'input-a',
        recipe: { type: 'direct', inputColumnId: 'input-a' },
      }),
      outputColumn({
        id: 'created-2',
        label: 'Nombre',
        order: 1,
        generatedFromInputColumnId: 'input-b',
        recipe: { type: 'direct', inputColumnId: 'input-b' },
      }),
    ]);
  });

  it('uses stable fallback names when alias and header are empty', () => {
    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: '  ', header: '' }),
        inputColumn({ id: 'input-b', columnIndex: 1, columnLetter: 'B' }),
      ],
      [outputColumn({ id: 'existing', order: 4 })],
      { idFactory: idFactory() },
    );

    expect(result.columns).toEqual([
      outputColumn({ id: 'existing', order: 0 }),
      outputColumn({
        id: 'created-1',
        label: 'Nueva columna A',
        order: 1,
        generatedFromInputColumnId: 'input-a',
        recipe: { type: 'direct', inputColumnId: 'input-a' },
      }),
      outputColumn({
        id: 'created-2',
        label: 'Nueva columna B',
        order: 2,
        generatedFromInputColumnId: 'input-b',
        recipe: { type: 'direct', inputColumnId: 'input-b' },
      }),
    ]);
  });

  it('uses the visual active input order as the generated output order', () => {
    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-c', columnIndex: 2, columnLetter: 'C', header: 'Precio' }),
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: 'Codigo' }),
        inputColumn({ id: 'input-b', columnIndex: 1, columnLetter: 'B', header: 'Nombre' }),
      ],
      [],
      { idFactory: idFactory() },
    );

    expect(result.columns.map((column) => column.generatedFromInputColumnId)).toEqual(['input-c', 'input-a', 'input-b']);
    expect(result.columns.map((column) => column.order)).toEqual([0, 1, 2]);
  });

  it('inserts missing generated columns according to the visual active input order', () => {
    const existingGeneratedColumn = outputColumn({
      id: 'generated-a',
      label: 'Codigo',
      generatedFromInputColumnId: 'input-a',
      recipe: { type: 'direct', inputColumnId: 'input-a' },
    });

    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-b', columnIndex: 1, columnLetter: 'B', header: 'Nombre' }),
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: 'Codigo' }),
        inputColumn({ id: 'input-c', columnIndex: 2, columnLetter: 'C', header: 'Precio' }),
      ],
      [existingGeneratedColumn],
      { idFactory: idFactory() },
    );

    expect(result.columns.map((column) => column.generatedFromInputColumnId)).toEqual(['input-b', 'input-a', 'input-c']);
    expect(result.columns.map((column) => column.id)).toEqual(['created-1', 'generated-a', 'created-2']);
  });

  it('preserves manually added columns while regenerating generated columns', () => {
    const customColumn = outputColumn({
      id: 'custom',
      label: 'Personalizada',
      order: 0,
      recipe: { type: 'combine', parts: [], separator: '' },
    });
    const obsoleteGeneratedColumn = outputColumn({
      id: 'direct-c',
      label: 'Obsoleta',
      order: 1,
      generatedFromInputColumnId: 'input-c',
      recipe: { type: 'direct', inputColumnId: 'input-c' },
    });
    const generatedColumn = outputColumn({
      id: 'direct-a',
      label: 'Codigo viejo',
      order: 2,
      generatedFromInputColumnId: 'input-a',
      recipe: { type: 'direct', inputColumnId: 'input-a' },
    });

    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: 'Codigo' }),
        inputColumn({ id: 'input-b', columnIndex: 1, columnLetter: 'B', header: 'Nombre' }),
        inputColumn({ id: 'input-c', columnIndex: 2, columnLetter: 'C', active: false, header: 'Obsoleta' }),
      ],
      [customColumn, obsoleteGeneratedColumn, generatedColumn],
      { idFactory: idFactory() },
    );

    expect(result.removedObsoleteCount).toBe(1);
    expect(result.columns).toEqual([
      outputColumn({ ...customColumn, order: 0 }),
      outputColumn({
        id: 'created-1',
        label: 'Codigo',
        order: 1,
        generatedFromInputColumnId: 'input-a',
        recipe: { type: 'direct', inputColumnId: 'input-a' },
      }),
      outputColumn({
        id: 'created-2',
        label: 'Nombre',
        order: 2,
        generatedFromInputColumnId: 'input-b',
        recipe: { type: 'direct', inputColumnId: 'input-b' },
      }),
    ]);
  });

  it('keeps unmarked direct columns as manual once generated markers exist', () => {
    const manualDirectColumn = outputColumn({
      id: 'manual-copy',
      label: 'Copia manual',
      recipe: { type: 'direct', inputColumnId: 'input-a' },
    });
    const generatedColumn = outputColumn({
      id: 'generated-a',
      label: 'Codigo',
      generatedFromInputColumnId: 'input-a',
      recipe: { type: 'direct', inputColumnId: 'input-a' },
    });

    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: 'Codigo' }),
      ],
      [manualDirectColumn, generatedColumn],
      { idFactory: idFactory() },
    );

    expect(result).toMatchObject({ createdCount: 0, skippedExistingCount: 1 });
    expect(result.columns).toEqual([
      outputColumn({ ...manualDirectColumn, order: 0 }),
      outputColumn({
        id: 'generated-a',
        label: 'Codigo',
        order: 1,
        generatedFromInputColumnId: 'input-a',
        recipe: { type: 'direct', inputColumnId: 'input-a' },
      }),
    ]);
  });

  it('does not leave obsolete generated columns or duplicate generated input references', () => {
    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A' }),
        inputColumn({ id: 'input-b', columnIndex: 1, columnLetter: 'B', active: false }),
      ],
      [
        outputColumn({ id: 'old-a', generatedFromInputColumnId: 'input-a', recipe: { type: 'direct', inputColumnId: 'input-a' } }),
        outputColumn({ id: 'old-b', generatedFromInputColumnId: 'input-b', recipe: { type: 'direct', inputColumnId: 'input-b' } }),
      ],
      { idFactory: idFactory() },
    );

    expect(result.columns.map((column) => column.generatedFromInputColumnId)).toEqual(['input-a']);
    expect(new Set(result.columns.map((column) => column.generatedFromInputColumnId)).size).toBe(1);
  });

  it('removes an obsolete generated column when its input column is no longer active', () => {
    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: 'Codigo' }),
        inputColumn({ id: 'input-b', columnIndex: 1, columnLetter: 'B', active: false, header: 'Nombre' }),
      ],
      [
        outputColumn({ id: 'manual', label: 'Manual', recipe: { type: 'empty' } }),
        outputColumn({ id: 'old-a', generatedFromInputColumnId: 'input-a', recipe: { type: 'direct', inputColumnId: 'input-a' } }),
        outputColumn({ id: 'old-b', generatedFromInputColumnId: 'input-b', recipe: { type: 'direct', inputColumnId: 'input-b' } }),
      ],
      { idFactory: idFactory() },
    );

    expect(result.removedObsoleteCount).toBe(1);
    expect(result.columns).toEqual([
      outputColumn({ id: 'manual', label: 'Manual', order: 0, recipe: { type: 'empty' } }),
      outputColumn({
        id: 'created-1',
        label: 'Codigo',
        order: 1,
        generatedFromInputColumnId: 'input-a',
        recipe: { type: 'direct', inputColumnId: 'input-a' },
      }),
    ]);
  });

  it('removes every generated column when all input columns are inactive and keeps manual columns', () => {
    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', active: false }),
        inputColumn({ id: 'input-b', columnIndex: 1, columnLetter: 'B', active: false }),
      ],
      [
        outputColumn({ id: 'manual', label: 'Manual', recipe: { type: 'empty' } }),
        outputColumn({ id: 'old-a', generatedFromInputColumnId: 'input-a', recipe: { type: 'direct', inputColumnId: 'input-a' } }),
        outputColumn({ id: 'old-b', generatedFromInputColumnId: 'input-b', recipe: { type: 'direct', inputColumnId: 'input-b' } }),
      ],
      { idFactory: idFactory() },
    );

    expect(result).toMatchObject({ activeCount: 0, createdCount: 0, removedObsoleteCount: 2 });
    expect(result.columns).toEqual([
      outputColumn({ id: 'manual', label: 'Manual', order: 0, recipe: { type: 'empty' } }),
    ]);
  });

  it('uses the current alias when regenerating generated columns', () => {
    const result = createOutputColumnsFromActiveInputColumns(
      [
        inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: 'Codigo nuevo', header: 'Codigo viejo' }),
      ],
      [
        outputColumn({
          id: 'old-a',
          label: 'Codigo viejo',
          generatedFromInputColumnId: 'input-a',
          recipe: { type: 'direct', inputColumnId: 'input-a' },
        }),
      ],
      { idFactory: idFactory() },
    );

    expect(result.columns[0]).toMatchObject({ label: 'Codigo nuevo', generatedFromInputColumnId: 'input-a' });
  });

  it('regenerates directly when generated columns are unmodified', () => {
    const inputColumns = [
      inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: 'Codigo' }),
    ];
    const outputColumns = createOutputColumnsFromActiveInputColumns(inputColumns, [], { idFactory: idFactory() }).columns;

    expect(hasGeneratedOutputColumnManualChanges(inputColumns, outputColumns)).toBe(false);
  });

  it('requires confirmation when generated columns have manual changes', () => {
    const inputColumns = [
      inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', alias: 'Codigo' }),
    ];
    const outputColumns = createOutputColumnsFromActiveInputColumns(inputColumns, [], { idFactory: idFactory() }).columns
      .map((column) => ({ ...column, label: 'Codigo editado' }));

    expect(hasGeneratedOutputColumnManualChanges(inputColumns, outputColumns)).toBe(true);
  });

  it('requires confirmation when an obsolete generated column has manual changes', () => {
    const inputColumns = [
      inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', active: false, alias: 'Codigo' }),
    ];
    const outputColumns = [
      outputColumn({
        id: 'old-a',
        label: 'Codigo editado',
        generatedFromInputColumnId: 'input-a',
        recipe: { type: 'direct', inputColumnId: 'input-a' },
      }),
    ];

    expect(hasGeneratedOutputColumnManualChanges(inputColumns, outputColumns)).toBe(true);
  });

  it('does not require confirmation when the active input set changed without manual edits', () => {
    const inputColumns = [
      inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A' }),
      inputColumn({ id: 'input-b', columnIndex: 1, columnLetter: 'B' }),
    ];
    const outputColumns = createOutputColumnsFromActiveInputColumns([inputColumns[0]], [], { idFactory: idFactory() }).columns;

    expect(hasGeneratedOutputColumnManualChanges(inputColumns, outputColumns)).toBe(false);
  });

  it('keeps current columns when regeneration is cancelled', () => {
    const inputColumns = [
      inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A' }),
    ];
    const outputColumns = [
      outputColumn({ id: 'manual', label: 'Manual' }),
    ];

    expect(resolveGeneratedColumnsRegeneration(inputColumns, outputColumns, false).columns).toBe(outputColumns);
  });

  it('regenerates cleanly when regeneration is confirmed', () => {
    const inputColumns = [
      inputColumn({ id: 'input-a', columnIndex: 0, columnLetter: 'A', header: 'Codigo' }),
    ];
    const outputColumns = [
      outputColumn({ id: 'manual', label: 'Manual' }),
      outputColumn({
        id: 'generated',
        label: 'Codigo editado',
        generatedFromInputColumnId: 'input-a',
        recipe: { type: 'direct', inputColumnId: 'input-a' },
      }),
    ];

    expect(resolveGeneratedColumnsRegeneration(inputColumns, outputColumns, true, { idFactory: idFactory() }).columns).toEqual([
      outputColumn({ id: 'manual', label: 'Manual', order: 0 }),
      outputColumn({
        id: 'created-1',
        label: 'Codigo',
        order: 1,
        generatedFromInputColumnId: 'input-a',
        recipe: { type: 'direct', inputColumnId: 'input-a' },
      }),
    ]);
  });
});
