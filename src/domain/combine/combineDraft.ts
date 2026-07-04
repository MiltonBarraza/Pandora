import type {
  ColumnAssignmentMode,
  CombineColumnMapping,
  CombineOutputColumn,
  CombineSource,
  ResultSort,
  SourceMetadataOptions,
} from '../../types/combine';
import { buildSourceMetadataColumns, isSourceMetadataColumn } from './sourceMetadata';

export const combineDraftStorageKey = 'pandora.combineDraft.v1';

export type CombineDraft = {
  schemaVersion: 1;
  columnAssignmentMode: ColumnAssignmentMode;
  outputColumns: CombineOutputColumn[];
  mappings: CombineColumnMapping[];
  sourceMetadataOptions: SourceMetadataOptions;
  resultSort: ResultSort;
  outputFileName: string;
  sourceOrder: string[];
  sourceIds: string[];
  sourceSheets: Array<{ sourceId: string; sheetName: string }>;
};

export type RestoredCombineDraft = Omit<CombineDraft, 'schemaVersion' | 'sourceIds' | 'sourceSheets'> & {
  hasDraft: boolean;
  hasDiscardedSourceState: boolean;
};

const emptyDraftState: RestoredCombineDraft = {
  hasDraft: false,
  hasDiscardedSourceState: false,
  columnAssignmentMode: 'name',
  outputColumns: [],
  mappings: [],
  sourceMetadataOptions: { includeFileName: false, includeSheetName: false },
  resultSort: { columnId: null, direction: 'asc' },
  outputFileName: 'Archivo combinado',
  sourceOrder: [],
};

export function saveCombineDraft(draft: CombineDraft, storage?: Storage) {
  try {
    (storage ?? window.sessionStorage).setItem(combineDraftStorageKey, JSON.stringify(draft));
  } catch {
    // Storage may be unavailable or full. Draft persistence must stay non-blocking.
  }
}

export function loadCombineDraft(storage?: Storage): CombineDraft | null {
  try {
    const raw = (storage ?? window.sessionStorage).getItem(combineDraftStorageKey);
    return raw ? normalizeCombineDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearCombineDraft(storage?: Storage) {
  try {
    (storage ?? window.sessionStorage).removeItem(combineDraftStorageKey);
  } catch {
    // Clearing a best-effort draft must never break CombineWizard.
  }
}

export function normalizeCombineDraft(value: unknown): CombineDraft | null {
  if (!isRecord(value)
    || value.schemaVersion !== 1
    || !isColumnAssignmentMode(value.columnAssignmentMode)
    || !Array.isArray(value.outputColumns)
    || !value.outputColumns.every(isOutputColumn)
    || !hasUniqueStrings(value.outputColumns.map((column) => column.id))
    || value.outputColumns.some((column) => isSourceMetadataColumn(column.id))
    || !Array.isArray(value.mappings)
    || !value.mappings.every(isMapping)
    || !hasUniqueStrings(value.mappings.map(mappingIdentity))
    || !isSourceMetadataOptions(value.sourceMetadataOptions)
    || !isResultSort(value.resultSort)
    || typeof value.outputFileName !== 'string'
    || !isStringArray(value.sourceOrder)
    || !hasUniqueStrings(value.sourceOrder)
    || !isStringArray(value.sourceIds)
    || !hasUniqueStrings(value.sourceIds)
    || !Array.isArray(value.sourceSheets)
    || !value.sourceSheets.every(isSourceSheet)
    || !hasUniqueStrings(value.sourceSheets.map((selection) => selection.sourceId))) {
    return null;
  }

  return {
    schemaVersion: 1,
    columnAssignmentMode: value.columnAssignmentMode,
    outputColumns: value.outputColumns.map((column) => ({ ...column })),
    mappings: value.mappings.map((mapping) => ({ ...mapping })),
    sourceMetadataOptions: { ...value.sourceMetadataOptions },
    resultSort: { ...value.resultSort },
    outputFileName: value.outputFileName,
    sourceOrder: [...value.sourceOrder],
    sourceIds: [...value.sourceIds],
    sourceSheets: value.sourceSheets.map((selection) => ({ ...selection })),
  };
}

export function restoreCombineDraft(
  draft: CombineDraft | null,
  currentSources: CombineSource[],
): RestoredCombineDraft {
  if (!draft) {
    return { ...emptyDraftState };
  }

  const sourcesById = new Map(currentSources.map((source) => [source.id, source]));
  const sourceColumnIdsBySource = new Map(currentSources.map((source) => [
    source.id,
    new Set(source.columns.map((column) => column.id)),
  ]));
  const outputColumnIds = new Set(draft.outputColumns.map((column) => column.id));
  const mappings = draft.mappings.filter((mapping) => {
    const source = sourcesById.get(mapping.sourceId);
    return Boolean(source
      && outputColumnIds.has(mapping.outputColumnId)
      && (!mapping.sourceColumnId || sourceColumnIdsBySource.get(source.id)?.has(mapping.sourceColumnId)));
  });
  const sourceOrder = draft.sourceOrder.filter((sourceId) => sourcesById.has(sourceId));
  const sortableColumnIds = new Set([
    ...draft.outputColumns,
    ...buildSourceMetadataColumns(draft.sourceMetadataOptions),
  ].map((column) => column.id));
  const resultSort = draft.resultSort.columnId && !sortableColumnIds.has(draft.resultSort.columnId)
    ? { ...draft.resultSort, columnId: null }
    : { ...draft.resultSort };
  const hasMissingSources = draft.sourceIds.some((sourceId) => !sourcesById.has(sourceId));
  const hasChangedSheets = draft.sourceSheets.some(({ sourceId, sheetName }) => (
    sourcesById.has(sourceId) && sourcesById.get(sourceId)?.sheetName !== sheetName
  ));

  return {
    hasDraft: true,
    hasDiscardedSourceState: hasMissingSources
      || hasChangedSheets
      || mappings.length !== draft.mappings.length
      || sourceOrder.length !== draft.sourceOrder.length,
    columnAssignmentMode: draft.columnAssignmentMode,
    outputColumns: draft.outputColumns.map((column) => ({ ...column })),
    mappings,
    sourceMetadataOptions: { ...draft.sourceMetadataOptions },
    resultSort,
    outputFileName: draft.outputFileName,
    sourceOrder,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isColumnAssignmentMode(value: unknown): value is ColumnAssignmentMode {
  return value === 'name' || value === 'position';
}

function isOutputColumn(value: unknown): value is CombineOutputColumn {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

function isMapping(value: unknown): value is CombineColumnMapping {
  return isRecord(value)
    && typeof value.sourceId === 'string'
    && typeof value.outputColumnId === 'string'
    && (value.sourceColumnId === null || typeof value.sourceColumnId === 'string');
}

function isSourceMetadataOptions(value: unknown): value is SourceMetadataOptions {
  return isRecord(value)
    && typeof value.includeFileName === 'boolean'
    && typeof value.includeSheetName === 'boolean';
}

function isResultSort(value: unknown): value is ResultSort {
  return isRecord(value)
    && (value.columnId === null || typeof value.columnId === 'string')
    && (value.direction === 'asc' || value.direction === 'desc');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function hasUniqueStrings(values: string[]) {
  return new Set(values).size === values.length;
}

function mappingIdentity(mapping: CombineColumnMapping) {
  return `${mapping.sourceId}\u0000${mapping.outputColumnId}`;
}

function isSourceSheet(value: unknown): value is { sourceId: string; sheetName: string } {
  return isRecord(value)
    && typeof value.sourceId === 'string'
    && typeof value.sheetName === 'string';
}
