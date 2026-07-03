// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as XLSX from 'xlsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CombineSource } from '../../types/combine';
import { CombineWizard } from './CombineWizard';

afterEach(cleanup);

describe('CombineWizard basket sources', () => {
  it('keeps the files section clean while no files are loaded', () => {
    render(<CombineWizard basketSources={emptySources} />);

    expect(screen.queryByText('Archivos cargados')).toBeNull();
    expect(screen.queryByLabelText('0 archivos cargados')).toBeNull();
    expect(screen.queryByText('Todavía no hay archivos cargados.')).toBeNull();
    expect(screen.getByText('Elegir archivos')).not.toBeNull();
  });

  it('shows basket sources as loaded and identifies their temporary origin', () => {
    render(<CombineWizard basketSources={[basketSource]} />);

    expect(screen.getByText('guardado.xlsx')).not.toBeNull();
    expect(screen.getByText('Desde sanitizador')).not.toBeNull();
    expect(screen.getByText('Hoja usada: Productos · 1 columna · 1 fila de datos')).not.toBeNull();
    expect(screen.getByText(/son temporales y se pierden al recargar/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Hoja usada' })).toBeNull();
  });

  it('uses numbered sections, plural upload copy and file terminology', () => {
    const { container } = render(<CombineWizard basketSources={[basketSource]} />);

    expect(screen.getByRole('heading', { name: '1. Archivos' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '2. Configuración' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '3. Columnas de salida' })).not.toBeNull();
    expect(screen.getByText('Archivos cargados')).not.toBeNull();
    expect(screen.getByLabelText('1 archivo cargado').textContent).toBe('1');
    expect(screen.queryByText('1 archivo')).toBeNull();
    expect(screen.getByText('Elegir archivos')).not.toBeNull();
    expect(screen.getByText('Arrastrá archivos aquí de tipo .xlsx, .xls, .xlsm o .csv')).not.toBeNull();
    expect(screen.getByText('Hacé click para subir archivos desde tu computadora')).not.toBeNull();
    expect((container.querySelector('input[type="file"][multiple]') as HTMLInputElement | null)?.multiple).toBe(true);
    expect(screen.getByRole('button', { name: 'Información sobre los archivos para combinar' })).not.toBeNull();
    expect(screen.queryByText('Fuentes')).toBeNull();
    expect(screen.queryByText('Excel: primera hoja.')).toBeNull();
  });

  it('places configuration copy and regular-size actions below its title', () => {
    const { container } = render(<CombineWizard basketSources={[basketSource]} />);

    expect(container.querySelector('.combineSettingsPanel > h2')).not.toBeNull();
    expect(screen.getByText('Guardá o restaurá columnas, asignaciones y nombre de salida para reutilizar esta combinación.')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Exportar configuración' }).classList).toContain('actionButton-md');
    expect(screen.getByRole('button', { name: 'Importar configuración' }).classList).toContain('actionButton-md');
  });

  it('numbers mapping, preview and export after output columns are initialized', async () => {
    render(<CombineWizard basketSources={[basketSource]} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Usar columnas del primer archivo' }));

    expect(screen.getByRole('heading', { name: '4. Asignar columnas' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '5. Vista previa' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '6. Nombre de archivo y descarga' })).not.toBeNull();
  });

  it('delegates basket source removal to its owner', async () => {
    const onRemoveBasketSource = vi.fn();
    render(
      <CombineWizard
        basketSources={[basketSource]}
        onRemoveBasketSource={onRemoveBasketSource}
      />,
    );

    await userEvent.setup().click(screen.getByRole('button', { name: 'Remover guardado.xlsx' }));

    expect(onRemoveBasketSource).toHaveBeenCalledWith('basket:1');
  });

  it('does not report basket-only state as local state that would be lost', async () => {
    const onLocalStatePresenceChange = vi.fn();
    render(
      <CombineWizard
        basketSources={[basketSource]}
        onLocalStatePresenceChange={onLocalStatePresenceChange}
      />,
    );

    await waitFor(() => expect(onLocalStatePresenceChange).toHaveBeenLastCalledWith(false));
  });
});

describe('CombineWizard uploaded source sheets', () => {
  it('shows a selector for multiple sheets and updates source data and preview', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código', 'Nombre'],
      ['A1', 'Anterior'],
    ]), 'Primera');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Nombre', 'Código', 'Estado'],
      ['Actual', 'A2', 'Activo'],
      ['Otra', 'A3', 'Inactivo'],
    ]), 'Segunda');
    const { container } = render(<CombineWizard />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), excelFile('multi.xlsx', workbook));
    await screen.findByText('multi.xlsx');
    await user.click(screen.getByRole('button', { name: 'Usar columnas del primer archivo' }));
    expect(screen.getAllByText('A1').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Hoja usada' }));
    await user.click(screen.getByRole('option', { name: 'Segunda' }));

    expect(screen.getByRole('button', { name: 'Hoja usada' }).textContent).toContain('Segunda');
    expect(screen.getByText('3 columnas · 2 filas de datos')).not.toBeNull();
    expect(screen.getAllByText('A2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Actual').length).toBeGreaterThan(0);
    expect(screen.queryByText('Anterior')).toBeNull();
    expect(screen.getByText(/Se exportarán 2 filas y 2 columnas desde 1 archivo/)).not.toBeNull();
  });

  it('shows static sheet text for a single-sheet Excel', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['A1'],
    ]), 'Hoja sanitizada');
    const { container } = render(<CombineWizard />);

    await userEvent.setup().upload(getUploadInput(container), excelFile('simple.xlsx', workbook));

    expect(await screen.findByText('Hoja usada: Hoja sanitizada · 1 columna · 1 fila de datos')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Hoja usada' })).toBeNull();
  });

  it('does not show sheet controls for CSV', async () => {
    const { container } = render(<CombineWizard />);

    await userEvent.setup().upload(getUploadInput(container), csvFile('datos.csv', 'Código\nA1'));
    await screen.findByText('datos.csv');

    expect(screen.queryByText(/Hoja usada:/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hoja usada' })).toBeNull();
  });

  it('keeps previous source and shows an error when selected sheet cannot be used', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['A1'],
    ]), 'Con datos');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), 'Vacía');
    const { container } = render(<CombineWizard />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), excelFile('fallo.xlsx', workbook));
    await screen.findByText('fallo.xlsx');
    await user.click(screen.getByRole('button', { name: 'Hoja usada' }));
    await user.click(screen.getByRole('option', { name: 'Vacía' }));

    expect(screen.getByRole('button', { name: 'Hoja usada' }).textContent).toContain('Con datos');
    expect(screen.getByText(/No se pudo usar la hoja "Vacía"/)).not.toBeNull();
    expect(screen.getByText('1 columna · 1 fila de datos')).not.toBeNull();
  });

  it('explains that a sheet can be chosen for multi-sheet Excel files', async () => {
    render(<CombineWizard />);

    const trigger = screen.getByRole('button', { name: 'Información sobre los archivos para combinar' });
    await userEvent.setup().hover(trigger);

    expect(await screen.findByText(/Si el archivo tiene varias hojas, podés elegir cuál usar/)).not.toBeNull();
    expect(screen.queryByText(/Excel: se usa la primera hoja/)).toBeNull();
  });
});

const basketSource: CombineSource = {
  id: 'basket:1',
  fileName: 'guardado.xlsx',
  sheetName: 'Productos',
  columns: [{ id: 'col:0', name: 'Código', index: 0 }],
  rows: [{ id: 'row:0', values: { 'col:0': 'A1' } }],
};

const emptySources: CombineSource[] = [];

function getUploadInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error('No se encontró el selector de archivos.');
  }
  return input;
}

function excelFile(name: string, workbook: XLSX.WorkBook) {
  const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const file = new File([data], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  Object.defineProperty(file, 'arrayBuffer', { value: async () => data });
  return file;
}

function csvFile(name: string, contents: string) {
  const file = new File([contents], name, { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => contents });
  return file;
}
