// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { MultiSheetBatch } from '../../types/multiSheet';
import { MultiSheetBatchPanel } from './MultiSheetBatchPanel';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
  window.scrollTo = vi.fn();
});

afterEach(cleanup);

describe('MultiSheetBatchPanel', () => {
  it('shows empty state and disables batch actions', () => {
    renderPanel(emptyBatch());

    expect(screen.getByText('Todavía no guardaste hojas en el lote.')).not.toBeNull();
    expect((screen.getByRole('button', { name: 'Limpiar lote' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Exportar lote combinado' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows source, sheet, row and column totals', () => {
    renderPanel(batchWithSheets());

    expect(screen.getByText(/ventas\.xlsx/)).not.toBeNull();
    expect(screen.getByText(/2 hojas · 3 filas · 2 columnas/)).not.toBeNull();
    expect(screen.getByText('Enero')).not.toBeNull();
    expect(screen.getByText('Febrero')).not.toBeNull();
  });

  it('emits remove and export actions', async () => {
    const onRemoveSheet = vi.fn();
    const onExport = vi.fn();
    renderPanel(batchWithSheets(), { onRemoveSheet, onExport });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Remover Enero' }));
    await user.click(screen.getByRole('button', { name: 'Exportar lote combinado' }));

    expect(onRemoveSheet).toHaveBeenCalledWith('sheet:1');
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('confirms before clearing the batch', async () => {
    const onClear = vi.fn();
    renderPanel(batchWithSheets(), { onClear });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Limpiar lote' }));
    expect(onClear).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Limpiar lote' }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

function renderPanel(
  batch: MultiSheetBatch,
  overrides: Partial<Parameters<typeof MultiSheetBatchPanel>[0]> = {},
) {
  render(
    <MultiSheetBatchPanel
      batch={batch}
      onRemoveSheet={vi.fn()}
      onClear={vi.fn()}
      onExport={vi.fn()}
      {...overrides}
    />,
  );
}

function emptyBatch(): MultiSheetBatch {
  return { id: 'batch:1', outputSchema: null, sheets: [] };
}

function batchWithSheets(): MultiSheetBatch {
  return {
    id: 'batch:1',
    fileName: 'ventas.xlsx',
    outputSchema: {
      columns: [
        { index: 0, name: 'Código', normalizedName: 'codigo' },
        { index: 1, name: 'Nombre', normalizedName: 'nombre' },
      ],
    },
    sheets: [sheet('sheet:1', 'Enero', 1), sheet('sheet:2', 'Febrero', 2)],
  };
}

function sheet(id: string, sheetName: string, rowCount: number): MultiSheetBatch['sheets'][number] {
  return {
    id,
    fileName: 'salida.xlsx',
    sheetName,
    status: 'configured',
    rowCount,
    warnings: [],
    source: {
      id,
      fileName: 'salida.xlsx',
      sheetName,
      columns: [],
      rows: [],
    },
  };
}
