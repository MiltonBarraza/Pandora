import type { InputColumn } from '../../types/import';

export function getInputColumnLabel(inputColumn: InputColumn) {
  const alias = inputColumn.alias?.trim();
  if (alias) {
    return `${inputColumn.columnLetter} - ${alias}`;
  }

  const header = inputColumn.header?.trim();
  if (header && header !== inputColumn.columnLetter) {
    return `${inputColumn.columnLetter} - ${header}`;
  }

  return inputColumn.columnLetter;
}
