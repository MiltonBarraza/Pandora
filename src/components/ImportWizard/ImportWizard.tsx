import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type * as XLSX from 'xlsx';
import { applyIgnoreRulesToProcessedRows } from '../../domain/import/applyIgnoreRules';
import { analyzeSheetColumns } from '../../domain/import/columnAnalysis';
import { getSheetRows } from '../../domain/import/getSheetRows';
import { buildInputColumnsFromAnalysis, buildProcessedRowsPipeline, migrateLegacyConfigToOutputColumns } from '../../domain/import/outputModel';
import { readCsv } from '../../domain/import/readCsv';
import { readWorkbook } from '../../domain/import/readWorkbook';
import { validateProcessedRows } from '../../domain/import/validateProcessedRows';
import { loadLegacyCategories } from '../../services/localCategoriesService';
import { loadFileNameSettings, saveFileNameSettings } from '../../services/localFileNameService';
import { hasSavedOutputColumnsConfig, loadOutputColumns, saveOutputColumns } from '../../services/localOutputColumnsService';
import { defaultIgnoreRules, loadPersistedSettings, savePersistedSettings } from '../../services/localTemplatesService';
import type { ColumnAnalysis, FileNameSettings as FileNameSettingsType, IgnoreRule, OutputColumn, RawRow, RowOverrides } from '../../types/import';
import { ColumnVisibilityManager } from '../ColumnVisibilityManager/ColumnVisibilityManager';
import { ExportActions } from '../ExportActions/ExportActions';
import { FileNameSettings } from '../FileNameSettings/FileNameSettings';
import { FileUploader } from '../FileUploader/FileUploader';
import { IgnoreRules } from '../IgnoreRules/IgnoreRules';
import { OutputColumnsManager } from '../OutputColumnsManager/OutputColumnsManager';
import { ProcessedRowsPreview } from '../ProcessedRowsDebugPreview/ProcessedRowsDebugPreview';
import { RawPreview } from '../RawPreview/RawPreview';
import { SheetSelector } from '../SheetSelector/SheetSelector';

const persisted = loadPersistedSettings();
const initialOutputColumns = loadOutputColumns();
const hasInitialOutputColumnsConfig = hasSavedOutputColumnsConfig();
const legacyCategories = hasInitialOutputColumnsConfig ? [] : loadLegacyCategories();
const legacyColumnMapping = persisted.columnMapping ?? {};

