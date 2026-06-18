import { describe, expect, it } from 'vitest';
import type { OutputColumn } from '../../../types/import';
import { duplicateOutputColumn } from '../duplicateOutputColumn';

describe('duplicateOutputColumn', () => {
  it('clones an output column with new ids and preserves functional config', () => {
    const original: OutputColumn = {
      id: 'output-price',
      label: 'Precio +10%',
      order: 3,
      enabled: false,
      recipe: {
        type: 'combine',
        separator: '',
        parts: [
          {
            id: 'part-prefix',
            type: 'text',
            value: '$ ',
            separatorAfter: '',
            steps: [{ id: 'trim-part', type: 'trim' }],
          },
          {
            id: 'part-price',
            type: 'input',
            inputColumnId: 'input-price',
            separatorAfter: ' ',
            steps: [
              {
                id: 'numeric-part',
                type: 'numericOperation',
                operation: 'addPercentage',
                amount: 10,
                rounding: 2,
                condition: {
                  target: 'input',
                  columnId: 'input-price',
                  operator: 'isNotEmpty',
                  value: '',
                  valueType: 'text',
                },
              },
            ],
          },
        ],
        steps: [{ id: 'trim-final', type: 'trim' }],
      },
    };

    const copy = duplicateOutputColumn(original);

    expect(copy.id).not.toBe(original.id);
    expect(copy.label).toBe('Precio +10% copia');
    expect(copy.order).toBe(original.order);
    expect(copy.enabled).toBe(true);
    expect(copy.recipe).toMatchObject({
      type: 'combine',
      separator: '',
      parts: [
        {
          type: 'text',
          value: '$ ',
          separatorAfter: '',
          steps: [{ type: 'trim' }],
        },
        {
          type: 'input',
          inputColumnId: 'input-price',
          separatorAfter: ' ',
          steps: [
            {
              type: 'numericOperation',
              operation: 'addPercentage',
              amount: 10,
              rounding: 2,
              condition: {
                target: 'input',
                columnId: 'input-price',
                operator: 'isNotEmpty',
                value: '',
                valueType: 'text',
              },
            },
          ],
        },
      ],
      steps: [{ type: 'trim' }],
    });

    if (copy.recipe.type !== 'combine' || original.recipe.type !== 'combine') {
      throw new Error('Expected combine recipes');
    }

    expect(copy.recipe.parts[0].id).not.toBe(original.recipe.parts[0].id);
    expect(copy.recipe.parts[1].id).not.toBe(original.recipe.parts[1].id);
    expect(copy.recipe.parts[0].steps?.[0].id).not.toBe(original.recipe.parts[0].steps?.[0].id);
    expect(copy.recipe.parts[1].steps?.[0].id).not.toBe(original.recipe.parts[1].steps?.[0].id);
    expect(copy.recipe.steps?.[0].id).not.toBe(original.recipe.steps?.[0].id);
    expect(original.label).toBe('Precio +10%');
  });

  it('deep clones manual range value recipes with concat parts', () => {
    const original: OutputColumn = {
      id: 'output-comment',
      label: 'Comentario',
      order: 1,
      enabled: true,
      recipe: {
        type: 'manualRange',
        ranges: [{
          id: 'range-8-13',
          startRowNumber: 8,
          endRowNumber: 13,
          valueRecipe: {
            source: { type: 'input', inputColumnId: 'input-name' },
            steps: [{
              id: 'concat-step',
              type: 'concat',
              parts: [
                { id: 'name-part', source: { type: 'input', inputColumnId: 'input-name' } },
                { id: 'fixed-part', source: { type: 'fixedText', value: 'OK' }, separatorBefore: ' - ' },
              ],
            }],
          },
        }],
      },
    };

    const copy = duplicateOutputColumn(original);

    if (copy.recipe.type !== 'manualRange' || original.recipe.type !== 'manualRange') {
      throw new Error('Expected manual range recipes');
    }

    const originalRange = original.recipe.ranges[0];
    const copyRange = copy.recipe.ranges[0];

    expect(copyRange.id).not.toBe(originalRange.id);
    expect(copyRange.valueRecipe).toMatchObject({
      source: { type: 'input', inputColumnId: 'input-name' },
      steps: [{
        type: 'concat',
        parts: [
          { source: { type: 'input', inputColumnId: 'input-name' } },
          { source: { type: 'fixedText', value: 'OK' }, separatorBefore: ' - ' },
        ],
      }],
    });
    expect(copyRange.valueRecipe).not.toBe(originalRange.valueRecipe);
    expect(copyRange.valueRecipe?.source).not.toBe(originalRange.valueRecipe?.source);
    expect(copyRange.valueRecipe?.steps?.[0].id).not.toBe(originalRange.valueRecipe?.steps?.[0].id);
    expect(copyRange.valueRecipe?.steps?.[0].parts?.[0].id).not.toBe(originalRange.valueRecipe?.steps?.[0].parts?.[0].id);
    expect(copyRange.valueRecipe?.steps?.[0].parts?.[0].source).not.toBe(originalRange.valueRecipe?.steps?.[0].parts?.[0].source);

    copyRange.valueRecipe!.steps![0].parts![0].source = { type: 'fixedText', value: 'Mutado' };
    expect(originalRange.valueRecipe?.steps?.[0].parts?.[0].source).toEqual({ type: 'input', inputColumnId: 'input-name' });
  });

  it('does not preserve the generated column marker when duplicating', () => {
    const original: OutputColumn = {
      id: 'generated-name',
      label: 'Nombre',
      order: 1,
      enabled: true,
      generatedFromInputColumnId: 'input-name',
      recipe: { type: 'direct', inputColumnId: 'input-name' },
    };

    const copy = duplicateOutputColumn(original);

    expect(copy.generatedFromInputColumnId).toBeUndefined();
    expect(copy.recipe).toEqual({ type: 'direct', inputColumnId: 'input-name' });
  });
});
