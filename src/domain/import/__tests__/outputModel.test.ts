import { describe, expect, it } from 'vitest';
import type { ColumnAnalysis, InputRow, NumericOperation, OutputColumn } from '../../../types/import';
import { buildProcessedRows, buildProcessedRowsPipeline } from '../outputModel';

const inputRows: InputRow[] = [
  {
    rowNumber: 1,
    values: {
      'input-code': 'ABC123',
      'input-name': ' Pintura Latex ',
      'input-brand': 'Marca',
      'input-product': 'Producto',
      'input-empty': '',
      'input-price': '$ 200',
      'input-large-price': '1500',
      'input-date': '01/06/2024',
      'input-short-date': '6/1/24',
      'input-single-digit-date': '1/6/2024',
      'input-invalid': 'abc',
    },
  },
];

function buildRow(outputColumns: OutputColumn[]) {
  return buildProcessedRows(inputRows, outputColumns)[0];
}

function outputColumn(partial: Partial<OutputColumn>): OutputColumn {
  return {
    id: partial.id ?? crypto.randomUUID(),
    label: partial.label ?? 'Salida',
    order: partial.order ?? 0,
    enabled: partial.enabled ?? true,
    recipe: partial.recipe ?? { type: 'empty' },
  };
}

describe('outputModel recipes', () => {
  it('resolves direct, empty and fixedText recipes', () => {
    const row = buildRow([
      outputColumn({ id: 'code', recipe: { type: 'direct', inputColumnId: 'input-code' } }),
      outputColumn({ id: 'empty', recipe: { type: 'empty' } }),
      outputColumn({ id: 'fixed', recipe: { type: 'fixedText', value: 'Activo' } }),
    ]);

    expect(row.outputValues.code).toBe('ABC123');
    expect(row.outputValues.empty).toBe('');
    expect(row.outputValues.fixed).toBe('Activo');
  });

  it('combines input columns and fixed text without undefined values', () => {
    const row = buildRow([
      outputColumn({
        id: 'combined',
        recipe: {
          type: 'combine',
          separator: ' - ',
          parts: [
            { id: 'brand', type: 'input', inputColumnId: 'input-brand' },
            { id: 'missing', type: 'input', inputColumnId: 'input-missing' },
            { id: 'product', type: 'input', inputColumnId: 'input-product' },
          ],
        },
      }),
      outputColumn({
        id: 'text-combined',
        recipe: {
          type: 'combine',
          parts: [
            { id: 'prefix', type: 'text', value: 'PROD-' },
            { id: 'code', type: 'input', inputColumnId: 'input-code' },
          ],
        },
      }),
    ]);

    expect(row.outputValues.combined).toBe('Marca - Producto');
    expect(row.outputValues['text-combined']).toBe('PROD-ABC123');
    expect(row.outputValues.combined).not.toContain('undefined');
  });

  it('combines parts with custom separators and part transformations', () => {
    const row = buildRow([
      outputColumn({
        id: 'presentation',
        recipe: {
          type: 'combine',
          separator: ' / ',
          parts: [
            { id: 'product', type: 'input', inputColumnId: 'input-product', separatorAfter: ' - ' },
            {
              id: 'amount',
              type: 'text',
              value: '20',
              separatorAfter: ' X ',
              steps: [{ id: 'liters', type: 'addSuffix', value: 'lts' }],
            },
            {
              id: 'units',
              type: 'text',
              value: '3',
              steps: [{ id: 'units-suffix', type: 'addSuffix', value: 'Unidades' }],
            },
          ],
        },
      }),
    ]);

    expect(row.outputValues.presentation).toBe('Producto - 20lts X 3Unidades');
  });

  it('applies part transformations before final transformations', () => {
    const row = buildRow([
      outputColumn({
        id: 'combined',
        recipe: {
          type: 'combine',
          parts: [
            {
              id: 'prefix',
              type: 'text',
              value: 'prod',
              separatorAfter: '-',
              steps: [{ id: 'upper', type: 'uppercase' }],
            },
            {
              id: 'code',
              type: 'input',
              inputColumnId: 'input-code',
              steps: [{ id: 'part-prefix', type: 'addPrefix', value: 'COD-' }],
            },
          ],
          steps: [{ id: 'final-suffix', type: 'addSuffix', value: '-OK' }],
        },
      }),
    ]);

    expect(row.outputValues.combined).toBe('PROD-COD-ABC123-OK');
  });

  it('does not add custom separator after the last part', () => {
    const row = buildRow([
      outputColumn({
        id: 'combined',
        recipe: {
          type: 'combine',
          parts: [
            { id: 'a', type: 'text', value: 'A', separatorAfter: ' - ' },
            { id: 'b', type: 'text', value: 'B', separatorAfter: ' SHOULD_NOT_APPEAR ' },
          ],
        },
      }),
    ]);

    expect(row.outputValues.combined).toBe('A - B');
  });
});

