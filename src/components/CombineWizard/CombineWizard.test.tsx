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

    await userEvent.setup().click(screen.getByRole('button', { name: 'Generar columnas' }));

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

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
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

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
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

  it('renders the column assignment mode selector', () => {
    render(<CombineWizard basketSources={[basketSource]} />);

    expect(screen.getByText('Modo de asignación de columnas')).not.toBeNull();
    expect((screen.getByRole('radio', { name: 'Por nombre' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: 'Por posición' }) as HTMLInputElement).checked).toBe(false);
  });

  it('combines by name using unique headers from all sources', async () => {
    const { container } = render(<CombineWizard basketSources={assignmentModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));

    expect(getPreviewOutputHeaders(container)).toEqual([
      'Código',
      'Descripción',
      'Precio',
      'ID',
      'Producto',
      'Importe',
    ]);
    expect(getPreviewDataRows(container)).toEqual([
      ['A-1', 'Lapiz', '10', '', '', ''],
      ['', '', '', 'B-1', 'Cuaderno', '20'],
    ]);
  });

  it('combines by position using names from the first ordered source', async () => {
    const { container } = render(<CombineWizard basketSources={assignmentModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: 'Por posición' }));
    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));

    expect(getPreviewOutputHeaders(container)).toEqual(['Código', 'Descripción', 'Precio']);
    expect(getPreviewDataRows(container)).toEqual([
      ['A-1', 'Lapiz', '10'],
      ['B-1', 'Cuaderno', '20'],
    ]);

    await user.click(screen.getByRole('button', { name: 'Descargar Excel combinado' }));
    await waitFor(() => expect(exportCombinedXlsx).toHaveBeenCalledTimes(1));
    const exportPayload = vi.mocked(exportCombinedXlsx).mock.calls[0][0];
    expect(exportPayload.outputColumns.map((column) => column.name)).toEqual(['Código', 'Descripción', 'Precio']);
    expect(exportPayload.combinedRows.map((row) => exportPayload.outputColumns.map((column) => row.values[column.id]))).toEqual([
      ['A-1', 'Lapiz', '10'],
      ['B-1', 'Cuaderno', '20'],
    ]);
  });

  it('uses the widest source in position mode and leaves missing positions empty', async () => {
    const { container } = render(<CombineWizard basketSources={positionWidthSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: 'Por posición' }));
    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));

    expect(getPreviewOutputHeaders(container)).toEqual(['Código', 'Descripción', 'Importe']);
    expect(getPreviewDataRows(container)).toEqual([
      ['A-1', 'Lapiz', ''],
      ['B-1', 'Cuaderno', '20'],
    ]);
  });

  it('updates preview and export when switching assignment modes', async () => {
    const { container } = render(<CombineWizard basketSources={assignmentModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    expect(getPreviewOutputHeaders(container)).toEqual([
      'Código',
      'Descripción',
      'Precio',
      'ID',
      'Producto',
      'Importe',
    ]);

    await user.click(screen.getByRole('radio', { name: 'Por posición' }));
    expect(getPreviewOutputHeaders(container)).toEqual(['Código', 'Descripción', 'Precio']);
    expect(getPreviewDataRows(container)[1]).toEqual(['B-1', 'Cuaderno', '20']);

    await user.click(screen.getByRole('button', { name: 'Descargar Excel combinado' }));
    await waitFor(() => expect(exportCombinedXlsx).toHaveBeenCalledTimes(1));
    expect(vi.mocked(exportCombinedXlsx).mock.calls[0][0].outputColumns.map((column) => column.name)).toEqual([
      'Código',
      'Descripción',
      'Precio',
    ]);
  });

  it('updates position-mode base names when sources are reordered', async () => {
    const { container } = render(<CombineWizard basketSources={assignmentModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: 'Por posición' }));
    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    dragSource(container, 0, 1);

    await waitFor(() => expect(getPreviewOutputHeaders(container)).toEqual(['ID', 'Producto', 'Importe']));
    expect(getPreviewDataRows(container)).toEqual([
      ['B-1', 'Cuaderno', '20'],
      ['A-1', 'Lapiz', '10'],
    ]);
  });

  it('keeps output column reordering working after switching mode', async () => {
    const { container } = render(<CombineWizard basketSources={assignmentModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    await user.click(screen.getByRole('radio', { name: 'Por posición' }));
    dragOutputColumn(container, 0, 2);

    expect(getPreviewOutputHeaders(container)).toEqual(['Descripción', 'Precio', 'Código']);
    expect(getPreviewDataRows(container)).toEqual([
      ['Lapiz', '10', 'A-1'],
      ['Cuaderno', '20', 'B-1'],
    ]);
  });

  it('renders final result sort controls without sorting by default', async () => {
    const { container } = render(<CombineWizard basketSources={sortModeSources} />);
    const user = userEvent.setup();

    expect(screen.getByText('Ordenar resultado final')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Ordenar por' }).textContent).toContain('Sin ordenar');
    expect((screen.getByRole('radio', { name: 'Ascendente' }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('radio', { name: 'Descendente' }) as HTMLInputElement).disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));

    expect(getPreviewSourceOrder(container)).toEqual(['orden-a.xlsx', 'orden-a.xlsx', 'orden-b.xlsx', 'orden-b.xlsx']);
    expect(getPreviewDataRows(container).map((row) => row[0])).toEqual(['C2', 'C1', 'C4', 'C3']);
  });

  it('sorts final preview and export by text in both directions', async () => {
    const { container } = render(<CombineWizard basketSources={sortModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    await selectSortColumn(user, 'Producto');

    expect(getPreviewDataRows(container).map((row) => row[1])).toEqual(['Ana', 'Ana', 'Luz', 'Zeta']);

    await user.click(screen.getByRole('radio', { name: 'Descendente' }));
    expect(getPreviewDataRows(container).map((row) => row[1])).toEqual(['Zeta', 'Luz', 'Ana', 'Ana']);

    await user.click(screen.getByRole('button', { name: 'Descargar Excel combinado' }));
    await waitFor(() => expect(exportCombinedXlsx).toHaveBeenCalledTimes(1));
    const exportPayload = vi.mocked(exportCombinedXlsx).mock.calls[0][0];
    expect(exportPayload.combinedRows.map((row) => row.values[exportPayload.outputColumns[1].id])).toEqual([
      'Zeta',
      'Luz',
      'Ana',
      'Ana',
    ]);
  });

  it('sorts final preview numerically and keeps empty values last', async () => {
    const { container } = render(<CombineWizard basketSources={sortModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    await selectSortColumn(user, 'Precio');

    expect(getPreviewDataRows(container).map((row) => row[2])).toEqual(['2', '10', '30', '']);

    await user.click(screen.getByRole('radio', { name: 'Descendente' }));
    expect(getPreviewDataRows(container).map((row) => row[2])).toEqual(['30', '10', '2', '']);
  });

  it('keeps stable final sort order for equivalent values', async () => {
    const { container } = render(<CombineWizard basketSources={sortModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    await selectSortColumn(user, 'Producto');

    expect(getPreviewDataRows(container).map((row) => row[0])).toEqual(['C1', 'C4', 'C3', 'C2']);
  });

  it('sorts final result in byPosition mode', async () => {
    const { container } = render(<CombineWizard basketSources={assignmentModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: 'Por posición' }));
    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    await selectSortColumn(user, 'Descripción');

    expect(getPreviewDataRows(container)).toEqual([
      ['B-1', 'Cuaderno', '20'],
      ['A-1', 'Lapiz', '10'],
    ]);
  });

  it('keeps selected sort column after output columns are reordered', async () => {
    const { container } = render(<CombineWizard basketSources={sortModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    await selectSortColumn(user, 'Precio');
    dragOutputColumn(container, 2, 0);

    expect(getPreviewOutputHeaders(container)).toEqual(['Precio', 'Código', 'Producto']);
    expect(getPreviewDataRows(container).map((row) => row[0])).toEqual(['2', '10', '30', '']);
  });

  it('falls back to no final sort when selected output column is removed', async () => {
    const { container } = render(<CombineWizard basketSources={[twoColumnBasketSource]} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    await selectSortColumn(user, 'Nombre');
    await user.click(screen.getByRole('button', { name: 'Remover columna Nombre' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Ordenar por' }).textContent).toContain('Sin ordenar'));
    expect(getPreviewOutputHeaders(container)).toEqual(['Código']);
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
    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    expect(screen.getAllByText('A1').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Hoja usada' }));
    await user.click(screen.getByRole('option', { name: 'Segunda' }));

    expect(screen.getByRole('button', { name: 'Hoja usada' }).textContent).toContain('Segunda');
    expect(screen.getByText('3 columnas · 2 filas de datos')).not.toBeNull();
    expect(screen.getAllByText('A2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Actual').length).toBeGreaterThan(0);
    expect(screen.queryByText('Anterior')).toBeNull();
    expect(screen.getByText(/Se exportarán 2 filas y 3 columnas desde 1 archivo/)).not.toBeNull();
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

const assignmentModeSources: CombineSource[] = [
  {
    id: 'assignment:a',
    fileName: 'fuente-a.xlsx',
    columns: [
      { id: 'a:code', name: 'Código', index: 0 },
      { id: 'a:description', name: 'Descripción', index: 1 },
      { id: 'a:price', name: 'Precio', index: 2 },
    ],
    rows: [{ id: 'a:row', values: { 'a:code': 'A-1', 'a:description': 'Lapiz', 'a:price': '10' } }],
  },
  {
    id: 'assignment:b',
    fileName: 'fuente-b.xlsx',
    columns: [
      { id: 'b:id', name: 'ID', index: 0 },
      { id: 'b:product', name: 'Producto', index: 1 },
      { id: 'b:amount', name: 'Importe', index: 2 },
    ],
    rows: [{ id: 'b:row', values: { 'b:id': 'B-1', 'b:product': 'Cuaderno', 'b:amount': '20' } }],
  },
];

const positionWidthSources: CombineSource[] = [
  {
    ...assignmentModeSources[0],
    columns: assignmentModeSources[0].columns.slice(0, 2),
    rows: [{ id: 'a:row', values: { 'a:code': 'A-1', 'a:description': 'Lapiz' } }],
  },
  assignmentModeSources[1],
];

const sortModeSources: CombineSource[] = [
  {
    id: 'sort:a',
    fileName: 'orden-a.xlsx',
    columns: [
      { id: 'sort-a:code', name: 'Código', index: 0 },
      { id: 'sort-a:product', name: 'Producto', index: 1 },
      { id: 'sort-a:price', name: 'Precio', index: 2 },
    ],
    rows: [
      { id: 'sort-a:row-1', values: { 'sort-a:code': 'C2', 'sort-a:product': 'Zeta', 'sort-a:price': '10' } },
      { id: 'sort-a:row-2', values: { 'sort-a:code': 'C1', 'sort-a:product': 'Ana', 'sort-a:price': '2' } },
    ],
  },
  {
    id: 'sort:b',
    fileName: 'orden-b.xlsx',
    columns: [
      { id: 'sort-b:code', name: 'Código', index: 0 },
      { id: 'sort-b:product', name: 'Producto', index: 1 },
      { id: 'sort-b:price', name: 'Precio', index: 2 },
    ],
    rows: [
      { id: 'sort-b:row-1', values: { 'sort-b:code': 'C4', 'sort-b:product': 'Ana', 'sort-b:price': '' } },
      { id: 'sort-b:row-2', values: { 'sort-b:code': 'C3', 'sort-b:product': 'Luz', 'sort-b:price': '30' } },
    ],
  },
];

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

function getPreviewOutputHeaders(container: HTMLElement) {
  const headers = Array.from(container.querySelectorAll('.combinePreviewTable thead th'));
  const dataStartIndex = headers[1]?.textContent === 'Hoja' ? 2 : 1;
  return headers
    .slice(dataStartIndex)
    .map((cell) => cell.textContent);
}

function getPreviewDataRows(container: HTMLElement) {
  const headers = Array.from(container.querySelectorAll('.combinePreviewTable thead th'));
  const dataStartIndex = headers[1]?.textContent === 'Hoja' ? 2 : 1;
  return Array.from(container.querySelectorAll('.combinePreviewTable tbody tr'))
    .map((row) => Array.from(row.querySelectorAll('td')).slice(dataStartIndex).map((cell) => cell.textContent));
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

async function selectSortColumn(user: ReturnType<typeof userEvent.setup>, columnName: string) {
  await user.click(screen.getByRole('button', { name: 'Ordenar por' }));
  await user.click(screen.getByRole('option', { name: columnName }));
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
