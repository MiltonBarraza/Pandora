import type {
  ColumnAnalysis,
  ExportedImportSettings,
  ImportedSettingsApplyPayload,
  ImportedSettingsApplyResult,
  IgnoredReason,
  SavedInputColumnConfig,
} from '../../types/import';
import { getInputColumnId } from './outputModel';
import { validateImportedSettings } from '../../services/settingsFileService';

export function createApplyPayloadFromSettings(settings: ExportedImportSettings): ImportedSettingsApplyResult {
  const validation = validateImportedSettings(settings);
  if (!validation.ok) {
    return validation;
  }

  return {
    ok: true,
    payload: {
      ...(settings.config.selectedSheet ? { selectedSheet: settings.config.selectedSheet } : {}),
      headerRowIndex: settings.config.headerRowIndex,
      startRowIndex: settings.config.startRowIndex,
      ...(settings.config.showRawPreviewFromDataStart !== undefined
        ? { showRawPreviewFromDataStart: settings.config.showRawPreviewFromDataStart }
        : {}),
      inputColumnAliases: { ...settings.config.inputColumnAliases },
      columnVisibility: cloneJson(settings.config.columnVisibility),
      inputIgnoreRules: cloneJson(settings.config.inputIgnoreRules),
      outputColumns: cloneJson(settings.config.outputColumns),
      outputIgnoreRules: cloneJson(settings.config.outputIgnoreRules),
      fileNameSettings: cloneJson(settings.config.fileNameSettings),
    },
  };
}

export type PreviewSettingsState = {
  showRawPreviewFromDataStart: boolean;
};

export function resolveImportedPreviewSettings(
  current: PreviewSettingsState,
  payload: Pick<ImportedSettingsApplyPayload, 'showRawPreviewFromDataStart' | 'showAllRawPreviewColumns'>,
): PreviewSettingsState {
  // `showAllRawPreviewColumns` is accepted from legacy settings but no longer affects the configured data preview.
  return {
    showRawPreviewFromDataStart: payload.showRawPreviewFromDataStart ?? current.showRawPreviewFromDataStart,
  };
}

export function applyColumnVisibilitySettings(
  columnAnalysis: ColumnAnalysis[],
  payload: Pick<ImportedSettingsApplyPayload, 'columnVisibility' | 'inputColumnAliases'>,
) {
  const visibilityByInputColumnId = new Map(payload.columnVisibility.map((column) => [column.inputColumnId, column]));

  return columnAnalysis.map((column) => {
    const inputColumnId = getInputColumnId(column.columnIndex);
    const visibility = visibilityByInputColumnId.get(inputColumnId);
    if (!visibility) {
      return {
        ...column,
        alias: payload.inputColumnAliases[inputColumnId] ?? column.alias,
      };
    }

    if (typeof visibility.active !== 'boolean') {
      return {
        ...column,
        alias: payload.inputColumnAliases[visibility.inputColumnId] ?? visibility.alias ?? column.alias,
      };
    }

    const active = visibility.active;
    const ignoredReasons = getSavedIgnoredReasons(visibility);
    const autoIgnoredReasons = getSavedAutoIgnoredReasons(visibility, column);
    return {
      ...column,
      alias: payload.inputColumnAliases[visibility.inputColumnId] ?? visibility.alias ?? column.alias,
      ignored: !active,
      ignoredReason: active ? undefined : ignoredReasons[0] ?? 'manual',
      ignoredReasons: active ? undefined : ignoredReasons,
      autoIgnoredReason: autoIgnoredReasons[0] ?? column.autoIgnoredReason,
      autoIgnoredReasons: autoIgnoredReasons.length > 0 ? autoIgnoredReasons : column.autoIgnoredReasons,
    };
  });
}

function getSavedIgnoredReasons(visibility: SavedInputColumnConfig) {
  return normalizeReasons(
    visibility.ignoredReasons && visibility.ignoredReasons.length > 0
      ? visibility.ignoredReasons
      : visibility.ignoredReason
        ? [visibility.ignoredReason]
        : ['manual'],
  );
}

function getSavedAutoIgnoredReasons(visibility: SavedInputColumnConfig, column: ColumnAnalysis) {
  return normalizeReasons(
    visibility.autoIgnoredReasons && visibility.autoIgnoredReasons.length > 0
      ? visibility.autoIgnoredReasons
      : visibility.autoIgnoredReason
        ? [visibility.autoIgnoredReason]
        : column.autoIgnoredReasons ?? (column.autoIgnoredReason ? [column.autoIgnoredReason] : []),
  );
}

function normalizeReasons(reasons: IgnoredReason[]) {
  return [...new Set(reasons)];
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
