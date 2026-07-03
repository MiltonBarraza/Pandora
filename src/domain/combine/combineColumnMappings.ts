import type {
  CombineColumnAssignmentMode,
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
  columnAssignmentMode: CombineColumnAssignmentMode = 'byName',
): CombineColumnMapping[] {
  if (columnAssignmentMode === 'byPosition') {
    return buildInitialCombineMappingsByPosition(sources, outputColumns);
  }

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

export function buildCombineOutputColumns(
  sources: CombineSource[],
  columnAssignmentMode: CombineColumnAssignmentMode,
): CombineOutputColumn[] {
  if (columnAssignmentMode === 'byPosition') {
    return buildCombineOutputColumnsByPosition(sources);
  }

  return buildCombineOutputColumnsByName(sources);
}

export function reapplyCombineMappings(
  sources: CombineSource[],
  outputColumns: CombineOutputColumn[],
  columnAssignmentMode: CombineColumnAssignmentMode = 'byName',
) {
  return buildInitialCombineMappings(sources, outputColumns, columnAssignmentMode);
}

function buildInitialCombineMappingsByPosition(
  sources: CombineSource[],
  outputColumns: CombineOutputColumn[],
): CombineColumnMapping[] {
  return sources.flatMap((source) => {
    const sourceColumnsByIndex = new Map(source.columns.map((column) => [column.index, column.id]));

    return outputColumns.map((outputColumn, outputIndex) => {
      const sourceColumnIndex = getOutputColumnPosition(outputColumn, outputIndex);

      return {
        sourceId: source.id,
        outputColumnId: outputColumn.id,
        sourceColumnId: sourceColumnsByIndex.get(sourceColumnIndex) ?? null,
      };
    });
  });
}

function buildCombineOutputColumnsByName(sources: CombineSource[]): CombineOutputColumn[] {
  const columnsByName = new Map<string, CombineOutputColumn>();

  sources.forEach((source) => {
    source.columns.forEach((column) => {
      const normalizedName = normalizeCombineColumnName(column.name);
      if (!normalizedName || columnsByName.has(normalizedName)) {
        return;
      }

      columnsByName.set(normalizedName, {
        id: `combine-output:name:${normalizedName}`,
        name: column.name.trim() || `Columna ${columnsByName.size + 1}`,
      });
    });
  });

  return [...columnsByName.values()];
}

function buildCombineOutputColumnsByPosition(sources: CombineSource[]): CombineOutputColumn[] {
  const columnCount = Math.max(0, ...sources.map((source) => source.columns.length));

  return Array.from({ length: columnCount }, (_, index) => {
    const sourceColumn = sources
      .flatMap((source) => source.columns)
      .find((column) => column.index === index);

    return {
      id: `combine-output:position:${index}`,
      name: sourceColumn?.name.trim() || `Columna ${index + 1}`,
    };
  });
}

function getOutputColumnPosition(outputColumn: CombineOutputColumn, outputIndex: number) {
  const positionMatch = /^combine-output:position:(\d+)$/.exec(outputColumn.id);
  return positionMatch ? Number(positionMatch[1]) : outputIndex;
}
