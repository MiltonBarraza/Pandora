import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type * as XLSX from 'xlsx';
import { applyOutputIgnoreRulesToProcessedRows, applyRowOverridesToProcessedRows } from '../../domain/import/applyIgnoreRules';
import { analyzeSheetColumns } from '../../domain/import/columnAnalysis';
import { getSheetRowsWithMetadata } from '../../domain/import/getSheetRows';
import { buildOutputFileBaseName } from '../../domain/import/downloadNames';
import { normalizeNumberInputOnBlur, parseStartRowInputWhileEditing } from '../../domain/import/numberInput';
import { buildProcessedRowsPipeline, getInputColumnId } from '../../domain/import/outputModel';
import { createProcessedExportResult, getProcessedExportAvailability } from '../../domain/import/processedExportResult';
import { readCsv } from '../../domain/import/readCsv';
import { readWorkbook } from '../../domain/import/readWorkbook';
import { createSettingsComparisonKey, hasRelevantSettingsChanges } from '../../domain/import/settingsBaseline';
import { applyColumnVisibilitySettings, createApplyPayloadFromSettings, resolveImportedPreviewSettings, type PreviewSettingsState } from '../../domain/import/settingsApply';
import { exportSettingsFromWizardState } from '../../domain/import/settingsSnapshot';
import { validateProcessedRows } from '../../domain/import/validateProcessedRows';
import { useBeforeUnloadWarning } from '../../hooks/useBeforeUnloadWarning';
import { useInternalReloadGuard } from '../../hooks/useInternalReloadGuard';
import { defaultFileNameSettings, loadFileNameSettings, normalizeFileNameSettings, saveFileNameSettings } from '../../services/localFileNameService';
import { createDefaultOutputColumns, loadOutputColumns, saveOutputColumns } from '../../services/localOutputColumnsService';
import { defaultIgnoreRules, loadPersistedSettings, savePersistedSettings } from '../../services/localTemplatesService';
import { downloadImportSettingsFile } from '../../services/settingsFileService';
import { showInfoToast } from '../../services/toastService';
import type { ColumnAnalysis, ExportedImportSettings, FileNameSettings as FileNameSettingsType, IgnoreRule, ImportedSettingsApplyPayload, InputColumn, InputRow, OutputColumn, ProcessedRow, RawRow, RowOverrides, SettingsCompatibilityResult, SheetRowMetadata } from '../../types/import';
import type { ProcessedExportResult } from '../../types/processedExport';
import { ColumnVisibilityManager, syncActiveColumnOrder } from '../ColumnVisibilityManager/ColumnVisibilityManager';
import { ExportActions } from '../ExportActions/ExportActions';
import { FileNameSettings } from '../FileNameSettings/FileNameSettings';
import { FileUploader } from '../FileUploader/FileUploader';
import { IgnoreRules } from '../IgnoreRules/IgnoreRules';
import { OutputColumnsManager } from '../OutputColumnsManager/OutputColumnsManager';
import { ProcessedRowsPreview } from '../ProcessedRowsDebugPreview/ProcessedRowsDebugPreview';
import { RawPreview } from '../RawPreview/RawPreview';
import { SettingsActions } from '../SettingsActions/SettingsActions';
import { SheetSelector } from '../SheetSelector/SheetSelector';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import { Dropdown } from '../ui/Dropdown/Dropdown';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

const persisted = loadPersistedSettings();
const initialOutputColumns = loadOutputColumns();
export const headerRowOptionsHelpText = 'Seleccioná la fila que contiene los nombres de las columnas. Solo se muestran filas con contenido.';

export function getManualRangeRowsForVisibleOutput(inputRows: InputRow[], processedRows: ProcessedRow[]) {
  if (processedRows.length === 0) {
    return inputRows;
  }

  const visibleRowNumbers = new Set(
    processedRows.filter((row) => row.status === 'included').map((row) => row.rowNumber),
  );
  return inputRows.filter((row) => visibleRowNumbers.has(row.rowNumber));
}

type ImportWizardProps = {
  appearanceToolbar?: ReactNode;
  multiSheetBatchPanel?: (props: MultiSheetBatchPanelRenderProps) => ReactNode;
  onSaveProcessedResult?: (result: ProcessedExportResult) => void;
  onSaveToMultiSheetBatch?: (result: ProcessedExportResult) => void;
  onStatePresenceChange?: (hasState: boolean) => void;
  externalReloadGuardActive?: boolean;
  suppressBeforeUnloadWarning?: boolean;
};

export type MultiSheetBatchPanelRenderProps = {
  onSaveCurrentSheet: () => void;
  saveCurrentSheetDisabled: boolean;
  saveCurrentSheetDisabledReason: string;
};

