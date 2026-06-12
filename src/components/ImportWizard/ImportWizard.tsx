import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type * as XLSX from 'xlsx';
import { applyOutputIgnoreRulesToProcessedRows, applyRowOverridesToProcessedRows } from '../../domain/import/applyIgnoreRules';
import { analyzeSheetColumns } from '../../domain/import/columnAnalysis';
import { getSheetReadMetadata, getSheetRows } from '../../domain/import/getSheetRows';
import { normalizeNumberInputOnBlur, parseStartRowInputWhileEditing } from '../../domain/import/numberInput';
import { buildProcessedRowsPipeline, getInputColumnId } from '../../domain/import/outputModel';
import { readCsv } from '../../domain/import/readCsv';
import { readWorkbook } from '../../domain/import/readWorkbook';
import { applyColumnVisibilitySettings, createApplyPayloadFromSettings, resolveImportedPreviewSettings, type PreviewSettingsState } from '../../domain/import/settingsApply';
import { validateProcessedRows } from '../../domain/import/validateProcessedRows';
import { useBeforeUnloadWarning } from '../../hooks/useBeforeUnloadWarning';
import { useInternalReloadGuard } from '../../hooks/useInternalReloadGuard';
import { defaultFileNameSettings, loadFileNameSettings, normalizeFileNameSettings, saveFileNameSettings } from '../../services/localFileNameService';
import { createDefaultOutputColumns, loadOutputColumns, saveOutputColumns } from '../../services/localOutputColumnsService';
import { defaultIgnoreRules, loadPersistedSettings, savePersistedSettings } from '../../services/localTemplatesService';
import { showInfoToast } from '../../services/toastService';
import type { ColumnAnalysis, ExportedImportSettings, FileNameSettings as FileNameSettingsType, IgnoreRule, ImportedSettingsApplyPayload, InputNormalizationRule, OutputColumn, RawRow, RowOverrides, SettingsCompatibilityResult, SheetReadMetadata } from '../../types/import';
import { ColumnVisibilityManager } from '../ColumnVisibilityManager/ColumnVisibilityManager';
import { ExportActions } from '../ExportActions/ExportActions';
import { FileNameSettings } from '../FileNameSettings/FileNameSettings';
import { FileUploader } from '../FileUploader/FileUploader';
import { IgnoreRules } from '../IgnoreRules/IgnoreRules';
import { InputNormalizationRules, inputNormalizationSectionInfo, inputNormalizationSectionTitle } from '../InputNormalizationRules/InputNormalizationRules';
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

