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

export const ventasConMetadataRows = [
  ['Reporte de ventas trimestral'],
  ['Sucursal Centro'],
  ['Período 2026-Q2'],
  ['Generado automáticamente'],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  ['Código', 'Cliente', 'Importe'],
  ['V1', 'Comercio Uno', 100.5],
  ['V2', 'Comercio Dos', 200],
] as const;

export function writeWorkbookWithShiftedHeaders(filePath: string) {
  writeWorkbook(filePath, 'Ventas', ventasConMetadataRows);
}

export const productosConEtiquetaRows = [
  ['Código', 'Nombre', 'Presentación'],
  ['A1', 'Pincel', '20 mm'],
  ['B2', 'Rodillo', '10 cm'],
] as const;

export function writeConcatRecipeWorkbook(filePath: string) {
  writeWorkbook(filePath, 'Productos', productosConEtiquetaRows);
}

export const fechasParaNormalizarRows = [
  ['Código', 'Fecha'],
  ['F1', '05/01/2026'],
  ['F2', '17/11/2025'],
  ['F3'],
  ['F4', 'fecha inválida'],
] as const;

export function writeDateRecipeWorkbook(filePath: string) {
  writeWorkbook(filePath, 'Fechas', fechasParaNormalizarRows);
}

export const productosPorCategoriaRows = [
  ['Producto', 'Cantidad'],
  ['Pincel', 2],
  ['Rodillo', 3],
  ['Espátula', 1],
  ['Lija', 5],
] as const;

export function writeManualRangeRecipeWorkbook(filePath: string) {
  writeWorkbook(filePath, 'Productos', productosPorCategoriaRows);
}

function writeWorkbook(filePath: string, sheetName: string, rows: readonly (readonly (string | number)[])[]) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows.map((row) => [...row]));

  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filePath, { bookType: 'xlsx' });
}