export function ImportWizard({
  appearanceToolbar,
  multiSheetBatchPanel,
  onSaveProcessedResult,
  onSaveToMultiSheetBatch,
  onStatePresenceChange,
  externalReloadGuardActive = false,
  suppressBeforeUnloadWarning = false,
}: ImportWizardProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'spreadsheet' | 'csv' | ''>('');
  const [selectedSheet, setSelectedSheet] = useState('');
  const [rows, setRows] = useState<RawRow[]>([]);
  const [rowMetadata, setRowMetadata] = useState<SheetRowMetadata[]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [startRowIndex, setStartRowIndex] = useState(0);
  const [startRowNumber, setStartRowNumber] = useState(1);
  const [startRowInputValue, setStartRowInputValue] = useState('1');
  const [startRowInputError, setStartRowInputError] = useState('');
  const [outputColumns, setOutputColumns] = useState<OutputColumn[]>(initialOutputColumns);
  const [fileNameSettings, setFileNameSettings] = useState<FileNameSettingsType>(() => loadFileNameSettings());
  const [columnAnalysis, setColumnAnalysis] = useState<ColumnAnalysis[]>([]);
  const [activeColumnOrder, setActiveColumnOrder] = useState<number[]>([]);
  const [inputIgnoreRules, setInputIgnoreRules] = useState<IgnoreRule[]>(
    persisted.inputIgnoreRules?.length ? persisted.inputIgnoreRules : defaultIgnoreRules(),
  );
  const [outputIgnoreRules, setOutputIgnoreRules] = useState<IgnoreRule[]>(
    persisted.outputIgnoreRules?.length ? persisted.outputIgnoreRules : defaultIgnoreRules(),
  );
  const [inputColumnAliases, setInputColumnAliases] = useState<Record<string, string>>(
    () => persisted.inputColumnAliases ?? {},
  );
  const [rowOverrides, setRowOverrides] = useState<RowOverrides>({});
  const [readError, setReadError] = useState('');
  const [showRawPreviewFromDataStart, setShowRawPreviewFromDataStart] = useState(true);
  const [isConfigurationDirty, setIsConfigurationDirty] = useState(false);
  const [isBeforeUnloadSuppressed, setIsBeforeUnloadSuppressed] = useState(false);
  const [discardConfirmation, setDiscardConfirmation] = useState<DiscardConfirmationState | null>(null);
  const [settingsBaselines, setSettingsBaselines] = useState<SettingsBaselineState>({});
  const [configurationRevision, setConfigurationRevision] = useState(0);
  const [showOutputModelDebug] = useState(() => localStorage.getItem('excel-sanitizer:debug-output-model') === '1');
  const importedColumnVisibilityRef = useRef<ImportedSettingsApplyPayload | null>(null);
  const importedPreviewSettingsRef = useRef<PreviewSettingsState | null>(null);
  const pendingLoadedSettingsBaselineSyncRef = useRef(false);
  const skipStartRowInputSyncRef = useRef(false);

  const sheetNames = workbook?.SheetNames ?? [];
  const hasLoadedFile = fileName !== '' && fileType !== '';
  const hasWizardStateToProtect = shouldProtectWizardState({
    isConfigurationDirty,
    hasLoadedFile,
    selectedSheet,
    rowCount: rows.length,
    columnAnalysisCount: columnAnalysis.length,
  });
  useEffect(() => {
    onStatePresenceChange?.(hasWizardStateToProtect);
  }, [hasWizardStateToProtect, onStatePresenceChange]);
  const selectedSheetObject = workbook && selectedSheet ? workbook.Sheets[selectedSheet] : undefined;
  const maxColumns = useMemo(() => Math.max(1, ...rows.slice(0, 25).map((row) => row.length)), [rows]);
  const rawPreviewRows = useMemo(
    () => getRawPreviewRows(rows, rowMetadata, startRowNumber, showRawPreviewFromDataStart),
    [rows, rowMetadata, startRowNumber, showRawPreviewFromDataStart],
  );
  const rawPreviewRowNumbers = useMemo(
    () => getRawPreviewRowNumbers(rowMetadata, startRowNumber, showRawPreviewFromDataStart),
    [rowMetadata, startRowNumber, showRawPreviewFromDataStart],
  );
  const rawPreviewRowNumberOffset = showRawPreviewFromDataStart ? startRowNumber - 1 : 0;
  const visibleStartRowNumber = startRowNumber;
  const headerRowOptions = useMemo(
    () => getHeaderRowOptions(rowMetadata, rows.length),
    [rowMetadata, rows.length],
  );
  const activeColumnIndexes = useMemo(
    () => columnAnalysis.filter((column) => !column.ignored).map((column) => column.columnIndex),
    [columnAnalysis],
  );
  const rawPreviewColumnLabels = useMemo(
    () => Object.fromEntries(
      columnAnalysis.map((column) => [
        column.columnIndex,
        column.alias?.trim() || column.header?.trim() || column.columnLetter,
      ]),
    ),
    [columnAnalysis],
  );
  const currentSettings = useMemo(
    () => createCurrentExportedSettings({
      fileType,
      selectedSheet,
      sheetNames,
      rows,
      headerRowIndex,
      startRowIndex,
      showRawPreviewFromDataStart,
      columnAnalysis,
      inputColumnAliases,
      inputIgnoreRules,
      outputColumns,
      outputIgnoreRules,
      fileNameSettings,
    }),
    [
      fileType,
      selectedSheet,
      sheetNames,
      rows,
      headerRowIndex,
      startRowIndex,
      showRawPreviewFromDataStart,
      columnAnalysis,
      inputColumnAliases,
      inputIgnoreRules,
      outputColumns,
      outputIgnoreRules,
      fileNameSettings,
    ],
  );
  const currentSettingsKey = useMemo(
    () => (currentSettings ? createSettingsComparisonKey(currentSettings) : null),
    [currentSettings],
  );
  const shouldPromptSaveBeforeExcelDownload = hasRelevantSettingsChanges(currentSettingsKey, [
    settingsBaselines.loaded,
    settingsBaselines.saved,
  ]);
  const rowConfigurationError = getRowConfigurationError(headerRowIndex, rowMetadata, startRowNumber);
  const rawPreviewStartRowNumber = rawPreviewRowNumbers?.[0] ?? startRowNumber;
  const rawPreviewSummary = showRawPreviewFromDataStart
    ? `Vista previa configurada desde la fila ${rawPreviewStartRowNumber}: columnas activas con encabezados y alias actuales. Se muestran hasta 30 filas.`
    : 'Vista previa configurada de las primeras 30 filas: columnas activas con encabezados y alias actuales.';
  const processedPipeline = useMemo(
    () =>
      buildProcessedRowsPipeline({
        rawRows: rows,
        columnAnalysis,
        startRowIndex,
        outputColumns,
        inputIgnoreRules,
        rowMetadata,
      }),
    [rows, columnAnalysis, startRowIndex, outputColumns, inputIgnoreRules, rowMetadata],
  );
  const inputColumnsForGeneration = useMemo(
    () => applyActiveColumnVisualOrder(processedPipeline.inputColumns, activeColumnOrder),
    [processedPipeline.inputColumns, activeColumnOrder],
  );
  const outputFilteredRows = useMemo(
    () =>
      applyOutputIgnoreRulesToProcessedRows({
        rows: validateProcessedRows(processedPipeline.processedRows, processedPipeline.outputColumns),
        outputIgnoreRules,
        outputColumns: processedPipeline.outputColumns,
      }),
    [processedPipeline.processedRows, processedPipeline.outputColumns, outputIgnoreRules],
  );
  const processedRowsWithStatus = useMemo(
    () => applyRowOverridesToProcessedRows(outputFilteredRows, rowOverrides),
    [outputFilteredRows, rowOverrides],
  );
  const manualRangeRows = useMemo(
    () => getManualRangeRowsForVisibleOutput(processedPipeline.includedInputRows, processedRowsWithStatus),
    [processedPipeline.includedInputRows, processedRowsWithStatus],
  );
  const auditRows = useMemo(
    () => [
      ...processedPipeline.ignoredInputRows.map((row) => ({
        rowNumber: row.rowNumber,
        inputValues: row.inputValues,
        outputValues: {},
        status: 'ignored' as const,
        ignoredReason: row.ignoredReason,
      })),
      ...processedRowsWithStatus,
    ].sort((left, right) => left.rowNumber - right.rowNumber),
    [processedPipeline.ignoredInputRows, processedRowsWithStatus],
  );
  const multiSheetSaveAvailability = getProcessedExportAvailability(
    processedRowsWithStatus,
    processedPipeline.outputColumns,
  );
  const saveCurrentSheetToMultiSheetBatch = () => {
    if (!onSaveToMultiSheetBatch || !multiSheetSaveAvailability.exportable) {
      return;
    }

    onSaveToMultiSheetBatch(createProcessedExportResult({
      rows: processedRowsWithStatus,
      outputColumns: processedPipeline.outputColumns,
      fileBaseName: buildOutputFileBaseName({
        settings: fileNameSettings,
        sourceFileName: fileName,
        sheetName: selectedSheet,
      }),
      sourceFileName: fileName,
      sheetName: selectedSheet,
    }));
  };

  useBeforeUnloadWarning(
    hasWizardStateToProtect
      && !isBeforeUnloadSuppressed
      && !suppressBeforeUnloadWarning,
  );
  useInternalReloadGuard(hasWizardStateToProtect && !externalReloadGuardActive, () => {
    requestConfigurationDiscard(() => {
      setIsBeforeUnloadSuppressed(true);
      window.setTimeout(() => window.location.reload(), 0);
    });
  });

  useEffect(() => {
    saveOutputColumns(outputColumns);
  }, [outputColumns]);

  useEffect(() => {
    saveFileNameSettings(fileNameSettings);
  }, [fileNameSettings]);

  useEffect(() => {
    savePersistedSettings({ inputIgnoreRules, outputIgnoreRules, inputColumnAliases });
  }, [inputIgnoreRules, outputIgnoreRules, inputColumnAliases]);

  useEffect(() => {
    if (skipStartRowInputSyncRef.current) {
      skipStartRowInputSyncRef.current = false;
      return;
    }

    setStartRowInputValue(String(visibleStartRowNumber));
    setStartRowInputError('');
  }, [startRowIndex, visibleStartRowNumber]);

  useEffect(() => {
    if (showOutputModelDebug) {
      console.debug('output-model pipeline', processedPipeline);
    }
  }, [processedPipeline, showOutputModelDebug]);

  useEffect(() => {
    if (!pendingLoadedSettingsBaselineSyncRef.current || !currentSettingsKey) {
      return;
    }

    pendingLoadedSettingsBaselineSyncRef.current = false;
    setSettingsBaselines((baselines) => ({ ...baselines, loaded: currentSettingsKey }));
  }, [currentSettingsKey]);

  useEffect(() => {
    if (!workbook || !selectedSheet || fileType !== 'spreadsheet') {
      return;
    }

    const sheetRows = getSheetRowsWithMetadata(workbook, selectedSheet);
    setRows(sheetRows.rows);
    setRowMetadata(sheetRows.rowMetadata);
  }, [workbook, selectedSheet, fileType]);

  useEffect(() => {
    const nextColumnAnalysis = analyzeSheetColumns(selectedSheetObject, rows, undefined, headerRowIndex, startRowIndex).map((column) => ({
        ...column,
        alias: inputColumnAliases[getInputColumnId(column.columnIndex)] ?? '',
      }));
    setColumnAnalysis(
      importedColumnVisibilityRef.current
        ? applyColumnVisibilitySettings(nextColumnAnalysis, importedColumnVisibilityRef.current)
        : nextColumnAnalysis,
    );
  }, [selectedSheetObject, rows, headerRowIndex, startRowIndex]);

  useEffect(() => {
    const importedPreviewSettings = importedPreviewSettingsRef.current;
    if (!importedPreviewSettings) {
      return;
    }

    setShowRawPreviewFromDataStart(importedPreviewSettings.showRawPreviewFromDataStart);
  }, [selectedSheetObject, rows, columnAnalysis, headerRowIndex, startRowIndex]);

  const resetWizardConfiguration = () => {
    setHeaderRowIndex(null);
    setStartRowIndex(0);
    setStartRowNumber(1);
    setStartRowInputValue('1');
    setStartRowInputError('');
    setShowRawPreviewFromDataStart(true);
    setInputColumnAliases({});
    setActiveColumnOrder([]);
    setColumnAnalysis([]);
    setInputIgnoreRules(defaultIgnoreRules());
    setOutputColumns(createDefaultOutputColumns());
    setOutputIgnoreRules(defaultIgnoreRules());
    setFileNameSettings(defaultFileNameSettings());
    setRowOverrides({});
    setSettingsBaselines({});
    importedColumnVisibilityRef.current = null;
    importedPreviewSettingsRef.current = null;
    setIsConfigurationDirty(false);
    setConfigurationRevision((revision) => revision + 1);
  };

  const requestConfigurationDiscard = (onConfirm: () => void) => {
    const nextConfirmation = getWizardDiscardConfirmationState(hasWizardStateToProtect, onConfirm);
    if (!nextConfirmation) {
      onConfirm();
      return;
    }

    setDiscardConfirmation(nextConfirmation);
  };

  const cancelConfigurationDiscard = () => {
    setDiscardConfirmation(null);
  };

  const confirmConfigurationDiscard = () => {
    const nextAction = getWizardDiscardConfirmationAction(discardConfirmation);
    setDiscardConfirmation(null);
    nextAction?.();
  };

  const notifyConfigurationDiscarded = () => {
    if (isConfigurationDirty) {
      showInfoToast('Configuración descartada.');
    }
  };

  const resetSourceFile = () => {
    setFileName('');
    setFileType('');
    setWorkbook(null);
    setSelectedSheet('');
    setRows([]);
    setRowMetadata([]);
    setReadError('');
  };

  const removeFile = () => {
    if (!fileName && fileType === '' && !workbook) {
      return;
    }

    requestConfigurationDiscard(() => {
      const wasDirty = isConfigurationDirty;
      resetWizardConfiguration();
      resetSourceFile();
      showInfoToast(wasDirty ? 'Configuración descartada.' : 'Se quitó el archivo seleccionado.');
    });
  };

  const loadFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    requestConfigurationDiscard(() => {
      void readSelectedFile(file);
    });
  };

  const readSelectedFile = async (file: File) => {
    setReadError('');

    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv');

      if (isCsv) {
        const csvRows = await readCsv(file);
        notifyConfigurationDiscarded();
        resetWizardConfiguration();
        setFileName(file.name);
        setWorkbook(null);
        setSelectedSheet('');
        setRows(csvRows);
        setRowMetadata([]);
        setFileType('csv');
        return;
      }

      const data = await file.arrayBuffer();
      const nextWorkbook = await readWorkbook(data);
      notifyConfigurationDiscarded();
      resetWizardConfiguration();
      setFileName(file.name);
      setWorkbook(nextWorkbook);
      setSelectedSheet(nextWorkbook.SheetNames[0] ?? '');
      const sheetRows = nextWorkbook.SheetNames[0]
        ? getSheetRowsWithMetadata(nextWorkbook, nextWorkbook.SheetNames[0])
        : { rows: [], rowMetadata: [] };
      setRows(sheetRows.rows);
      setRowMetadata(sheetRows.rowMetadata);
      setFileType('spreadsheet');
    } catch {
      setReadError('No se pudo leer el archivo. Revisá que sea .xlsx, .xls, .xlsm o .csv.');
    }
  };

  const updateOutputColumns = (nextColumns: OutputColumn[]) => {
    setIsConfigurationDirty(true);
    setOutputColumns(nextColumns);
  };

  const updateColumnAnalysis = (nextColumns: ColumnAnalysis[]) => {
    setIsConfigurationDirty(true);
    importedColumnVisibilityRef.current = null;
    setColumnAnalysis(nextColumns);
    setInputColumnAliases(
      Object.fromEntries(
        nextColumns
          .map((column) => [getInputColumnId(column.columnIndex), column.alias?.trim() ?? ''] as const)
          .filter(([, alias]) => alias !== ''),
      ),
    );
  };

  const applyImportedSettings = (settings: ExportedImportSettings, compatibility: SettingsCompatibilityResult) => {
    if (!workbook && fileType !== 'csv') {
      return { ok: false as const, error: 'Primero cargá un Excel para aplicar configuración.' };
    }

    if (compatibility.status === 'blocked') {
      return { ok: false as const, error: 'Esta configuración no se puede aplicar a este archivo.' };
    }

    if (compatibility.status === 'needsRemap') {
      return { ok: false as const, error: 'Esta configuración necesita remapeo de columnas antes de aplicarse.' };
    }

    const result = createApplyPayloadFromSettings(settings);
    if (!result.ok) {
      return result;
    }

    applySettingsPayload(result.payload, compatibility);
    return { ok: true as const };
  };

  const applySettingsPayload = (payload: ImportedSettingsApplyPayload, compatibility: SettingsCompatibilityResult) => {
    const nextSheet = getApplicableSheet(payload, compatibility, selectedSheet, sheetNames);
    if (nextSheet !== selectedSheet) {
      setSelectedSheet(nextSheet);
    }

    setHeaderRowIndex(payload.headerRowIndex);
    setStartRowIndex(payload.startRowIndex);
    setStartRowNumber(getExcelRowNumberForInternalIndex(rowMetadata, payload.startRowIndex));
    const previewSettings = resolveImportedPreviewSettings(
      { showRawPreviewFromDataStart },
      payload,
    );
    importedPreviewSettingsRef.current = previewSettings;
    setShowRawPreviewFromDataStart(previewSettings.showRawPreviewFromDataStart);

    setInputColumnAliases(payload.inputColumnAliases);
    importedColumnVisibilityRef.current = payload;
    setColumnAnalysis(applyColumnVisibilitySettings(columnAnalysis, payload));
    setInputIgnoreRules(payload.inputIgnoreRules);
    setOutputColumns(payload.outputColumns);
    setOutputIgnoreRules(payload.outputIgnoreRules);
    setFileNameSettings(normalizeFileNameSettings(payload.fileNameSettings));
    setIsConfigurationDirty(true);
    pendingLoadedSettingsBaselineSyncRef.current = true;
  };

  const saveCurrentSettings = () => {
    if (!currentSettings || !currentSettingsKey) {
      return { ok: false as const, error: 'Primero cargá un Excel y seleccioná una hoja para guardar configuraciones.' };
    }

    try {
      downloadImportSettingsFile(currentSettings);
      setSettingsBaselines((baselines) => ({ ...baselines, saved: currentSettingsKey }));
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: 'No se pudo guardar la configuración.' };
    }
  };

  const changeSelectedSheet = (sheetName: string) => {
    if (sheetName === selectedSheet) {
      return;
    }

    const applySheetChange = () => {
      notifyConfigurationDiscarded();
      resetWizardConfiguration();
      setSelectedSheet(sheetName);
      const sheetRows = workbook ? getSheetRowsWithMetadata(workbook, sheetName) : { rows: [], rowMetadata: [] };
      setRows(sheetRows.rows);
      setRowMetadata(sheetRows.rowMetadata);
    };

    if (isConfigurationDirty) {
      requestConfigurationDiscard(applySheetChange);
      return;
    }

    applySheetChange();
  };

  const applyStartRowNumber = (nextRowNumber: number) => {
    const nextStartRowIndex = getInternalDataStartIndexForExcelRowNumber(rowMetadata, nextRowNumber);
    if (nextStartRowIndex !== startRowIndex || nextRowNumber !== startRowNumber) {
      setIsConfigurationDirty(true);
      skipStartRowInputSyncRef.current = true;
      setStartRowIndex(nextStartRowIndex);
      setStartRowNumber(nextRowNumber);
    }
  };

  const applyStartRowInputIfValid = (value: string) => {
    const error = getStartRowInputValidationError(value);
    setStartRowInputError(error);
    if (error) {
      return false;
    }

    const nextRowNumber = parseStartRowInputWhileEditing(value);
    if (nextRowNumber === undefined) {
      return false;
    }

    applyStartRowNumber(nextRowNumber);
    return true;
  };

  const commitStartRowInput = (value: string) => {
    const error = getStartRowInputValidationError(value);
    if (error) {
      setStartRowInputError(error);
      return;
    }

    const rowNumber = normalizeNumberInputOnBlur(value, {
      fallback: visibleStartRowNumber,
      min: 1,
      integer: true,
    });
    skipStartRowInputSyncRef.current = false;
    setStartRowInputValue(String(rowNumber));
    setStartRowInputError('');
    applyStartRowNumber(rowNumber);
  };

  return (
    <main className="appShell">
      {appearanceToolbar}
      <ConfirmDialog
        open={Boolean(discardConfirmation)}
        title="Hay cambios sin aplicar"
        message="Si continuás, se perderá la configuración actual."
        cancelLabel="Seguir editando"
        confirmLabel="Descartar cambios"
        variant="danger"
        onCancel={cancelConfigurationDiscard}
        onConfirm={confirmConfigurationDiscard}
      />
      <header className="hero">
        <div>
          <p className="eyebrow">PANDORA</p>
          <h1>Limpia, transforma y guarda tus planillas </h1>
          <p>
            Cargá un Excel, configurá columnas, aplicá transformaciones y descargá un archivo limpio sin tocar fórmulas ni código.
          </p>
        </div>
      </header>

      <div className="wizard">
        <Step title="1. Archivo">
          <FileUploader
            fileName={fileName}
            onFileSelected={loadFile}
            onFileRemoved={removeFile}
          />
          {readError ? <p className="errorText">{readError}</p> : null}
        </Step>

        {hasLoadedFile ? (
          <>
        <Step title="2. Hoja y configuración">
          {fileType === 'csv' ? (
            <p className="muted">El archivo CSV se procesa como una única hoja.</p>
          ) : (
            <SheetSelector
              sheetNames={sheetNames}
              selectedSheet={selectedSheet}
              onSelectSheet={changeSelectedSheet}
            />
          )}
          <div className={`sheetConfigurationWorkspace${multiSheetBatchPanel ? ' hasMultiSheetBatch' : ''}`}>
            <SettingsActions
              key={configurationRevision}
              fileType={fileType}
              selectedSheet={selectedSheet}
              sheetNames={sheetNames}
              rows={rows}
              headerRowIndex={headerRowIndex}
              startRowIndex={startRowIndex}
              columnAnalysis={columnAnalysis}
              onSaveSettings={saveCurrentSettings}
              onApplySettings={applyImportedSettings}
              onSettingsImported={() => setIsConfigurationDirty(true)}
            />
            {multiSheetBatchPanel?.({
              onSaveCurrentSheet: saveCurrentSheetToMultiSheetBatch,
              saveCurrentSheetDisabled: !multiSheetSaveAvailability.exportable,
              saveCurrentSheetDisabledReason: multiSheetSaveAvailability.disabledReason,
            })}
          </div>
        </Step>

        <Step title="3. Configuración de columnas" info="Elegí la fila de encabezados y qué columnas entran en la receta.">
          <div className="rowColumnConfig">
            <Dropdown
              label="Fila de encabezados"
              labelInfo={<InfoTooltip content={headerRowOptionsHelpText} />}
              value={headerRowIndex === null ? 'none' : String(getExcelRowNumberForInternalIndex(rowMetadata, headerRowIndex))}
              options={headerRowOptions}
              scrollStrategy="lock"
              onChange={(value) => {
                const nextHeaderRowIndex = value === 'none'
                  ? null
                  : getInternalIndexForExcelRowNumber(rowMetadata, Number(value));
                if (nextHeaderRowIndex !== headerRowIndex) {
                  setIsConfigurationDirty(true);
                  setHeaderRowIndex(nextHeaderRowIndex);
                }
              }}
            />
          </div>
          <ColumnVisibilityManager
            columns={columnAnalysis}
            showHeaderColumn={headerRowIndex !== null}
            activeColumnOrder={activeColumnOrder}
            onActiveColumnOrderChange={setActiveColumnOrder}
            onChange={updateColumnAnalysis}
          />
        </Step>

        <Step title="4. Vista previa de datos" info="Elegí desde qué fila empieza la vista previa y revisá la selección actual con columnas activas, encabezados y alias.">
          <div className="rowColumnConfig">
            <div className="field startRowField">
              <span className="labelWithInfo">
                <span>Primera fila de datos</span>
                <InfoTooltip content="Desde esta fila se empiezan a mostrar y procesar los registros." />
              </span>
              <div className="startRowControls">
                <input
                  type="number"
                  min="1"
                  value={startRowInputValue}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setStartRowInputValue(nextValue);
                    applyStartRowInputIfValid(nextValue);
                  }}
                  onBlur={(event) => commitStartRowInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') {
                      return;
                    }

                    event.preventDefault();
                    commitStartRowInput(event.currentTarget.value);
                  }}
                />
                <label className="checkboxField startRowPreviewToggle">
                  <input
                    type="checkbox"
                    checked={showRawPreviewFromDataStart}
                    onChange={(event) => {
                      setIsConfigurationDirty(true);
                      importedPreviewSettingsRef.current = null;
                      setShowRawPreviewFromDataStart(event.target.checked);
                    }}
                  />
                  Previsualizar desde esta fila
                </label>
              </div>
              <p className="muted previewSummary">{rawPreviewSummary}</p>
              {startRowInputError ? <p className="rowInputError">{startRowInputError}</p> : null}
            </div>
          </div>
          {rowConfigurationError ? <p className="rowConfigurationError">{rowConfigurationError}</p> : null}
          <RawPreview
            rows={rawPreviewRows}
            maxColumns={maxColumns}
            activeColumns={activeColumnIndexes}
            columnLabels={rawPreviewColumnLabels}
            rowNumbers={rawPreviewRowNumbers}
            rowNumberOffset={rawPreviewRowNumberOffset}
          />
        </Step>

        <Step title="5. Filtrar filas de entrada" info="Estas reglas se aplican sobre los datos originales antes de construir las columnas de salida.">
          <IgnoreRules
            mode="input"
            inputColumns={processedPipeline.inputColumns}
            outputColumns={processedPipeline.outputColumns}
            rules={inputIgnoreRules}
            onChange={(rules) => {
              setIsConfigurationDirty(true);
              setInputIgnoreRules(rules);
            }}
          />
        </Step>

        <Step title="6. Columnas de salida" info="Define las columnas finales del archivo y como se llena cada una.">
          <OutputColumnsManager
            inputColumns={processedPipeline.inputColumns}
            inputColumnsForGeneration={inputColumnsForGeneration}
            manualRangeRows={manualRangeRows}
            sampleInputValues={manualRangeRows[0]?.values ?? processedPipeline.includedInputRows[0]?.values}
            outputColumns={outputColumns}
            onChange={updateOutputColumns}
          />
        </Step>

        <Step title="7. Filtrar filas de salida" info="Estas reglas se aplican sobre las columnas de salida ya transformadas.">
          <IgnoreRules
            mode="output"
            inputColumns={processedPipeline.inputColumns}
            outputColumns={processedPipeline.outputColumns}
            rules={outputIgnoreRules}
            onChange={(rules) => {
              setIsConfigurationDirty(true);
              setOutputIgnoreRules(rules);
            }}
          />
        </Step>

        <Step title="8. Vista normalizada" info="Muestra una vista previa del resultado ya procesado.">
          <ProcessedRowsPreview
            rows={processedRowsWithStatus}
            outputColumns={processedPipeline.outputColumns}
            rowOverrides={rowOverrides}
            onRowOverridesChange={(overrides) => {
              setIsConfigurationDirty(true);
              setRowOverrides(overrides);
            }}
          />
          {showOutputModelDebug ? (
            <p className="muted">Debug del modelo nuevo activo en consola.</p>
          ) : null}
        </Step>

        <Step title="9. Nombre del archivo de salida" info="Configurá cómo se va a llamar el archivo final.">
          <FileNameSettings
            settings={fileNameSettings}
            sourceFileName={fileName}
            sheetName={selectedSheet}
            onChange={(settings) => {
              setIsConfigurationDirty(true);
              setFileNameSettings(settings);
            }}
          />
        </Step>

        <Step title="10. Descargar archivo" info="Generá el archivo final y, si hace falta, el archivo de auditoría.">
          <ExportActions
            rows={processedRowsWithStatus}
            auditRows={auditRows}
            inputColumns={processedPipeline.inputColumns}
            outputColumns={processedPipeline.outputColumns}
            fileNameSettings={fileNameSettings}
            sourceFileName={fileName}
            sheetName={selectedSheet}
            shouldPromptSaveBeforeExcelDownload={shouldPromptSaveBeforeExcelDownload}
            onSaveSettingsBeforeExcelDownload={async () => saveCurrentSettings().ok}
            onSaveProcessedResult={onSaveProcessedResult}
            onSaveToMultiSheetBatch={onSaveToMultiSheetBatch}
          />
        </Step>
          </>
        ) : null}
      </div>
    </main>
  );
}

