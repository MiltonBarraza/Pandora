import { describe, expect, it } from 'vitest';
import type { CombineOutputColumn, CombineSource } from '../../../types/combine';
import {
  buildInitialCombineMappings,
  buildSuggestedCombineOutputColumns,
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

  it('matches columns by position even when names differ and leaves missing positions empty', () => {
    const positionalMappings = buildInitialCombineMappings(sources, outputColumns.slice(0, 3), 'position');

    expect(findMapping(positionalMappings, 'source:0', 'output-code')?.sourceColumnId).toBe('col:0');
    expect(findMapping(positionalMappings, 'source:1', 'output-code')?.sourceColumnId).toBe('col:0');
    expect(findMapping(positionalMappings, 'source:1', 'output-description')?.sourceColumnId).toBe('col:1');
    expect(findMapping(positionalMappings, 'source:1', 'output-product')?.sourceColumnId).toBeNull();
  });
});

describe('buildSuggestedCombineOutputColumns', () => {
  it('uses first available names by position and includes extra columns from later sources', () => {
    const sources = [
      source('short', [{ id: 'short:0', name: 'Cod', index: 0 }]),
      source('long', [
        { id: 'long:0', name: 'Código', index: 0 },
        { id: 'long:1', name: 'Descripción', index: 1 },
        { id: 'long:2', name: 'Precio', index: 2 },
      ]),
    ];
    let nextId = 0;

    expect(buildSuggestedCombineOutputColumns(
      sources,
      'position',
      [],
      () => `output:${nextId++}`,
    )).toEqual([
      { id: 'output:0', name: 'Cod' },
      { id: 'output:1', name: 'Descripción' },
      { id: 'output:2', name: 'Precio' },
    ]);
  });

  it('uses reordered first source as positional name reference while preserving ids', () => {
    const previous = [
      { id: 'output:0', name: 'Código' },
      { id: 'output:1', name: 'Descripción' },
    ];
    const reorderedSources = [source('other', [
      { id: 'other:0', name: 'Cod', index: 0 },
      { id: 'other:1', name: 'Producto', index: 1 },
    ])];

    expect(buildSuggestedCombineOutputColumns(reorderedSources, 'position', previous)).toEqual([
      { id: 'output:0', name: 'Cod' },
      { id: 'output:1', name: 'Producto' },
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
