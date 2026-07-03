import { describe, expect, it } from 'vitest';
import type { CombineOutputColumn, CombineSource } from '../../../types/combine';
import {
  buildCombineOutputColumns,
  buildInitialCombineMappings,
  normalizeCombineColumnName,
  reapplyCombineMappings,
} from '../combineColumnMappings';

describe('normalizeCombineColumnName', () => {
  it('ignores uppercase and lowercase differences', () => {
    expect(normalizeCombineColumnName('CÓDIGO')).toBe(normalizeCombineColumnName('código'));
  });

  it('removes accents and diacritics', () => {
    expect(normalizeCombineColumnName('Código Descripción')).toBe('codigo descripcion');
  });

  it('trims and collapses whitespace', () => {
    expect(normalizeCombineColumnName('  Nombre   del\t producto  ')).toBe('nombre del producto');
  });
});

describe('buildInitialCombineMappings', () => {
  const sources: CombineSource[] = [
    source('source:0', [
      { id: 'col:0', name: 'Código', index: 0 },
      { id: 'col:1', name: ' Descripción ', index: 1 },
      { id: 'col:2', name: 'Nombre', index: 2 },
    ]),
    source('source:1', [
      { id: 'col:0', name: 'CODIGO', index: 0 },
      { id: 'col:1', name: 'Precio', index: 1 },
    ]),
  ];
  const outputColumns: CombineOutputColumn[] = [
    { id: 'output-code', name: ' codigo ' },
    { id: 'output-description', name: 'DESCRIPCION' },
    { id: 'output-product', name: 'Producto' },
    { id: 'output-short-code', name: 'Cod.' },
  ];

  it('matches columns with the same normalized name', () => {
    const mappings = buildInitialCombineMappings(sources, outputColumns);

    expect(findMapping(mappings, 'source:0', 'output-code')?.sourceColumnId).toBe('col:0');
    expect(findMapping(mappings, 'source:0', 'output-description')?.sourceColumnId).toBe('col:1');
    expect(findMapping(mappings, 'source:1', 'output-code')?.sourceColumnId).toBe('col:0');
  });

  it('uses null when no exact normalized match exists', () => {
    const mappings = buildInitialCombineMappings(sources, outputColumns);

    expect(findMapping(mappings, 'source:0', 'output-product')?.sourceColumnId).toBeNull();
    expect(findMapping(mappings, 'source:1', 'output-description')?.sourceColumnId).toBeNull();
  });

  it('does not use aliases or fuzzy abbreviations', () => {
    const mappings = buildInitialCombineMappings(sources, outputColumns);

    expect(findMapping(mappings, 'source:0', 'output-short-code')?.sourceColumnId).toBeNull();
    expect(findMapping(mappings, 'source:0', 'output-product')?.sourceColumnId).toBeNull();
  });

  it('creates one mapping for every source and output column pair', () => {
    const mappings = buildInitialCombineMappings(sources, outputColumns);

    expect(mappings).toHaveLength(sources.length * outputColumns.length);
    expect(mappings.map(({ sourceId, outputColumnId }) => `${sourceId}:${outputColumnId}`)).toEqual([
      'source:0:output-code',
      'source:0:output-description',
      'source:0:output-product',
      'source:0:output-short-code',
      'source:1:output-code',
      'source:1:output-description',
      'source:1:output-product',
      'source:1:output-short-code',
    ]);
  });

  it('matches columns by visible position when requested', () => {
    const mappings = buildInitialCombineMappings(sources, outputColumns.slice(0, 3), 'byPosition');

    expect(findMapping(mappings, 'source:0', 'output-code')?.sourceColumnId).toBe('col:0');
    expect(findMapping(mappings, 'source:0', 'output-description')?.sourceColumnId).toBe('col:1');
    expect(findMapping(mappings, 'source:0', 'output-product')?.sourceColumnId).toBe('col:2');
    expect(findMapping(mappings, 'source:1', 'output-code')?.sourceColumnId).toBe('col:0');
    expect(findMapping(mappings, 'source:1', 'output-description')?.sourceColumnId).toBe('col:1');
    expect(findMapping(mappings, 'source:1', 'output-product')?.sourceColumnId).toBeNull();
  });
});