type DiscardConfirmationState = {
  onConfirm: () => void;
};

export function getWizardDiscardConfirmationState(
  hasWizardStateToProtect: boolean,
  onConfirm: () => void,
): DiscardConfirmationState | null {
  return hasWizardStateToProtect ? { onConfirm } : null;
}

export function getWizardDiscardConfirmationAction(discardConfirmation: DiscardConfirmationState | null) {
  return discardConfirmation?.onConfirm;
}

type SettingsBaselineState = {
  loaded?: string;
  saved?: string;
};

function createCurrentExportedSettings({
  fileType,
  selectedSheet,
  sheetNames,
  rows,
  headerRowIndex,
  startRowIndex,
  showRawPreviewFromDataStart,
  columnAnalysis,
  inputColumnAliases,
  inputIgnoreRules,
  outputColumns,
  outputIgnoreRules,
  fileNameSettings,
}: {
  fileType: 'spreadsheet' | 'csv' | '';
  selectedSheet: string;
  sheetNames: string[];
  rows: RawRow[];
  headerRowIndex: number | null;
  startRowIndex: number;
  showRawPreviewFromDataStart: boolean;
  columnAnalysis: ColumnAnalysis[];
  inputColumnAliases: Record<string, string>;
  inputIgnoreRules: IgnoreRule[];
  outputColumns: OutputColumn[];
  outputIgnoreRules: IgnoreRule[];
  fileNameSettings: FileNameSettingsType;
}) {
  if (fileType === '' || columnAnalysis.length === 0) {
    return null;
  }

  if (fileType === 'spreadsheet' && !selectedSheet) {
    return null;
  }

  return exportSettingsFromWizardState({
    name: selectedSheet || undefined,
    fileType,
    selectedSheet,
    sheetNames,
    rows,
    headerRowIndex,
    startRowIndex,
    showRawPreviewFromDataStart,
    columnAnalysis,
    inputColumnAliases,
    inputIgnoreRules,
    outputColumns,
    outputIgnoreRules,
    fileNameSettings,
  });
}

