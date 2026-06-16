import { describe, expect, it } from 'vitest';
import type { ExportedImportSettings, FileNameSettings, OutputColumn } from '../../../types/import';
import {
  collectInputColumnReferences,
  collectOutputColumnReferences,
  collectSettingsReferences,
  groupReferencesByColumnId,
} from '../settingsReferences';

const fileNameSettings: FileNameSettings = {
  mode: 'default',
  customName: '',
  baseText: 'Archivo sanitizado',
  includeBaseText: true,
  includeOriginalName: true,
  includeSheetName: true,
  includeDate: false,
};

function settings(outputColumns: OutputColumn[]): ExportedImportSettings {
  return {
    schemaVersion: 1,
    app: 'excel-sanitizer',
    exportedAt: '2026-06-04T13:00:00.000Z',
    sourceSnapshot: {
      fileType: 'spreadsheet',
      sheetName: 'Hoja 1',
      rowCount: 10,
      headerRowIndex: 0,
      startRowIndex: 1,
      columns: [],
    },
    config: {
      selectedSheet: 'Hoja 1',
      headerRowIndex: 0,
      startRowIndex: 1,
      columnVisibility: [],
      inputColumnAliases: {},
      inputIgnoreRules: [
        { id: 'input-ignore', target: 'input', columnId: 'input-filter', operator: 'contains', value: 'X' },
      ],
      outputColumns,
      outputIgnoreRules: [
        { id: 'output-ignore', target: 'output', columnId: 'output-total', operator: 'isNotEmpty' },
      ],
      fileNameSettings,
    },
  };
}

function outputColumn(partial: Partial<OutputColumn>): OutputColumn {
  return {
    id: partial.id ?? 'output',
    label: partial.label ?? 'Salida',
    order: partial.order ?? 0,
    enabled: partial.enabled ?? true,
    recipe: partial.recipe ?? { type: 'empty' },
  };
}

