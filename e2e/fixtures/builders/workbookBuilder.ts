import * as XLSX from 'xlsx';

export const productosMinimoRows = [
  ['Código', 'Nombre', 'Precio'],
  ['A1', 'Pincel', 10],
  ['B2', 'Rodillo', 20],
] as const;

export function writeProductosMinimoWorkbook(filePath: string) {
  writeWorkbook(filePath, 'Productos', productosMinimoRows);
}

export const productosACombineRows = [
  ['Código', 'Producto', 'Precio'],
  ['A1', 'Pincel', 10],
  ['A2', 'Rodillo', 20],
] as const;

export const productosBCombineRows = [
  ['Producto', 'Código', 'Stock'],
  ['Lija', 'B1', 5],
  ['Cinta', 'B2', 8],
] as const;

export function writeProductosACombineWorkbook(filePath: string) {
  writeWorkbook(filePath, 'Productos A', productosACombineRows);
}

export function writeProductosBCombineWorkbook(filePath: string) {
  writeWorkbook(filePath, 'Productos B', productosBCombineRows);
}

export const resumenMultiSheetRows = [
  ['Métrica', 'Valor'],
  ['Total', 2],
  ['Estado', 'Activo'],
] as const;

export const productosMultiSheetRows = [
  ['Código', 'Producto', 'Precio'],
  ['P1', 'Brocha', 15],
  ['P2', 'Espátula', 25],
] as const;

export function writeMultiSheetWorkbook(filePath: string) {
  const workbook = XLSX.utils.book_new();
  const resumenSheet = XLSX.utils.aoa_to_sheet(resumenMultiSheetRows.map((row) => [...row]));
  const productosSheet = XLSX.utils.aoa_to_sheet(productosMultiSheetRows.map((row) => [...row]));

  XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');
  XLSX.utils.book_append_sheet(workbook, productosSheet, 'Productos');
  XLSX.writeFile(workbook, filePath, { bookType: 'xlsx' });
}

function writeWorkbook(filePath: string, sheetName: string, rows: readonly (readonly (string | number)[])[]) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows.map((row) => [...row]));

  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filePath, { bookType: 'xlsx' });
}
