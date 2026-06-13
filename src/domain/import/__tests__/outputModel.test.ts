import { describe, expect, it } from 'vitest';
import type { ColumnAnalysis, InputRow, NumericOperation, OutputColumn, RawRow, VirtualInputColumn } from '../../../types/import';
import { buildInputRows, buildProcessedRows, buildProcessedRowsPipeline } from '../outputModel';

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

describe('outputModel input filters', () => {
  it('builds input rows without virtual input columns as before', () => {
    expect(buildInputRows([
      ['A1', 'Pintura'],
    ], [
      inputColumn(0, 'A', 'Codigo'),
      inputColumn(1, 'B', 'Producto'),
    ])).toEqual([
      {
        rowNumber: 1,
        values: {
          'input-0': 'A1',
          'input-1': 'Pintura',
        },
      },
    ]);
  });

  it('adds empty virtual input values when there is no calculated value yet', () => {
    const pipeline = buildProcessedRowsPipeline({
      rawRows: [
        ['A1'],
      ],
      columnAnalysis: [
        columnAnalysis(0, 'A', 'Codigo'),
      ],
      startRowIndex: 0,
      virtualInputColumns: [
        virtualInputColumn('virtual:dato-adicional', 'Dato adicional'),
      ],
      outputColumns: [],
    });

    expect(pipeline.inputRows[0].values).toEqual({
      'input-0': 'A1',
      'virtual:dato-adicional': '',
    });
  });

  it('preserves virtual input values already present on normalized rows', () => {
    const row = rawRowWithVirtualValue(['A1'], 'virtual:dato-adicional', 'RÃ¡pida acciÃ³n');

    expect(buildInputRows([
      row,
    ], [
      inputColumn(0, 'A', 'Codigo'),
    ], 0, [
      virtualInputColumn('virtual:dato-adicional', 'Dato adicional'),
    ])).toEqual([
      {
        rowNumber: 1,
        values: {
          'input-0': 'A1',
          'virtual:dato-adicional': 'RÃ¡pida acciÃ³n',
        },
      },
    ]);
  });

  it('allows direct output recipes to read virtual input values from the pipeline', () => {
    const pipeline = buildProcessedRowsPipeline({
      rawRows: [
        rawRowWithVirtualValue(['9280034'], 'virtual:dato-adicional', 'RÃ¡pida acciÃ³n'),
      ],
      columnAnalysis: [
        columnAnalysis(0, 'A', 'Codigo'),
      ],
      startRowIndex: 0,
      virtualInputColumns: [
        virtualInputColumn('virtual:dato-adicional', 'Dato adicional'),
      ],
      outputColumns: [
        outputColumn({ id: 'extra', recipe: { type: 'direct', inputColumnId: 'virtual:dato-adicional' } }),
      ],
    });

    expect(pipeline.inputRows[0].values['virtual:dato-adicional']).toBe('RÃ¡pida acciÃ³n');
    expect(pipeline.processedRows.map((row) => row.outputValues)).toEqual([
      { extra: 'RÃ¡pida acciÃ³n' },
    ]);
  });

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

  it('applies input normalization before input filters and output recipes', () => {
    const columns: ColumnAnalysis[] = [
      columnAnalysis(0, 'A', 'Producto'),
      columnAnalysis(1, 'B', 'Codigo'),
    ];
    const pipeline = buildProcessedRowsPipeline({
      rawRows: [
        ['REMOVEDOR EN GEL', 'SKU-1'],
        ['', 'SKU-2'],
        ['AGUARRAS PREMIUM', 'SKU-3'],
      ],
      columnAnalysis: columns,
      startRowIndex: 0,
      inputNormalizationRules: [
        { id: 'fill-product', type: 'fillDown', columnId: 'input-0', enabled: true },
      ],
      inputIgnoreRules: [
        { id: 'remove-aguarras', target: 'input', columnId: 'input-0', operator: 'equals', value: 'AGUARRAS PREMIUM' },
      ],
      outputColumns: [
        outputColumn({ id: 'product', recipe: { type: 'direct', inputColumnId: 'input-0' } }),
        outputColumn({ id: 'code', recipe: { type: 'direct', inputColumnId: 'input-1' } }),
      ],
    });

    expect(pipeline.normalizedRawRows).toEqual([
      ['REMOVEDOR EN GEL', 'SKU-1'],
      ['REMOVEDOR EN GEL', 'SKU-2'],
      ['AGUARRAS PREMIUM', 'SKU-3'],
    ]);
    expect(pipeline.includedInputRows).toEqual([
      {
        rowNumber: 1,
        values: { 'input-0': 'REMOVEDOR EN GEL', 'input-1': 'SKU-1' },
      },
      {
        rowNumber: 2,
        values: { 'input-0': 'REMOVEDOR EN GEL', 'input-1': 'SKU-2' },
      },
    ]);
    expect(pipeline.processedRows.map((row) => row.outputValues)).toEqual([
      { product: 'REMOVEDOR EN GEL', code: 'SKU-1' },
      { product: 'REMOVEDOR EN GEL', code: 'SKU-2' },
    ]);
    expect(pipeline.ignoredInputRows[0]).toMatchObject({
      rowNumber: 3,
      inputValues: { 'input-0': 'AGUARRAS PREMIUM', 'input-1': 'SKU-3' },
    });
  });

  it('does not use header rows as fill-down source values', () => {
    const pipeline = buildProcessedRowsPipeline({
      rawRows: [
        ['Producto', 'Codigo'],
        ['', 'SKU-1'],
        ['REMOVEDOR EN GEL', 'SKU-2'],
        ['', 'SKU-3'],
      ],
      columnAnalysis: [
        columnAnalysis(0, 'A', 'Producto'),
        columnAnalysis(1, 'B', 'Codigo'),
      ],
      headerRowIndex: 0,
      startRowIndex: 1,
      inputNormalizationRules: [
        { id: 'fill-product', type: 'fillDown', columnId: 'input-0', enabled: true },
      ],
      outputColumns: [
        outputColumn({ id: 'product', recipe: { type: 'direct', inputColumnId: 'input-0' } }),
      ],
    });

    expect(pipeline.inputRows.map((row) => row.values['input-0'])).toEqual([
      '',
      'REMOVEDOR EN GEL',
      'REMOVEDOR EN GEL',
    ]);
    expect(pipeline.normalizedRawRows).toEqual([
      ['Producto', 'Codigo'],
      ['', 'SKU-1'],
      ['REMOVEDOR EN GEL', 'SKU-2'],
      ['REMOVEDOR EN GEL', 'SKU-3'],
    ]);
  });

  it('uses group rows above startRowIndex as fill-down source values after the header', () => {
    const pipeline = buildProcessedRowsPipeline({
      rawRows: [
        ['Producto', 'Codigo'],
        ['REMOVEDOR EN GEL', ''],
        ['', 'SKU-1'],
        ['', 'SKU-2'],
        ['AGUARRAS PREMIUM', ''],
        ['', 'SKU-3'],
      ],
      columnAnalysis: [
        columnAnalysis(0, 'A', 'Producto'),
        columnAnalysis(1, 'B', 'Codigo'),
      ],
      headerRowIndex: 0,
      startRowIndex: 2,
      inputNormalizationRules: [
        { id: 'fill-product', type: 'fillDown', columnId: 'input-0', enabled: true },
      ],
      outputColumns: [
        outputColumn({ id: 'product', recipe: { type: 'direct', inputColumnId: 'input-0' } }),
        outputColumn({ id: 'code', recipe: { type: 'direct', inputColumnId: 'input-1' } }),
      ],
    });

    expect(pipeline.inputRows.map((row) => row.values['input-0'])).toEqual([
      'REMOVEDOR EN GEL',
      'REMOVEDOR EN GEL',
      'AGUARRAS PREMIUM',
      'AGUARRAS PREMIUM',
    ]);
    expect(pipeline.processedRows.map((row) => row.outputValues.product)).toEqual([
      'REMOVEDOR EN GEL',
      'REMOVEDOR EN GEL',
      'AGUARRAS PREMIUM',
      'AGUARRAS PREMIUM',
    ]);
  });

  it('applies rangeGroup before output recipes without letting descriptor rows cut the group', () => {
    const pipeline = buildProcessedRowsPipeline({
      rawRows: [
        ['Producto', 'Codigo'],
        ['REMOVEDOR EN GEL', ''],
        ['', '9280033'],
        ['Rápida acción', '9280034'],
        ['AGUARRAS PREMIUM', ''],
        ['', '9400013'],
        ['Disolvente para sintéticos', '9400014'],
      ],
      columnAnalysis: [
        columnAnalysis(0, 'A', 'Producto'),
        columnAnalysis(1, 'B', 'Codigo'),
      ],
      headerRowIndex: 0,
      startRowIndex: 2,
      inputNormalizationRules: [
        {
          id: 'range-group',
          type: 'rangeGroup',
          enabled: true,
          groupColumnId: 'input-0',
          groupStartCondition: { columnId: 'input-1', operator: 'isEmpty' },
          applyToRowCondition: { columnId: 'input-1', operator: 'isNotEmpty' },
          targetColumnId: 'input-0',
        },
      ],
      outputColumns: [
        outputColumn({ id: 'product', recipe: { type: 'direct', inputColumnId: 'input-0' } }),
        outputColumn({ id: 'code', recipe: { type: 'direct', inputColumnId: 'input-1' } }),
      ],
    });

    expect(pipeline.processedRows.map((row) => row.outputValues)).toEqual([
      { product: 'REMOVEDOR EN GEL', code: '9280033' },
      { product: 'REMOVEDOR EN GEL', code: '9280034' },
      { product: 'AGUARRAS PREMIUM', code: '9400013' },
      { product: 'AGUARRAS PREMIUM', code: '9400014' },
    ]);
  });

  it('applies rangeValue before output recipes', () => {
    const pipeline = buildProcessedRowsPipeline({
      rawRows: [
        ['Producto', 'Codigo', 'Dato'],
        ['REMOVEDOR EN GEL', '', ''],
        ['', '9280033', ''],
        ['Rápida acción', '9280034', ''],
        ['', '9280035', ''],
        ['AGUARRAS PREMIUM', '', ''],
        ['', '9400013', ''],
      ],
      columnAnalysis: [
        columnAnalysis(0, 'A', 'Producto'),
        columnAnalysis(1, 'B', 'Codigo'),
        columnAnalysis(2, 'C', 'Dato'),
      ],
      headerRowIndex: 0,
      startRowIndex: 2,
      inputNormalizationRules: [
        {
          id: 'range-value',
          type: 'rangeValue',
          enabled: true,
          valueColumnId: 'input-0',
          captureCondition: { columnId: 'input-1', operator: 'isNotEmpty' },
          targetColumnId: 'input-2',
        },
      ],
      outputColumns: [
        outputColumn({ id: 'code', recipe: { type: 'direct', inputColumnId: 'input-1' } }),
        outputColumn({ id: 'extra', recipe: { type: 'direct', inputColumnId: 'input-2' } }),
      ],
    });

    expect(pipeline.processedRows.map((row) => row.outputValues)).toEqual([
      { code: '9280033', extra: '' },
      { code: '9280034', extra: 'Rápida acción' },
      { code: '9280035', extra: 'Rápida acción' },
      { code: '9400013', extra: '' },
    ]);
  });

  it('keeps rangeGroup and rangeValue output stable in any order', () => {
    const rawRows = [
      synthPlusRow('Producto', 'Codigo', 'Dato'),
      synthPlusRow('REMOVEDOR EN GEL', '', ''),
      synthPlusRow('', '9280033', ''),
      synthPlusRow('Rápida acción', '9280034', ''),
      synthPlusRow('AGUARRAS PREMIUM', '', ''),
      synthPlusRow('', '9400013', ''),
      synthPlusRow('Disolvente para sintéticos', '9400014', ''),
    ];
    const columnAnalysisConfig = [
      columnAnalysis(0, 'A', 'Producto'),
      columnAnalysis(1, 'B', 'Codigo'),
      columnAnalysis(14, 'O', 'Dato'),
    ];
    const groupRule = {
      id: 'range-group',
      type: 'rangeGroup' as const,
      enabled: true,
      groupColumnId: 'input-0',
      groupStartCondition: { columnId: 'input-1', operator: 'isEmpty' as const },
      applyToRowCondition: { columnId: 'input-1', operator: 'isNotEmpty' as const },
      targetColumnId: 'input-0',
    };
    const valueRule = {
      id: 'range-value',
      type: 'rangeValue' as const,
      enabled: true,
      valueColumnId: 'input-0',
      captureCondition: { columnId: 'input-1', operator: 'isNotEmpty' as const },
      targetColumnId: 'input-14',
    };
    const outputColumns = [
      outputColumn({ id: 'product', recipe: { type: 'direct', inputColumnId: 'input-0' } }),
      outputColumn({ id: 'code', recipe: { type: 'direct', inputColumnId: 'input-1' } }),
      outputColumn({ id: 'extra', recipe: { type: 'direct', inputColumnId: 'input-14' } }),
    ];

    const groupThenValue = buildProcessedRowsPipeline({
      rawRows,
      columnAnalysis: columnAnalysisConfig,
      headerRowIndex: 0,
      startRowIndex: 2,
      inputNormalizationRules: [groupRule, valueRule],
      outputColumns,
    });
    const valueThenGroup = buildProcessedRowsPipeline({
      rawRows,
      columnAnalysis: columnAnalysisConfig,
      headerRowIndex: 0,
      startRowIndex: 2,
      inputNormalizationRules: [valueRule, groupRule],
      outputColumns,
    });
    const expected = [
      { product: 'REMOVEDOR EN GEL', code: '9280033', extra: '' },
      { product: 'REMOVEDOR EN GEL', code: '9280034', extra: 'Rápida acción' },
      { product: 'AGUARRAS PREMIUM', code: '9400013', extra: '' },
      { product: 'AGUARRAS PREMIUM', code: '9400014', extra: 'Disolvente para sintéticos' },
    ];

    expect(groupThenValue.processedRows.map((row) => row.outputValues)).toEqual(expected);
    expect(valueThenGroup.processedRows.map((row) => row.outputValues)).toEqual(expected);
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

function inputColumn(columnIndex: number, columnLetter: string, header: string) {
  return {
    id: `input-${columnIndex}`,
    columnIndex,
    columnLetter,
    label: header,
    header,
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  };
}

function virtualInputColumn(id: string, label: string): VirtualInputColumn {
  return {
    id,
    kind: 'virtual',
    label,
    active: true,
  };
}

function rawRowWithVirtualValue(row: RawRow, columnId: string, value: string): RawRow {
  return Object.assign([...row], { [columnId]: value });
}

function synthPlusRow(columnA: string, columnB: string, columnO: string) {
  const row = Array.from({ length: 15 }, () => '');
  row[0] = columnA;
  row[1] = columnB;
  row[14] = columnO;
  return row;
}
