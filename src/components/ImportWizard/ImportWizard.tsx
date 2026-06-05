import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type * as XLSX from 'xlsx';
import { applyOutputIgnoreRulesToProcessedRows, applyRowOverridesToProcessedRows } from '../../domain/import/applyIgnoreRules';
import { analyzeSheetColumns } from '../../domain/import/columnAnalysis';
import { getSheetRows } from '../../domain/import/getSheetRows';
import { buildProcessedRowsPipeline, getInputColumnId } from '../../domain/import/outputModel';
import { readCsv } from '../../domain/import/readCsv';
import { readWorkbook } from '../../domain/import/readWorkbook';
import { applyColumnVisibilitySettings, createApplyPayloadFromSettings, resolveImportedPreviewSettings, type PreviewSettingsState } from '../../domain/import/settingsApply';
import { validateProcessedRows } from '../../domain/import/validateProcessedRows';
import { loadFileNameSettings, saveFileNameSettings } from '../../services/localFileNameService';
import { loadOutputColumns, saveOutputColumns } from '../../services/localOutputColumnsService';
import { defaultIgnoreRules, loadPersistedSettings, savePersistedSettings } from '../../services/localTemplatesService';
import type { ColumnAnalysis, ExportedImportSettings, FileNameSettings as FileNameSettingsType, IgnoreRule, ImportedSettingsApplyPayload, OutputColumn, RawRow, RowOverrides, SettingsCompatibilityResult } from '../../types/import';
import { ColumnVisibilityManager } from '../ColumnVisibilityManager/ColumnVisibilityManager';
import { ExportActions } from '../ExportActions/ExportActions';
import { FileNameSettings } from '../FileNameSettings/FileNameSettings';
import { FileUploader } from '../FileUploader/FileUploader';
import { IgnoreRules } from '../IgnoreRules/IgnoreRules';
import { OutputColumnsManager } from '../OutputColumnsManager/OutputColumnsManager';
import { ProcessedRowsPreview } from '../ProcessedRowsDebugPreview/ProcessedRowsDebugPreview';
import { RawPreview } from '../RawPreview/RawPreview';
import { SheetSelector } from '../SheetSelector/SheetSelector';
import { SettingsActions } from '../SettingsActions/SettingsActions';

const persisted = loadPersistedSettings();
const initialOutputColumns = loadOutputColumns();

