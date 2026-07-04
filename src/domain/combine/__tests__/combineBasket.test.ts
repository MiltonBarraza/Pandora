import { describe, expect, it } from 'vitest';
import type { CombineSource } from '../../../types/combine';
import type { ProcessedExportResult } from '../../../types/processedExport';
import { buildCombinedRows } from '../buildCombinedRows';
import {
  addProcessedResultToCombineBasket,
  mergeCombineSources,
  removeCombineSourceFromCollections,
} from '../combineBasket';
import { buildCombinedExportAoA } from '../exportCombinedXlsx';

describe('combineBasket', () => {
  it('converts and adds a processed result to the basket', () => {
    const basket = addProcessedResultToCombineBasket([], processedResult());

    expect(basket).toHaveLength(1);
    expect(basket[0]).toMatchObject({ id: 'saved:1', fileName: 'sanitizado.xlsx' });
    expect(basket[0].rows[0].values).toEqual({ 'col:0': 'A1' });
  });

  it('resolves duplicate source ids without replacing existing entries', () => {
    const first = addProcessedResultToCombineBasket([], processedResult());
    const second = addProcessedResultToCombineBasket(first, processedResult());

    expect(second.map((source) => source.id)).toEqual(['saved:1', 'saved:1:2']);
  });

  it('merges basket and uploaded sources while keeping both origins', () => {
    expect(mergeCombineSources([basketSource], [uploadedSource]).map((source) => source.id)).toEqual([
      'basket:1',
      'source:0',
    ]);
  });

  it('marks basket removals and removes uploaded sources locally', () => {
    expect(removeCombineSourceFromCollections({
      sourceId: 'basket:1',
      basketSources: [basketSource],
      uploadedSources: [uploadedSource],
    })).toEqual({
      removedBasketSourceId: 'basket:1',
      uploadedSources: [uploadedSource],
    });

    expect(removeCombineSourceFromCollections({
      sourceId: 'source:0',
      basketSources: [basketSource],
      uploadedSources: [uploadedSource],
    })).toEqual({
      removedBasketSourceId: null,
      uploadedSources: [],
    });
  });

  it('uses merged sources in combined rows and export AoA', () => {
    const sources = mergeCombineSources([basketSource], [uploadedSource]);
    const outputColumns = [{ id: 'output-code', name: 'Código' }];
    const mappings = sources.map((source) => ({
      sourceId: source.id,
      outputColumnId: 'output-code',
      sourceColumnId: 'col:0',
    }));
    const rows = buildCombinedRows({ sources, outputColumns, mappings });

    expect(rows.map((row) => row.values['output-code'])).toEqual(['B1', 'U1']);
    expect(buildCombinedExportAoA({ outputColumns, combinedRows: rows })).toEqual([
      ['Código'],
      ['B1'],
      ['U1'],
    ]);
  });
});

const basketSource = source('basket:1', 'guardado.xlsx', 'B1');
const uploadedSource = source('source:0', 'subido.csv', 'U1');

function source(id: string, fileName: string, value: string): CombineSource {
  return {
    id,
    fileName,
    columns: [{ id: 'col:0', name: 'Código', index: 0 }],
    rows: [{ id: 'row:0', values: { 'col:0': value } }],
  };
}

function processedResult(): ProcessedExportResult {
  return {
    id: 'saved:1',
    fileBaseName: 'sanitizado',
    columns: [{ id: 'code', label: 'Código', order: 0, enabled: true }],
    rows: [{ status: 'included', outputValues: { code: 'A1' } }],
  };
}
