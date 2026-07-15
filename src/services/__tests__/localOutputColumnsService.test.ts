import { afterEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
});

afterEach(() => {
  storage.clear();
});

describe('localOutputColumnsService', () => {
  it('creates an empty default output column list', async () => {
    const { createDefaultOutputColumns } = await import('../localOutputColumnsService');
    const first = createDefaultOutputColumns();
    const second = createDefaultOutputColumns();

    expect(first).toEqual([]);
    expect(second).toEqual([]);
    expect(first).not.toBe(second);
  });

  it('returns current default output columns when storage is empty', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    expect(loadOutputColumns()).toEqual([]);
  });

  it('drops the legacy default output columns saved by older sessions', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        { id: 'output-code', label: 'Codigo', order: 0, enabled: true, recipe: { type: 'empty' } },
        { id: 'output-name', label: 'Nombre', order: 1, enabled: true, recipe: { type: 'empty' } },
        { id: 'output-price', label: 'Precio', order: 2, enabled: true, recipe: { type: 'empty' } },
        { id: 'output-comments', label: 'Comentarios', order: 3, enabled: true, recipe: { type: 'empty' } },
      ]),
    );

    expect(loadOutputColumns()).toEqual([]);
  });

  it('preserves an explicitly saved empty output column list', async () => {
    const { loadOutputColumns, saveOutputColumns } = await import('../localOutputColumnsService');

    saveOutputColumns([]);

    expect(loadOutputColumns()).toEqual([]);
  });

  it('normalizes saved disabled columns as enabled', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'disabled',
          label: 'Vieja',
          enabled: false,
          recipe: { type: 'empty' },
        },
      ]),
    );

    expect(loadOutputColumns()).toEqual([
      {
        id: 'disabled',
        label: 'Vieja',
        order: 0,
        enabled: true,
        recipe: { type: 'empty' },
      },
    ]);
  });

  it('preserves generated output column markers when loading saved columns', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'generated-name',
          label: 'Nombre',
          generatedFromInputColumnId: 'input-name',
          recipe: { type: 'direct', inputColumnId: 'input-name' },
        },
      ]),
    );

    expect(loadOutputColumns()).toEqual([
      {
        id: 'generated-name',
        label: 'Nombre',
        order: 0,
        enabled: true,
        generatedFromInputColumnId: 'input-name',
        recipe: { type: 'direct', inputColumnId: 'input-name' },
      },
    ]);
  });

  it('drops hidden final transformations from simple recipes when loading saved columns', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'direct',
          label: 'Directa',
          recipe: {
            type: 'direct',
            inputColumnId: 'input-code',
            steps: [{ id: 'suffix', type: 'addSuffix', value: 'lts' }],
          },
        },
        {
          id: 'fixed',
          label: 'Fija',
          recipe: {
            type: 'fixedText',
            value: 'OK',
            steps: [{ id: 'upper', type: 'uppercase' }],
          },
        },
      ]),
    );

    expect(loadOutputColumns()).toEqual([
      {
        id: 'direct',
        label: 'Directa',
        order: 0,
        enabled: true,
        recipe: { type: 'direct', inputColumnId: 'input-code' },
      },
      {
        id: 'fixed',
        label: 'Fija',
        order: 0,
        enabled: true,
        recipe: { type: 'fixedText', value: 'OK' },
      },
    ]);
  });

  it('preserves combine part steps and separators when loading saved columns', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'combined',
          label: 'Combinada',
          recipe: {
            type: 'combine',
            customMode: 'concat',
            parts: [
              {
                id: 'name',
                type: 'input',
                inputColumnId: 'input-name',
                separatorAfter: ' - ',
                steps: [{ id: 'trim', type: 'trim' }],
              },
              {
                id: 'suffix',
                type: 'text',
                value: 'OK',
                separatorAfter: '',
                steps: [{ id: 'upper', type: 'uppercase' }],
              },
            ],
          },
        },
      ]),
    );

    const [column] = loadOutputColumns();

    expect(column.recipe).toMatchObject({
      type: 'combine',
      customMode: 'concat',
      parts: [
        {
          id: 'name',
          type: 'input',
          inputColumnId: 'input-name',
          separatorAfter: ' - ',
          steps: [{ id: 'trim', type: 'trim' }],
        },
        {
          id: 'suffix',
          type: 'text',
          value: 'OK',
          separatorAfter: '',
          steps: [{ id: 'upper', type: 'uppercase' }],
        },
      ],
    });
  });

  it('preserves and infers step modes when loading saved columns', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'combined',
          label: 'Combinada',
          recipe: {
            type: 'combine',
            customMode: 'text',
            parts: [
              {
                id: 'name',
                type: 'input',
                inputColumnId: 'input-name',
                steps: [
                  { id: 'suffix', type: 'addSuffix', mode: 'text', value: 'lts' },
                  { id: 'number', type: 'numericOperation', operation: 'add', amount: 10 },
                  { id: 'convert', type: 'toText' },
                ],
              },
            ],
            steps: [
              { id: 'trim', type: 'trim' },
              { id: 'numeric', type: 'numericOperation', mode: 'number', operation: 'addPercentage', amount: 10 },
              { id: 'extract', type: 'extractNumber' },
            ],
          },
        },
      ]),
    );

    const [column] = loadOutputColumns();

    expect(column.recipe).toMatchObject({
      type: 'combine',
      parts: [
        {
          steps: [
            { id: 'suffix', type: 'addSuffix', mode: 'text' },
            { id: 'number', type: 'numericOperation', mode: 'number' },
            { id: 'convert', type: 'toText', mode: 'conversion' },
          ],
        },
      ],
      steps: [
        { id: 'trim', type: 'trim', mode: 'text' },
        { id: 'numeric', type: 'numericOperation', mode: 'number' },
        { id: 'extract', type: 'extractNumber', mode: 'conversion' },
      ],
    });
  });

  it('does not accept conversion as a recipe custom mode but preserves it as step mode', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'combined',
          label: 'Combinada',
          recipe: {
            type: 'combine',
            customMode: 'conversion',
            parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name' }],
            steps: [{ id: 'convert', type: 'toText', mode: 'conversion' }],
          },
        },
      ]),
    );

    const [column] = loadOutputColumns();

    expect(column.recipe).toMatchObject({
      type: 'combine',
      steps: [{ id: 'convert', type: 'toText', mode: 'conversion' }],
    });
    expect(column.recipe).not.toMatchObject({ customMode: 'conversion' });
  });

  it('preserves date step mode, type and fields when loading saved columns', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'date',
          label: 'Fecha',
          recipe: {
            type: 'combine',
            customMode: 'text',
            parts: [{ id: 'date-part', type: 'input', inputColumnId: 'input-date' }],
            steps: [{
              id: 'format-date',
              mode: 'date',
              type: 'formatDate',
              dateInputFormat: 'M/D/YY',
              dateOutputFormat: 'YYYY-MM-DD',
              dateInvalidFallback: 'fixedText',
              dateInvalidFallbackText: 'SIN FECHA',
            }],
          },
        },
      ]),
    );

    const [column] = loadOutputColumns();

    expect(column.recipe).toMatchObject({
      type: 'combine',
      steps: [{
        id: 'format-date',
        mode: 'date',
        type: 'formatDate',
        dateInputFormat: 'M/D/YY',
        dateOutputFormat: 'YYYY-MM-DD',
        dateInvalidFallback: 'fixedText',
        dateInvalidFallbackText: 'SIN FECHA',
      }],
    });
  });

  it('preserves custom date output formats when loading saved columns', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'date',
          label: 'Fecha',
          recipe: {
            type: 'combine',
            customMode: 'text',
            parts: [{ id: 'date-part', type: 'input', inputColumnId: 'input-date' }],
            steps: [{
              id: 'format-date',
              mode: 'date',
              type: 'formatDate',
              dateInputFormat: 'DD/MM/YYYY',
              dateOutputFormat: 'MM-DD-YYYY',
            }],
          },
        },
      ]),
    );

    const [column] = loadOutputColumns();

    expect(column.recipe).toMatchObject({
      type: 'combine',
      steps: [{
        id: 'format-date',
        type: 'formatDate',
        dateOutputFormat: 'MM-DD-YYYY',
      }],
    });
  });

  it('keeps preset date output formats while loading saved columns', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'date',
          label: 'Fecha',
          recipe: {
            type: 'combine',
            customMode: 'text',
            parts: [],
            steps: [{
              id: 'format-date',
              mode: 'date',
              type: 'formatDate',
              dateOutputFormat: 'DD/MM/YYYY',
            }],
          },
        },
      ]),
    );

    const [column] = loadOutputColumns();

    expect(column.recipe).toMatchObject({
      type: 'combine',
      steps: [{ id: 'format-date', dateOutputFormat: 'DD/MM/YYYY' }],
    });
  });

  it('falls back to the safe date output format when loading invalid saved formats', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'date',
          label: 'Fecha',
          recipe: {
            type: 'combine',
            customMode: 'text',
            parts: [],
            steps: [{
              id: 'format-date',
              mode: 'date',
              type: 'formatDate',
              dateOutputFormat: 'mm-dd-yyyy',
            }],
          },
        },
      ]),
    );

    const [column] = loadOutputColumns();

    expect(column.recipe).toMatchObject({
      type: 'combine',
      steps: [{ id: 'format-date', dateOutputFormat: 'YYYY-MM-DD' }],
    });
  });

  it('preserves manual range value recipes in top-level recipes and manual range steps', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'manual-range',
          label: 'Manual range',
          recipe: {
            type: 'manualRange',
            ranges: [{
              id: 'range-8-13',
              startRowNumber: 8,
              endRowNumber: 13,
              suggestedFromText: 'PINCELES SERIE 304',
              valueRecipe: {
                source: { type: 'input', inputColumnId: 'input-name' },
                steps: [{ id: 'upper', type: 'uppercase', mode: 'text' }],
              },
            }],
          },
        },
        {
          id: 'combined',
          label: 'Combinada',
          recipe: {
            type: 'combine',
            customMode: 'text',
            parts: [],
            steps: [{
              id: 'range-step',
              type: 'manualRange',
              mode: 'manualRange',
              ranges: [{
                id: 'range-20-22',
                startRowNumber: 20,
                endRowNumber: 22,
                valueRecipe: {
                  source: { type: 'rangeText', inputColumnId: 'input-brand', selectedText: 'Sinteplast' },
                  steps: [{
                    id: 'concat',
                    type: 'concat',
                    mode: 'text',
                    parts: [
                      { id: 'previous', source: { type: 'previousResult' } },
                      { id: 'suffix', source: { type: 'fixedText', value: 'OK' }, separatorBefore: ' - ' },
                    ],
                  }],
                },
              }],
            }],
          },
        },
      ]),
    );

    const columns = loadOutputColumns();

    expect(columns[0].recipe).toMatchObject({
      type: 'manualRange',
      ranges: [{
        id: 'range-8-13',
        suggestedFromText: 'PINCELES SERIE 304',
        valueRecipe: {
          source: { type: 'input', inputColumnId: 'input-name' },
          steps: [{ id: 'upper', type: 'uppercase', mode: 'text' }],
        },
      }],
    });
    expect(columns[1].recipe).toMatchObject({
      type: 'combine',
      steps: [{
        id: 'range-step',
        type: 'manualRange',
        mode: 'manualRange',
        ranges: [{
          id: 'range-20-22',
          valueRecipe: {
            source: { type: 'rangeText', inputColumnId: 'input-brand', selectedText: 'Sinteplast' },
            steps: [{
              id: 'concat',
              type: 'concat',
              parts: [
                { id: 'previous', source: { type: 'previousResult' } },
                { id: 'suffix', source: { type: 'fixedText', value: 'OK' }, separatorBefore: ' - ' },
              ],
            }],
          },
        }],
      }],
    });
  });

  it('preserves step sources, operands and concat step parts when loading saved columns', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'combined',
          label: 'Combinada',
          recipe: {
            type: 'combine',
            customMode: 'text',
            parts: [
              {
                id: 'legacy-part',
                type: 'input',
                inputColumnId: 'input-name',
                separatorAfter: ' - ',
                steps: [{ id: 'legacy-trim', type: 'trim' }],
              },
            ],
            steps: [
              {
                id: 'source',
                type: 'uppercase',
                source: { type: 'input', inputColumnId: 'input-code' },
              },
              {
                id: 'operands',
                type: 'numericOperation',
                operation: 'subtract',
                leftOperand: { type: 'input', inputColumnId: 'input-a' },
                rightOperand: { type: 'fixedText', value: '10', numericFallback: 10 },
              },
              {
                id: 'concat',
                type: 'concat',
                parts: [
                  {
                    id: 'previous',
                    source: { type: 'previousResult' },
                    steps: [{ id: 'part-upper', type: 'uppercase' }],
                  },
                  {
                    id: 'fixed',
                    source: { type: 'fixedText', value: 'OK' },
                    separatorBefore: ' / ',
                  },
                ],
              },
            ],
          },
        },
      ]),
    );

    const [column] = loadOutputColumns();

    expect(column.recipe).toMatchObject({
      type: 'combine',
      parts: [
        {
          id: 'legacy-part',
          type: 'input',
          inputColumnId: 'input-name',
          separatorAfter: ' - ',
          steps: [{ id: 'legacy-trim', type: 'trim' }],
        },
      ],
      steps: [
        {
          id: 'source',
          type: 'uppercase',
          source: { type: 'input', inputColumnId: 'input-code' },
        },
        {
          id: 'operands',
          type: 'numericOperation',
          leftOperand: { type: 'input', inputColumnId: 'input-a' },
          rightOperand: { type: 'fixedText', value: '10', numericFallback: 10 },
        },
        {
          id: 'concat',
          type: 'concat',
          parts: [
            {
              id: 'previous',
              source: { type: 'previousResult' },
              steps: [{ id: 'part-upper', type: 'uppercase' }],
            },
            {
              id: 'fixed',
              source: { type: 'fixedText', value: 'OK' },
              separatorBefore: ' / ',
            },
          ],
        },
      ],
    });
  });

  it('preserves numeric formula steps when loading saved columns', async () => {
    const { loadOutputColumns } = await import('../localOutputColumnsService');

    storage.set(
      'excel-sanitizer:v2-output-columns',
      JSON.stringify([
        {
          id: 'formula',
          label: 'Formula',
          recipe: {
            type: 'combine',
            parts: [],
            steps: [{
              id: 'formula-step',
              type: 'numericFormula',
              mode: 'number',
              rounding: 'none',
              formula: {
                version: 1,
                expression: {
                  kind: 'binary',
                  operator: 'subtract',
                  left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'input-price' } },
                  right: {
                    kind: 'binary',
                    operator: 'multiply',
                    left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'input-discount' } },
                    right: { kind: 'operand', operand: { type: 'fixedText', value: '2', numericFallback: 2 } },
                  },
                },
              },
            }],
          },
        },
      ]),
    );

    const [column] = loadOutputColumns();

    expect(column.recipe).toMatchObject({
      type: 'combine',
      steps: [{
        id: 'formula-step',
        type: 'numericFormula',
        mode: 'number',
        rounding: 'none',
        formula: {
          version: 1,
          expression: {
            kind: 'binary',
            operator: 'subtract',
            left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'input-price' } },
            right: {
              kind: 'binary',
              operator: 'multiply',
              left: { kind: 'operand', operand: { type: 'input', inputColumnId: 'input-discount' } },
              right: { kind: 'operand', operand: { type: 'fixedText', value: '2', numericFallback: 2 } },
            },
          },
        },
      }],
    });
  });
});
