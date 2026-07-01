import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
  CombineSourceColumn,
} from '../../types/combine';
import { buildInitialCombineMappings, normalizeCombineColumnName } from './combineColumnMappings';

export type CombineSettingsSnapshot = {
  schemaVersion: 1;
  app: 'excel-sanitizer';
  feature: 'combine-files';
  outputFileName: string;
  outputColumns: CombineSettingsOutputColumn[];
  sourceMappings: CombineSettingsSourceMapping[];
};

export type CombineSettingsOutputColumn = {
  id: string;
  name: string;
  index: number;
};

export type CombineSettingsSourceMapping = {
  sourceIndex: number;
  fileName: string;
  sheetName?: string;
  mappings: CombineSettingsColumnMapping[];
};

export type CombineSettingsColumnMapping = {
  outputColumnId: string;
  outputColumnName: string;
  sourceColumnId: string | null;
  sourceColumnName: string | null;
  sourceColumnIndex: number | null;
};

type CreateCombineSettingsSnapshotInput = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
  outputFileName: string;
};

type ApplyCombineSettingsSnapshotInput = {
  snapshot: CombineSettingsSnapshot;
  sources: CombineSource[];
};

export type AppliedCombineSettings = {
  outputFileName: string;
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
};

export function createCombineSettingsSnapshot({
  sources,
  outputColumns,
  mappings,
  outputFileName,
}: CreateCombineSettingsSnapshotInput): CombineSettingsSnapshot {
  const mappingsByPair = new Map(
    mappings.map((mapping) => [mappingKey(mapping.sourceId, mapping.outputColumnId), mapping]),
  );

  return {
    schemaVersion: 1,
    app: 'excel-sanitizer',
    feature: 'combine-files',
    outputFileName,
    outputColumns: outputColumns.map((column, index) => ({
      id: column.id,
      name: column.name,
      index,
    })),
    sourceMappings: sources.map((source, sourceIndex) => ({
      sourceIndex,
      fileName: source.fileName,
      sheetName: source.sheetName,
      mappings: outputColumns.map((outputColumn) => {
        const mapping = mappingsByPair.get(mappingKey(source.id, outputColumn.id));
        const sourceColumn = mapping?.sourceColumnId
          ? source.columns.find((column) => column.id === mapping.sourceColumnId)
          : undefined;

        return {
          outputColumnId: outputColumn.id,
          outputColumnName: outputColumn.name,
          sourceColumnId: sourceColumn?.id ?? null,
          sourceColumnName: sourceColumn?.name ?? null,
          sourceColumnIndex: sourceColumn?.index ?? null,
        };
      }),
    })),
  };
}

export function applyCombineSettingsSnapshot({
  snapshot,
  sources,
}: ApplyCombineSettingsSnapshotInput): AppliedCombineSettings {
  const outputColumns = [...snapshot.outputColumns]
    .sort((left, right) => left.index - right.index)
    .map(({ id, name }) => ({ id, name }));
  const savedSources = matchSavedSources(snapshot.sourceMappings, sources);
  const initialMappings = buildInitialCombineMappings(sources, outputColumns);
  const initialByPair = new Map(
    initialMappings.map((mapping) => [mappingKey(mapping.sourceId, mapping.outputColumnId), mapping]),
  );

  const mappings = sources.flatMap((source, sourceIndex) => {
    const savedSource = savedSources[sourceIndex];
    const savedByOutputId = new Map(
      savedSource?.mappings.map((mapping) => [mapping.outputColumnId, mapping]) ?? [],
    );

    return outputColumns.map((outputColumn) => {
      const savedMapping = savedByOutputId.get(outputColumn.id);
      if (!savedMapping) {
        return initialByPair.get(mappingKey(source.id, outputColumn.id)) ?? {
          sourceId: source.id,
          outputColumnId: outputColumn.id,
          sourceColumnId: null,
        };
      }

      const sourceColumn = savedMapping.sourceColumnId === null
        ? undefined
        : resolveSavedSourceColumn(source.columns, savedMapping);
      return {
        sourceId: source.id,
        outputColumnId: outputColumn.id,
        sourceColumnId: sourceColumn?.id ?? null,
      };
    });
  });

  return {
    outputFileName: snapshot.outputFileName,
    outputColumns,
    mappings,
  };
}

function matchSavedSources(
  savedSources: CombineSettingsSourceMapping[],
  currentSources: CombineSource[],
) {
  const usedSavedIndexes = new Set<number>();

  return currentSources.map((source, currentIndex) => {
    const savedAtSameIndex = savedSources[currentIndex];
    if (
      savedAtSameIndex
      && sourceMetadataMatches(savedAtSameIndex, source)
      && !usedSavedIndexes.has(currentIndex)
    ) {
      usedSavedIndexes.add(currentIndex);
      return savedAtSameIndex;
    }

    const savedIndex = savedSources.findIndex((savedSource, index) => (
      !usedSavedIndexes.has(index) && sourceMetadataMatches(savedSource, source)
    ));
    if (savedIndex === -1) {
      return undefined;
    }

    usedSavedIndexes.add(savedIndex);
    return savedSources[savedIndex];
  });
}

function sourceMetadataMatches(savedSource: CombineSettingsSourceMapping, currentSource: CombineSource) {
  return savedSource.fileName === currentSource.fileName
    && (savedSource.sheetName ?? '') === (currentSource.sheetName ?? '');
}

function resolveSavedSourceColumn(
  sourceColumns: CombineSourceColumn[],
  savedMapping: CombineSettingsColumnMapping,
) {
  if (savedMapping.sourceColumnName === null) {
    return undefined;
  }

  const normalizedSavedName = normalizeCombineColumnName(savedMapping.sourceColumnName);
  const sameIndex = savedMapping.sourceColumnIndex === null
    ? undefined
    : sourceColumns.find((column) => column.index === savedMapping.sourceColumnIndex);
  if (sameIndex && normalizeCombineColumnName(sameIndex.name) === normalizedSavedName) {
    return sameIndex;
  }

  return sourceColumns.find((column) => (
    normalizeCombineColumnName(column.name) === normalizedSavedName
  ));
}

function mappingKey(sourceId: string, outputColumnId: string) {
  return `${sourceId}\u0000${outputColumnId}`;
}
