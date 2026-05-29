import type { ColumnMapping, OutputCategory, RawRow } from '../../types/import';

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function guessColumnMapping(headerRow: RawRow | undefined, categories: OutputCategory[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  if (!headerRow) {
    return mapping;
  }

  headerRow.forEach((header, index) => {
    const normalizedHeader = normalize(header);
    const match = categories.find((category) => normalizedHeader.includes(normalize(category.name)));
    mapping[index] = match?.id ?? 'ignore';
  });

  return mapping;
}

export function columnLabel(index: number, headerRow?: RawRow) {
  const letter = XLSXColumnName(index);
  const header = String(headerRow?.[index] ?? '').trim();
  return header ? `${letter} - ${header}` : letter;
}

function XLSXColumnName(index: number) {
  let dividend = index + 1;
  let columnName = '';

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}
