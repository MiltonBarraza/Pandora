import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSourceColumn,
} from '../../types/combine';
import { normalizeCombineColumnName } from './combineColumnMappings';

type ReconcileMappingsAfterCombineSheetChangeInput = {
  sourceId: string;
  outputColumns: CombineOutputColumn[];
  previousMappings: CombineColumnMapping[];
  previousSourceColumns: CombineSourceColumn[];
  nextSourceColumns: CombineSourceColumn[];
};

export function reconcileMappingsAfterCombineSheetChange({
  sourceId,
  outputColumns,
  previousMappings,
  previousSourceColumns,
  nextSourceColumns,
}: ReconcileMappingsAfterCombineSheetChangeInput): CombineColumnMapping[] {
  const previousColumnsById = new Map(
    previousSourceColumns.map((column) => [column.id, column]),
  );
  const outputColumnsById = new Map(outputColumns.map((column) => [column.id, column]));
  const nextColumnsByName = new Map<string, CombineSourceColumn>();

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

    return {
      ...mapping,
      sourceColumnId: matchingPreviousColumn?.id ?? matchingOutputColumn?.id ?? null,
    };
  });
}