describe('outputModel manual range recipes', () => {
  it('assigns fixed text from valueRecipe source to rows inside the configured range', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': 'A8' } },
      { rowNumber: 14, values: { 'input-code': 'A14' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [{
            id: 'range-8-13',
            startRowNumber: 8,
            endRowNumber: 13,
            valueRecipe: { source: { type: 'fixedText', value: 'Promo' } },
          }],
        },
      }),
    ]);

    expect(rows.map((row) => row.outputValues.comment)).toEqual(['Promo', '']);
  });

  it('does not use suggested manual range reference text as the output value', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': 'A8' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [{
            id: 'range-8-13',
            startRowNumber: 8,
            endRowNumber: 13,
            suggestedFromText: 'PINCELES SERIE 304',
            valueRecipe: { source: { type: 'fixedText', value: '' } },
          }],
        },
      }),
    ]);

    expect(rows[0].outputValues.comment).toBe('');
  });

  it('assigns current row input values from valueRecipe source columns', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': 'A8' } },
      { rowNumber: 9, values: { 'input-code': 'A9' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [{
            id: 'range-8-13',
            startRowNumber: 8,
            endRowNumber: 13,
            valueRecipe: { source: { type: 'input', inputColumnId: 'input-code' } },
          }],
        },
      }),
    ]);

    expect(rows.map((row) => row.outputValues.comment)).toEqual(['A8', 'A9']);
  });

  it('assigns selected text from valueRecipe rangeText sources', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': 'A8' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [{
            id: 'range-8-13',
            startRowNumber: 8,
            endRowNumber: 13,
            valueRecipe: { source: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'Sinteplast' } },
          }],
        },
      }),
    ]);

    expect(rows[0].outputValues.comment).toBe('Sinteplast');
  });

  it('applies valueRecipe steps over the initial range value', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': '  promo  ' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [{
            id: 'range-8-13',
            startRowNumber: 8,
            endRowNumber: 13,
            valueRecipe: {
              source: { type: 'input', inputColumnId: 'input-code' },
              steps: [
                { id: 'trim', type: 'trim' },
                { id: 'upper', type: 'uppercase' },
              ],
            },
          }],
        },
      }),
    ]);

    expect(rows[0].outputValues.comment).toBe('PROMO');
  });

  it('applies concat valueRecipe steps using the current real row', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': 'A8', 'input-brand': 'Marca' } },
      { rowNumber: 9, values: { 'input-code': 'A9', 'input-brand': 'Otra' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [{
            id: 'range-8-13',
            startRowNumber: 8,
            endRowNumber: 13,
            valueRecipe: {
              source: { type: 'fixedText', value: '' },
              steps: [{
                id: 'concat',
                type: 'concat',
                parts: [
                  { id: 'code', source: { type: 'input', inputColumnId: 'input-code' } },
                  { id: 'brand', source: { type: 'input', inputColumnId: 'input-brand' }, separatorBefore: ' - ' },
                ],
              }],
            },
          }],
        },
      }),
    ]);

    expect(rows.map((row) => row.outputValues.comment)).toEqual(['A8 - Marca', 'A9 - Otra']);
  });

  it('ignores nested manualRange steps inside valueRecipe without recursing or failing', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': 'A8' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [{
            id: 'range-8-13',
            startRowNumber: 8,
            endRowNumber: 13,
            valueRecipe: {
              source: { type: 'fixedText', value: 'Base' },
              steps: [
                {
                  id: 'nested-range',
                  type: 'manualRange',
                  ranges: [{
                    id: 'nested',
                    startRowNumber: 8,
                    endRowNumber: 8,
                    valueSource: { type: 'fixedText', value: 'Nested' },
                  }],
                },
                { id: 'suffix', type: 'addSuffix', value: '-OK' },
              ],
            },
          }],
        },
      }),
    ]);

    expect(rows[0].outputValues.comment).toBe('Base-OK');
  });

  it('assigns fixed text from valueSource to rows inside the configured range and empty text outside it', () => {
    const rows = buildProcessedRows([
      { rowNumber: 7, values: { 'input-code': 'A7' } },
      { rowNumber: 8, values: { 'input-code': 'A8' } },
      { rowNumber: 13, values: { 'input-code': 'A13' } },
      { rowNumber: 14, values: { 'input-code': 'A14' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [
            {
              id: 'range-8-13',
              startRowNumber: 8,
              endRowNumber: 13,
              valueSource: { type: 'fixedText', value: 'Cerda china mango amarillo' },
            },
          ],
        },
      }),
    ]);

    expect(rows.map((row) => row.outputValues.comment)).toEqual([
      '',
      'Cerda china mango amarillo',
      'Cerda china mango amarillo',
      '',
    ]);
  });

  it('keeps legacy manual range values working', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': 'A8' } },
      { rowNumber: 14, values: { 'input-code': 'A14' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Legacy' }],
        },
      }),
    ]);

    expect(rows.map((row) => row.outputValues.comment)).toEqual(['Legacy', '']);
  });

  it('uses manual range as a normal custom value step before later transformations', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': 'A8', 'input-brand': 'Marca' } },
      { rowNumber: 14, values: { 'input-code': 'A14', 'input-brand': 'Marca' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'combine',
          customMode: 'text',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'range',
              type: 'manualRange',
              mode: 'text',
              ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: '  promo ' }],
            },
            { id: 'trim', type: 'trim', mode: 'text' },
            { id: 'suffix', type: 'addSuffix', mode: 'text', value: '-OK' },
            {
              id: 'concat',
              type: 'concat',
              mode: 'text',
              parts: [
                { id: 'previous', source: { type: 'previousResult' } },
                { id: 'brand', source: { type: 'input', inputColumnId: 'input-brand' }, separatorBefore: '-' },
              ],
            },
          ],
        },
      }),
    ]);

    expect(rows.map((row) => row.outputValues.comment)).toEqual(['promo-OK-Marca', '-Marca']);
  });

  it('uses selected range text from a manual range step inside a concat part', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': 'A8', 'input-brand': 'Marca' } },
      { rowNumber: 14, values: { 'input-code': 'A14', 'input-brand': 'Marca' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'combine',
          customMode: 'concat',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'concat',
              type: 'concat',
              mode: 'text',
              parts: [
                {
                  id: 'range-part',
                  source: { type: 'previousResult' },
                  steps: [{
                    id: 'nested-range',
                    type: 'manualRange',
                    mode: 'text',
                    ranges: [{
                      id: 'range-8-13',
                      startRowNumber: 8,
                      endRowNumber: 13,
                      valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'PINCELES SERIE 304' },
                    }],
                  }],
                },
                {
                  id: 'brand-part',
                  source: { type: 'input', inputColumnId: 'input-brand' },
                  separatorBefore: ' - ',
                },
              ],
            },
          ],
        },
      }),
    ]);

    expect(rows.map((row) => row.outputValues.comment)).toEqual([
      'PINCELES SERIE 304 - Marca',
      ' - Marca',
    ]);
  });

  it('uses selected range text as a concat part source inside a range value recipe', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': 'A8', 'input-brand': 'Marca' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [{
            id: 'range-8-13',
            startRowNumber: 8,
            endRowNumber: 13,
            valueRecipe: {
              source: { type: 'fixedText', value: '' },
              steps: [{
                id: 'concat',
                type: 'concat',
                mode: 'text',
                parts: [
                  { id: 'range-text', source: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'PINCELES SERIE 304' } },
                  { id: 'brand', source: { type: 'input', inputColumnId: 'input-brand' }, separatorBefore: ' - ' },
                ],
              }],
            },
          }],
        },
      }),
    ]);

    expect(rows[0].outputValues.comment).toBe('PINCELES SERIE 304 - Marca');
  });

  it('assigns selected text from rangeText value sources', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-code': 'A8' } },
      { rowNumber: 9, values: { 'input-code': 'A9' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [
            {
              id: 'range-8-8',
              startRowNumber: 8,
              endRowNumber: 8,
              valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: 'Sinteplast' },
            },
            {
              id: 'range-9-9',
              startRowNumber: 9,
              endRowNumber: 9,
              valueSource: { type: 'rangeText', inputColumnId: 'input-code', selectedText: '' },
            },
          ],
        },
      }),
    ]);

    expect(rows.map((row) => row.outputValues.comment)).toEqual(['Sinteplast', '']);
  });

  it('uses real Excel row numbers from metadata, not internal row indexes', () => {
    const pipeline = buildProcessedRowsPipeline({
      rawRows: [
        ['A7'],
        ['A8'],
        ['A13'],
      ],
      rowMetadata: [
        { internalRowIndex: 0, excelRowNumber: 7 },
        { internalRowIndex: 1, excelRowNumber: 8 },
        { internalRowIndex: 2, excelRowNumber: 13 },
      ],
      columnAnalysis: [columnAnalysis(0, 'A', 'Codigo')],
      startRowIndex: 0,
      outputColumns: [
        outputColumn({
          id: 'comment',
          recipe: {
            type: 'manualRange',
            ranges: [{ id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Dentro' }],
          },
        }),
      ],
    });

    expect(pipeline.processedRows.map((row) => ({
      rowNumber: row.rowNumber,
      comment: row.outputValues.comment,
    }))).toEqual([
      { rowNumber: 8, comment: 'Dentro' },
      { rowNumber: 13, comment: 'Dentro' },
    ]);
  });

  it('respects an input condition such as column B is not empty', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-0': 'A8', 'input-1': 'B8' } },
      { rowNumber: 9, values: { 'input-0': 'A9', 'input-1': '' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [{ id: 'range-8-9', startRowNumber: 8, endRowNumber: 9, value: 'Con codigo' }],
          condition: { inputColumnId: 'input-1', operator: 'isNotEmpty' },
        },
      }),
    ]);

    expect(rows.map((row) => row.outputValues.comment)).toEqual(['Con codigo', '']);
  });

  it('applies to every row in range when no condition is configured', () => {
    const rows = buildProcessedRows([
      { rowNumber: 8, values: { 'input-0': 'A8', 'input-1': '' } },
      { rowNumber: 9, values: { 'input-0': 'A9', 'input-1': 'B9' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [{ id: 'range-8-9', startRowNumber: 8, endRowNumber: 9, value: 'Sin condicion' }],
        },
      }),
    ]);

    expect(rows.map((row) => row.outputValues.comment)).toEqual(['Sin condicion', 'Sin condicion']);
  });

  it('uses the first configured range when ranges overlap', () => {
    const [row] = buildProcessedRows([
      { rowNumber: 10, values: { 'input-0': 'A10' } },
    ], [
      outputColumn({
        id: 'comment',
        recipe: {
          type: 'manualRange',
          ranges: [
            { id: 'first', startRowNumber: 8, endRowNumber: 12, value: 'Primero' },
            { id: 'second', startRowNumber: 10, endRowNumber: 13, value: 'Segundo' },
          ],
        },
      }),
    ]);

    expect(row.outputValues.comment).toBe('Primero');
  });
});

