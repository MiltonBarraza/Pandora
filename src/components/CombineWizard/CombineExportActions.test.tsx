// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportCombinedXlsx } from '../../domain/combine/exportCombinedXlsx';
import { exportCombinedCsv } from '../../domain/combine/exportCombinedCsv';
import type { CombineColumnMapping, CombineOutputColumn, CombineSource, CombinedRow } from '../../types/combine';
import { buildCombineFinalFileName, CombineExportActions } from './CombineExportActions';

vi.mock('../../domain/combine/exportCombinedXlsx', () => ({
  exportCombinedXlsx: vi.fn(),
}));
vi.mock('../../domain/combine/exportCombinedCsv', () => ({
  exportCombinedCsv: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(exportCombinedXlsx).mockClear();
  vi.mocked(exportCombinedCsv).mockClear();
});

afterEach(cleanup);

describe('CombineExportActions', () => {
  it('renders compact naming options without sanitizer-only copy', () => {
    render(<ExportHarness />);

    expect(screen.getByRole('heading', { name: '8. Nombre de archivo y descarga' })).not.toBeNull();
    expect((screen.getByLabelText('Nombre predeterminado') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Nombre personalizado') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Incluir texto base') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Incluir fecha actual') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Incluir hora actual') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('Nombre final')).not.toBeNull();
    expect(screen.getByText('Archivo combinado')).not.toBeNull();
    expect(screen.queryByText('La extensión .xlsx se agrega automáticamente.')).toBeNull();
    expect(screen.queryByText(/Formatos disponibles/)).toBeNull();
    expect(screen.queryByText(/Auditoría/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Exportar CSV' }).getAttribute('title')).toBeNull();
  });

  it('edits a custom base name and exports the calculated final name', async () => {
    const user = userEvent.setup();
    render(<ExportHarness />);

    await user.click(screen.getByLabelText('Nombre personalizado'));
    const input = screen.getByRole('textbox', { name: 'Nombre base' });
    await user.clear(input);
    await user.type(input, 'Reporte mensual');
    expect(screen.getByText('Reporte mensual')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Descargar Excel combinado' }));
    await waitFor(() => expect(exportCombinedXlsx).toHaveBeenCalledWith({
      outputColumns,
      combinedRows,
      fileName: 'Reporte mensual',
    }));
  });

  it('exports CSV with the same final columns, rows and configured name', async () => {
    const user = userEvent.setup();
    render(<ExportHarness />);

    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    await waitFor(() => expect(exportCombinedCsv).toHaveBeenCalledWith({
      outputColumns,
      combinedRows,
      fileName: 'Archivo combinado',
    }));
    expect(exportCombinedXlsx).not.toHaveBeenCalled();
  });

  it('keeps the download disabled reason when no rows can be exported', () => {
    render(<ExportHarness rows={[]} />);

    expect((screen.getByRole('button', { name: 'Descargar Excel combinado' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Exportar CSV' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('No hay filas combinadas para exportar.')).not.toBeNull();
  });
});

describe('buildCombineFinalFileName', () => {
  it('combines base text, date and time', () => {
    expect(buildCombineFinalFileName({
      baseText: 'Reporte mensual.xlsx',
      includeBaseText: true,
      includeDate: true,
      includeTime: true,
      now: new Date(2026, 6, 2, 9, 5),
    })).toBe('Reporte mensual - 2026-07-02_09-05');
  });
});

function ExportHarness({ rows = combinedRows }: { rows?: CombinedRow[] }) {
  const [fileName, setFileName] = useState('Archivo combinado');
  return (
    <CombineExportActions
      sources={sources}
      outputColumns={outputColumns}
      mappings={mappings}
      combinedRows={rows}
      outputFileName={fileName}
      onOutputFileNameChange={setFileName}
    />
  );
}

const sources: CombineSource[] = [{
  id: 'source:1',
  fileName: 'origen.xlsx',
  columns: [{ id: 'source-column:1', name: 'Código', index: 0 }],
  rows: [{ id: 'source-row:1', values: { 'source-column:1': 'A1' } }],
}];

const outputColumns: CombineOutputColumn[] = [{ id: 'output:1', name: 'Código' }];

const mappings: CombineColumnMapping[] = [{
  sourceId: 'source:1',
  outputColumnId: 'output:1',
  sourceColumnId: 'source-column:1',
}];

const combinedRows: CombinedRow[] = [{
  id: 'combined:1',
  sourceId: 'source:1',
  sourceFileName: 'origen.xlsx',
  values: { 'output:1': 'A1' },
}];
