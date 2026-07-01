import type { RawRow } from '../../types/import';
import type { CombineSource } from '../../types/combine';
import { columnLetter } from '../import/columnAnalysis';
import { getSheetRows } from '../import/getSheetRows';
import { readCsv } from '../import/readCsv';
import { readWorkbook } from '../import/readWorkbook';

const supportedSpreadsheetExtensions = ['.xlsx', '.xls', '.xlsm'];

export async function readCombineSource(file: File, sourceIndex: number): Promise<CombineSource> {
  const lowerName = file.name.toLowerCase();
  let rows: RawRow[];
  let sheetName: string | undefined;

  if (lowerName.endsWith('.csv')) {
    rows = await readCsv(file);
  } else if (supportedSpreadsheetExtensions.some((extension) => lowerName.endsWith(extension))) {
    const workbook = await readWorkbook(await file.arrayBuffer());
    sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('El archivo Excel no contiene hojas.');
    }
    rows = getSheetRows(workbook, sheetName);
  } else {
    throw new Error('Formato no compatible. Usá .xlsx, .xls, .xlsm o .csv.');
  }

  return buildCombineSourceFromRows({
    id: `source:${sourceIndex}`,
    fileName: file.name,
    sheetName,
    rows,
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