function getApplicableSheet(
  payload: ImportedSettingsApplyPayload,
  compatibility: SettingsCompatibilityResult,
  currentSheet: string,
  sheetNames: string[],
) {
  const candidate = compatibility.sheet.exists
    ? compatibility.sheet.currentSheet ?? payload.selectedSheet
    : compatibility.sheet.suggestedSheet;

  if (candidate && sheetNames.includes(candidate)) {
    return candidate;
  }

  if (payload.selectedSheet && sheetNames.includes(payload.selectedSheet)) {
    return payload.selectedSheet;
  }

  return currentSheet;
}

function Step({ title, info, children }: { title: string; info?: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2 className={info ? 'headingWithInfo' : undefined}>
        <span>{title}</span>
        {info ? <InfoTooltip content={info} ariaLabel={`Ayuda: ${title}`} placement="right" /> : null}
      </h2>
      {children}
    </section>
  );
}

export function shouldProtectWizardState({
  isConfigurationDirty,
  hasLoadedFile,
  selectedSheet,
  rowCount,
  columnAnalysisCount,
}: {
  isConfigurationDirty: boolean;
  hasLoadedFile: boolean;
  selectedSheet: string;
  rowCount: number;
  columnAnalysisCount: number;
}) {
  const hasLoadedSourceState = hasLoadedFile || selectedSheet.trim() !== '' || rowCount > 0;
  const hasDetectedColumns = hasLoadedSourceState && columnAnalysisCount > 0;
  return isConfigurationDirty || hasLoadedSourceState || hasDetectedColumns;
}

