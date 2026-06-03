import { describe, expect, it } from 'vitest';
import type { InputColumn, OutputColumn } from '../../../types/import';
import { buildCombinePreview, buildCustomValuePreview, buildRecipeForSelectedType, buildSimpleCustomValueRecipe, changeStepMode, createCustomValueRecipeForMode, createRecipeForConstructionMode, describeCombineParts, getConstructorAdjustmentsSummary, getConstructorPartsSummary, getSimpleStepValue, getStepMode, getStepTypesForMode, inferStepModeFromType, normalizeStepsForMode, setSimpleStep, stepModeOptions, valueConstructionOptions } from '../OutputColumnRecipeEditor';

const inputColumns: InputColumn[] = [
  {
    id: 'input-code',
    columnIndex: 0,
    columnLetter: 'A',
    label: 'Codigo',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
  {
    id: 'input-name',
    columnIndex: 3,
    columnLetter: 'D',
    label: 'D',
    header: 'Nombre',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
  {
    id: 'input-pack',
    columnIndex: 5,
    columnLetter: 'F',
    label: 'F',
    header: 'Envase',
    alias: 'Presentacion',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
  {
    id: 'input-price',
    columnIndex: 39,
    columnLetter: 'AN',
    label: 'AN',
    header: 'Precio',
    active: true,
    sampleValues: [],
    nonEmptyCount: 1,
  },
];

const combineColumn: OutputColumn = {
  id: 'output-code',
  label: 'Codigo',
  order: 0,
  enabled: true,
  recipe: {
    type: 'combine',
    parts: [{ id: 'part-code', type: 'input', inputColumnId: 'input-code' }],
    steps: [{ id: 'suffix', type: 'addSuffix', value: 'lts' }],
  },
};

describe('buildRecipeForSelectedType', () => {
  it('drops hidden steps when switching from combine to direct', () => {
    expect(buildRecipeForSelectedType('direct', combineColumn, inputColumns)).toEqual({
      type: 'direct',
      inputColumnId: 'input-code',
    });
  });

  it('drops hidden steps when switching from combine to fixed text', () => {
    expect(buildRecipeForSelectedType('fixedText', combineColumn, inputColumns)).toEqual({
      type: 'fixedText',
      value: '',
    });
  });

  it('drops hidden steps when switching from combine to empty', () => {
    expect(buildRecipeForSelectedType('empty', combineColumn, inputColumns)).toEqual({
      type: 'empty',
    });
  });

  it('does not create default parts when switching to custom value', () => {
    expect(buildRecipeForSelectedType('combine', combineColumn, inputColumns)).toEqual({
      type: 'combine',
      parts: [],
      separator: '',
    });
  });
});

describe('constructor helpers', () => {
  it('builds an empty custom value recipe when no operation mode is selected', () => {
    expect(createCustomValueRecipeForMode('', {
      type: 'combine',
      parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
      steps: [{ id: 'numeric', type: 'numericOperation', operation: 'addPercentage', amount: 10 }],
    })).toEqual({ type: 'combine', parts: [], separator: '' });
  });

  it('builds a numeric custom value with one input part and one numeric final step', () => {
    const recipe = buildSimpleCustomValueRecipe('number', 'input-price', {
      id: 'numeric',
      type: 'numericOperation',
      operation: 'addPercentage',
      amount: 10,
      rounding: 2,
    });

    expect(recipe).toMatchObject({
      type: 'combine',
      parts: [{ type: 'input', inputColumnId: 'input-price' }],
      steps: [{ type: 'numericOperation', operation: 'addPercentage', amount: 10 }],
    });
  });

  it('builds a text custom value with one input part and one text final step', () => {
    const recipe = buildSimpleCustomValueRecipe('text', 'input-pack', {
      id: 'suffix',
      type: 'addSuffix',
      value: 'lts',
    });

    expect(recipe).toMatchObject({
      type: 'combine',
      parts: [{ type: 'input', inputColumnId: 'input-pack' }],
      steps: [{ type: 'addSuffix', value: 'lts' }],
    });
  });

  it('does not show invented preview before custom value is configured', () => {
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '' }, { 'input-price': '100' })).toBe('Sin valores configurados');
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '' }, { 'input-price': '100' }, true)).toBe('Selecciona un tipo de operacion para ver la vista previa.');
  });

  it('keeps concat mode selected with an empty combine recipe', () => {
    const recipe = createCustomValueRecipeForMode('concat', { type: 'combine', parts: [], separator: '' });

    expect(recipe).toEqual({
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [],
    });
    expect(buildCustomValuePreview(recipe, { 'input-price': '100' })).toBe('Agrega una parte para ver la vista previa.');
  });

  it('keeps value construction options separate from step modes', () => {
    expect(valueConstructionOptions.map((option) => option.value)).toEqual(['steps', 'concat']);
    expect(valueConstructionOptions.map((option) => option.value)).not.toContain('conversion');
    expect(stepModeOptions.map((option) => option.value)).toEqual(['text', 'number', 'conversion']);
    expect(stepModeOptions.map((option) => option.value)).not.toContain('concat');
  });

  it('maps construction modes to safe combine recipes', () => {
    expect(createRecipeForConstructionMode('steps', { type: 'combine', customMode: 'concat', parts: [], separator: '' })).toMatchObject({
      type: 'combine',
      customMode: 'text',
      parts: [{ type: 'input', inputColumnId: '' }],
      steps: [{ type: 'noop', mode: 'text' }],
    });

    expect(createRecipeForConstructionMode('concat', {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-name' }],
      steps: [{ id: 'noop', type: 'noop', mode: 'text' }],
    })).toEqual({
      type: 'combine',
      customMode: 'concat',
      parts: [],
      separator: '',
      steps: [],
    });
  });

  it('does not inherit a concat part column when switching from concat to steps', () => {
    expect(createRecipeForConstructionMode('steps', {
      type: 'combine',
      customMode: 'concat',
      parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name' }],
      separator: '',
    })).toMatchObject({
      type: 'combine',
      customMode: 'text',
      parts: [{ type: 'input', inputColumnId: '' }],
      steps: [{ type: 'noop', mode: 'text' }],
    });
  });

  it('infers simple mixed-step recipes as a value with steps, not concat', () => {
    expect(buildCustomValuePreview(
      {
        type: 'combine',
        parts: [{ id: 'code', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [
          { id: 'extract', type: 'extractNumber' },
          { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
        ],
      },
      { 'input-code': 'hay 25 personas' },
      true,
    )).toBe('35');
  });

  it('starts text and number modes with a neutral step', () => {
    const textRecipe = createCustomValueRecipeForMode('text', { type: 'combine', parts: [], separator: '' });
    const numberRecipe = createCustomValueRecipeForMode('number', { type: 'combine', parts: [], separator: '' });

    expect(textRecipe.steps).toMatchObject([{ type: 'noop' }]);
    expect(numberRecipe.steps).toMatchObject([{ type: 'noop' }]);
  });

  it('filters step options by step mode', () => {
    expect(getStepTypesForMode('text').map((stepType) => stepType.value)).toContain('addSuffix');
    expect(getStepTypesForMode('text').map((stepType) => stepType.value)).not.toContain('numericOperation');
    expect(getStepTypesForMode('number').map((stepType) => stepType.value)).toContain('numericOperation');
    expect(getStepTypesForMode('number').map((stepType) => stepType.value)).not.toContain('addSuffix');
    expect(getStepTypesForMode('conversion').map((stepType) => stepType.value)).toEqual(['noop', 'extractNumber', 'toNumber', 'toText']);
  });

  it('infers step mode from existing step type', () => {
    expect(inferStepModeFromType('addSuffix')).toBe('text');
    expect(inferStepModeFromType('numericOperation')).toBe('number');
    expect(inferStepModeFromType('extractNumber')).toBe('conversion');
    expect(getStepMode({ id: 'noop', type: 'noop' }, 'number')).toBe('number');
  });

  it('keeps different modes in different steps', () => {
    const steps = normalizeStepsForMode([
      { id: 'suffix', type: 'addSuffix', mode: 'text', value: 'lts' },
      { id: 'numeric', type: 'numericOperation', mode: 'number', operation: 'addPercentage', amount: 10 },
    ], 'text');

    expect(steps).toMatchObject([
      { id: 'suffix', type: 'addSuffix', mode: 'text' },
      { id: 'numeric', type: 'numericOperation', mode: 'number' },
    ]);
  });

  it('resets only the changed incompatible step to noop', () => {
    expect(changeStepMode({ id: 'suffix', type: 'addSuffix', mode: 'text', value: 'lts' }, 'number')).toEqual({
      id: 'suffix',
      mode: 'number',
      type: 'noop',
      applyToEmptyValues: false,
    });
    expect(changeStepMode({ id: 'numeric', type: 'numericOperation', mode: 'number', operation: 'addPercentage', amount: 10 }, 'text')).toEqual({
      id: 'numeric',
      mode: 'text',
      type: 'noop',
      applyToEmptyValues: false,
    });
    expect(changeStepMode({ id: 'text', type: 'toText', mode: 'conversion' }, 'conversion')).toEqual({ mode: 'conversion' });
  });

  it('infers missing modes without forcing all steps to recipe mode', () => {
    expect(normalizeStepsForMode([
      { id: 'suffix', type: 'addSuffix', value: 'lts' },
      { id: 'numeric', type: 'numericOperation', operation: 'addPercentage', amount: 10 },
      { id: 'convert', type: 'toText' },
    ], 'text')).toMatchObject([
      { id: 'suffix', type: 'addSuffix', mode: 'text' },
      { id: 'numeric', type: 'numericOperation', mode: 'number' },
      { id: 'convert', type: 'toText', mode: 'conversion' },
    ]);
  });

  it('does not invent a transformation for a neutral first step', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name' }],
          separator: '',
          steps: [{ id: 'noop', type: 'noop' }],
        },
        { 'input-name': 'latex iberia' },
      ),
    ).toBe('latex iberia');

    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [{ id: 'noop', type: 'noop' }],
        },
        { 'input-price': '100' },
      ),
    ).toBe('100');
  });

  it('shows numeric preview states without treating text as success', () => {
    const recipe = buildSimpleCustomValueRecipe('number', 'input-code', {
      id: 'numeric',
      type: 'numericOperation',
      operation: 'addPercentage',
      amount: 10,
      rounding: 2,
    });

    expect(buildCustomValuePreview(recipe, { 'input-code': 'ABC123' })).toBe('No se pudo calcular: valor no numerico.');
  });

  it('calculates numeric preview when sample value is currency', () => {
    const recipe = buildSimpleCustomValueRecipe('number', 'input-price', {
      id: 'numeric',
      type: 'numericOperation',
      operation: 'addPercentage',
      amount: 10,
      rounding: 2,
    });

    expect(buildCustomValuePreview(recipe, { 'input-price': '$ 43,138.09' })).toBe('47451.90');
  });

  it('previews text steps sequentially', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name' }],
          separator: '',
          steps: [
            { id: 'trim', type: 'trim' },
            { id: 'upper', type: 'uppercase' },
            { id: 'suffix', type: 'addSuffix', value: ' MATE' },
          ],
        },
        { 'input-name': ' latex iberia ' },
      ),
    ).toBe('LATEX IBERIA MATE');
  });

  it('previews numeric steps sequentially', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 2 },
            { id: 'percent', type: 'numericOperation', operation: 'addPercentage', amount: 20, rounding: 2 },
          ],
        },
        { 'input-price': '100' },
      ),
    ).toBe('132.00');
  });

  it('skips a conditioned step and applies the next step to the previous value', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            {
              id: 'skipped',
              type: 'numericOperation',
              operation: 'add',
              amount: 10,
              rounding: 2,
              condition: { target: 'input', columnId: 'input-code', operator: 'equals', value: 'APPLY' },
            },
            { id: 'percent', type: 'numericOperation', operation: 'addPercentage', amount: 20, rounding: 2 },
          ],
        },
        { 'input-price': '100', 'input-code': 'SKIP' },
      ),
    ).toBe('120.00');
  });

  it('previews extraction before numeric operation', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'code', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
          steps: [
            { id: 'extract', type: 'extractNumber' },
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
          ],
        },
        { 'input-code': 'hay 25 personas' },
      ),
    ).toBe('35');
  });

  it('previews text after numeric operation when converting explicitly to text', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          customMode: 'number',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          separator: '',
          steps: [
            { id: 'add', type: 'numericOperation', operation: 'add', amount: 10, rounding: 0 },
            { id: 'text', type: 'toText' },
            { id: 'suffix', type: 'addSuffix', value: ' personas' },
          ],
        },
        { 'input-price': '25' },
      ),
    ).toBe('35 personas');
  });

  it('shows concat empty state when concat mode is selected without parts', () => {
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '' }, { 'input-price': '100' }, true, 'concat')).toBe('Agrega una parte para ver la vista previa.');
  });

  it('previews concat when parts are configured', () => {
    expect(
      buildCustomValuePreview(
        {
          type: 'combine',
          parts: [
            { id: 'text', type: 'text', value: 'PC' },
            { id: 'code', type: 'input', inputColumnId: 'input-code' },
          ],
          separator: '',
        },
        { 'input-code': '3074' },
        true,
        'concat',
      ),
    ).toBe('PC3074');
  });

  it('keeps concat input and fixed text parts working without steps', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [
            { id: 'name', type: 'input', inputColumnId: 'input-name', separatorAfter: ' - ' },
            { id: 'fixed', type: 'text', value: 'OK' },
          ],
          separator: '',
        },
        { 'input-name': 'Latex' },
      ),
    ).toBe('Latex - OK');
  });

  it('applies concat part steps in order before joining parts', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [
            {
              id: 'name',
              type: 'input',
              inputColumnId: 'input-name',
              separatorAfter: ' ',
              steps: [
                { id: 'trim', type: 'trim' },
                { id: 'upper', type: 'uppercase' },
              ],
            },
            { id: 'pack', type: 'input', inputColumnId: 'input-pack' },
          ],
          separator: '',
        },
        { 'input-name': ' latex ', 'input-pack': '20L' },
      ),
    ).toBe('LATEX 20L');
  });

  it('keeps noop concat part steps neutral', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [{ id: 'name', type: 'input', inputColumnId: 'input-name', steps: [{ id: 'noop', type: 'noop' }] }],
          separator: '',
        },
        { 'input-name': 'Latex' },
      ),
    ).toBe('Latex');
  });

  it('applies numeric concat part steps before joining', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          customMode: 'concat',
          parts: [
            { id: 'prefix', type: 'text', value: '$ ' },
            {
              id: 'price',
              type: 'input',
              inputColumnId: 'input-price',
              steps: [
                { id: 'number', type: 'toNumber' },
                { id: 'add', type: 'numericOperation', operation: 'addPercentage', amount: 10, rounding: 2 },
                { id: 'text', type: 'toText' },
              ],
            },
          ],
          separator: '',
        },
        { 'input-price': '100' },
      ),
    ).toBe('$ 110.00');
  });

  it('shows specific empty states for simple number and text modes', () => {
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '', steps: [{ id: 'numeric', type: 'numericOperation' }] }, {}, true, 'number')).toBe('Selecciona una columna numerica.');
    expect(buildCustomValuePreview({ type: 'combine', parts: [], separator: '', steps: [{ id: 'suffix', type: 'addSuffix', value: 'lts' }] }, {}, true, 'text')).toBe('Selecciona una columna de texto.');
  });

  it('builds a readable summary for combine parts', () => {
    expect(
      describeCombineParts(
        {
          type: 'combine',
          parts: [
            { id: 'prefix', type: 'text', value: 'PC' },
            { id: 'code', type: 'input', inputColumnId: 'input-code' },
            { id: 'name', type: 'input', inputColumnId: 'input-name' },
            { id: 'pack', type: 'input', inputColumnId: 'input-pack' },
          ],
        },
        inputColumns,
      ),
    ).toBe('Texto: "PC" | Columna A | Columna D (Nombre) | Columna F (Presentacion)');
  });

  it('labels a single constructor part as base', () => {
    expect(
      getConstructorPartsSummary(
        {
          type: 'combine',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
        },
        inputColumns,
      ),
    ).toBe('Base: Columna AN (Precio)');
  });

  it('labels multiple constructor parts as parts', () => {
    expect(
      getConstructorPartsSummary(
        {
          type: 'combine',
          parts: [
            { id: 'name', type: 'input', inputColumnId: 'input-name' },
            { id: 'pack', type: 'input', inputColumnId: 'input-pack' },
          ],
        },
        inputColumns,
      ),
    ).toBe('Partes: Columna D (Nombre) | Columna F (Presentacion)');
  });

  it('summarizes numeric operation adjustments', () => {
    expect(
      getConstructorAdjustmentsSummary(
        {
          type: 'combine',
          parts: [{ id: 'price', type: 'input', inputColumnId: 'input-price' }],
          steps: [{
            id: 'numeric',
            type: 'numericOperation',
            operation: 'addPercentage',
            amount: 10,
            rounding: 2,
          }],
        },
        inputColumns,
      ),
    ).toBe('sumar 10% · 2 decimales');
  });

  it('builds a preview using sample input values and part steps', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          parts: [
            { id: 'prefix', type: 'text', value: 'PC' },
            {
              id: 'code',
              type: 'input',
              inputColumnId: 'input-code',
              separatorAfter: ' - ',
              steps: [{ id: 'suffix', type: 'addSuffix', value: 'lts' }],
            },
            { id: 'units', type: 'text', value: '4 unidades' },
          ],
        },
        { 'input-code': '3074' },
      ),
    ).toBe('PC3074lts - 4 unidades');
  });

  it('applies prefix and suffix text adjustments to concat preview', () => {
    expect(
      buildCombinePreview(
        {
          type: 'combine',
          parts: [
            {
              id: 'code',
              type: 'input',
              inputColumnId: 'input-code',
              steps: [
                { id: 'prefix', type: 'addPrefix', value: 'SKU-' },
                { id: 'suffix', type: 'addSuffix', value: '-OK' },
              ],
            },
          ],
        },
        { 'input-code': '3074' },
      ),
    ).toBe('SKU-3074-OK');
  });

  it('keeps one prefix and suffix adjustment when updating text steps', () => {
    const withPrefix = setSimpleStep([], 'addPrefix', 'PC');
    const updatedPrefix = setSimpleStep(withPrefix, 'addPrefix', 'SKU-');
    const withSuffix = setSimpleStep(updatedPrefix, 'addSuffix', 'lts');

    expect(getSimpleStepValue(withSuffix, 'addPrefix')).toBe('SKU-');
    expect(getSimpleStepValue(withSuffix, 'addSuffix')).toBe('lts');
    expect(withSuffix.filter((step) => step.type === 'addPrefix')).toHaveLength(1);
    expect(withSuffix.filter((step) => step.type === 'addSuffix')).toHaveLength(1);
  });
});
