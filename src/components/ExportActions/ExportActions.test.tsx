// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FileNameSettings, OutputColumn, ProcessedRow } from '../../types/import';
import { ExportActions } from './ExportActions';

afterEach(cleanup);

describe('ExportActions processed result', () => {
  it('runs the shared save-for-combine handler', async () => {
    const onSaveForCombine = vi.fn();
    renderExportActions({ onSaveForCombine });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar para combinar' }));

    expect(onSaveForCombine).toHaveBeenCalledTimes(1);
  });

  it('does not render the action without a callback', () => {
    renderExportActions();

    expect(screen.queryByRole('button', { name: 'Guardar para combinar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Guardar hoja en lote' })).toBeNull();
  });

  it('disables the action without included rows', () => {
    renderExportActions({
      onSaveForCombine: vi.fn(),
      saveForCombineDisabled: true,
      rows: [{ ...includedRow, status: 'ignored' }],
    });

    expect((screen.getByRole('button', { name: 'Guardar para combinar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables the action without enabled output columns', () => {
    renderExportActions({
      onSaveForCombine: vi.fn(),
      saveForCombineDisabled: true,
      outputColumns: outputColumns.map((column) => ({ ...column, enabled: false })),
    });

    expect((screen.getByRole('button', { name: 'Guardar para combinar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps existing download actions available', () => {
    renderExportActions({ onSaveForCombine: vi.fn() });

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
  onSaveForCombine,
  saveForCombineDisabled,
  rows = [includedRow, ignoredRow],
  outputColumns: columns = outputColumns,
}: {
  onSaveForCombine?: Parameters<typeof ExportActions>[0]['onSaveForCombine'];
  saveForCombineDisabled?: boolean;
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
      onSaveForCombine={onSaveForCombine}
      saveForCombineDisabled={saveForCombineDisabled}
    />,
  );
}
