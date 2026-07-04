import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import type { OutputColumn, ProcessedRow } from '../../../types/import';
import { exportXlsxFromProcessedRows } from '../exportXlsx';

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return { ...actual, writeFile: vi.fn() };
});

beforeEach(() => {
  vi.mocked(XLSX.writeFile).mockClear();
});

describe('exportXlsxFromProcessedRows', () => {
  it('exports the sanitized data in Hoja sanitizada', () => {
    exportXlsxFromProcessedRows(rows, columns, 'resultado');

    const workbook = vi.mocked(XLSX.writeFile).mock.calls[0]?.[0];
    expect(workbook?.SheetNames).toEqual(['Hoja sanitizada']);
    expect(XLSX.writeFile).toHaveBeenCalledWith(workbook, 'resultado.xlsx');
  });
});

const columns: OutputColumn[] = [{
  id: 'output:1',
  label: 'Código',
  order: 0,
  enabled: true,
  recipe: { type: 'empty' },
}];

const rows: ProcessedRow[] = [{
  rowNumber: 2,
  inputValues: {},
  outputValues: { 'output:1': 'A1' },
  status: 'included',
}];