describe('settingsReferences', () => {
  it('collects direct recipe and ignore rule references', () => {
    const summary = collectSettingsReferences(settings([
      outputColumn({
        id: 'output-code',
        recipe: { type: 'direct', inputColumnId: 'input-code' },
      }),
    ]));

    expect(summary.references).toEqual(expect.arrayContaining([
      expect.objectContaining({
        columnId: 'output-code',
        target: 'output',
        kind: 'outputColumn',
        path: 'config.outputColumns[0]',
      }),
      expect.objectContaining({
        columnId: 'input-code',
        target: 'input',
        kind: 'directRecipe',
        path: 'config.outputColumns[0].recipe.inputColumnId',
        outputColumnId: 'output-code',
      }),
      expect.objectContaining({
        columnId: 'input-filter',
        target: 'input',
        kind: 'inputIgnoreRule',
        path: 'config.inputIgnoreRules[0]',
        ruleId: 'input-ignore',
      }),
      expect.objectContaining({
        columnId: 'output-total',
        target: 'output',
        kind: 'outputIgnoreRule',
        path: 'config.outputIgnoreRules[0]',
        ruleId: 'output-ignore',
      }),
    ]));
    expect(summary.inputColumnIds).toEqual(['input-code', 'input-filter']);
    expect(summary.outputColumnIds).toEqual(['output-code', 'output-total']);
  });

  it('collects recipe parts, transform sources, operands and conditions', () => {
    const summary = collectSettingsReferences(settings([
      outputColumn({
        id: 'output-combined',
        recipe: {
          type: 'combine',
          separator: ' - ',
          parts: [
            {
              id: 'part-input',
              type: 'input',
              inputColumnId: 'input-brand',
              steps: [
                {
                  id: 'part-step',
                  type: 'uppercase',
                  source: { type: 'input', inputColumnId: 'input-part-source' },
                  condition: {
                    target: 'input',
                    columnId: 'input-part-condition',
                    operator: 'isNotEmpty',
                  },
                },
              ],
            },
            { id: 'part-text', type: 'text', value: 'fixed' },
          ],
          steps: [
            {
              id: 'numeric-step',
              type: 'numericOperation',
              leftOperand: { type: 'input', inputColumnId: 'input-price' },
              rightOperand: { type: 'input', inputColumnId: 'input-tax' },
              condition: {
                target: 'output',
                columnId: 'output-combined',
                operator: 'isNotEmpty',
              },
            },
          ],
        },
      }),
    ]));

    expect(summary.references).toEqual(expect.arrayContaining([
      expect.objectContaining({
        columnId: 'input-brand',
        kind: 'recipePart',
        path: 'config.outputColumns[0].recipe.parts[0].inputColumnId',
        partId: 'part-input',
      }),
      expect.objectContaining({
        columnId: 'input-part-source',
        kind: 'transformStepSource',
        path: 'config.outputColumns[0].recipe.parts[0].steps[0].source',
        stepId: 'part-step',
      }),
      expect.objectContaining({
        columnId: 'input-part-condition',
        kind: 'condition',
        path: 'config.outputColumns[0].recipe.parts[0].steps[0].condition',
        stepId: 'part-step',
      }),
      expect.objectContaining({
        columnId: 'input-price',
        kind: 'transformStepOperand',
        path: 'config.outputColumns[0].recipe.steps[0].leftOperand',
        stepId: 'numeric-step',
      }),
      expect.objectContaining({
        columnId: 'input-tax',
        kind: 'transformStepOperand',
        path: 'config.outputColumns[0].recipe.steps[0].rightOperand',
        stepId: 'numeric-step',
      }),
      expect.objectContaining({
        columnId: 'output-combined',
        target: 'output',
        kind: 'condition',
        path: 'config.outputColumns[0].recipe.steps[0].condition',
        stepId: 'numeric-step',
      }),
    ]));
  });

  it('collects concat step part sources and nested concat part transform references', () => {
    const summary = collectSettingsReferences(settings([
      outputColumn({
        id: 'output-description',
        recipe: {
          type: 'combine',
          parts: [],
          steps: [
            {
              id: 'concat-step',
              type: 'concat',
              parts: [
                {
                  id: 'concat-part',
                  source: { type: 'input', inputColumnId: 'input-pack' },
                  steps: [
                    {
                      id: 'concat-part-step',
                      type: 'addSuffix',
                      source: { type: 'input', inputColumnId: 'input-suffix-source' },
                      condition: {
                        target: 'input',
                        columnId: 'input-suffix-condition',
                        operator: 'contains',
                        value: 'A',
                      },
                    },
                  ],
                },
              ],
            },
          ],
          customMode: 'concat',
        },
      }),
    ]));

    expect(summary.references).toEqual(expect.arrayContaining([
      expect.objectContaining({
        columnId: 'input-pack',
        kind: 'concatPartSource',
        path: 'config.outputColumns[0].recipe.steps[0].parts[0].source',
        stepId: 'concat-step',
        partId: 'concat-part',
      }),
      expect.objectContaining({
        columnId: 'input-suffix-source',
        kind: 'transformStepSource',
        path: 'config.outputColumns[0].recipe.steps[0].parts[0].steps[0].source',
        stepId: 'concat-part-step',
      }),
      expect.objectContaining({
        columnId: 'input-suffix-condition',
        kind: 'condition',
        path: 'config.outputColumns[0].recipe.steps[0].parts[0].steps[0].condition',
        stepId: 'concat-part-step',
      }),
    ]));
  });

  it('collects manual range condition input references', () => {
    const summary = collectSettingsReferences(settings([
      outputColumn({
        id: 'output-comment',
        recipe: {
          type: 'manualRange',
          ranges: [
            { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Cerda china mango amarillo' },
          ],
          condition: { inputColumnId: 'input-code', operator: 'isNotEmpty' },
        },
      }),
    ]));

    expect(summary.references).toEqual(expect.arrayContaining([
      expect.objectContaining({
        columnId: 'input-code',
        target: 'input',
        kind: 'condition',
        path: 'config.outputColumns[0].recipe.condition',
        outputColumnId: 'output-comment',
      }),
    ]));
    expect(summary.inputColumnIds).toEqual(['input-code', 'input-filter']);
  });

  it('collects manual range value source input references', () => {
    const summary = collectSettingsReferences(settings([
      outputColumn({
        id: 'output-comment',
        recipe: {
          type: 'manualRange',
          ranges: [
            {
              id: 'range-8-13',
              startRowNumber: 8,
              endRowNumber: 13,
              valueSource: { type: 'rangeText', inputColumnId: 'input-brand', selectedText: 'Sinteplast' },
            },
          ],
        },
      }),
    ]));

    expect(summary.references).toEqual(expect.arrayContaining([
      expect.objectContaining({
        columnId: 'input-brand',
        target: 'input',
        kind: 'manualRangeValueSource',
        path: 'config.outputColumns[0].recipe.ranges[0].valueSource.inputColumnId',
        outputColumnId: 'output-comment',
      }),
    ]));
    expect(summary.inputColumnIds).toEqual(['input-brand', 'input-filter']);
  });

  it('does not collect manual range input references when there is no condition', () => {
    const summary = collectSettingsReferences(settings([
      outputColumn({
        id: 'output-comment',
        recipe: {
          type: 'manualRange',
          ranges: [
            { id: 'range-8-13', startRowNumber: 8, endRowNumber: 13, value: 'Cerda china mango amarillo' },
          ],
        },
      }),
    ]));

    expect(summary.inputColumnIds).toEqual(['input-filter']);
    expect(summary.references).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: 'config.outputColumns[0].recipe.condition',
      }),
    ]));
  });

  it('groups references by column id and keeps deterministic unique ids', () => {
    const summary = collectSettingsReferences(settings([
      outputColumn({
        id: 'output-b',
        recipe: { type: 'direct', inputColumnId: 'input-b' },
      }),
      outputColumn({
        id: 'output-a',
        recipe: { type: 'direct', inputColumnId: 'input-a' },
      }),
      outputColumn({
        id: 'output-duplicate-input',
        recipe: { type: 'direct', inputColumnId: 'input-a' },
      }),
    ]));

    expect(summary.inputColumnIds).toEqual(['input-a', 'input-b', 'input-filter']);
    expect(summary.outputColumnIds).toEqual(['output-a', 'output-b', 'output-duplicate-input', 'output-total']);
    expect(summary.referencesByColumnId['input-a']).toHaveLength(2);
    expect(groupReferencesByColumnId(summary.references)['input-a']).toHaveLength(2);
  });

  it('returns input and output references separately', () => {
    const currentSettings = settings([
      outputColumn({ id: 'output-code', recipe: { type: 'direct', inputColumnId: 'input-code' } }),
    ]);

    expect(collectInputColumnReferences(currentSettings).every((reference) => reference.target === 'input')).toBe(true);
    expect(collectOutputColumnReferences(currentSettings).every((reference) => reference.target === 'output')).toBe(true);
  });

  it('does not break when optional fields or old compatible recipe shapes are missing', () => {
    const summary = collectSettingsReferences(settings([
      outputColumn({
        id: 'output-empty',
        recipe: { type: 'empty' },
      }),
      outputColumn({
        id: 'output-fixed',
        recipe: { type: 'fixedText', value: 'ok' },
      }),
      outputColumn({
        id: 'output-combine-empty',
        recipe: { type: 'combine', parts: [], separator: '' },
      }),
    ]));

    expect(summary.inputColumnIds).toEqual(['input-filter']);
    expect(summary.outputColumnIds).toEqual(['output-combine-empty', 'output-empty', 'output-fixed', 'output-total']);
    expect(summary.references.filter((reference) => reference.kind === 'outputColumn')).toHaveLength(3);
  });
});