export function getRawPreviewRowNumbers(
  rowMetadata: SheetRowMetadata[],
  startRowNumber: number,
  showRawPreviewFromDataStart: boolean,
) {
  if (rowMetadata.length === 0) {
    return undefined;
  }

  if (!showRawPreviewFromDataStart) {
    return rowMetadata.map((metadata) => metadata.excelRowNumber);
  }

  const lastRowNumber = Math.max(startRowNumber, rowMetadata[rowMetadata.length - 1]?.excelRowNumber ?? startRowNumber);
  return createSequentialRowNumbers(startRowNumber, lastRowNumber, 30);
}

export function getRawPreviewRows(
  rows: RawRow[],
  rowMetadata: SheetRowMetadata[],
  startRowNumber: number,
  showRawPreviewFromDataStart: boolean,
) {
  if (rowMetadata.length === 0) {
    return showRawPreviewFromDataStart ? rows.slice(Math.max(0, startRowNumber - 1)) : rows;
  }

  if (!showRawPreviewFromDataStart) {
    return rows;
  }

  const rowsByExcelRowNumber = new Map(
    rowMetadata.map((metadata) => [metadata.excelRowNumber, rows[metadata.internalRowIndex] ?? []] as const),
  );
  const lastRowNumber = Math.max(startRowNumber, rowMetadata[rowMetadata.length - 1]?.excelRowNumber ?? startRowNumber);
  return createSequentialRowNumbers(startRowNumber, lastRowNumber, 30).map((rowNumber) => rowsByExcelRowNumber.get(rowNumber) ?? []);
}

