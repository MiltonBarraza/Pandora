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
    expect(row.warnings).toContain('No se pudo aplicar operacion numerica: valor invalido');
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
    expect(row.warnings).toContain('No se pudo convertir a numero: valor invalido');
    expect(row.warnings).toContain('No se pudo aplicar operacion numerica: valor invalido');
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
    expect(row.warnings).toContain('No se pudo evaluar la condicion de transformacion');
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