describe('outputModel input filters', () => {
  it('filters input rows before building processed rows', () => {
    const columns: ColumnAnalysis[] = [
      columnAnalysis(0, 'A', 'Codigo'),
      columnAnalysis(1, 'B', 'Estado'),
    ];
    const pipeline = buildProcessedRowsPipeline({
      rawRows: [
        ['A1', 'ACTIVO'],
        ['A2', 'BORRAR'],
      ],
      columnAnalysis: columns,
      startRowIndex: 0,
      inputIgnoreRules: [
        { id: 'remove-deleted', target: 'input', columnId: 'input-1', operator: 'equals', value: 'BORRAR' },
      ],
      outputColumns: [
        outputColumn({ id: 'code', recipe: { type: 'direct', inputColumnId: 'input-0' } }),
      ],
    });

    expect(pipeline.includedInputRows).toHaveLength(1);
    expect(pipeline.processedRows).toHaveLength(1);
    expect(pipeline.processedRows[0].rowNumber).toBe(1);
    expect(pipeline.ignoredInputRows).toEqual([
      {
        rowNumber: 2,
        inputValues: { 'input-0': 'A2', 'input-1': 'BORRAR' },
        ignoredReason: 'Ignorada por regla: B - Estado es igual a "BORRAR"',
      },
    ]);
  });

  it('keeps index-based row numbers when metadata is not provided', () => {
    const pipeline = buildProcessedRowsPipeline({
      rawRows: [
        ['A1'],
        ['A2'],
      ],
      columnAnalysis: [columnAnalysis(0, 'A', 'Codigo')],
      startRowIndex: 0,
      outputColumns: [
        outputColumn({ id: 'code', recipe: { type: 'direct', inputColumnId: 'input-0' } }),
      ],
    });

    expect(pipeline.inputRows.map((row) => row.rowNumber)).toEqual([1, 2]);
    expect(pipeline.processedRows.map((row) => row.rowNumber)).toEqual([1, 2]);
  });

  it('uses Excel row numbers from metadata while keeping filters and recipes working', () => {
    const columns: ColumnAnalysis[] = [
      columnAnalysis(0, 'A', 'Codigo'),
      columnAnalysis(1, 'B', 'Estado'),
    ];
    const pipeline = buildProcessedRowsPipeline({
      rawRows: [
        ['A1', 'ACTIVO'],
        ['A2', 'BORRAR'],
        ['A3', 'ACTIVO'],
      ],
      rowMetadata: [
        { internalRowIndex: 0, excelRowNumber: 1 },
        { internalRowIndex: 1, excelRowNumber: 3 },
        { internalRowIndex: 2, excelRowNumber: 5 },
      ],
      columnAnalysis: columns,
      startRowIndex: 0,
      inputIgnoreRules: [
        { id: 'remove-deleted', target: 'input', columnId: 'input-1', operator: 'equals', value: 'BORRAR' },
      ],
      outputColumns: [
        outputColumn({ id: 'code', recipe: { type: 'direct', inputColumnId: 'input-0' } }),
      ],
    });

    expect(pipeline.inputRows.map((row) => row.rowNumber)).toEqual([1, 3, 5]);
    expect(pipeline.ignoredInputRows).toEqual([
      {
        rowNumber: 3,
        inputValues: { 'input-0': 'A2', 'input-1': 'BORRAR' },
        ignoredReason: 'Ignorada por regla: B - Estado es igual a "BORRAR"',
      },
    ]);
    expect(pipeline.processedRows.map((row) => ({
      rowNumber: row.rowNumber,
      code: row.outputValues.code,
    }))).toEqual([
      { rowNumber: 1, code: 'A1' },
      { rowNumber: 5, code: 'A3' },
    ]);
  });
});