describe('buildCombineOutputColumns', () => {
  it('creates unique output columns by normalized name in source order', () => {
    const sources = [
      source('source:0', [
        { id: 'col:0', name: 'Código', index: 0 },
        { id: 'col:1', name: ' Descripción ', index: 1 },
        { id: 'col:2', name: 'Nombre', index: 2 },
      ]),
      source('source:1', [
        { id: 'col:0', name: 'CODIGO', index: 0 },
        { id: 'col:1', name: 'Precio', index: 1 },
      ]),
    ];

    expect(buildCombineOutputColumns(sources, 'byName')).toEqual([
      { id: 'combine-output:name:codigo', name: 'Código' },
      { id: 'combine-output:name:descripcion', name: 'Descripción' },
      { id: 'combine-output:name:nombre', name: 'Nombre' },
      { id: 'combine-output:name:precio', name: 'Precio' },
    ]);
  });

  it('creates output columns by max source width and names them from the first source with each position', () => {
    const shortFirst = [
      source('source:short', [{ id: 'short:first', name: 'Primera', index: 0 }]),
      source('source:wide', [
        { id: 'wide:first', name: 'ID', index: 0 },
        { id: 'wide:second', name: 'Producto', index: 1 },
        { id: 'wide:third', name: 'Importe', index: 2 },
      ]),
    ];

    expect(buildCombineOutputColumns(shortFirst, 'byPosition')).toEqual([
      { id: 'combine-output:position:0', name: 'Primera' },
      { id: 'combine-output:position:1', name: 'Producto' },
      { id: 'combine-output:position:2', name: 'Importe' },
    ]);
  });
});

describe('reapplyCombineMappings', () => {
  it('recalculates mappings using exact normalized names', () => {
    const sources = [source('source:0', [{ id: 'code', name: ' CÓDIGO ', index: 0 }])];
    const outputColumns = [{ id: 'output-code', name: 'codigo' }];

    expect(reapplyCombineMappings(sources, outputColumns)).toEqual([{
      sourceId: 'source:0',
      outputColumnId: 'output-code',
      sourceColumnId: 'code',
    }]);
  });

  it('recalculates mappings by position when requested', () => {
    const sources = [source('source:0', [
      { id: 'id', name: 'ID', index: 0 },
      { id: 'product', name: 'Producto', index: 1 },
    ])];
    const outputColumns = [
      { id: 'output-code', name: 'Código' },
      { id: 'output-description', name: 'Descripción' },
    ];

    expect(reapplyCombineMappings(sources, outputColumns, 'byPosition')).toEqual([
      { sourceId: 'source:0', outputColumnId: 'output-code', sourceColumnId: 'id' },
      { sourceId: 'source:0', outputColumnId: 'output-description', sourceColumnId: 'product' },
    ]);
  });

  it('keeps generated position column ids tied to their source indexes after output reordering', () => {
    const sources = [source('source:0', [
      { id: 'id', name: 'ID', index: 0 },
      { id: 'product', name: 'Producto', index: 1 },
    ])];
    const reorderedOutputColumns = [
      { id: 'combine-output:position:1', name: 'Producto' },
      { id: 'combine-output:position:0', name: 'ID' },
    ];

    expect(reapplyCombineMappings(sources, reorderedOutputColumns, 'byPosition')).toEqual([
      { sourceId: 'source:0', outputColumnId: 'combine-output:position:1', sourceColumnId: 'product' },
      { sourceId: 'source:0', outputColumnId: 'combine-output:position:0', sourceColumnId: 'id' },
    ]);
  });

  it('does not match abbreviations or aliases', () => {
    const sources = [source('source:0', [{ id: 'code', name: 'Código', index: 0 }])];
    const outputColumns = [{ id: 'output-short-code', name: 'Cod.' }];

    expect(reapplyCombineMappings(sources, outputColumns)[0].sourceColumnId).toBeNull();
  });
});

function source(id: string, columns: CombineSource['columns']): CombineSource {
  return { id, fileName: `${id}.xlsx`, columns, rows: [] };
}

function findMapping(
  mappings: ReturnType<typeof buildInitialCombineMappings>,
  sourceId: string,
  outputColumnId: string,
) {
  return mappings.find((mapping) => (
    mapping.sourceId === sourceId && mapping.outputColumnId === outputColumnId
  ));
}
