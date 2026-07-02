// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FileNameSettings, OutputColumn, ProcessedRow } from '../../types/import';
import { ExportActions } from './ExportActions';

afterEach(cleanup);

describe('ExportActions processed result', () => {
  it('emits a neutral export result from included rows', async () => {
    const onSaveProcessedResult = vi.fn();
    renderExportActions({ onSaveProcessedResult });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar para combinar' }));

    expect(onSaveProcessedResult).toHaveBeenCalledTimes(1);
    const result = onSaveProcessedResult.mock.calls[0][0];
    expect(result).toMatchObject({
      fileBaseName: 'resultado-final',
      sourceFileName: 'origen.xlsx',
      sheetName: 'Productos',
      columns: [
        { id: 'code', label: 'Código', order: 0, enabled: true },
        { id: 'internal', label: 'Interno', order: 1, enabled: false },
      ],
      rows: [{ status: 'included', outputValues: { code: 'A1', internal: 'X' } }],
    });
    expect(typeof result.id).toBe('string');
    expect(result.rows[0]).not.toHaveProperty('inputValues');
    expect(result.rows[0]).not.toHaveProperty('warnings');
    expect(result.columns[0]).not.toHaveProperty('recipe');
  });

  it('does not render the action without a callback', () => {
    renderExportActions();

    expect(screen.queryByRole('button', { name: 'Guardar para combinar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Guardar hoja en lote' })).toBeNull();
  });

  it('emits a neutral result for the multi-sheet batch action', async () => {
    const onSaveToMultiSheetBatch = vi.fn();
    renderExportActions({ onSaveToMultiSheetBatch });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar hoja en lote' }));

    expect(onSaveToMultiSheetBatch).toHaveBeenCalledTimes(1);
    expect(onSaveToMultiSheetBatch.mock.calls[0][0]).toMatchObject({
      sourceFileName: 'origen.xlsx',
      sheetName: 'Productos',
      rows: [{ status: 'included' }],
    });
  });

  it('disables the action without included rows', () => {
    renderExportActions({
      onSaveProcessedResult: vi.fn(),
      rows: [{ ...includedRow, status: 'ignored' }],
    });

    expect((screen.getByRole('button', { name: 'Guardar para combinar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables the action without enabled output columns', () => {
    renderExportActions({
      onSaveProcessedResult: vi.fn(),
      outputColumns: outputColumns.map((column) => ({ ...column, enabled: false })),
    });

    expect((screen.getByRole('button', { name: 'Guardar para combinar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables the multi-sheet action without included rows', () => {
    renderExportActions({
      onSaveToMultiSheetBatch: vi.fn(),
      rows: [{ ...includedRow, status: 'ignored' }],
    });

    expect((screen.getByRole('button', { name: 'Guardar hoja en lote' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables the multi-sheet action without enabled output columns', () => {
    renderExportActions({
      onSaveToMultiSheetBatch: vi.fn(),
      outputColumns: outputColumns.map((column) => ({ ...column, enabled: false })),
    });

    expect((screen.getByRole('button', { name: 'Guardar hoja en lote' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps existing download actions available', () => {
    renderExportActions({ onSaveProcessedResult: vi.fn() });

    expect((screen.getByRole('button', { name: 'Descargar Excel' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Descargar CSV' }) as HTMLButtonElement).disabled).toBe(false);
  });
});

const outputColumns: OutputColumn[] = [
  { id: 'code', label: 'Código', order: 0, enabled: true, recipe: { type: 'empty' } },
  { id: 'internal', label: 'Interno', order: 1, enabled: false, recipe: { type: 'empty' } },
];

const includedRow: ProcessedRow = {
  rowNumber: 1,
  status: 'included',
  inputValues: { source: 'entrada' },
  outputValues: { code: 'A1', internal: 'X' },
  warnings: ['advertencia interna'],
};

const ignoredRow: ProcessedRow = {
  rowNumber: 2,
  status: 'ignored',
  inputValues: { source: 'entrada ignorada' },
  outputValues: { code: 'NO', internal: 'Y' },
};

const fileNameSettings: FileNameSettings = {
  mode: 'custom',
  customName: 'resultado-final',
  baseText: '',
  includeBaseText: false,
  includeOriginalName: false,
  includeSheetName: false,
  includeDate: false,
};

function renderExportActions({
  onSaveProcessedResult,
  onSaveToMultiSheetBatch,
  rows = [includedRow, ignoredRow],
  outputColumns: columns = outputColumns,
}: {
  onSaveProcessedResult?: Parameters<typeof ExportActions>[0]['onSaveProcessedResult'];
  onSaveToMultiSheetBatch?: Parameters<typeof ExportActions>[0]['onSaveToMultiSheetBatch'];
  rows?: ProcessedRow[];
  outputColumns?: OutputColumn[];
} = {}) {
  render(
    <ExportActions
      rows={rows}
      inputColumns={[]}
      outputColumns={columns}
      fileNameSettings={fileNameSettings}
      sourceFileName="origen.xlsx"
      sheetName="Productos"
      onSaveProcessedResult={onSaveProcessedResult}
      onSaveToMultiSheetBatch={onSaveToMultiSheetBatch}
    />,
  );
}
