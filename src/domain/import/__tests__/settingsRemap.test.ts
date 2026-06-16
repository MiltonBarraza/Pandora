import { describe, expect, it } from 'vitest';
import type { ExportedImportSettings, FileNameSettings, OutputColumn } from '../../../types/import';
import { applyInputColumnRemapToSettings, hasInputColumnRemap, remapInputColumnId } from '../settingsRemap';
import { collectSettingsReferences } from '../settingsReferences';

const fileNameSettings: FileNameSettings = {
  mode: 'default',
  customName: '',
  baseText: 'Archivo sanitizado',
  includeBaseText: true,
  includeOriginalName: true,
  includeSheetName: true,
  includeDate: false,
};

function buildSettings(): ExportedImportSettings {
  const outputColumns: OutputColumn[] = [
    {
      id: 'output-direct',
      label: 'Directa',
      order: 0,
      enabled: true,
      recipe: {
        type: 'direct',
        inputColumnId: 'input-direct',
      },
    },
    {
      id: 'output-combine',
      label: 'Combinada',
      order: 1,
      enabled: true,
      recipe: {
        type: 'combine',
        separator: ' - ',
        parts: [
          {
            id: 'recipe-part',
            type: 'input',
            inputColumnId: 'input-part',
            steps: [
              {
                id: 'part-step',
                type: 'uppercase',
                source: { type: 'input', inputColumnId: 'input-part-step-source' },
                condition: {
                  target: 'input',
                  columnId: 'input-part-step-condition',
                  operator: 'isNotEmpty',
                },
              },
            ],
          },
          {
            id: 'text-part',
            type: 'text',
            value: 'fijo',
          },
        ],
        steps: [
          {
            id: 'numeric-step',
            type: 'numericOperation',
            source: { type: 'input', inputColumnId: 'input-step-source' },
            leftOperand: { type: 'input', inputColumnId: 'input-left' },
            rightOperand: { type: 'input', inputColumnId: 'input-right' },
            condition: {
              target: 'input',
              columnId: 'input-step-condition',
              operator: 'contains',
              value: 'ok',
            },
          },
          {
            id: 'concat-step',
            type: 'concat',
            parts: [
              {
                id: 'concat-part',
                source: { type: 'input', inputColumnId: 'input-concat-source' },
                steps: [
                  {
                    id: 'concat-part-step',
                    type: 'addSuffix',
                    source: { type: 'input', inputColumnId: 'input-concat-step-source' },
                    condition: {
                      target: 'input',
                      columnId: 'input-concat-step-condition',
                      operator: 'isNotEmpty',
                    },
                  },
                ],
              },
            ],
          },
          {
            id: 'output-condition-step',
            type: 'trim',
            condition: {
              target: 'output',
              columnId: 'output-direct',
              operator: 'isNotEmpty',
            },
          },
        ],
        customMode: 'concat',
      },
    },
    {
      id: 'output-legacy-compatible',
      label: 'Legacy compatible',
      order: 2,
      enabled: true,
      recipe: {
        type: 'combine',
        parts: [],
        separator: '',
      },
    },
  ];

  return {
    schemaVersion: 1,
    app: 'excel-sanitizer',
    exportedAt: '2026-06-04T13:00:00.000Z',
    name: 'Settings originales',
    sourceSnapshot: {
      fileType: 'spreadsheet',
      sheetName: 'Hoja 1',
      rowCount: 10,
      headerRowIndex: 0,
      startRowIndex: 1,
      columns: [
        {
          inputColumnId: 'input-direct',
          columnIndex: 0,
          columnLetter: 'A',
          header: 'Directa',
          active: true,
          sampleValues: ['A'],
          nonEmptyCount: 1,
          fingerprint: 'direct',
        },
        {
          inputColumnId: 'input-unused-snapshot',
          columnIndex: 20,
          columnLetter: 'U',
          header: 'No usada',
          active: true,
          sampleValues: [],
          nonEmptyCount: 0,
          fingerprint: 'unused',
        },
      ],
    },
    config: {
      selectedSheet: 'Hoja 1',
      headerRowIndex: 0,
      startRowIndex: 1,
      columnVisibility: [
        {
          inputColumnId: 'input-direct',
          columnIndex: 0,
          columnLetter: 'A',
          header: 'Directa',
          active: true,
        },
        {
          inputColumnId: 'input-unused-visibility',
          columnIndex: 9,
          columnLetter: 'J',
          header: 'Visible no usada',
          active: false,
          ignoredReason: 'manual',
        },
      ],
      inputColumnAliases: {
        'input-direct': 'Directa',
        'input-part': 'Parte',
      },
      inputIgnoreRules: [
        { id: 'input-ignore', target: 'input', columnId: 'input-ignore', operator: 'contains', value: 'x' },
        { id: 'input-unresolved-rule', target: 'input', columnId: 'input-unresolved', operator: 'isNotEmpty' },
      ],
      outputColumns,
      outputIgnoreRules: [
        { id: 'output-ignore', target: 'output', columnId: 'output-direct', operator: 'isNotEmpty' },
      ],
      fileNameSettings,
    },
  };
}

