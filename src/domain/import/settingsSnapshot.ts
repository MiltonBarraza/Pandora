import type {
  ColumnAnalysis,
  ExportedImportSettings,
  FileNameSettings,
  IgnoreRule,
  InputNormalizationRule,
  OutputColumn,
  RawRow,
  SavedInputColumnConfig,
  SourceColumnSnapshot,
  SourceSnapshot,
  VirtualInputColumn,
} from '../../types/import';
import { getInputColumnId } from './outputModel';

const settingsAppName = 'excel-sanitizer' as const;
const settingsSchemaVersion = 1;
const defaultSampleLimit = 5;

export type CreateSourceSnapshotOptions = {
  fileType: SourceSnapshot['fileType'];
  sheetName?: string;
  sheetNames?: string[];
  rows?: RawRow[];
  rowCount?: number;
  headerRowIndex: number | null;
  startRowIndex: number;
  columnAnalysis: ColumnAnalysis[];
  sampleLimit?: number;
};

export type ExportSettingsFromWizardStateOptions = {
  name?: string;
  exportedAt?: string;
  fileType: SourceSnapshot['fileType'];
  selectedSheet?: string;
  sheetNames?: string[];
  rows?: RawRow[];
  rowCount?: number;
  headerRowIndex: number | null;
  startRowIndex: number;
  showRawPreviewFromDataStart?: boolean;
  showAllRawPreviewColumns?: boolean;
  columnAnalysis: ColumnAnalysis[];
  inputColumnAliases: Record<string, string>;
  virtualInputColumns?: VirtualInputColumn[];
  inputNormalizationRules: InputNormalizationRule[];
  inputIgnoreRules: IgnoreRule[];
  outputColumns: OutputColumn[];
  outputIgnoreRules: IgnoreRule[];
  fileNameSettings: FileNameSettings;
  sampleLimit?: number;
};

export function createSourceSnapshot({
  fileType,
  sheetName,
  sheetNames,
  rows,
  rowCount,
  headerRowIndex,
  startRowIndex,
  columnAnalysis,
  sampleLimit = defaultSampleLimit,
}: CreateSourceSnapshotOptions): SourceSnapshot {
  return {
    fileType,
    ...(sheetName ? { sheetName } : {}),
    ...(sheetNames ? { sheetNames: [...sheetNames] } : {}),
    rowCount: rowCount ?? rows?.length ?? 0,
    headerRowIndex,
    startRowIndex,
    columns: columnAnalysis.map((column) => createSourceColumnSnapshot(column, sampleLimit)),
  };
}

export function createColumnFingerprint(column: Pick<ColumnAnalysis, 'header' | 'sampleValues' | 'nonEmptyCount'>, sampleLimit = defaultSampleLimit) {
  const header = normalizeFingerprintPart(column.header ?? '');
  const samples = getLimitedSamples(column.sampleValues, sampleLimit).map(normalizeFingerprintPart);
  return [
    `h:${header}`,
    `n:${column.nonEmptyCount}`,
    `s:${samples.join('|')}`,
  ].join(';');
}

export function exportSettingsFromWizardState({
  name,
  exportedAt,
  fileType,
  selectedSheet,
  sheetNames,
  rows,
  rowCount,
  headerRowIndex,
  startRowIndex,
  showRawPreviewFromDataStart,
  showAllRawPreviewColumns,
  columnAnalysis,
  inputColumnAliases,
  virtualInputColumns = [],
  inputNormalizationRules,
  inputIgnoreRules,
  outputColumns,
  outputIgnoreRules,
  fileNameSettings,
  sampleLimit,
}: ExportSettingsFromWizardStateOptions): ExportedImportSettings {
  return {
    schemaVersion: settingsSchemaVersion,
    app: settingsAppName,
    exportedAt: exportedAt ?? new Date().toISOString(),
    ...(name ? { name } : {}),
    sourceSnapshot: createSourceSnapshot({
      fileType,
      sheetName: selectedSheet,
      sheetNames,
      rows,
      rowCount,
      headerRowIndex,
      startRowIndex,
      columnAnalysis,
      sampleLimit,
    }),
    config: {
      ...(selectedSheet ? { selectedSheet } : {}),
      headerRowIndex,
      startRowIndex,
      ...(showRawPreviewFromDataStart !== undefined ? { showRawPreviewFromDataStart } : {}),
      ...(showAllRawPreviewColumns !== undefined ? { showAllRawPreviewColumns } : {}),
      columnVisibility: columnAnalysis.map(createSavedInputColumnConfig),
      inputColumnAliases: { ...inputColumnAliases },
      virtualInputColumns: cloneJson(virtualInputColumns),
      inputNormalizationRules: cloneJson(inputNormalizationRules),
      inputIgnoreRules: cloneJson(inputIgnoreRules),
      outputColumns: cloneJson(outputColumns),
      outputIgnoreRules: cloneJson(outputIgnoreRules),
      fileNameSettings: cloneJson(fileNameSettings),
    },
  };
}

function createSourceColumnSnapshot(column: ColumnAnalysis, sampleLimit: number): SourceColumnSnapshot {
  return {
    inputColumnId: getInputColumnId(column.columnIndex),
    columnIndex: column.columnIndex,
    columnLetter: column.columnLetter,
    ...(column.header ? { header: column.header } : {}),
    ...(column.alias ? { alias: column.alias } : {}),
    active: !column.ignored,
    ...(column.ignoredReason ? { ignoredReason: column.ignoredReason } : {}),
    sampleValues: getLimitedSamples(column.sampleValues, sampleLimit),
    nonEmptyCount: column.nonEmptyCount,
    fingerprint: createColumnFingerprint(column, sampleLimit),
  };
}

function createSavedInputColumnConfig(column: ColumnAnalysis): SavedInputColumnConfig {
  return {
    inputColumnId: getInputColumnId(column.columnIndex),
    columnIndex: column.columnIndex,
    columnLetter: column.columnLetter,
    ...(column.header ? { header: column.header } : {}),
    ...(column.alias ? { alias: column.alias } : {}),
    active: !column.ignored,
    ...(column.ignoredReason ? { ignoredReason: column.ignoredReason } : {}),
  };
}

function getLimitedSamples(sampleValues: string[], sampleLimit: number) {
  return sampleValues
    .map((value) => value.trim())
    .filter((value) => value !== '')
    .slice(0, Math.max(0, sampleLimit));
}

function normalizeFingerprintPart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
