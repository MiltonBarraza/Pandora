import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSourceColumn,
  ColumnAssignmentMode,
} from '../../types/combine';
import { normalizeCombineColumnName } from './combineColumnMappings';

type ReconcileMappingsAfterCombineSheetChangeInput = {
  sourceId: string;
  outputColumns: CombineOutputColumn[];
  previousMappings: CombineColumnMapping[];
  previousSourceColumns: CombineSourceColumn[];
  nextSourceColumns: CombineSourceColumn[];
  assignmentMode?: ColumnAssignmentMode;
};

export function reconcileMappingsAfterCombineSheetChange({
  sourceId,
  outputColumns,
  previousMappings,
  previousSourceColumns,
  nextSourceColumns,
  assignmentMode = 'name',
}: ReconcileMappingsAfterCombineSheetChangeInput): CombineColumnMapping[] {
  const previousColumnsById = new Map(
    previousSourceColumns.map((column) => [column.id, column]),
  );
  const outputColumnsById = new Map(outputColumns.map((column) => [column.id, column]));
  const nextColumnsByName = new Map<string, CombineSourceColumn>();
  const nextColumnsByPosition = [...nextSourceColumns].sort((left, right) => left.index - right.index);
  const outputColumnIndexes = new Map(outputColumns.map((column, index) => [column.id, index]));

  nextSourceColumns.forEach((column) => {
    const name = normalizeCombineColumnName(column.name);
    if (name && !nextColumnsByName.has(name)) {
      nextColumnsByName.set(name, column);
    }
  });

  return previousMappings.map((mapping) => {
    if (mapping.sourceId !== sourceId) {
      return mapping;
    }

    const previousColumn = mapping.sourceColumnId
      ? previousColumnsById.get(mapping.sourceColumnId)
      : undefined;
    const matchingPreviousColumn = previousColumn
      ? nextColumnsByName.get(normalizeCombineColumnName(previousColumn.name))
      : undefined;
    const outputColumn = outputColumnsById.get(mapping.outputColumnId);
    const matchingOutputColumn = outputColumn
      ? nextColumnsByName.get(normalizeCombineColumnName(outputColumn.name))
      : undefined;
    const previousPosition = previousColumn
      ? [...previousSourceColumns].sort((left, right) => left.index - right.index).findIndex((column) => column.id === previousColumn.id)
      : -1;
    const fallbackPosition = outputColumnIndexes.get(mapping.outputColumnId) ?? -1;
    const matchingPositionColumn = nextColumnsByPosition[previousPosition >= 0 ? previousPosition : fallbackPosition];

    return {
      ...mapping,
      sourceColumnId: assignmentMode === 'position'
        ? matchingPositionColumn?.id ?? null
        : matchingPreviousColumn?.id ?? matchingOutputColumn?.id ?? null,
    };
  });
}
