// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FileNameSettings, OutputColumn, ProcessedRow } from '../../types/import';
import { ExportActions } from './ExportActions';

afterEach(cleanup);

describe('ExportActions processed result', () => {
  it('groups final download, combine and audit actions in order', async () => {
    const onSaveForCombine = vi.fn();
    renderExportActions({ onSaveForCombine });

    const blocks = [...document.querySelectorAll('.exportBlock')];
    expect(blocks).toHaveLength(3);
    expect(blocks[0].textContent).toContain('Descargar archivo final');
    expect(blocks[1].textContent).toContain('Guardar para combinar');
    expect(blocks[2].textContent).toContain('Control y revisión');
    expect(screen.queryByText(/^Archivo: .*\.xlsx$/)).toBeNull();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar para combinar' }));

    expect(onSaveForCombine).toHaveBeenCalledTimes(1);
  });

  it('disables combine action when current result is unavailable', () => {
    renderExportActions({ onSaveForCombine: vi.fn(), saveForCombineDisabled: true });

    expect((screen.getByRole('button', { name: 'Guardar para combinar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps existing download actions available', () => {
    renderExportActions();

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
