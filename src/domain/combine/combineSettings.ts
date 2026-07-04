import type {
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
  CombineSourceColumn,
  ColumnAssignmentMode,
  ResultSort,
} from '../../types/combine';
import { buildInitialCombineMappings, normalizeCombineColumnName } from './combineColumnMappings';

export type CombineSettingsSnapshot = {
  schemaVersion: 1;
  app: 'excel-sanitizer';
  feature: 'combine-files';
  outputFileName: string;
  columnAssignmentMode?: ColumnAssignmentMode;
  resultSort?: ResultSort;
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
  columnAssignmentMode?: ColumnAssignmentMode;
  resultSort?: ResultSort;
};

type ApplyCombineSettingsSnapshotInput = {
  snapshot: CombineSettingsSnapshot;
  sources: CombineSource[];
};

export type AppliedCombineSettings = {
  outputFileName: string;
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
  columnAssignmentMode: ColumnAssignmentMode;
  resultSort: ResultSort;
  warnings: string[];
};

export type ParseCombineSettingsSnapshotResult =
  | { ok: true; snapshot: CombineSettingsSnapshot }
  | { ok: false; error: string };

export function createCombineSettingsSnapshot({
  sources,
  outputColumns,
  mappings,
  outputFileName,
  columnAssignmentMode = 'name',
  resultSort = { columnId: null, direction: 'asc' },
}: CreateCombineSettingsSnapshotInput): CombineSettingsSnapshot {
  const mappingsByPair = new Map(
    mappings.map((mapping) => [mappingKey(mapping.sourceId, mapping.outputColumnId), mapping]),
  );

  return {
    schemaVersion: 1,
    app: 'excel-sanitizer',
    feature: 'combine-files',
    outputFileName,
    columnAssignmentMode,
    resultSort,
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
  const warnings: string[] = [];
  const columnAssignmentMode = snapshot.columnAssignmentMode ?? 'name';
  const outputColumns = [...snapshot.outputColumns]
    .sort((left, right) => left.index - right.index)
    .map(({ id, name }) => ({ id, name }));
  const resultSort = snapshot.resultSort?.columnId
    && outputColumns.some((column) => column.id === snapshot.resultSort?.columnId)
    ? snapshot.resultSort
    : { columnId: null, direction: snapshot.resultSort?.direction ?? 'asc' } satisfies ResultSort;
  const savedSources = matchSavedSources(snapshot.sourceMappings, sources);
  if (sources.length === 0 && snapshot.sourceMappings.length > 0) {
    warnings.push('Para restaurar mapeos, cargá los archivos correspondientes y volvé a importar la configuración.');
  } else {
    savedSources.forEach((savedSource, index) => {
      if (!savedSource) {
        warnings.push(`No se encontró configuración para ${sources[index].fileName}; se aplicó automapeo.`);
      }
    });
    const matchedSavedSources = new Set(savedSources.filter(Boolean));
    snapshot.sourceMappings.forEach((savedSource) => {
      if (!matchedSavedSources.has(savedSource)) {
        warnings.push(`No está cargada la fuente ${savedSource.fileName}; sus mapeos no se aplicaron.`);
      }
    });
  }
  const initialMappings = buildInitialCombineMappings(sources, outputColumns, columnAssignmentMode);
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
      if (savedMapping.sourceColumnId !== null && !sourceColumn) {
        warnings.push(
          `No se encontró la columna ${savedMapping.sourceColumnName ?? savedMapping.sourceColumnId} en ${source.fileName}.`,
        );
      }
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
    columnAssignmentMode,
    resultSort,
    warnings: [...new Set(warnings)],
  };
}

export function parseCombineSettingsSnapshotJson(text: string): ParseCombineSettingsSnapshotResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no contiene un JSON válido.' };
  }

  if (!isRecord(value)) {
    return { ok: false, error: 'La configuración debe ser un objeto JSON.' };
  }
  if (value.schemaVersion !== 1) {
    return { ok: false, error: 'Versión de configuración no compatible.' };
  }
  if (value.app !== 'excel-sanitizer') {
    return { ok: false, error: 'La configuración no pertenece a Excel Sanitizer.' };
  }
  if (value.feature !== 'combine-files') {
    return { ok: false, error: 'La configuración no corresponde a Combinar archivos.' };
  }
  if (!Array.isArray(value.outputColumns) || !value.outputColumns.every(isSettingsOutputColumn)) {
    return { ok: false, error: 'Las columnas de salida de la configuración no son válidas.' };
  }
  if (!Array.isArray(value.sourceMappings) || !value.sourceMappings.every(isSettingsSourceMapping)) {
    return { ok: false, error: 'Los mapeos de fuentes de la configuración no son válidos.' };
  }
  if (value.columnAssignmentMode !== undefined && !isColumnAssignmentMode(value.columnAssignmentMode)) {
    return { ok: false, error: 'El modo de asignación de columnas no es válido.' };
  }
  if (value.resultSort !== undefined && !isResultSort(value.resultSort)) {
    return { ok: false, error: 'El orden del resultado no es válido.' };
  }

  return {
    ok: true,
    snapshot: {
      schemaVersion: 1,
      app: 'excel-sanitizer',
      feature: 'combine-files',
      outputFileName: typeof value.outputFileName === 'string' ? value.outputFileName : 'Archivo combinado',
      columnAssignmentMode: isColumnAssignmentMode(value.columnAssignmentMode)
        ? value.columnAssignmentMode
        : 'name',
      resultSort: isResultSort(value.resultSort)
        ? value.resultSort
        : { columnId: null, direction: 'asc' },
      outputColumns: value.outputColumns,
      sourceMappings: value.sourceMappings,
    },
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isColumnAssignmentMode(value: unknown): value is ColumnAssignmentMode {
  return value === 'name' || value === 'position';
}

function isResultSort(value: unknown): value is ResultSort {
  return isRecord(value)
    && (value.columnId === null || typeof value.columnId === 'string')
    && (value.direction === 'asc' || value.direction === 'desc');
}

function isSettingsOutputColumn(value: unknown): value is CombineSettingsOutputColumn {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && Number.isInteger(value.index)
    && Number(value.index) >= 0;
}

function isSettingsSourceMapping(value: unknown): value is CombineSettingsSourceMapping {
  return isRecord(value)
    && Number.isInteger(value.sourceIndex)
    && Number(value.sourceIndex) >= 0
    && typeof value.fileName === 'string'
    && (value.sheetName === undefined || typeof value.sheetName === 'string')
    && Array.isArray(value.mappings)
    && value.mappings.every(isSettingsColumnMapping);
}

function isSettingsColumnMapping(value: unknown): value is CombineSettingsColumnMapping {
  return isRecord(value)
    && typeof value.outputColumnId === 'string'
    && typeof value.outputColumnName === 'string'
    && (value.sourceColumnId === null || typeof value.sourceColumnId === 'string')
    && (value.sourceColumnName === null || typeof value.sourceColumnName === 'string')
    && (value.sourceColumnIndex === null || (Number.isInteger(value.sourceColumnIndex) && Number(value.sourceColumnIndex) >= 0));
}
