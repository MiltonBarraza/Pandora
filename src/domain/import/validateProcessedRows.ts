import type { OutputColumn, ProcessedRow } from '../../types/import';
import { getEnabledOutputColumns } from './outputModel';

type ValidateProcessedRowsOptions = {
  warnPartialEmptyRows?: boolean;
};

export function validateProcessedRows(
  rows: ProcessedRow[],
  outputColumns: OutputColumn[],
  options: ValidateProcessedRowsOptions = {},
): ProcessedRow[] {
  const enabledColumns = getEnabledOutputColumns(outputColumns);

  if (enabledColumns.length === 0) {
    return rows;
  }

  return rows.map((row) => validateProcessedRow(row, enabledColumns, options));
}

function validateProcessedRow(
  row: ProcessedRow,
  enabledColumns: OutputColumn[],
  options: ValidateProcessedRowsOptions,
): ProcessedRow {
  if (row.status === 'error' || row.error || row.status === 'ignored') {
    return row;
  }

  const outputValues = enabledColumns.map((column) => String(row.outputValues[column.id] ?? '').trim());
  const emptyCount = outputValues.filter((value) => value === '').length;

  if (emptyCount === outputValues.length) {
    return {
      ...row,
      status: 'ignored',
      ignoredReason: 'Fila sin valores de salida',
    };
  }

  if (options.warnPartialEmptyRows && emptyCount > 0) {
    return {
      ...row,
      warnings: [...(row.warnings ?? []), 'Algunas columnas de salida estan vacias'],
    };
  }

  return row;
}
