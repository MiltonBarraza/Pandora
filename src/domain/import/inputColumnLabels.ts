import type { AvailableInputColumn, InputColumn, RealInputColumn, VirtualInputColumn } from '../../types/import';

export const virtualInputColumnIdPrefix = 'virtual:';

export function isVirtualInputColumnId(id: string) {
  return id.startsWith(virtualInputColumnIdPrefix);
}

export function isVirtualInputColumn(column: AvailableInputColumn): column is VirtualInputColumn {
  return column.kind === 'virtual';
}

export function toRealInputColumns(inputColumns: InputColumn[]): RealInputColumn[] {
  return inputColumns.map((inputColumn) => ({
    ...inputColumn,
    kind: 'real',
  }));
}

export function getAvailableInputColumnLabel(inputColumn: AvailableInputColumn) {
  return isVirtualInputColumn(inputColumn)
    ? inputColumn.label
    : getInputColumnLabel(inputColumn);
}

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