export function getExcelRowNumberForInternalIndex(rowMetadata: SheetRowMetadata[], internalRowIndex: number) {
  return rowMetadata[internalRowIndex]?.excelRowNumber ?? internalRowIndex + 1;
}

export function getInternalIndexForExcelRowNumber(rowMetadata: SheetRowMetadata[], excelRowNumber: number) {
  if (rowMetadata.length === 0) {
    return Math.max(0, excelRowNumber - 1);
  }

  const nextMetadata = rowMetadata.find((metadata) => metadata.excelRowNumber >= excelRowNumber);
  return nextMetadata?.internalRowIndex ?? rowMetadata.length;
}

export function getInternalDataStartIndexForExcelRowNumber(rowMetadata: SheetRowMetadata[], excelRowNumber: number) {
  if (rowMetadata.length === 0) {
    return Math.max(0, excelRowNumber - 1);
  }

  return rowMetadata.filter((metadata) => metadata.excelRowNumber < excelRowNumber).length;
}

export function getHeaderRowOptions(rowMetadata: SheetRowMetadata[], rowCount: number) {
  const rowNumbers = rowMetadata.length > 0
    ? rowMetadata.map((metadata) => metadata.excelRowNumber)
    : Array.from({ length: rowCount }, (_, index) => index + 1);

  return [
    { value: 'none', label: 'Sin encabezados' },
    ...rowNumbers.map((rowNumber) => ({ value: String(rowNumber), label: `Fila ${rowNumber}` })),
  ];
}

