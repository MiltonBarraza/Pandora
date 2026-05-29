import type { NormalizedRow } from '../../types/import';

export function validateRows(rows: NormalizedRow[]): NormalizedRow[] {
  return rows.map((row) => {
    const hasValue = Object.values(row.values).some((value) => value.trim() !== '');
    return hasValue ? { ...row, status: 'included' } : { ...row, status: 'error', error: 'Fila sin datos de salida' };
  });
}
