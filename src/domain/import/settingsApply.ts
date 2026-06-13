import type {
  ColumnAnalysis,
  ExportedImportSettings,
  ImportedSettingsApplyPayload,
  ImportedSettingsApplyResult,
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
      ...(settings.config.showAllRawPreviewColumns !== undefined
        ? { showAllRawPreviewColumns: settings.config.showAllRawPreviewColumns }
        : {}),
      inputColumnAliases: { ...settings.config.inputColumnAliases },
      columnVisibility: cloneJson(settings.config.columnVisibility),
      virtualInputColumns: cloneJson(settings.config.virtualInputColumns ?? []),
      inputNormalizationRules: cloneJson(settings.config.inputNormalizationRules ?? []),
      inputIgnoreRules: cloneJson(settings.config.inputIgnoreRules),
      outputColumns: cloneJson(settings.config.outputColumns),
      outputIgnoreRules: cloneJson(settings.config.outputIgnoreRules),
      fileNameSettings: cloneJson(settings.config.fileNameSettings),
    },
  };
}

export type PreviewSettingsState = {
  showRawPreviewFromDataStart: boolean;
  showAllRawPreviewColumns: boolean;
};

export function resolveImportedPreviewSettings(
  current: PreviewSettingsState,
  payload: Pick<ImportedSettingsApplyPayload, 'showRawPreviewFromDataStart' | 'showAllRawPreviewColumns'>,
): PreviewSettingsState {
  return {
    showRawPreviewFromDataStart: payload.showRawPreviewFromDataStart ?? current.showRawPreviewFromDataStart,
    showAllRawPreviewColumns: payload.showAllRawPreviewColumns ?? current.showAllRawPreviewColumns,
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
    return {
      ...column,
      alias: payload.inputColumnAliases[visibility.inputColumnId] ?? visibility.alias ?? column.alias,
      ignored: !active,
      ignoredReason: active ? undefined : visibility.ignoredReason ?? 'manual',
    };
  });
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
