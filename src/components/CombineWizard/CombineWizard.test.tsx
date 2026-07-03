// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as XLSX from 'xlsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportCombinedXlsx } from '../../domain/combine/exportCombinedXlsx';
import type { CombineSource } from '../../types/combine';
import { CombineWizard } from './CombineWizard';

vi.mock('../../domain/combine/exportCombinedXlsx', () => ({
  exportCombinedXlsx: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.mocked(exportCombinedXlsx).mockClear();
});

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

  it('renders compact sanitizer source rows without move arrow buttons', () => {
    const { container } = render(<CombineWizard basketSources={orderedBasketSources} />);

    expect(getVisibleSourceOrder(container)).toEqual(['enero.xlsx', 'febrero.xlsx', 'marzo.xlsx']);
    expect(screen.queryByRole('button', { name: 'Subir enero.xlsx' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Bajar enero.xlsx' })).toBeNull();
    const firstItem = container.querySelector('.combineSourceItem');
    expect(firstItem?.lastElementChild?.classList).toContain('combineSourceActions');
    expect(firstItem?.lastElementChild?.querySelector('.combineSourceDragHandle')).not.toBeNull();
    expect(screen.getAllByText('Desde sanitizador')).toHaveLength(3);
  });

  it('truncates long source names with an app tooltip and wraps remove in an app tooltip', async () => {
    const longName = 'reporte-mensual-con-un-nombre-muy-largo-para-combinar.xlsx';
    render(<CombineWizard basketSources={[basketSourceForOrder('basket:long', longName, 'L1')]} />);
    const user = userEvent.setup();
    const fileName = screen.getByText(longName);

    expect(fileName.classList).toContain('truncatedText');
    expect(fileName.parentElement?.classList).toContain('infoTooltipCustomTrigger');
    await user.hover(fileName);
    expect((await screen.findByRole('tooltip')).textContent).toBe(longName);
    await user.unhover(fileName);

    const removeButton = screen.getByRole('button', { name: `Remover ${longName}` });
    expect(removeButton.getAttribute('title')).toBeNull();
    await user.hover(removeButton);
    expect((await screen.findByRole('tooltip')).textContent).toBe('Remover');
  });

  it('reorders sources through drag and drop', () => {
    const { container } = render(<CombineWizard basketSources={orderedBasketSources} />);
    dragSource(container, 0, 2);

    expect(getVisibleSourceOrder(container)).toEqual(['febrero.xlsx', 'marzo.xlsx', 'enero.xlsx']);
  });

  it('reports reordered basket sources as local state', async () => {
    const onLocalStatePresenceChange = vi.fn();
    render(
      <CombineWizard
        basketSources={orderedBasketSources}
        onLocalStatePresenceChange={onLocalStatePresenceChange}
      />,
    );

    await waitFor(() => expect(onLocalStatePresenceChange).toHaveBeenLastCalledWith(false));
    dragSource(document.body, 0, 1);
    await waitFor(() => expect(onLocalStatePresenceChange).toHaveBeenLastCalledWith(true));
  });

  it('uses visible source order in preview and export', async () => {
    const { container } = render(<CombineWizard basketSources={orderedBasketSources.slice(0, 2)} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Usar columnas del primer archivo' }));
    dragSource(container, 0, 1);

    expect(getPreviewSourceOrder(container)).toEqual(['febrero.xlsx', 'enero.xlsx']);

    await user.click(screen.getByRole('button', { name: 'Descargar Excel combinado' }));
    await waitFor(() => expect(exportCombinedXlsx).toHaveBeenCalledTimes(1));
    const exportPayload = vi.mocked(exportCombinedXlsx).mock.calls[0][0];
    expect(exportPayload.combinedRows.map((row) => row.sourceFileName)).toEqual([
      'febrero.xlsx',
      'enero.xlsx',
    ]);
  });

  it('uses section 3 drag order in preview and export columns', async () => {
    const { container } = render(<CombineWizard basketSources={[twoColumnBasketSource]} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Usar columnas del primer archivo' }));
    dragOutputColumn(container, 0, 1);

    expect(Array.from(container.querySelectorAll('.combinePreviewTable thead th')).slice(-2).map((cell) => cell.textContent)).toEqual([
      'Nombre',
      'Código',
    ]);

    await user.click(screen.getByRole('button', { name: 'Descargar Excel combinado' }));
    await waitFor(() => expect(exportCombinedXlsx).toHaveBeenCalledTimes(1));
    expect(vi.mocked(exportCombinedXlsx).mock.calls[0][0].outputColumns.map((column) => column.name)).toEqual([
      'Nombre',
      'Código',
    ]);
  });
});

describe('CombineWizard uploaded source sheets', () => {
  it('reorders manual and sanitizer sources in the same list', async () => {
    const { container } = render(<CombineWizard basketSources={[orderedBasketSources[0]]} />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), csvFile('manual.csv', 'Código\nU1'));
    await screen.findByText('manual.csv');
    dragSource(container, 1, 0);

    expect(getVisibleSourceOrder(container)).toEqual(['manual.csv', 'enero.xlsx']);
    expect(screen.getByText('Manual')).not.toBeNull();
    expect(screen.getByText('Desde sanitizador')).not.toBeNull();
  });

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
    expect(screen.getByText('multi.xlsx').closest('.combineSourceMain')).toBe(
      screen.getByRole('button', { name: 'Hoja usada' }).closest('.combineSourceMain'),
    );
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

const orderedBasketSources: CombineSource[] = [
  basketSourceForOrder('basket:enero', 'enero.xlsx', 'E1'),
  basketSourceForOrder('basket:febrero', 'febrero.xlsx', 'F1'),
  basketSourceForOrder('basket:marzo', 'marzo.xlsx', 'M1'),
];

const twoColumnBasketSource: CombineSource = {
  id: 'basket:two-columns',
  fileName: 'dos-columnas.xlsx',
  sheetName: 'Datos',
  columns: [
    { id: 'two:code', name: 'Código', index: 0 },
    { id: 'two:name', name: 'Nombre', index: 1 },
  ],
  rows: [{ id: 'two:row', values: { 'two:code': 'A1', 'two:name': 'Producto' } }],
};

function basketSourceForOrder(id: string, fileName: string, value: string): CombineSource {
  return {
    id,
    fileName,
    sheetName: 'Datos',
    columns: [{ id: `${id}:column`, name: 'Código', index: 0 }],
    rows: [{ id: `${id}:row`, values: { [`${id}:column`]: value } }],
  };
}

function getVisibleSourceOrder(container: HTMLElement) {
  return Array.from(container.querySelectorAll('.combineSourceFileName .truncatedText'))
    .map((element) => element.textContent);
}

function getPreviewSourceOrder(container: HTMLElement) {
  return Array.from(container.querySelectorAll('.combinePreviewTable tbody tr'))
    .map((row) => row.querySelector('td')?.textContent);
}

function createDataTransfer() {
  const values = new Map<string, string>();
  return {
    dropEffect: 'none',
    effectAllowed: 'none',
    getData: (format: string) => values.get(format) ?? '',
    setData: (format: string, value: string) => {
      values.set(format, value);
    },
  } as unknown as DataTransfer;
}

function dragSource(container: HTMLElement, fromIndex: number, toIndex: number) {
  const sourceItems = Array.from(container.querySelectorAll<HTMLElement>('.combineSourceItem'));
  const dragHandles = Array.from(container.querySelectorAll<HTMLElement>('.combineSourceDragHandle'));
  const dataTransfer = createDataTransfer();
  fireEvent.dragStart(dragHandles[fromIndex], { dataTransfer });
  fireEvent.dragOver(sourceItems[toIndex], { dataTransfer });
  fireEvent.drop(sourceItems[toIndex], { dataTransfer });
}

function dragOutputColumn(container: HTMLElement, fromIndex: number, toIndex: number) {
  const items = Array.from(container.querySelectorAll<HTMLElement>('.combineOutputColumnItem'));
  const handles = Array.from(container.querySelectorAll<HTMLElement>('.combineOutputColumnDragHandle'));
  const dataTransfer = createDataTransfer();
  fireEvent.dragStart(handles[fromIndex], { dataTransfer });
  fireEvent.dragOver(items[toIndex], { dataTransfer });
  fireEvent.drop(items[toIndex], { dataTransfer });
}

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
