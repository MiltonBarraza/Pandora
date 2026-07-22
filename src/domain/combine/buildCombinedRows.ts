import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
  CombinedRow,
} from '../../types/combine';

type BuildCombinedRowsInput = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
};

export function buildCombinedRows({
  sources,
  outputColumns,
  mappings,
}: BuildCombinedRowsInput): CombinedRow[] {
  const mappingsBySource = groupMappingsBySource(mappings);

  return sources.flatMap((source) => {
    const sourceMappings = mappingsBySource.get(source.id);
    const sourceColumnIds = new Set(source.columns.map((column) => column.id));

    return source.rows.map((row) => ({
      id: `${source.id}:${row.id}`,
      sourceId: source.id,
      sourceFileName: source.fileName,
      sourceSheetName: source.sheetName,
      values: Object.fromEntries(
        outputColumns.map((outputColumn) => {
          const sourceColumnId = sourceMappings?.get(outputColumn.id) ?? null;
          const value = sourceColumnId && sourceColumnIds.has(sourceColumnId)
            ? row.values[sourceColumnId] ?? ''
            : '';
          return [outputColumn.id, value];
        }),
      ),
    }));
  });
}

function groupMappingsBySource(mappings: CombineColumnMapping[]) {
  const grouped = new Map<string, Map<string, string | null>>();

  mappings.forEach((mapping) => {
    const sourceMappings = grouped.get(mapping.sourceId) ?? new Map<string, string | null>();
    sourceMappings.set(mapping.outputColumnId, mapping.sourceColumnId);
    grouped.set(mapping.sourceId, sourceMappings);
  });

  return grouped;
}