describe('outputModel simple transformations', () => {
  it('applies text transformations in order', () => {
    const row = buildRow([
      outputColumn({
        id: 'name',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-name',
          steps: [
            { id: 'trim', type: 'trim' },
            { id: 'upper', type: 'uppercase' },
            { id: 'remove', type: 'removeText', value: ' LATEX' },
            { id: 'replace', type: 'replaceText', searchValue: 'PINTURA', replaceValue: 'PINT.' },
            { id: 'prefix', type: 'addPrefix', value: 'GEN-' },
            { id: 'suffix', type: 'addSuffix', value: '-OK' },
          ],
        },
      }),
      outputColumn({
        id: 'lower',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-name',
          steps: [{ id: 'lowercase', type: 'lowercase' }],
        },
      }),
    ]);

    expect(row.outputValues.name).toBe('GEN-PINT.-OK');
    expect(row.outputValues.lower).toBe(' pintura latex ');
  });

  it('does not apply prefix/suffix to empty values by default but can opt in', () => {
    const row = buildRow([
      outputColumn({
        id: 'default-empty',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-empty',
          steps: [{ id: 'prefix', type: 'addPrefix', value: 'ME' }],
        },
      }),
      outputColumn({
        id: 'forced-empty',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-empty',
          steps: [{ id: 'prefix', type: 'addPrefix', value: 'ME', applyToEmptyValues: true }],
        },
      }),
    ]);

    expect(row.outputValues['default-empty']).toBe('');
    expect(row.outputValues['forced-empty']).toBe('ME');
  });
});

