import * as XLSX from 'xlsx';

export const productosMinimoRows = [
  ['Código', 'Nombre', 'Precio'],
  ['A1', 'Pincel', 10],
  ['B2', 'Rodillo', 20],
] as const;

export function writeProductosMinimoWorkbook(filePath: string) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(productosMinimoRows.map((row) => [...row]));

  XLSX.utils.book_append_sheet(workbook, sheet, 'Productos');
  XLSX.writeFile(workbook, filePath, { bookType: 'xlsx' });
}
