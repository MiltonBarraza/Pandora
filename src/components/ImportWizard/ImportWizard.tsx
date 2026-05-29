import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type * as XLSX from 'xlsx';
import { applyIgnoreRules } from '../../domain/import/applyIgnoreRules';
import { buildOutputRows } from '../../domain/import/buildOutputRows';
import { analyzeSheetColumns } from '../../domain/import/columnAnalysis';
import { getSheetRows } from '../../domain/import/getSheetRows';
import { guessColumnMapping } from '../../domain/import/normalizeHeaders';
import { readCsv } from '../../domain/import/readCsv';
import { readWorkbook } from '../../domain/import/readWorkbook';
import { validateRows } from '../../domain/import/validateRows';
import { loadCategories, saveCategories } from '../../services/localCategoriesService';
import { loadFileNameSettings, saveFileNameSettings } from '../../services/localFileNameService';
import { defaultIgnoreRules, defaultTransformationRules, loadPersistedSettings, savePersistedSettings } from '../../services/localTemplatesService';
import type { ColumnAnalysis, ColumnMapping, FileNameSettings as FileNameSettingsType, IgnoreRule, OutputCategory, RawRow, RowOverrides, TransformationRule } from '../../types/import';
import { CategoriesManager } from '../CategoriesManager/CategoriesManager';
import { ColumnMapper } from '../ColumnMapper/ColumnMapper';
import { ColumnVisibilityManager } from '../ColumnVisibilityManager/ColumnVisibilityManager';
import { ExportActions } from '../ExportActions/ExportActions';
import { FileNameSettings } from '../FileNameSettings/FileNameSettings';
import { FileUploader } from '../FileUploader/FileUploader';
import { IgnoreRules } from '../IgnoreRules/IgnoreRules';
import { NormalizedPreview } from '../NormalizedPreview/NormalizedPreview';
import { OutputColumnsManager } from '../OutputColumnsManager/OutputColumnsManager';
import { RawPreview } from '../RawPreview/RawPreview';
import { SheetSelector } from '../SheetSelector/SheetSelector';
import { TransformationRules } from '../TransformationRules/TransformationRules';

const persisted = loadPersistedSettings();
const initialCategories = loadCategories();