describe('outputModel numeric transformations', () => {
  it('applies numeric operations', () => {
    const row = buildRow([
      numericColumn('add', 'add', 50),
      numericColumn('subtract', 'subtract', 10),
      numericColumn('multiply', 'multiply', 1.21),
      numericColumn('divide', 'divide', 2),
      numericColumn('addPercentage', 'addPercentage', 10),
      numericColumn('subtractPercentage', 'subtractPercentage', 10),
      outputColumn({
        id: 'removeIncludedPercentage',
        recipe: {
          type: 'fixedText',
          value: '242',
          steps: [{ id: 'numeric', type: 'numericOperation', operation: 'removeIncludedPercentage', amount: 21, rounding: 2 }],
        },
      }),
    ]);

    expect(row.outputValues.add).toBe('250.00');
    expect(row.outputValues.subtract).toBe('190.00');
    expect(row.outputValues.multiply).toBe('242.00');
    expect(row.outputValues.divide).toBe('100.00');
    expect(row.outputValues.addPercentage).toBe('220.00');
    expect(row.outputValues.subtractPercentage).toBe('180.00');
    expect(row.outputValues.removeIncludedPercentage).toBe('200.00');
  });

  it('keeps original value and emits warnings for invalid numeric operations', () => {
    const row = buildRow([
      outputColumn({
        id: 'invalid',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-invalid',
          steps: [{ id: 'numeric', type: 'numericOperation', operation: 'addPercentage', amount: 10 }],
        },
      }),
      outputColumn({
        id: 'zero',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-price',
          steps: [{ id: 'numeric', type: 'numericOperation', operation: 'divide', amount: 0 }],
        },
      }),
    ]);

    expect(row.outputValues.invalid).toBe('abc');
    expect(row.outputValues.zero).toBe('$ 200');
    expect(row.warnings).toContain('No se pudo aplicar operación numérica: valor inválido');
    expect(row.warnings).toContain('No se puede dividir por cero');
  });

  it('converts values explicitly between text and number steps', () => {
    const row = buildRow([
      outputColumn({
        id: 'extract-and-add',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-code',
          steps: [
            { id: 'extract', type: 'extractNumber' },
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
          ],
        },
      }),
      outputColumn({
        id: 'number-to-text',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-price',
          steps: [
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
            { id: 'text', type: 'toText' },
            { id: 'prefix', type: 'addPrefix', value: 'hay ' },
            { id: 'suffix', type: 'addSuffix', value: ' personas' },
          ],
        },
      }),
    ]);

    expect(row.outputValues['extract-and-add']).toBe('133');
    expect(row.outputValues['number-to-text']).toBe('hay 210 personas');
  });

  it('does not convert mixed text to number unless extraction is explicit', () => {
    const row = buildRow([
      outputColumn({
        id: 'strict',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-code',
          steps: [
            { id: 'to-number', type: 'toNumber' },
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
          ],
        },
      }),
    ]);

    expect(row.outputValues.strict).toBe('ABC123');
    expect(row.warnings).toContain('No se pudo convertir a número: valor inválido');
    expect(row.warnings).toContain('No se pudo aplicar operación numérica: valor inválido');
  });
});

describe('outputModel step sources', () => {
  it('uses a configured input column as the first step source', () => {
    const row = buildRow([
      outputColumn({
        id: 'source-input',
        recipe: {
          type: 'fixedText',
          value: '',
          steps: [{ id: 'suffix', type: 'addSuffix', source: { type: 'input', inputColumnId: 'input-code' }, value: '-OK' }],
        },
      }),
    ]);

    expect(row.outputValues['source-input']).toBe('ABC123-OK');
  });

  it('uses fixed text as the first step source', () => {
    const row = buildRow([
      outputColumn({
        id: 'source-fixed',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-code',
          steps: [{ id: 'upper', type: 'uppercase', source: { type: 'fixedText', value: 'manual' } }],
        },
      }),
    ]);

    expect(row.outputValues['source-fixed']).toBe('MANUAL');
  });

  it('uses previous result by default in later steps', () => {
    const row = buildRow([
      outputColumn({
        id: 'previous',
        recipe: {
          type: 'fixedText',
          value: 'A',
          steps: [
            { id: 'b', type: 'addSuffix', value: 'B' },
            { id: 'c', type: 'addSuffix', value: 'C' },
          ],
        },
      }),
    ]);

    expect(row.outputValues.previous).toBe('ABC');
  });

  it('can use another input column in a later step', () => {
    const row = buildRow([
      outputColumn({
        id: 'other-column',
        recipe: {
          type: 'fixedText',
          value: 'A',
          steps: [
            { id: 'b', type: 'addSuffix', value: 'B' },
            { id: 'code', type: 'addSuffix', source: { type: 'input', inputColumnId: 'input-code' }, value: '-OK' },
          ],
        },
      }),
    ]);

    expect(row.outputValues['other-column']).toBe('ABC123-OK');
  });
});

