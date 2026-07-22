import { writeFileSync } from 'node:fs';

export const productosEspecialesRows = [
  ['Código', 'Producto', 'Descripción', 'Precio'],
  ['A1', 'Pincel, ancho', 'Mango de madera', '10.5'],
  ['B2', 'Rodillo "Pro"', 'Para pared, techo y madera', '20'],
  ['C3', 'Lija ámbar', '', '5'],
] as const;

export function writeProductosEspecialesCsv(filePath: string) {
  const csv = `${productosEspecialesRows.map(serializeCsvRow).join('\r\n')}\r\n`;
  writeFileSync(filePath, csv, 'utf8');
}

function serializeCsvRow(row: readonly string[]) {
  return row.map(serializeCsvCell).join(',');
}

function serializeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