const remap = {
  'input-direct': 'input-100',
  'input-part': 'input-101',
  'input-part-step-source': 'input-102',
  'input-part-step-condition': 'input-103',
  'input-step-source': 'input-104',
  'input-left': 'input-105',
  'input-right': 'input-106',
  'input-step-condition': 'input-107',
  'input-concat-source': 'input-108',
  'input-concat-step-source': 'input-109',
  'input-concat-step-condition': 'input-110',
  'input-ignore': 'input-111',
  'input-unused-visibility': 'input-112',
};

describe('settingsRemap', () => {
  it('remaps input column references deeply without mutating original settings', () => {
    const original = buildSettings();
    const originalJson = JSON.stringify(original);
    const result = applyInputColumnRemapToSettings(original, remap);
    const next = result.settings;

    expect(JSON.stringify(original)).toBe(originalJson);
    expect(next).not.toBe(original);
    expect(next.sourceSnapshot).toEqual(original.sourceSnapshot);
    expect(next.schemaVersion).toBe(original.schemaVersion);
    expect(next.app).toBe(original.app);
    expect(next.exportedAt).toBe(original.exportedAt);
    expect(next.name).toBe(original.name);

    expect(next.config.outputColumns[0].id).toBe('output-direct');
    if (next.config.outputColumns[0].recipe.type !== 'direct') {
      throw new Error('Expected direct recipe');
    }
    expect(next.config.outputColumns[0].recipe.inputColumnId).toBe('input-100');

    const combineRecipe = next.config.outputColumns[1].recipe;
    if (combineRecipe.type !== 'combine') {
      throw new Error('Expected combine recipe');
    }
    const [recipePart] = combineRecipe.parts;
    if (recipePart.type !== 'input') {
      throw new Error('Expected input part');
    }
    expect(recipePart.inputColumnId).toBe('input-101');
    expect(recipePart.steps?.[0].source).toEqual({ type: 'input', inputColumnId: 'input-102' });
    expect(recipePart.steps?.[0].condition?.columnId).toBe('input-103');

    expect(combineRecipe.steps?.[0].source).toEqual({ type: 'input', inputColumnId: 'input-104' });
    expect(combineRecipe.steps?.[0].leftOperand).toEqual({ type: 'input', inputColumnId: 'input-105' });
    expect(combineRecipe.steps?.[0].rightOperand).toEqual({ type: 'input', inputColumnId: 'input-106' });
    expect(combineRecipe.steps?.[0].condition?.columnId).toBe('input-107');

    expect(combineRecipe.steps?.[1].parts?.[0].source).toEqual({ type: 'input', inputColumnId: 'input-108' });
    expect(combineRecipe.steps?.[1].parts?.[0].steps?.[0].source).toEqual({ type: 'input', inputColumnId: 'input-109' });
    expect(combineRecipe.steps?.[1].parts?.[0].steps?.[0].condition?.columnId).toBe('input-110');
    expect(combineRecipe.steps?.[2].condition?.columnId).toBe('output-direct');

    expect(next.config.inputIgnoreRules[0].columnId).toBe('input-111');
    expect(next.config.inputIgnoreRules[1].columnId).toBe('input-unresolved');
    expect(next.config.outputIgnoreRules).toEqual(original.config.outputIgnoreRules);
  });

  it('remaps inputColumnAliases and columnVisibility but not sourceSnapshot', () => {
    const original = buildSettings();
    const result = applyInputColumnRemapToSettings(original, remap);

    expect(result.settings.config.inputColumnAliases).toEqual({
      'input-100': 'Directa',
      'input-101': 'Parte',
    });
    expect(result.settings.config.columnVisibility.map((column) => column.inputColumnId)).toEqual(['input-100', 'input-112']);
    expect(result.settings.sourceSnapshot.columns.map((column) => column.inputColumnId)).toEqual(['input-direct', 'input-unused-snapshot']);
  });

  it('reports changed and unresolved real references only', () => {
    const result = applyInputColumnRemapToSettings(buildSettings(), remap);

    expect(result.changedReferences.map((reference) => reference.columnId)).toEqual([
      'input-direct',
      'input-step-source',
      'input-left',
      'input-right',
      'input-step-condition',
      'input-concat-source',
      'input-concat-step-source',
      'input-concat-step-condition',
      'input-part',
      'input-part-step-source',
      'input-part-step-condition',
      'input-ignore',
    ]);
    expect(result.unresolvedReferences).toEqual([
      expect.objectContaining({
        columnId: 'input-unresolved',
        kind: 'inputIgnoreRule',
        path: 'config.inputIgnoreRules[1]',
      }),
    ]);
    expect(result.unresolvedReferences.map((reference) => reference.columnId)).not.toContain('input-unused-snapshot');
    expect(result.unresolvedReferences.map((reference) => reference.columnId)).not.toContain('input-unused-visibility');
  });

  it('keeps collected references consistent after remap', () => {
    const result = applyInputColumnRemapToSettings(buildSettings(), remap);
    const summary = collectSettingsReferences(result.settings);

    expect(summary.inputColumnIds).toContain('input-100');
    expect(summary.inputColumnIds).toContain('input-111');
    expect(summary.inputColumnIds).toContain('input-unresolved');
    expect(summary.inputColumnIds).not.toContain('input-direct');
    expect(summary.outputColumnIds).toContain('output-direct');
  });

  it('remaps manual range conditions and range text value sources without changing row numbers or fixed values', () => {
    const currentSettings = buildSettings();
    currentSettings.config.outputColumns = [
      {
        id: 'output-comment',
        label: 'Comentario',
        order: 0,
        enabled: true,
        recipe: {
          type: 'manualRange',
          ranges: [
            {
              id: 'range-8-13',
              startRowNumber: 8,
              endRowNumber: 13,
              valueSource: { type: 'rangeText', inputColumnId: 'input-manual-value', selectedText: 'Sinteplast' },
            },
          ],
          condition: { inputColumnId: 'input-manual-condition', operator: 'isNotEmpty' },
        },
      },
      {
        id: 'output-comment-unconditional',
        label: 'Comentario sin condicion',
        order: 1,
        enabled: true,
        recipe: {
          type: 'manualRange',
          ranges: [
            { id: 'range-20-21', startRowNumber: 20, endRowNumber: 21, value: 'Texto fijo' },
          ],
        },
      },
    ];
    currentSettings.config.inputIgnoreRules = [];

    const result = applyInputColumnRemapToSettings(currentSettings, {
      'input-manual-condition': 'input-200',
      'input-manual-value': 'input-201',
    });
    const manualRangeRecipe = result.settings.config.outputColumns[0].recipe;
    const unconditionalRecipe = result.settings.config.outputColumns[1].recipe;

    if (manualRangeRecipe.type !== 'manualRange' || unconditionalRecipe.type !== 'manualRange') {
      throw new Error('Expected manual range recipes');
    }

    expect(manualRangeRecipe.condition?.inputColumnId).toBe('input-200');
    expect(manualRangeRecipe.ranges).toEqual([
      {
        id: 'range-8-13',
        startRowNumber: 8,
        endRowNumber: 13,
        valueSource: { type: 'rangeText', inputColumnId: 'input-201', selectedText: 'Sinteplast' },
      },
    ]);
    expect(unconditionalRecipe).toEqual(currentSettings.config.outputColumns[1].recipe);
    expect(result.changedReferences).toEqual(expect.arrayContaining([
      expect.objectContaining({
        columnId: 'input-manual-condition',
        kind: 'condition',
        path: 'config.outputColumns[0].recipe.condition',
      }),
      expect.objectContaining({
        columnId: 'input-manual-value',
        kind: 'manualRangeValueSource',
        path: 'config.outputColumns[0].recipe.ranges[0].valueSource.inputColumnId',
      }),
    ]));
    expect(result.changedReferences).toHaveLength(2);
    expect(result.unresolvedReferences).toEqual([]);
  });

  it('remaps manual range steps inside custom value recipes', () => {
    const currentSettings = buildSettings();
    currentSettings.config.outputColumns = [
      {
        id: 'output-comment',
        label: 'Comentario',
        order: 0,
        enabled: true,
        recipe: {
          type: 'combine',
          parts: [],
          separator: '',
          steps: [
            {
              id: 'range-step',
              type: 'manualRange',
              ranges: [
                {
                  id: 'range-8-13',
                  startRowNumber: 8,
                  endRowNumber: 13,
                  valueSource: { type: 'rangeText', inputColumnId: 'input-manual-value', selectedText: 'Sinteplast' },
                },
              ],
              manualRangeCondition: { inputColumnId: 'input-manual-condition', operator: 'isNotEmpty' },
            },
          ],
        },
      },
    ];
    currentSettings.config.inputIgnoreRules = [];

    const result = applyInputColumnRemapToSettings(currentSettings, {
      'input-manual-condition': 'input-200',
      'input-manual-value': 'input-201',
    });
    const recipe = result.settings.config.outputColumns[0].recipe;

    if (recipe.type !== 'combine') {
      throw new Error('Expected combine recipe');
    }

    expect(recipe.steps?.[0]).toMatchObject({
      manualRangeCondition: { inputColumnId: 'input-200', operator: 'isNotEmpty' },
      ranges: [
        {
          valueSource: { type: 'rangeText', inputColumnId: 'input-201', selectedText: 'Sinteplast' },
        },
      ],
    });
    expect(result.changedReferences).toEqual(expect.arrayContaining([
      expect.objectContaining({
        columnId: 'input-manual-condition',
        kind: 'condition',
        path: 'config.outputColumns[0].recipe.steps[0].manualRangeCondition',
        stepId: 'range-step',
      }),
      expect.objectContaining({
        columnId: 'input-manual-value',
        kind: 'manualRangeValueSource',
        path: 'config.outputColumns[0].recipe.steps[0].ranges[0].valueSource.inputColumnId',
        stepId: 'range-step',
      }),
    ]));
    expect(result.unresolvedReferences).toEqual([]);
  });

  it('remaps simple ids and detects whether a remap has entries', () => {
    expect(remapInputColumnId('input-a', { 'input-a': 'input-b' })).toBe('input-b');
    expect(remapInputColumnId('input-a', {})).toBe('input-a');
    expect(hasInputColumnRemap({})).toBe(false);
    expect(hasInputColumnRemap({ 'input-a': 'input-b' })).toBe(true);
  });

  it('tolerates optional fields and compatible old recipe shapes', () => {
    const currentSettings = buildSettings();
    currentSettings.config.outputColumns = [
      {
        id: 'output-empty',
        label: 'Empty',
        order: 0,
        enabled: true,
        recipe: { type: 'empty' },
      },
      {
        id: 'output-combine',
        label: 'Combine',
        order: 1,
        enabled: true,
        recipe: { type: 'combine', parts: [], separator: '' },
      },
    ];
    currentSettings.config.inputIgnoreRules = [];

    const result = applyInputColumnRemapToSettings(currentSettings, remap);

    expect(result.settings.config.outputColumns).toEqual(currentSettings.config.outputColumns);
    expect(result.changedReferences).toEqual([]);
    expect(result.unresolvedReferences).toEqual([]);
  });
});