describe('outputModel numeric operands', () => {
  it('adds previous result and a fixed operand', () => {
    const row = buildRow([
      outputColumn({
        id: 'previous-plus-fixed',
        recipe: {
          type: 'fixedText',
          value: '100',
          steps: [{
            id: 'add',
            type: 'numericOperation',
            operation: 'add',
            leftOperand: { type: 'previousResult' },
            rightOperand: { type: 'fixedText', value: '10' },
            rounding: 0,
          }],
        },
      }),
    ]);

    expect(row.outputValues['previous-plus-fixed']).toBe('110');
  });

  it('adds two input operands', () => {
    const row = buildRow([
      outputColumn({
        id: 'input-plus-input',
        recipe: {
          type: 'fixedText',
          value: '',
          steps: [{
            id: 'add',
            type: 'numericOperation',
            operation: 'add',
            leftOperand: { type: 'input', inputColumnId: 'input-price' },
            rightOperand: { type: 'input', inputColumnId: 'input-large-price' },
            rounding: 0,
          }],
        },
      }),
    ]);

    expect(row.outputValues['input-plus-input']).toBe('1700');
  });

  it('subtracts input operand from previous result', () => {
    const row = buildRow([
      outputColumn({
        id: 'previous-minus-input',
        recipe: {
          type: 'fixedText',
          value: '1500',
          steps: [{
            id: 'subtract',
            type: 'numericOperation',
            operation: 'subtract',
            leftOperand: { type: 'previousResult' },
            rightOperand: { type: 'input', inputColumnId: 'input-price' },
            rounding: 0,
          }],
        },
      }),
    ]);

    expect(row.outputValues['previous-minus-input']).toBe('1300');
  });

  it('subtracts previous result from an input operand', () => {
    const row = buildRow([
      outputColumn({
        id: 'input-minus-previous',
        recipe: {
          type: 'fixedText',
          value: '200',
          steps: [{
            id: 'subtract',
            type: 'numericOperation',
            operation: 'subtract',
            leftOperand: { type: 'input', inputColumnId: 'input-large-price' },
            rightOperand: { type: 'previousResult' },
            rounding: 0,
          }],
        },
      }),
    ]);

    expect(row.outputValues['input-minus-previous']).toBe('1300');
  });

  it('divides previous result by an input operand', () => {
    const row = buildRow([
      outputColumn({
        id: 'previous-divide-input',
        recipe: {
          type: 'fixedText',
          value: '1500',
          steps: [{
            id: 'divide',
            type: 'numericOperation',
            operation: 'divide',
            leftOperand: { type: 'previousResult' },
            rightOperand: { type: 'input', inputColumnId: 'input-price' },
            rounding: 2,
          }],
        },
      }),
    ]);

    expect(row.outputValues['previous-divide-input']).toBe('7.50');
  });

  it('divides an input operand by previous result', () => {
    const row = buildRow([
      outputColumn({
        id: 'input-divide-previous',
        recipe: {
          type: 'fixedText',
          value: '200',
          steps: [{
            id: 'divide',
            type: 'numericOperation',
            operation: 'divide',
            leftOperand: { type: 'input', inputColumnId: 'input-large-price' },
            rightOperand: { type: 'previousResult' },
            rounding: 2,
          }],
        },
      }),
    ]);

    expect(row.outputValues['input-divide-previous']).toBe('7.50');
  });

  it('keeps current value and warns for zero division and invalid operands', () => {
    const row = buildRow([
      outputColumn({
        id: 'zero',
        recipe: {
          type: 'fixedText',
          value: '200',
          steps: [{
            id: 'divide',
            type: 'numericOperation',
            operation: 'divide',
            leftOperand: { type: 'previousResult' },
            rightOperand: { type: 'fixedText', value: '0' },
          }],
        },
      }),
      outputColumn({
        id: 'invalid',
        recipe: {
          type: 'fixedText',
          value: '200',
          steps: [{
            id: 'add',
            type: 'numericOperation',
            operation: 'add',
            leftOperand: { type: 'previousResult' },
            rightOperand: { type: 'input', inputColumnId: 'input-invalid' },
          }],
        },
      }),
    ]);

    expect(row.outputValues.zero).toBe('200');
    expect(row.outputValues.invalid).toBe('200');
    expect(row.warnings).toContain('No se puede dividir por cero');
    expect(row.warnings).toContain('No se pudo aplicar operación numérica: operando inválido');
  });

  it('keeps old amount-based numeric operations working', () => {
    const row = buildRow([numericColumn('amount-compat', 'add', 50)]);

    expect(row.outputValues['amount-compat']).toBe('250.00');
  });
});

describe('outputModel concat step', () => {
  it('concatenates input and fixed text parts', () => {
    const row = buildRow([
      outputColumn({
        id: 'concat-step',
        recipe: {
          type: 'fixedText',
          value: '',
          steps: [{
            id: 'concat',
            type: 'concat',
            parts: [
              { id: 'product', source: { type: 'input', inputColumnId: 'input-product' } },
              { id: 'suffix', source: { type: 'fixedText', value: 'OK' }, separatorBefore: ' ' },
            ],
          }],
        },
      }),
    ]);

    expect(row.outputValues['concat-step']).toBe('Producto OK');
  });

  it('uses previous result inside concat from the second step onward', () => {
    const row = buildRow([
      outputColumn({
        id: 'concat-previous',
        recipe: {
          type: 'fixedText',
          value: '',
          steps: [
            { id: 'trim', type: 'trim', source: { type: 'input', inputColumnId: 'input-name' } },
            {
              id: 'concat',
              type: 'concat',
              parts: [
                { id: 'previous', source: { type: 'previousResult' } },
                { id: 'suffix', source: { type: 'fixedText', value: 'OK' }, separatorBefore: ' ' },
              ],
            },
          ],
        },
      }),
    ]);

    expect(row.outputValues['concat-previous']).toBe('Pintura Latex OK');
  });

  it('preserves separators and applies part steps before joining', () => {
    const row = buildRow([
      outputColumn({
        id: 'concat-part-steps',
        recipe: {
          type: 'fixedText',
          value: '',
          steps: [{
            id: 'concat',
            type: 'concat',
            parts: [
              {
                id: 'name',
                source: { type: 'input', inputColumnId: 'input-name' },
                steps: [
                  { id: 'trim', type: 'trim' },
                  { id: 'upper', type: 'uppercase' },
                ],
              },
              { id: 'suffix', source: { type: 'fixedText', value: 'OK' }, separatorBefore: ' - ' },
            ],
          }],
        },
      }),
    ]);

    expect(row.outputValues['concat-part-steps']).toBe('PINTURA LATEX - OK');
  });
});

