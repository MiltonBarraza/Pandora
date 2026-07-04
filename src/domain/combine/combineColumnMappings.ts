import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
  ColumnAssignmentMode,
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
  assignmentMode: ColumnAssignmentMode = 'name',
): CombineColumnMapping[] {
  return sources.flatMap((source) => {
    const sourceColumnsByPosition = [...source.columns].sort((left, right) => left.index - right.index);
    const sourceColumnsByName = new Map<string, string>();

    source.columns.forEach((column) => {
      const normalizedName = normalizeCombineColumnName(column.name);
      if (normalizedName && !sourceColumnsByName.has(normalizedName)) {
        sourceColumnsByName.set(normalizedName, column.id);
      }
    });

    return outputColumns.map((outputColumn, outputIndex) => {
      const normalizedName = normalizeCombineColumnName(outputColumn.name);
      return {
        sourceId: source.id,
        outputColumnId: outputColumn.id,
        sourceColumnId: assignmentMode === 'position'
          ? sourceColumnsByPosition[outputIndex]?.id ?? null
          : normalizedName ? sourceColumnsByName.get(normalizedName) ?? null : null,
      };
    });
  });
}

export function reapplyCombineMappings(
  sources: CombineSource[],
  outputColumns: CombineOutputColumn[],
  assignmentMode: ColumnAssignmentMode = 'name',
) {
  return buildInitialCombineMappings(sources, outputColumns, assignmentMode);
}

export function buildSuggestedCombineOutputColumns(
  sources: CombineSource[],
  assignmentMode: ColumnAssignmentMode,
  previousOutputColumns: CombineOutputColumn[] = [],
  createId: () => string = () => crypto.randomUUID(),
) {
  if (assignmentMode === 'name') {
    if (previousOutputColumns.length > 0) {
      return previousOutputColumns.map((column) => ({ ...column }));
    }
    const firstSourceColumns = [...(sources[0]?.columns ?? [])]
      .sort((left, right) => left.index - right.index);
    return firstSourceColumns.map((column) => ({ id: createId(), name: column.name }));
  }

  const sourceColumnsByPosition = sources.map((source) => (
    [...source.columns].sort((left, right) => left.index - right.index)
  ));
  const columnCount = Math.max(0, ...sourceColumnsByPosition.map((columns) => columns.length));
  return Array.from({ length: columnCount }, (_, index) => ({
    id: previousOutputColumns[index]?.id ?? createId(),
    name: sourceColumnsByPosition.find((columns) => columns[index])?.[index]?.name
      ?? previousOutputColumns[index]?.name
      ?? `Columna ${index + 1}`,
  }));
}