export function ImportWizard() {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'spreadsheet' | 'csv' | ''>('');
  const [selectedSheet, setSelectedSheet] = useState('');
  const [rows, setRows] = useState<RawRow[]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [startRowIndex, setStartRowIndex] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>(persisted.columnMapping ?? {});
  const [categories, setCategories] = useState<OutputCategory[]>(initialCategories);
  const [fileNameSettings, setFileNameSettings] = useState<FileNameSettingsType>(() => loadFileNameSettings());
  const [columnAnalysis, setColumnAnalysis] = useState<ColumnAnalysis[]>([]);
  const [transformationRules, setTransformationRules] = useState<TransformationRule[]>(
    persisted.transformationRules?.length ? persisted.transformationRules : defaultTransformationRules(),
  );
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>(
    persisted.ignoreRules?.length ? persisted.ignoreRules : defaultIgnoreRules(),
  );
  const [rowOverrides, setRowOverrides] = useState<RowOverrides>({});
  const [readError, setReadError] = useState('');

  const sheetNames = workbook?.SheetNames ?? [];
  const selectedSheetObject = workbook && selectedSheet ? workbook.Sheets[selectedSheet] : undefined;
  const headerRow = headerRowIndex === null ? undefined : rows[headerRowIndex];
  const maxColumns = useMemo(() => Math.max(1, ...rows.slice(0, 25).map((row) => row.length)), [rows]);
  const activeColumnIndexes = useMemo(
    () => columnAnalysis.filter((column) => !column.ignored).map((column) => column.columnIndex),
    [columnAnalysis],
  );
  const normalizedRows = useMemo(
    () =>
      applyIgnoreRules(
        validateRows(
          buildOutputRows(rows, {
            startRowIndex,
            columnMapping: mapping,
            categories,
            transformationRules,
            activeColumnIndexes,
          }),
        ),
        ignoreRules,
        rowOverrides,
      ),
    [rows, startRowIndex, mapping, categories, transformationRules, activeColumnIndexes, ignoreRules, rowOverrides],
  );

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveFileNameSettings(fileNameSettings);
  }, [fileNameSettings]);

  useEffect(() => {
    savePersistedSettings({
      columnMapping: mapping,
      transformationRules,
      ignoreRules,
    });
  }, [mapping, transformationRules, ignoreRules]);

  useEffect(() => {
    if (!workbook || !selectedSheet || fileType !== 'spreadsheet') {
      return;
    }

    setRows(getSheetRows(workbook, selectedSheet));
  }, [workbook, selectedSheet, fileType]);

  useEffect(() => {
    setColumnAnalysis(analyzeSheetColumns(selectedSheetObject, rows, undefined, headerRowIndex, startRowIndex));
  }, [selectedSheetObject, rows, headerRowIndex, startRowIndex]);

  useEffect(() => {
    const hasMappedColumn = Object.values(mapping).some((categoryId) => categoryId && categoryId !== 'ignore');
    if (hasMappedColumn || !headerRow || columnAnalysis.length === 0) {
      return;
    }

    setMapping(filterMappingByActiveColumns(guessColumnMapping(headerRow, categories), activeColumnIndexes));
  }, [headerRow, mapping, categories, activeColumnIndexes, columnAnalysis.length]);

  const loadFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setReadError('');
    setFileName(file.name);
    setMapping({});
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

  const updateCategories = (nextCategories: OutputCategory[]) => {
    const nextIds = new Set(nextCategories.map((category) => category.id));
    setCategories(nextCategories);
    setMapping(
      Object.fromEntries(
        Object.entries(mapping).map(([columnIndex, categoryId]) => [
          columnIndex,
          categoryId === 'ignore' || nextIds.has(categoryId) ? categoryId : 'ignore',
        ]),
      ),
    );
    setTransformationRules(
      transformationRules.filter(
        (rule) => nextIds.has(rule.sourceColumn) && nextIds.has(rule.targetCategoryId),
      ),
    );
  };

  const applyHeaderGuess = () => {
    setMapping(filterMappingByActiveColumns(guessColumnMapping(headerRow, categories), activeColumnIndexes));
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

        <Step title="5. Categorias de salida">
          <CategoriesManager categories={categories} onChange={updateCategories} />
        </Step>

        <Step title="6. Mapear columnas">
          <div className="sectionHeader">
            <p>Asigna columnas del archivo original a categorias de salida.</p>
            <button type="button" className="secondary" onClick={applyHeaderGuess}>
              Detectar por encabezados
            </button>
          </div>
          <ColumnMapper
            headerRow={headerRow}
            maxColumns={maxColumns}
            activeColumns={activeColumnIndexes}
            mapping={mapping}
            categories={categories}
            onChange={setMapping}
          />
        </Step>

        <Step title="7. Reglas de transformacion">
          <TransformationRules
            categories={categories}
            rules={transformationRules}
            onChange={setTransformationRules}
            onCategoriesChange={updateCategories}
          />
        </Step>

        <Step title="8. Orden del archivo de salida">
          <OutputColumnsManager categories={categories} onChange={updateCategories} />
        </Step>

        <Step title="9. Reglas para ignorar filas">
          <IgnoreRules categories={categories} rules={ignoreRules} onChange={setIgnoreRules} />
        </Step>

        <Step title="10. Vista normalizada">
          <NormalizedPreview
            rows={normalizedRows}
            categories={categories}
            rowOverrides={rowOverrides}
            onRowOverridesChange={setRowOverrides}
          />
        </Step>

        <Step title="11. Nombre del archivo de salida">
          <FileNameSettings
            settings={fileNameSettings}
            sourceFileName={fileName}
            sheetName={selectedSheet}
            onChange={setFileNameSettings}
          />
        </Step>

        <Step title="12. Descargar archivo">
          <ExportActions
            rows={normalizedRows}
            categories={categories}
            fileNameSettings={fileNameSettings}
            sourceFileName={fileName}
            sheetName={selectedSheet}
          />
        </Step>
      </div>
    </main>
  );
}

function filterMappingByActiveColumns(mapping: ColumnMapping, activeColumnIndexes: number[]) {
  const activeColumns = new Set(activeColumnIndexes);
  return Object.fromEntries(
    Object.entries(mapping).map(([columnIndex, categoryId]) => [
      columnIndex,
      activeColumns.has(Number(columnIndex)) ? categoryId : 'ignore',
    ]),
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