export function ImportWizard() {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'spreadsheet' | 'csv' | ''>('');
  const [selectedSheet, setSelectedSheet] = useState('');
  const [rows, setRows] = useState<RawRow[]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [startRowIndex, setStartRowIndex] = useState(0);
  const [outputColumns, setOutputColumns] = useState<OutputColumn[]>(initialOutputColumns);
  const [didMigrateOutputColumns, setDidMigrateOutputColumns] = useState(hasInitialOutputColumnsConfig);
  const [fileNameSettings, setFileNameSettings] = useState<FileNameSettingsType>(() => loadFileNameSettings());
  const [columnAnalysis, setColumnAnalysis] = useState<ColumnAnalysis[]>([]);
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>(
    persisted.ignoreRules?.length ? persisted.ignoreRules : defaultIgnoreRules(),
  );
  const [rowOverrides, setRowOverrides] = useState<RowOverrides>({});
  const [readError, setReadError] = useState('');
  const [showOutputModelDebug] = useState(() => localStorage.getItem('excel-sanitizer:debug-output-model') === '1');

  const sheetNames = workbook?.SheetNames ?? [];
  const selectedSheetObject = workbook && selectedSheet ? workbook.Sheets[selectedSheet] : undefined;
  const maxColumns = useMemo(() => Math.max(1, ...rows.slice(0, 25).map((row) => row.length)), [rows]);
  const activeColumnIndexes = useMemo(
    () => columnAnalysis.filter((column) => !column.ignored).map((column) => column.columnIndex),
    [columnAnalysis],
  );
  const inputColumns = useMemo(
    () => buildInputColumnsFromAnalysis(columnAnalysis),
    [columnAnalysis],
  );
  const migratedLegacyOutputColumns = useMemo(
    () =>
      migrateLegacyConfigToOutputColumns({
        categories: legacyCategories,
        columnMapping: legacyColumnMapping,
        inputColumns,
      }),
    [inputColumns],
  );
  const activeOutputColumns =
    didMigrateOutputColumns || outputColumns.length ? outputColumns : migratedLegacyOutputColumns;
  const processedPipeline = useMemo(
    () =>
      buildProcessedRowsPipeline({
        rawRows: rows,
        columnAnalysis,
        startRowIndex,
        outputColumns: activeOutputColumns,
      }),
    [rows, columnAnalysis, startRowIndex, activeOutputColumns],
  );
  const processedRowsWithStatus = useMemo(
    () =>
      applyIgnoreRulesToProcessedRows({
        rows: validateProcessedRows(processedPipeline.processedRows, processedPipeline.outputColumns),
        ignoreRules,
        rowOverrides,
        inputColumns: processedPipeline.inputColumns,
        outputColumns: processedPipeline.outputColumns,
      }),
    [processedPipeline.processedRows, processedPipeline.inputColumns, processedPipeline.outputColumns, ignoreRules, rowOverrides],
  );

  useEffect(() => {
    if (!didMigrateOutputColumns && outputColumns.length === 0) {
      return;
    }

    saveOutputColumns(outputColumns);
  }, [didMigrateOutputColumns, outputColumns]);

  useEffect(() => {
    saveFileNameSettings(fileNameSettings);
  }, [fileNameSettings]);

  useEffect(() => {
    const nextSettings = {
      ignoreRules,
    };

    savePersistedSettings(
      !didMigrateOutputColumns && Object.keys(legacyColumnMapping).length > 0
        ? { ...nextSettings, columnMapping: legacyColumnMapping }
        : nextSettings,
    );
  }, [didMigrateOutputColumns, ignoreRules]);

  useEffect(() => {
    if (showOutputModelDebug) {
      console.debug('output-model pipeline', processedPipeline);
    }
  }, [processedPipeline, showOutputModelDebug]);

  useEffect(() => {
    setOutputColumns((currentColumns) => {
      if (didMigrateOutputColumns || currentColumns.length > 0 || inputColumns.length === 0) {
        return currentColumns;
      }

      return areOutputColumnsEqual(currentColumns, migratedLegacyOutputColumns) ? currentColumns : migratedLegacyOutputColumns;
    });
    if (!didMigrateOutputColumns && inputColumns.length > 0 && migratedLegacyOutputColumns.length > 0) {
      setDidMigrateOutputColumns(true);
    }
  }, [didMigrateOutputColumns, inputColumns.length, migratedLegacyOutputColumns]);

  useEffect(() => {
    if (!workbook || !selectedSheet || fileType !== 'spreadsheet') {
      return;
    }

    setRows(getSheetRows(workbook, selectedSheet));
  }, [workbook, selectedSheet, fileType]);

  useEffect(() => {
    setColumnAnalysis(analyzeSheetColumns(selectedSheetObject, rows, undefined, headerRowIndex, startRowIndex));
  }, [selectedSheetObject, rows, headerRowIndex, startRowIndex]);

  const loadFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setReadError('');
    setFileName(file.name);
    setRowOverrides({});
    setHeaderRowIndex(null);
    setStartRowIndex(0);

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
    setDidMigrateOutputColumns(true);
    setOutputColumns(nextColumns);
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
            <SheetSelector sheetNames={sheetNames} selectedSheet={selectedSheet} onSelectSheet={setSelectedSheet} />
          )}
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
          <RawPreview rows={rows} maxColumns={maxColumns} activeColumns={activeColumnIndexes} />
        </Step>

        <Step title="4. Columnas detectadas">
          <ColumnVisibilityManager columns={columnAnalysis} onChange={setColumnAnalysis} />
        </Step>

        <Step title="5. Columnas de salida">
          <OutputColumnsManager
            inputColumns={processedPipeline.inputColumns}
            outputColumns={activeOutputColumns}
            onChange={updateOutputColumns}
          />
        </Step>

        <Step title="6. Reglas para ignorar filas">
          <IgnoreRules
            inputColumns={processedPipeline.inputColumns}
            outputColumns={processedPipeline.outputColumns}
            rules={ignoreRules}
            onChange={setIgnoreRules}
          />
        </Step>

        <Step title="7. Vista normalizada">
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

        <Step title="8. Nombre del archivo de salida">
          <FileNameSettings
            settings={fileNameSettings}
            sourceFileName={fileName}
            sheetName={selectedSheet}
            onChange={setFileNameSettings}
          />
        </Step>

        <Step title="9. Descargar archivo">
          <ExportActions
            rows={processedRowsWithStatus}
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

function areOutputColumnsEqual(left: OutputColumn[], right: OutputColumn[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