describe('outputModel date steps', () => {
  it('formats a direct recipe value as a string', () => {
    const row = buildRow([
      outputColumn({
        id: 'date',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-date',
          steps: [{
            id: 'format-date',
            type: 'formatDate',
            mode: 'date',
            dateInputFormat: 'DD/MM/YYYY',
            dateOutputFormat: 'YYYY-MM-DD',
          }],
        },
      }),
    ]);

    expect(row.outputValues.date).toBe('2024-06-01');
  });

  it('formats dates with two digit years from real spreadsheet display values', () => {
    const row = buildRow([
      outputColumn({
        id: 'date',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-short-date',
          steps: [{
            id: 'format-date',
            type: 'formatDate',
            mode: 'date',
            dateInputFormat: 'MM/DD/YY',
            dateOutputFormat: 'YYYY-MM-DD',
          }],
        },
      }),
    ]);

    expect(row.outputValues.date).toBe('2024-06-01');
  });

  it('formats dates with single digit day and month', () => {
    const row = buildRow([
      outputColumn({
        id: 'date',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-single-digit-date',
          steps: [{
            id: 'format-date',
            type: 'formatDate',
            mode: 'date',
            dateInputFormat: 'DD/MM/YYYY',
            dateOutputFormat: 'YYYY-MM-DD',
          }],
        },
      }),
    ]);

    expect(row.outputValues.date).toBe('2024-06-01');
  });

  it('changes the result when the output format changes', () => {
    const row = buildRow([
      outputColumn({
        id: 'iso',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-short-date',
          steps: [{ id: 'format-date', type: 'formatDate', dateInputFormat: 'MM/DD/YY', dateOutputFormat: 'YYYY-MM-DD' }],
        },
      }),
      outputColumn({
        id: 'slashed',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-short-date',
          steps: [{ id: 'format-date', type: 'formatDate', dateInputFormat: 'MM/DD/YY', dateOutputFormat: 'DD/MM/YYYY' }],
        },
      }),
    ]);

    expect(row.outputValues.iso).toBe('2024-06-01');
    expect(row.outputValues.slashed).toBe('01/06/2024');
  });

  it('applies fixed text fallback only to invalid dates', () => {
    const row = buildRow([
      outputColumn({
        id: 'valid',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-short-date',
          steps: [{
            id: 'format-date',
            type: 'formatDate',
            dateInputFormat: 'MM/DD/YY',
            dateOutputFormat: 'YYYY-MM-DD',
            dateInvalidFallback: 'fixedText',
            dateInvalidFallbackText: 'Esta bonito',
          }],
        },
      }),
      outputColumn({
        id: 'invalid',
        recipe: {
          type: 'fixedText',
          value: '31/02/2024',
          steps: [{
            id: 'format-date',
            type: 'formatDate',
            dateInputFormat: 'DD/MM/YYYY',
            dateOutputFormat: 'YYYY-MM-DD',
            dateInvalidFallback: 'fixedText',
            dateInvalidFallbackText: 'Esta bonito',
          }],
        },
      }),
    ]);

    expect(row.outputValues.valid).toBe('2024-06-01');
    expect(row.outputValues.invalid).toBe('Esta bonito');
  });

  it('formats a value from an explicit input source', () => {
    const row = buildRow([
      outputColumn({
        id: 'date',
        recipe: {
          type: 'fixedText',
          value: 'ignored',
          steps: [{
            id: 'format-date',
            type: 'formatDate',
            source: { type: 'input', inputColumnId: 'input-date' },
            dateInputFormat: 'DD/MM/YYYY',
            dateOutputFormat: 'DD-MM-YYYY',
          }],
        },
      }),
    ]);

    expect(row.outputValues.date).toBe('01-06-2024');
  });

  it('formats an ISO fixed text date source from the date picker', () => {
    const row = buildRow([
      outputColumn({
        id: 'date',
        recipe: {
          type: 'fixedText',
          value: 'ignored',
          steps: [{
            id: 'format-date',
            type: 'formatDate',
            source: { type: 'fixedText', value: '2024-06-01' },
            dateInputFormat: 'YYYY-MM-DD',
            dateOutputFormat: 'DD/MM/YYYY',
          }],
        },
      }),
    ]);

    expect(row.outputValues.date).toBe('01/06/2024');
  });

  it('formats the previous result from an earlier step', () => {
    const row = buildRow([
      outputColumn({
        id: 'date',
        recipe: {
          type: 'fixedText',
          value: ' 01/06/2024 ',
          steps: [
            { id: 'trim', type: 'trim' },
            {
              id: 'format-date',
              type: 'formatDate',
              source: { type: 'previousResult' },
              dateInputFormat: 'DD/MM/YYYY',
              dateOutputFormat: 'YYYY-MM-DD',
            },
          ],
        },
      }),
    ]);

    expect(row.outputValues.date).toBe('2024-06-01');
  });

  it('formats dates inside concat part steps', () => {
    const row = buildRow([
      outputColumn({
        id: 'concat-date',
        recipe: {
          type: 'fixedText',
          value: '',
          steps: [{
            id: 'concat',
            type: 'concat',
            parts: [
              {
                id: 'date',
                source: { type: 'input', inputColumnId: 'input-date' },
                steps: [{
                  id: 'format-date',
                  type: 'formatDate',
                  dateInputFormat: 'DD/MM/YYYY',
                  dateOutputFormat: 'YYYY-MM-DD',
                }],
              },
              { id: 'suffix', source: { type: 'fixedText', value: 'OK' }, separatorBefore: ' ' },
            ],
          }],
        },
      }),
    ]);

    expect(row.outputValues['concat-date']).toBe('2024-06-01 OK');
  });

  it('keeps existing text steps unchanged', () => {
    const row = buildRow([
      outputColumn({
        id: 'name',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-name',
          steps: [{ id: 'trim', type: 'trim' }],
        },
      }),
    ]);

    expect(row.outputValues.name).toBe('Pintura Latex');
  });
});