export function ImportWizard() {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'spreadsheet' | 'csv' | ''>('');
  const [selectedSheet, setSelectedSheet] = useState('');
  const [rows, setRows] = useState<RawRow[]>([]);
  const [sheetReadMetadata, setSheetReadMetadata] = useState<SheetReadMetadata | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [startRowIndex, setStartRowIndex] = useState(0);
  const [startRowInputValue, setStartRowInputValue] = useState('1');
  const [outputColumns, setOutputColumns] = useState<OutputColumn[]>(initialOutputColumns);
  const [fileNameSettings, setFileNameSettings] = useState<FileNameSettingsType>(() => loadFileNameSettings());
  const [columnAnalysis, setColumnAnalysis] = useState<ColumnAnalysis[]>([]);
  const [inputIgnoreRules, setInputIgnoreRules] = useState<IgnoreRule[]>(
    persisted.inputIgnoreRules?.length ? persisted.inputIgnoreRules : defaultIgnoreRules(),
  );
  const [inputNormalizationRules, setInputNormalizationRules] = useState<InputNormalizationRule[]>([]);
  const [outputIgnoreRules, setOutputIgnoreRules] = useState<IgnoreRule[]>(
    persisted.outputIgnoreRules?.length ? persisted.outputIgnoreRules : defaultIgnoreRules(),
  );
  const [inputColumnAliases, setInputColumnAliases] = useState<Record<string, string>>(
    () => persisted.inputColumnAliases ?? {},
  );
  const [rowOverrides, setRowOverrides] = useState<RowOverrides>({});
  const [readError, setReadError] = useState('');
  const [showRawPreviewFromDataStart, setShowRawPreviewFromDataStart] = useState(true);
  const [showAllRawPreviewColumns, setShowAllRawPreviewColumns] = useState(false);
  const [isConfigurationDirty, setIsConfigurationDirty] = useState(false);
  const [isBeforeUnloadSuppressed, setIsBeforeUnloadSuppressed] = useState(false);
  const [discardConfirmation, setDiscardConfirmation] = useState<DiscardConfirmationState | null>(null);
  const [configurationRevision, setConfigurationRevision] = useState(0);
  const [showOutputModelDebug] = useState(() => localStorage.getItem('excel-sanitizer:debug-output-model') === '1');
  const importedColumnVisibilityRef = useRef<ImportedSettingsApplyPayload | null>(null);
  const importedPreviewSettingsRef = useRef<PreviewSettingsState | null>(null);
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
  const selectedSheetObject = workbook && selectedSheet ? workbook.Sheets[selectedSheet] : undefined;
  const maxColumns = useMemo(() => Math.max(1, ...rows.slice(0, 25).map((row) => row.length)), [rows]);
  const rawPreviewRows = useMemo(
    () => (showRawPreviewFromDataStart ? rows.slice(startRowIndex) : rows),
    [rows, showRawPreviewFromDataStart, startRowIndex],
  );
  const rawRowNumbers = useMemo(
    () => getRawRowNumbersFromSheetMetadata(sheetReadMetadata),
    [sheetReadMetadata],
  );
  const rawPreviewRowNumbers = useMemo(
    () => (showRawPreviewFromDataStart ? rawRowNumbers?.slice(startRowIndex) : rawRowNumbers),
    [rawRowNumbers, showRawPreviewFromDataStart, startRowIndex],
  );
  const rawPreviewRowNumberOffset = showRawPreviewFromDataStart ? startRowIndex : 0;
  const activeColumnIndexes = useMemo(
    () => columnAnalysis.filter((column) => !column.ignored).map((column) => column.columnIndex),
    [columnAnalysis],
  );
  const rawPreviewColumnIndexes = useMemo(
    () => columnAnalysis.filter((column) => !column.autoIgnored).map((column) => column.columnIndex),
    [columnAnalysis],
  );
  const hasAutoHiddenColumns = useMemo(
    () => columnAnalysis.some((column) => column.autoIgnored),
    [columnAnalysis],
  );
  const rowConfigurationError = headerRowIndex !== null && headerRowIndex >= startRowIndex
    ? 'La fila de encabezados debe estar antes de la primera fila de datos.'
    : '';
  const rawPreviewSummary = showRawPreviewFromDataStart
    ? `Vista previa desde la fila ${startRowIndex + 1}. Se muestran hasta 30 filas.`
    : 'Vista previa de las primeras 30 filas.';
  const processedPipeline = useMemo(
    () =>
      buildProcessedRowsPipeline({
        rawRows: rows,
        columnAnalysis,
        headerRowIndex,
        startRowIndex,
        outputColumns,
        inputNormalizationRules,
        inputIgnoreRules,
      }),
    [rows, columnAnalysis, headerRowIndex, startRowIndex, outputColumns, inputNormalizationRules, inputIgnoreRules],
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

  useBeforeUnloadWarning(hasWizardStateToProtect && !isBeforeUnloadSuppressed);
  useInternalReloadGuard(hasWizardStateToProtect, () => {
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

    setStartRowInputValue(String(startRowIndex + 1));
  }, [startRowIndex]);

  useEffect(() => {
    if (showOutputModelDebug) {
      console.debug('output-model pipeline', processedPipeline);
    }
  }, [processedPipeline, showOutputModelDebug]);

  useEffect(() => {
    if (!workbook || !selectedSheet || fileType !== 'spreadsheet') {
      return;
    }

    setRows(getSheetRows(workbook, selectedSheet));
    setSheetReadMetadata(getSheetReadMetadata(workbook, selectedSheet));
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
    setShowAllRawPreviewColumns(importedPreviewSettings.showAllRawPreviewColumns);
  }, [selectedSheetObject, rows, columnAnalysis, headerRowIndex, startRowIndex]);

  const resetWizardConfiguration = () => {
    setHeaderRowIndex(null);
    setStartRowIndex(0);
    setShowRawPreviewFromDataStart(true);
    setShowAllRawPreviewColumns(false);
    setInputColumnAliases({});
    setColumnAnalysis([]);
    setInputNormalizationRules([]);
    setInputIgnoreRules(defaultIgnoreRules());
    setOutputColumns(createDefaultOutputColumns());
    setOutputIgnoreRules(defaultIgnoreRules());
    setFileNameSettings(defaultFileNameSettings());
    setRowOverrides({});
    importedColumnVisibilityRef.current = null;
    importedPreviewSettingsRef.current = null;
    setIsConfigurationDirty(false);
    setConfigurationRevision((revision) => revision + 1);
  };

  const requestConfigurationDiscard = (onConfirm: () => void) => {
    if (!hasWizardStateToProtect) {
      onConfirm();
      return;
    }

    setDiscardConfirmation({ onConfirm });
  };

  const cancelConfigurationDiscard = () => {
    setDiscardConfirmation(null);
  };

  const confirmConfigurationDiscard = () => {
    const nextAction = discardConfirmation?.onConfirm;
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
    setSheetReadMetadata(null);
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
        setSheetReadMetadata(null);
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
      setRows(nextWorkbook.SheetNames[0] ? getSheetRows(nextWorkbook, nextWorkbook.SheetNames[0]) : []);
      setSheetReadMetadata(nextWorkbook.SheetNames[0] ? getSheetReadMetadata(nextWorkbook, nextWorkbook.SheetNames[0]) : null);
      setFileType('spreadsheet');
    } catch {
      setReadError('No se pudo leer el archivo. Revisa que sea .xlsx, .xls, .xlsm o .csv.');
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
      return { ok: false as const, error: 'Primero carga un Excel para aplicar settings.' };
    }

    if (compatibility.status === 'blocked') {
      return { ok: false as const, error: 'Estos settings no se pueden aplicar a este archivo.' };
    }

    if (compatibility.status === 'needsRemap') {
      return { ok: false as const, error: 'Estos settings necesitan remapeo de columnas antes de aplicarse.' };
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
    const previewSettings = resolveImportedPreviewSettings(
      { showRawPreviewFromDataStart, showAllRawPreviewColumns },
      payload,
    );
    importedPreviewSettingsRef.current = previewSettings;
    setShowRawPreviewFromDataStart(previewSettings.showRawPreviewFromDataStart);
    setShowAllRawPreviewColumns(previewSettings.showAllRawPreviewColumns);

    setInputColumnAliases(payload.inputColumnAliases);
    importedColumnVisibilityRef.current = payload;
    setColumnAnalysis(applyColumnVisibilitySettings(columnAnalysis, payload));
    setInputNormalizationRules(payload.inputNormalizationRules);
    setInputIgnoreRules(payload.inputIgnoreRules);
    setOutputColumns(payload.outputColumns);
    setOutputIgnoreRules(payload.outputIgnoreRules);
    setFileNameSettings(normalizeFileNameSettings(payload.fileNameSettings));
    setIsConfigurationDirty(true);
  };

  const changeSelectedSheet = (sheetName: string) => {
    if (sheetName === selectedSheet) {
      return;
    }

    const applySheetChange = () => {
      notifyConfigurationDiscarded();
      resetWizardConfiguration();
      setSelectedSheet(sheetName);
      setRows(workbook ? getSheetRows(workbook, sheetName) : []);
      setSheetReadMetadata(workbook ? getSheetReadMetadata(workbook, sheetName) : null);
    };

    if (isConfigurationDirty) {
      requestConfigurationDiscard(applySheetChange);
      return;
    }

    applySheetChange();
  };

  const applyStartRowIndex = (nextRowNumber: number) => {
    if (nextRowNumber - 1 !== startRowIndex) {
      setIsConfigurationDirty(true);
      skipStartRowInputSyncRef.current = true;
      setStartRowIndex(nextRowNumber - 1);
    }
  };

  const applyStartRowInputIfValid = (value: string) => {
    const nextRowNumber = parseStartRowInputWhileEditing(value);
    if (nextRowNumber === undefined) {
      return false;
    }

    applyStartRowIndex(nextRowNumber);
    return true;
  };

  const commitStartRowInput = (value: string) => {
    const rowNumber = normalizeNumberInputOnBlur(value, {
      fallback: startRowIndex + 1,
      min: 1,
      integer: true,
    });

    skipStartRowInputSyncRef.current = false;
    setStartRowInputValue(String(rowNumber));
    applyStartRowIndex(rowNumber);
  };

  return (
    <main className="appShell">
      <ConfirmDialog
        open={Boolean(discardConfirmation)}
        title="Hay cambios sin aplicar"
        message="Si continuás, se perderá la configuración actual."
        cancelLabel="Cancelar"
        confirmLabel="Descartar"
        variant="danger"
        onCancel={cancelConfigurationDiscard}
        onConfirm={confirmConfigurationDiscard}
      />
      <header className="hero">
        <div>
          <p className="eyebrow">PANDORA</p>
          <h1>Limpia, transforma y guarda tus planillas </h1>
          <p>
            Carga un Excel o CSV, configura columnas, aplica transformaciones y descarga un archivo limpio sin tocar fórmulas ni código.
          </p>
        </div>
      </header>

      <div className="wizard">
        <Step title="1. Subir archivo" info="Elegi el Excel o CSV que queres limpiar.">
          <FileUploader
            fileName={fileName}
            emptyHint={!hasLoadedFile ? 'Cargá un archivo para continuar con la configuración.' : undefined}
            onFileSelected={loadFile}
            onFileRemoved={removeFile}
          />
          {readError ? <p className="errorText">{readError}</p> : null}
        </Step>

        {hasLoadedFile ? (
          <>
        <Step title="2. Seleccionar hoja" info="Indica que hoja del archivo se va a procesar.">
          {fileType === 'csv' ? (
            <p className="muted">El archivo CSV se procesa como una única hoja.</p>
          ) : (
            <SheetSelector
              sheetNames={sheetNames}
              selectedSheet={selectedSheet}
              onSelectSheet={changeSelectedSheet}
            />
          )}
          <SettingsActions
            key={configurationRevision}
            fileType={fileType}
            selectedSheet={selectedSheet}
            sheetNames={sheetNames}
            rows={rows}
            headerRowIndex={headerRowIndex}
            startRowIndex={startRowIndex}
            showRawPreviewFromDataStart={showRawPreviewFromDataStart}
            showAllRawPreviewColumns={showAllRawPreviewColumns}
            columnAnalysis={columnAnalysis}
            inputColumnAliases={inputColumnAliases}
            inputNormalizationRules={inputNormalizationRules}
            inputIgnoreRules={inputIgnoreRules}
            outputColumns={outputColumns}
            outputIgnoreRules={outputIgnoreRules}
            fileNameSettings={fileNameSettings}
            onApplySettings={applyImportedSettings}
            onSettingsImported={() => setIsConfigurationDirty(true)}
          />
        </Step>

        <Step title="3. Configurar filas" info="Define donde empiezan los titulos y los datos reales.">
          <div className="twoColumns">
            <Dropdown
              label="Fila de encabezados"
              labelInfo={<InfoTooltip content="Selecciona la fila que contiene los nombres de las columnas." />}
              value={headerRowIndex === null ? 'none' : String(headerRowIndex + 1)}
              options={[
                { value: 'none', label: 'Sin encabezados' },
                ...rows.map((_, index) => ({ value: String(index + 1), label: `Fila ${index + 1}` })),
              ]}
              scrollStrategy="lock"
              onChange={(value) => {
                const nextHeaderRowIndex = value === 'none' ? null : Math.max(0, Number(value) - 1);
                if (nextHeaderRowIndex !== headerRowIndex) {
                  setIsConfigurationDirty(true);
                  setHeaderRowIndex(nextHeaderRowIndex);
                }
              }}
            />
            <div className="field startRowField">
              <span className="labelWithInfo">
                <span>Primera fila de datos</span>
                <InfoTooltip content="Desde esta fila se empiezan a procesar los registros." />
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
            </div>
          </div>
          <div className="twoColumns previewSummaryRow">
            <span aria-hidden="true" />
            <p className="muted previewSummary">{rawPreviewSummary}</p>
          </div>
          {rowConfigurationError ? <p className="errorText rowConfigurationError">{rowConfigurationError}</p> : null}
          <RawPreview
            rows={rawPreviewRows}
            maxColumns={maxColumns}
            activeColumns={rawPreviewColumnIndexes}
            rowNumberOffset={rawPreviewRowNumberOffset}
            rowNumbers={rawPreviewRowNumbers}
            showAllColumns={showAllRawPreviewColumns}
            showHiddenColumnsToggle={hasAutoHiddenColumns}
            onShowAllColumnsChange={(showAllColumns) => {
              setIsConfigurationDirty(true);
              importedPreviewSettingsRef.current = null;
              setShowAllRawPreviewColumns(showAllColumns);
            }}
          />
        </Step>

        <Step title="4. Columnas detectadas" info="Revisa que columnas entran en la receta y cuales se ignoran.">
          <ColumnVisibilityManager
            columns={columnAnalysis}
            showHeaderColumn={headerRowIndex !== null}
            onChange={updateColumnAnalysis}
          />
        </Step>

        <Step title={`5. ${inputNormalizationSectionTitle}`} info={inputNormalizationSectionInfo}>
          <InputNormalizationRules
            inputColumns={processedPipeline.inputColumns}
            rawRows={rows}
            rawRowNumbers={rawRowNumbers}
            headerRowIndex={headerRowIndex}
            rules={inputNormalizationRules}
            onChange={(rules) => {
              setIsConfigurationDirty(true);
              setInputNormalizationRules(rules);
            }}
          />
        </Step>

        <Step title="6. Filtrar filas de entrada" info="Excluye filas usando los datos normalizados.">
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

        <Step title="7. Columnas de salida" info="Define las columnas que tendra el archivo final.">
          <OutputColumnsManager
            inputColumns={processedPipeline.inputColumns}
            sampleInputValues={processedPipeline.includedInputRows[0]?.values ?? processedPipeline.inputRows[0]?.values}
            outputColumns={outputColumns}
            onChange={updateOutputColumns}
          />
        </Step>

        <Step title="8. Filtrar filas de salida" info="Excluye filas despues de aplicar las transformaciones.">
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

        <Step title="9. Vista normalizada" info="Muestra una vista previa del resultado ya procesado.">
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

        <Step title="10. Nombre del archivo de salida" info="Configura como se va a llamar el archivo final.">
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

        <Step title="11. Descargar archivo" info="Genera el archivo final y, si hace falta, el archivo de auditoria.">
          <ExportActions
            rows={processedRowsWithStatus}
            auditRows={auditRows}
            inputColumns={processedPipeline.inputColumns}
            outputColumns={processedPipeline.outputColumns}
            fileNameSettings={fileNameSettings}
            sourceFileName={fileName}
            sheetName={selectedSheet}
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

export function getRawRowNumbersFromSheetMetadata(metadata: SheetReadMetadata | null) {
  if (!metadata) {
    return undefined;
  }

  return metadata.rows
    .filter((row) => !row.isEmpty)
    .map((row) => row.originalRowIndex + 1);
}