export function getStartRowInputValidationError(value: string) {
  if (value.trim() === '') {
    return 'Ingresá una primera fila de datos.';
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1
    ? ''
    : 'Usá un número entero mayor o igual a 1.';
}

export function getRowConfigurationError(
  headerRowIndex: number | null,
  rowMetadata: SheetRowMetadata[],
  startRowNumber: number,
) {
  if (headerRowIndex === null) {
    return '';
  }

  const headerRowNumber = getExcelRowNumberForInternalIndex(rowMetadata, headerRowIndex);
  return headerRowNumber >= startRowNumber
    ? 'La fila de encabezados debe estar antes de la primera fila de datos.'
    : '';
}

export function applyActiveColumnVisualOrder(inputColumns: InputColumn[], activeColumnOrder: number[]) {
  const syncedActiveOrder = syncActiveColumnOrder(
    activeColumnOrder,
    inputColumns.filter((column) => column.active),
  );
  const orderIndex = new Map(syncedActiveOrder.map((columnIndex, index) => [columnIndex, index]));

  return [...inputColumns].sort((left, right) => {
    if (left.active && right.active) {
      return (orderIndex.get(left.columnIndex) ?? Number.MAX_SAFE_INTEGER)
        - (orderIndex.get(right.columnIndex) ?? Number.MAX_SAFE_INTEGER)
        || left.columnIndex - right.columnIndex;
    }

    if (left.active) {
      return -1;
    }

    if (right.active) {
      return 1;
    }

    return left.columnIndex - right.columnIndex;
  });
}

function createSequentialRowNumbers(startRowNumber: number, lastRowNumber: number, limit: number) {
  const length = Math.min(Math.max(0, lastRowNumber - startRowNumber + 1), limit);
  return Array.from({ length }, (_, index) => startRowNumber + index);
}
