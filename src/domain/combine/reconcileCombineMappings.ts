import type {
  CombineColumnAssignmentMode,
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
} from '../../types/combine';
import { buildInitialCombineMappings } from './combineColumnMappings';

type ReconcileCombineMappingsInput = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  previousMappings: CombineColumnMapping[];
  columnAssignmentMode?: CombineColumnAssignmentMode;
};

export function reconcileCombineMappings({
  sources,
  outputColumns,
  previousMappings,
  columnAssignmentMode = 'byName',
}: ReconcileCombineMappingsInput): CombineColumnMapping[] {
  const previousByPair = new Map<string, CombineColumnMapping>();
  previousMappings.forEach((mapping) => {
    const key = mappingKey(mapping.sourceId, mapping.outputColumnId);
    if (!previousByPair.has(key)) {
      previousByPair.set(key, mapping);
    }
  });

  const initialByPair = new Map(
    buildInitialCombineMappings(sources, outputColumns, columnAssignmentMode).map((mapping) => [
      mappingKey(mapping.sourceId, mapping.outputColumnId),
      mapping,
    ]),
  );

  return sources.flatMap((source) => {
    const sourceColumnIds = new Set(source.columns.map((column) => column.id));

    return outputColumns.map((outputColumn) => {
      const key = mappingKey(source.id, outputColumn.id);
      const previous = previousByPair.get(key);

      if (!previous) {
        return initialByPair.get(key) ?? {
          sourceId: source.id,
          outputColumnId: outputColumn.id,
          sourceColumnId: null,
        };
      }

      return {
        sourceId: source.id,
        outputColumnId: outputColumn.id,
        sourceColumnId: previous.sourceColumnId && sourceColumnIds.has(previous.sourceColumnId)
          ? previous.sourceColumnId
          : null,
      };
    });
  });
}

function mappingKey(sourceId: string, outputColumnId: string) {
  return `${sourceId}\u0000${outputColumnId}`;
}
