import type { RawRow } from '../../types/import';
import type { CombineSource, LoadedCombineSource } from '../../types/combine';
import type { WorkBook } from 'xlsx';
import { columnLetter } from '../import/columnAnalysis';
import { getSheetRows } from '../import/getSheetRows';
import { readCsv } from '../import/readCsv';
import { readWorkbook } from '../import/readWorkbook';

const supportedSpreadsheetExtensions = ['.xlsx', '.xls', '.xlsm'];

export async function readCombineSource(file: File, sourceIndex: number): Promise<CombineSource> {
  return (await readLoadedCombineSource(file, sourceIndex)).source;
}

export async function readLoadedCombineSource(
  file: File,
  sourceIndex: number,
): Promise<LoadedCombineSource> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.csv')) {
    return {
      kind: 'csv',
      source: buildCombineSourceFromRows({
        id: `source:${sourceIndex}`,
        fileName: file.name,
        rows: await readCsv(file),
      }),
    };
  }

  if (supportedSpreadsheetExtensions.some((extension) => lowerName.endsWith(extension))) {
    const workbook = await readWorkbook(await file.arrayBuffer());
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('El archivo Excel no contiene hojas.');
    }

    return {
      kind: 'excel',
      source: createCombineSourceFromWorkbookSheet({
        workbook,
        fileName: file.name,
        sourceId: `source:${sourceIndex}`,
        sheetName,
      }),
      sheetNames: [...workbook.SheetNames],
      workbook,
    };
  }

  throw new Error('Formato no compatible. Usá .xlsx, .xls, .xlsm o .csv.');
}

export function createCombineSourceFromWorkbookSheet({
  workbook,
  fileName,
  sourceId,
  sheetName,
}: {
  workbook: WorkBook;
  fileName: string;
  sourceId: string;
  sheetName: string;
}): CombineSource {
  if (!workbook.Sheets[sheetName]) {
    throw new Error(`La hoja "${sheetName}" no existe en el archivo.`);
  }

  return buildCombineSourceFromRows({
    id: sourceId,
    fileName,
    sheetName,
    rows: getSheetRows(workbook, sheetName),
  });
}

export function buildCombineSourceFromRows({
  id,
  fileName,
  sheetName,
  rows,
}: {
  id: string;
  fileName: string;
  sheetName?: string;
  rows: RawRow[];
}): CombineSource {
  const headerRowIndex = rows.findIndex(rowHasData);
  if (headerRowIndex === -1) {
    throw new Error('El archivo no contiene filas con datos.');
  }

  const headerRow = rows[headerRowIndex];
  const dataRows = rows.slice(headerRowIndex + 1).filter(rowHasData);
  const columnCount = Math.max(headerRow.length, ...dataRows.map((row) => row.length));
  const columns = Array.from({ length: columnCount }, (_, index) => ({
    id: `col:${index}`,
    name: cellText(headerRow[index]).trim() || `Columna ${columnLetter(index)}`,
    index,
  }));

  return {
    id,
    fileName,
    sheetName,
    columns,
    rows: dataRows.map((row, rowIndex) => ({
      id: `row:${rowIndex}`,
      values: Object.fromEntries(columns.map((column) => [column.id, cellText(row[column.index])])),
    })),
  };
}

function rowHasData(row: RawRow) {
  return row.some((value) => cellText(value).trim() !== '');
}

function cellText(value: unknown) {
  return String(value ?? '');
}
