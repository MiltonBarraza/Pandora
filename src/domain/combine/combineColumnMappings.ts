import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
} from '../../types/combine';

export function normalizeCombineColumnName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function buildInitialCombineMappings(
  sources: CombineSource[],
  outputColumns: CombineOutputColumn[],
): CombineColumnMapping[] {
  return sources.flatMap((source) => {
    const sourceColumnsByName = new Map<string, string>();

    source.columns.forEach((column) => {
      const normalizedName = normalizeCombineColumnName(column.name);
      if (normalizedName && !sourceColumnsByName.has(normalizedName)) {
        sourceColumnsByName.set(normalizedName, column.id);
      }
    });

    return outputColumns.map((outputColumn) => {
      const normalizedName = normalizeCombineColumnName(outputColumn.name);
      return {
        sourceId: source.id,
        outputColumnId: outputColumn.id,
        sourceColumnId: normalizedName ? sourceColumnsByName.get(normalizedName) ?? null : null,
      };
    });
  });
}

export function reapplyCombineMappings(
  sources: CombineSource[],
  outputColumns: CombineOutputColumn[],
) {
  return buildInitialCombineMappings(sources, outputColumns);
}