export function ImportWizard() {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'spreadsheet' | 'csv' | ''>('');
  const [selectedSheet, setSelectedSheet] = useState('');
  const [rows, setRows] = useState<RawRow[]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [startRowIndex, setStartRowIndex] = useState(0);
  const [outputColumns, setOutputColumns] = useState<OutputColumn[]>(initialOutputColumns);
  const [fileNameSettings, setFileNameSettings] = useState<FileNameSettingsType>(() => loadFileNameSettings());
  const [columnAnalysis, setColumnAnalysis] = useState<ColumnAnalysis[]>([]);
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
  const [showAllRawPreviewColumns, setShowAllRawPreviewColumns] = useState(false);
  const [showOutputModelDebug] = useState(() => localStorage.getItem('excel-sanitizer:debug-output-model') === '1');
  const importedColumnVisibilityRef = useRef<ImportedSettingsApplyPayload | null>(null);
  const importedPreviewSettingsRef = useRef<PreviewSettingsState | null>(null);

  const sheetNames = workbook?.SheetNames ?? [];
  const selectedSheetObject = workbook && selectedSheet ? workbook.Sheets[selectedSheet] : undefined;
  const maxColumns = useMemo(() => Math.max(1, ...rows.slice(0, 25).map((row) => row.length)), [rows]);
  const rawPreviewRows = useMemo(
    () => (showRawPreviewFromDataStart ? rows.slice(startRowIndex) : rows),
    [rows, showRawPreviewFromDataStart, startRowIndex],
  );
  const rawPreviewRowNumberOffset = showRawPreviewFromDataStart ? startRowIndex : 0;
  const activeColumnIndexes = useMemo(
    () => columnAnalysis.filter((column) => !column.ignored).map((column) => column.columnIndex),
    [columnAnalysis],
  );
  const processedPipeline = useMemo(
    () =>
      buildProcessedRowsPipeline({
        rawRows: rows,
        columnAnalysis,
        startRowIndex,
        outputColumns,
        inputIgnoreRules,
      }),
    [rows, columnAnalysis, startRowIndex, outputColumns, inputIgnoreRules],
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
    if (showOutputModelDebug) {
      console.debug('output-model pipeline', processedPipeline);
    }
  }, [processedPipeline, showOutputModelDebug]);

  useEffect(() => {
    if (!workbook || !selectedSheet || fileType !== 'spreadsheet') {
      return;
    }

    setRows(getSheetRows(workbook, selectedSheet));
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

  const loadFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setReadError('');
    setFileName(file.name);
    setRowOverrides({});
    setHeaderRowIndex(null);
    setStartRowIndex(0);
    setShowRawPreviewFromDataStart(true);
    setShowAllRawPreviewColumns(false);
    importedColumnVisibilityRef.current = null;
    importedPreviewSettingsRef.current = null;

    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv');

      if (isCsv) {
        const csvRows = await readCsv(file);
        setWorkbook(null);
        setSelectedSheet('');
        setRows(csvRows);
        setFileType('csv');
        return;
      }

      const data = await file.arrayBuffer();
      const nextWorkbook = await readWorkbook(data);
      setWorkbook(nextWorkbook);
      setSelectedSheet(nextWorkbook.SheetNames[0] ?? '');
      setRows(nextWorkbook.SheetNames[0] ? getSheetRows(nextWorkbook, nextWorkbook.SheetNames[0]) : []);
      setFileType('spreadsheet');
    } catch {
      setReadError('No se pudo leer el archivo. Revisa que sea .xlsx, .xls, .xlsm o .csv.');
    }
  };

  const updateOutputColumns = (nextColumns: OutputColumn[]) => {
    setOutputColumns(nextColumns);
  };

  const updateColumnAnalysis = (nextColumns: ColumnAnalysis[]) => {
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
    setInputIgnoreRules(payload.inputIgnoreRules);
    setOutputColumns(payload.outputColumns);
    setOutputIgnoreRules(payload.outputIgnoreRules);
    setFileNameSettings(payload.fileNameSettings);
  };

  return (
    <main className="appShell">
      <header className="hero">
        <div>
          <p className="eyebrow">excel-sanitizer</p>
          <h1>Sanitizador de archivos tabulares</h1>
          <p>
            Importa un Excel o CSV, mapea columnas, aplica transformaciones y descarga un archivo de salida limpio.
          </p>
        </div>
      </header>

      <div className="wizard">
        <Step title="1. Subir archivo">
          <FileUploader fileName={fileName} onFileSelected={loadFile} />
          {readError ? <p className="errorText">{readError}</p> : null}
        </Step>

        <Step title="2. Seleccionar hoja">
          {fileType === 'csv' ? (
            <p className="muted">El archivo CSV se procesa como una unica hoja.</p>
          ) : (
            <SheetSelector
              sheetNames={sheetNames}
              selectedSheet={selectedSheet}
              onSelectSheet={(sheetName) => {
                importedColumnVisibilityRef.current = null;
                setSelectedSheet(sheetName);
              }}
            />
          )}
        </Step>

        <Step title="Settings reutilizables">
          <SettingsActions
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
            inputIgnoreRules={inputIgnoreRules}
            outputColumns={outputColumns}
            outputIgnoreRules={outputIgnoreRules}
            fileNameSettings={fileNameSettings}
            onApplySettings={applyImportedSettings}
          />
        </Step>

        <Step title="3. Configurar filas">
          <div className="twoColumns">
            <label className="field">
              <span>Fila de encabezados</span>
              <select
                value={headerRowIndex === null ? 'none' : String(headerRowIndex + 1)}
                onChange={(event) => {
                  const value = event.target.value;
                  setHeaderRowIndex(value === 'none' || value === '' ? null : Math.max(0, Number(value) - 1));
                }}
              >
                <option value="none">Sin encabezados</option>
                {rows.map((_, index) => (
                  <option key={index} value={index + 1}>
                    Fila {index + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Primera fila de datos</span>
              <input
                type="number"
                min="1"
                value={startRowIndex + 1}
                onChange={(event) => setStartRowIndex(Math.max(0, Number(event.target.value) - 1))}
              />
            </label>
          </div>
          <label className="checkboxField previewToggle">
            <input
              type="checkbox"
              checked={showRawPreviewFromDataStart}
              onChange={(event) => {
                importedPreviewSettingsRef.current = null;
                setShowRawPreviewFromDataStart(event.target.checked);
              }}
            />
            Mostrar desde la primera fila de datos
          </label>
          {!showRawPreviewFromDataStart ? <p className="muted">Mostrando todas las filas del archivo.</p> : null}
          <RawPreview
            rows={rawPreviewRows}
            maxColumns={maxColumns}
            activeColumns={activeColumnIndexes}
            rowNumberOffset={rawPreviewRowNumberOffset}
            showAllColumns={showAllRawPreviewColumns}
            onShowAllColumnsChange={(showAllColumns) => {
              importedPreviewSettingsRef.current = null;
              setShowAllRawPreviewColumns(showAllColumns);
            }}
          />
        </Step>

        <Step title="4. Columnas detectadas">
          <ColumnVisibilityManager columns={columnAnalysis} onChange={updateColumnAnalysis} />
        </Step>

        <Step title="5. Filtrar filas de entrada">
          <IgnoreRules
            mode="input"
            inputColumns={processedPipeline.inputColumns}
            outputColumns={processedPipeline.outputColumns}
            rules={inputIgnoreRules}
            onChange={setInputIgnoreRules}
          />
        </Step>

        <Step title="6. Columnas de salida">
          <OutputColumnsManager
            inputColumns={processedPipeline.inputColumns}
            sampleInputValues={processedPipeline.includedInputRows[0]?.values ?? processedPipeline.inputRows[0]?.values}
            outputColumns={outputColumns}
            onChange={updateOutputColumns}
          />
        </Step>

        <Step title="7. Filtrar filas de salida">
          <IgnoreRules
            mode="output"
            inputColumns={processedPipeline.inputColumns}
            outputColumns={processedPipeline.outputColumns}
            rules={outputIgnoreRules}
            onChange={setOutputIgnoreRules}
          />
        </Step>

        <Step title="8. Vista normalizada">
          <ProcessedRowsPreview
            rows={processedRowsWithStatus}
            outputColumns={processedPipeline.outputColumns}
            rowOverrides={rowOverrides}
            onRowOverridesChange={setRowOverrides}
          />
          {showOutputModelDebug ? (
            <p className="muted">Debug del modelo nuevo activo en consola.</p>
          ) : null}
        </Step>

        <Step title="9. Nombre del archivo de salida">
          <FileNameSettings
            settings={fileNameSettings}
            sourceFileName={fileName}
            sheetName={selectedSheet}
            onChange={setFileNameSettings}
          />
        </Step>

        <Step title="10. Descargar archivo">
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
      </div>
    </main>
  );
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

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