describe('outputModel custom value compatibility', () => {
  it('keeps old customMode text, number and concat recipes working', () => {
    const row = buildRow([
      outputColumn({
        id: 'text',
        recipe: {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name' }],
          steps: [{ id: 'trim', type: 'trim' }],
        },
      }),
      outputColumn({
        id: 'number',
        recipe: {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          steps: [{ id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 }],
        },
      }),
      outputColumn({
        id: 'concat',
        recipe: {
          type: 'combine',
          customMode: 'concat',
          parts: [
            {
              id: 'name',
              type: 'input',
              inputColumnId: 'input-name',
              separatorAfter: ' / ',
              steps: [{ id: 'trim', type: 'trim' }],
            },
            { id: 'product', type: 'input', inputColumnId: 'input-product' },
          ],
        },
      }),
    ]);

    expect(row.outputValues.text).toBe('Pintura Latex');
    expect(row.outputValues.number).toBe('210');
    expect(row.outputValues.concat).toBe('Pintura Latex / Producto');
  });
});

describe('outputModel conditional transformations', () => {
  it('applies a text condition over input values', () => {
    const row = buildRow([
      outputColumn({
        id: 'code',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-code',
          steps: [
            {
              id: 'prefix',
              type: 'addPrefix',
              value: 'GEN-',
              condition: { target: 'input', columnId: 'input-name', operator: 'startsWith', value: ' Pin' },
            },
          ],
        },
      }),
    ]);

    expect(row.outputValues.code).toBe('GEN-ABC123');
  });

  it('applies a text condition over current output values', () => {
    const row = buildRow([
      outputColumn({
        id: 'code',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-code',
          steps: [
            { id: 'prefix-a', type: 'addPrefix', value: 'A-' },
            {
              id: 'prefix-b',
              type: 'addPrefix',
              value: 'B-',
              condition: { target: 'output', columnId: 'code', operator: 'startsWith', value: 'A-' },
            },
          ],
        },
      }),
    ]);

    expect(row.outputValues.code).toBe('B-A-ABC123');
  });

  it('applies numeric conditions and skips transformations when they do not match', () => {
    const row = buildRow([
      outputColumn({
        id: 'price',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-large-price',
          steps: [
            {
              id: 'numeric',
              type: 'numericOperation',
              operation: 'addPercentage',
              amount: 10,
              condition: { target: 'input', columnId: 'input-large-price', operator: 'greaterThan', value: '1000', valueType: 'number' },
            },
          ],
        },
      }),
      outputColumn({
        id: 'not-matching',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-code',
          steps: [
            {
              id: 'prefix',
              type: 'addPrefix',
              value: 'NO-',
              condition: { target: 'input', columnId: 'input-code', operator: 'startsWith', value: 'ZZZ' },
            },
          ],
        },
      }),
    ]);

    expect(row.outputValues.price).toBe('1650.00');
    expect(row.outputValues['not-matching']).toBe('ABC123');
  });

  it('emits a warning when a numeric condition cannot be evaluated', () => {
    const row = buildRow([
      outputColumn({
        id: 'code',
        recipe: {
          type: 'direct',
          inputColumnId: 'input-code',
          steps: [
            {
              id: 'prefix',
              type: 'addPrefix',
              value: 'GEN-',
              condition: { target: 'input', columnId: 'input-invalid', operator: 'greaterThan', value: '1000', valueType: 'number' },
            },
          ],
        },
      }),
    ]);

    expect(row.outputValues.code).toBe('ABC123');
    expect(row.warnings).toContain('No se pudo evaluar la condición de transformación');
  });
});

function numericColumn(id: string, operation: NumericOperation, amount: number): OutputColumn {
  return outputColumn({
    id,
    recipe: {
      type: 'direct',
      inputColumnId: 'input-price',
      steps: [{ id: `numeric-${id}`, type: 'numericOperation', operation, amount, rounding: 2 }],
    },
  });
}

function columnAnalysis(columnIndex: number, columnLetter: string, header: string): ColumnAnalysis {
  return {
    columnIndex,
    columnLetter,
    header,
    sampleValues: [],
    nonEmptyCount: 2,
    isEmpty: false,
    ignored: false,
    autoIgnored: false,
  };
}
