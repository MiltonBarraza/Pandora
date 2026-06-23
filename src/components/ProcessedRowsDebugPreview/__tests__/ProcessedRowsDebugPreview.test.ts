import { describe, expect, it } from 'vitest';
import type { ProcessedRow } from '../../../types/import';
import { getNormalizedPreviewLimitText, getNormalizedPreviewRowCountLabel, getNormalizedPreviewRows, getNormalizedPreviewSummary, getVisibleNormalizedPreviewRows, normalizedPreviewRowLimit } from '../ProcessedRowsDebugPreview';

function row(rowNumber: number, status: ProcessedRow['status'] = 'included'): ProcessedRow {
  return {
    rowNumber,
    inputValues: {},
    outputValues: { output: `Valor ${rowNumber}` },
    status,
  };
}

describe('ProcessedRowsPreview helpers', () => {
  it('limits the normalized preview to 30 rows', () => {
    const rows = Array.from({ length: 45 }, (_, index) => row(index + 1));

    const previewRows = getNormalizedPreviewRows(rows);

    expect(previewRows).toHaveLength(normalizedPreviewRowLimit);
    expect(previewRows[0].rowNumber).toBe(1);
    expect(previewRows[29].rowNumber).toBe(30);
  });

  it('describes limited and short previews', () => {
    expect(getNormalizedPreviewLimitText(45, 30)).toBe('Vista previa normalizada: 30 de 45 filas.');
    expect(getNormalizedPreviewLimitText(12, 12)).toBe('Vista previa normalizada: se muestran hasta 30 filas.');
  });

  it('summarizes processed row statuses', () => {
    expect(getNormalizedPreviewSummary([
      row(1, 'included'),
      row(2, 'ignored'),
      row(3, 'error'),
      row(4, 'included'),
    ])).toBe('4 filas procesadas. 2 incluidas, 1 excluidas por filtros, 1 con errores.');
  });

  it('removes output-filtered rows from normalized preview and counts visible rows', () => {
    const rows = [
      row(1, 'included'),
      row(2, 'ignored'),
      row(3, 'included'),
    ];

    expect(getVisibleNormalizedPreviewRows(rows).map((item) => item.rowNumber)).toEqual([1, 3]);
    expect(getNormalizedPreviewRows(rows).map((item) => item.rowNumber)).toEqual([1, 3]);
    expect(getNormalizedPreviewRowCountLabel(2)).toBe('2 filas');
    expect(getNormalizedPreviewRowCountLabel(1)).toBe('1 fila');
  });
});
