// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as XLSX from 'xlsx';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportCombinedXlsx } from '../../domain/combine/exportCombinedXlsx';
import { exportCombinedCsv } from '../../domain/combine/exportCombinedCsv';
import { loadCombineDraft, saveCombineDraft } from '../../domain/combine/combineDraft';
import type { CombineDraft } from '../../domain/combine/combineDraft';
import { showInfoToast } from '../../services/toastService';
import type { CombineSource } from '../../types/combine';
import { CombineWizard } from './CombineWizard';

vi.mock('../../domain/combine/exportCombinedXlsx', () => ({
  exportCombinedXlsx: vi.fn(),
}));
vi.mock('../../domain/combine/exportCombinedCsv', () => ({
  exportCombinedCsv: vi.fn(),
}));
vi.mock('../../services/toastService', () => ({
  showInfoToast: vi.fn(),
}));

beforeEach(() => {
  sessionStorage.clear();
});

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.mocked(exportCombinedXlsx).mockClear();
  vi.mocked(exportCombinedCsv).mockClear();
  vi.mocked(showInfoToast).mockClear();
  sessionStorage.clear();
});

describe('CombineWizard basket sources', () => {
  it('persists configurable combine state without source rows', async () => {
    const { container } = render(<CombineWizard basketSources={[twoColumnBasketSource]} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: /Por posición/ }));
    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    dragOutputColumn(container, 0, 1);
    await user.click(screen.getByLabelText('Incluir Archivo origen'));
    await user.click(screen.getByRole('button', { name: 'Columna' }));
    await user.click(screen.getByRole('option', { name: 'Nombre' }));
    await user.click(screen.getByLabelText('Nombre personalizado'));
    const nameInput = screen.getByRole('textbox', { name: 'Nombre base' });
    await user.clear(nameInput);
    await user.type(nameInput, 'Reporte temporal');

    await waitFor(() => expect(loadCombineDraft()).toMatchObject({
      columnAssignmentMode: 'position',
      outputColumns: [
        { name: 'Nombre' },
        { name: 'Código' },
      ],
      sourceMetadataOptions: { includeFileName: true, includeSheetName: false },
      outputFileName: 'Reporte temporal',
      sourceIds: ['basket:two-columns'],
    }));
    expect(loadCombineDraft()?.resultSort.columnId).toBeTruthy();
    expect(JSON.stringify(loadCombineDraft())).not.toContain('Producto');
    expect(JSON.stringify(loadCombineDraft())).not.toContain('dos-columnas.xlsx');
  });

  it('restores a compatible draft silently', async () => {
    saveCombineDraft(restorableDraft());

    render(<CombineWizard basketSources={[basketSource]} />);

    expect((screen.getByRole('radio', { name: /Por posición/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Incluir Archivo origen') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('textbox', { name: 'Nombre base' })).toHaveProperty('value', 'Reporte restaurado');
    expect(screen.getAllByText('A1').length).toBeGreaterThan(0);
    expect(showInfoToast).not.toHaveBeenCalled();
  });

  it('restores safe configuration and discards missing source state', async () => {
    saveCombineDraft({
      ...restorableDraft(),
      mappings: [{ sourceId: 'missing', outputColumnId: 'restored-code', sourceColumnId: 'col:0' }],
      sourceOrder: ['missing'],
      sourceIds: ['missing'],
    });

    render(<CombineWizard basketSources={[basketSource]} />);

    expect(screen.queryByRole('textbox', { name: /Nombre de columna de salida/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: '3. Asignar columnas' })).toBeNull();
    expect(screen.getByText('Todavía no hay columnas de salida. Generá columnas automáticamente o agregá una columna manualmente.')).not.toBeNull();
    expect(showInfoToast).not.toHaveBeenCalled();
  });

  it('flushes a pending draft before the page is hidden', () => {
    render(<CombineWizard basketSources={[basketSource]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar columna' }));

    window.dispatchEvent(new Event('pagehide'));

    expect(loadCombineDraft()?.outputColumns).toHaveLength(1);
  });

  it('keeps the files section clean while no files are loaded', () => {
    render(<CombineWizard basketSources={emptySources} />);

    expect(screen.getByRole('heading', { name: '1. Archivos' })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: '2. Columnas de salida' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '3. Asignar columnas' })).toBeNull();
    expect(screen.queryByText('Fuentes cargadas')).toBeNull();
    expect(screen.queryByLabelText('0 fuentes cargadas')).toBeNull();
    expect(screen.queryByText('Todavía no hay archivos cargados.')).toBeNull();
    expect(screen.getByText('Elegir archivos')).not.toBeNull();
  });

  it('shows basket sources as loaded and identifies their temporary origin', () => {
    render(<CombineWizard basketSources={[basketSource]} />);

    expect(screen.getByText('guardado.xlsx')).not.toBeNull();
    expect(screen.getByText('Archivo preparado')).not.toBeNull();
    expect(screen.getByText('Hoja usada: Productos · 1 columna · 1 fila de datos')).not.toBeNull();
    expect(screen.getByText(/son temporales y se pierden al recargar/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Hoja' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Agregar hoja' })).toBeNull();
  });

  it('uses numbered sections, plural upload copy and file terminology', () => {
    const { container } = render(<CombineWizard basketSources={[basketSource]} />);

    expect(screen.getByRole('heading', { name: '1. Archivos' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '2. Columnas de salida' })).not.toBeNull();
    expect(screen.getByText('Fuentes cargadas')).not.toBeNull();
    expect(screen.getByLabelText('1 fuente cargada').textContent).toBe('1');
    expect(screen.queryByText('1 archivo')).toBeNull();
    expect(screen.getByText('Elegir archivos')).not.toBeNull();
    expect(screen.getByText('Arrastrá archivos aquí de tipo .xlsx, .xls, .xlsm o .csv')).not.toBeNull();
    expect(screen.getByText('Hacé click para subir archivos desde tu computadora')).not.toBeNull();
    expect((container.querySelector('input[type="file"][multiple]') as HTMLInputElement | null)?.multiple).toBe(true);
    expect(screen.getByRole('button', { name: 'Información sobre los archivos para combinar' })).not.toBeNull();
    expect(screen.queryByText('Archivos cargados')).toBeNull();
    expect(screen.queryByText('Excel: primera hoja.')).toBeNull();
  });

  it('numbers mapping, preview and export after output columns are initialized', async () => {
    render(<CombineWizard basketSources={[basketSource]} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Generar columnas' }));

    expect(screen.getByRole('heading', { name: '3. Asignar columnas' })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: '5. Datos de origen' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '6. Orden del resultado' })).toBeNull();
    expect(screen.getByRole('heading', { name: '4. Vista previa' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '5. Nombre del archivo' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '6. Descargar archivo' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Datos de origen' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Orden del resultado' })).not.toBeNull();
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
    expect(screen.getAllByText('Archivo preparado')).toHaveLength(3);
  });

  it('keeps long source names constrained and wraps remove in an app tooltip', async () => {
    const longName = 'reporte-mensual-con-un-nombre-muy-largo-para-combinar.xlsx';
    render(<CombineWizard basketSources={[basketSourceForOrder('basket:long', longName, 'L1')]} />);
    const user = userEvent.setup();
    const fileName = screen.getByText(longName);

    expect(fileName.classList).toContain('truncatedText');
    await user.hover(fileName);
    expect(screen.queryByRole('tooltip')).toBeNull();
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

  it('sorts preview and export with same rows, then restores base source order', async () => {
    const sources = [
      basketSourceForOrder('basket:z', 'primero.xlsx', 'Z10'),
      basketSourceForOrder('basket:a', 'segundo.xlsx', 'A2'),
    ];
    const { container } = render(<CombineWizard basketSources={sources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    expect(getPreviewSourceOrder(container)).toEqual(['primero.xlsx', 'segundo.xlsx']);

    await user.click(screen.getByRole('button', { name: 'Columna' }));
    await user.click(screen.getByRole('option', { name: 'Código' }));
    expect(getPreviewSourceOrder(container)).toEqual(['segundo.xlsx', 'primero.xlsx']);

    await user.click(screen.getByRole('radio', { name: 'Descendente' }));
    expect(getPreviewSourceOrder(container)).toEqual(['primero.xlsx', 'segundo.xlsx']);

    await user.click(screen.getByRole('button', { name: 'Descargar Excel combinado' }));
    await waitFor(() => expect(exportCombinedXlsx).toHaveBeenCalledTimes(1));
    expect(vi.mocked(exportCombinedXlsx).mock.calls[0][0].combinedRows.map((row) => row.sourceFileName)).toEqual([
      'primero.xlsx',
      'segundo.xlsx',
    ]);

    await user.click(screen.getByRole('button', { name: 'Sin ordenar' }));
    expect(getPreviewSourceOrder(container)).toEqual(['primero.xlsx', 'segundo.xlsx']);
  });

  it('adds source metadata only to export, not to preview', async () => {
    const sources = [
      basketSourceForOrder('basket:zeta', 'zeta.xlsx', 'Z1'),
      basketSourceForOrder('basket:alfa', 'alfa.xlsx', 'A1'),
    ];
    const { container } = render(<CombineWizard basketSources={sources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    expect((screen.getByLabelText('Incluir Archivo origen') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Incluir Hoja origen') as HTMLInputElement).checked).toBe(false);

    await user.click(screen.getByLabelText('Incluir Archivo origen'));
    await user.click(screen.getByLabelText('Incluir Hoja origen'));

    const previewHeaders = Array.from(container.querySelectorAll('.combinePreviewTable thead th'))
      .map((cell) => cell.textContent);
    expect(previewHeaders).not.toContain('Archivo origen');
    expect(previewHeaders).not.toContain('Hoja origen');
    expect(getPreviewDataRows(container)).toEqual([
      ['zeta.xlsx', 'Datos', 'Z1'],
      ['alfa.xlsx', 'Datos', 'A1'],
    ]);

    await user.click(screen.getByRole('button', { name: 'Columna' }));
    expect(screen.queryByRole('option', { name: 'Archivo origen' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Hoja origen' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Descargar Excel combinado' }));
    await waitFor(() => expect(exportCombinedXlsx).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(exportCombinedXlsx).mock.calls[0][0];
    expect(payload.outputColumns.slice(-2).map((column) => column.name)).toEqual(['Archivo origen', 'Hoja origen']);
    expect(payload.combinedRows.map((row) => [
      row.values['metadata:fileName'],
      row.values['metadata:sheetName'],
    ])).toEqual([
      ['zeta.xlsx', 'Datos'],
      ['alfa.xlsx', 'Datos'],
    ]);

    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    await waitFor(() => expect(exportCombinedCsv).toHaveBeenCalledTimes(1));
    expect(vi.mocked(exportCombinedCsv).mock.calls[0][0]).toEqual({
      outputColumns: payload.outputColumns,
      combinedRows: payload.combinedRows,
      fileName: payload.fileName,
    });
  });

  it('uses section 2 drag order in preview and export columns', async () => {
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

  it('defaults to name mode and confirms before replacing existing assignments', async () => {
    render(<CombineWizard basketSources={assignmentModeSources} />);
    const user = userEvent.setup();

    expect((screen.getByRole('radio', { name: /Por nombre/ }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    await user.click(screen.getByRole('radio', { name: /Por posición/ }));

    expect(screen.getByRole('heading', { name: 'Cambiar modo de asignación' })).not.toBeNull();
    expect((screen.getByRole('radio', { name: /Por nombre/ }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Cambiar modo' }));

    expect((screen.getByRole('radio', { name: /Por posición/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getAllByRole('textbox', { name: /Nombre de columna de salida/ }).map((input) => (
      (input as HTMLInputElement).value
    ))).toEqual(['Cod', 'Producto', 'Precio']);
  });

  it('uses position mode for missing and extra columns in preview and export', async () => {
    const { container } = render(<CombineWizard basketSources={assignmentModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: /Por posición/ }));
    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    await waitFor(() => expect(container.querySelectorAll('.combinePreviewTable tbody tr')).toHaveLength(2));

    expect(getPreviewDataRows(container)).toEqual([
      ['estructura-corta.xlsx', 'Datos', 'C1', 'Producto 1', ''],
      ['estructura-larga.xlsx', 'Datos', 'C2', 'Descripción 2', '100'],
    ]);

    await user.click(screen.getByLabelText('Incluir Archivo origen'));

    await user.click(screen.getByRole('button', { name: 'Descargar Excel combinado' }));
    await waitFor(() => expect(exportCombinedXlsx).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(exportCombinedXlsx).mock.calls[0][0];
    expect(payload.outputColumns.map((column) => column.name)).toEqual(['Cod', 'Producto', 'Precio', 'Archivo origen']);
    expect(payload.combinedRows.map((row) => payload.outputColumns.map((column) => row.values[column.id] ?? ''))).toEqual([
      ['C1', 'Producto 1', '', 'estructura-corta.xlsx'],
      ['C2', 'Descripción 2', '100', 'estructura-larga.xlsx'],
    ]);
  });

  it('uses reordered first source as position-mode name reference', async () => {
    const { container } = render(<CombineWizard basketSources={assignmentModeSources} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: /Por posición/ }));
    dragSource(container, 0, 1);
    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));

    await waitFor(() => expect(screen.getAllByRole('textbox', { name: /Nombre de columna de salida/ }).map((input) => (
      (input as HTMLInputElement).value
    ))).toEqual(['Código', 'Descripción', 'Precio']));
  });
});

describe('CombineWizard uploaded source sheets', () => {
  it('shows add sheet for multi-sheet Excel files and not for CSV files', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['E1'],
    ]), 'Enero');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['F1'],
    ]), 'Febrero');
    const { container } = render(<CombineWizard />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), excelFile('multi.xlsx', workbook));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('multi.xlsx'));

    expect(screen.getByRole('button', { name: 'Agregar hoja' })).not.toBeNull();
    expect(screen.getByText('Hoja')).not.toBeNull();
    expect(screen.queryByText('Agregar hoja')).toBeNull();

    await user.upload(getUploadInput(container), csvFile('datos.csv', 'Código\nC1'));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('datos.csv'));

    expect(screen.getAllByRole('button', { name: 'Agregar hoja' })).toHaveLength(1);
  });

  it('adds another sheet from the same workbook as an independent source without generating columns', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['E1'],
    ]), 'Enero');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['F1'],
    ]), 'Febrero');
    const { container } = render(<CombineWizard />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), excelFile('multi.xlsx', workbook));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('multi.xlsx'));
    await user.click(screen.getByRole('button', { name: 'Agregar hoja' }));

    expect(getVisibleSourceOrder(container)).toEqual(['multi.xlsx', 'multi.xlsx']);
    expect(getVisibleSheetSelections()).toEqual(['Enero', 'Febrero']);
    expect(screen.queryByRole('textbox', { name: /Nombre de columna de salida/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: '3. Asignar columnas' })).toBeNull();
    const addSheetButtons = screen.getAllByRole('button', { name: 'Agregar hoja' });
    expect(addSheetButtons.every((button) => (
      (button as HTMLButtonElement).disabled
    ))).toBe(true);
    await user.hover(addSheetButtons[0].parentElement as HTMLElement);
    expect((await screen.findByRole('tooltip')).textContent).toBe('Todas las hojas ya fueron agregadas');
  });

  it('does not allow selecting a sheet already used by another source from the same workbook', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['E1'],
    ]), 'Enero');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['F1'],
    ]), 'Febrero');
    const { container } = render(<CombineWizard />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), excelFile('multi.xlsx', workbook));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('multi.xlsx'));
    await user.click(screen.getByRole('button', { name: 'Agregar hoja' }));
    await user.click(screen.getAllByRole('button', { name: 'Hoja' })[0]);

    expect(screen.getByRole('option', { name: 'Febrero (ya agregada)' })).toHaveProperty('disabled', true);
  });

  it('changes one added sheet without affecting another source from the same workbook', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['E1'],
    ]), 'Enero');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['F1'],
    ]), 'Febrero');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['M1'],
    ]), 'Marzo');
    const { container } = render(<CombineWizard />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), excelFile('multi.xlsx', workbook));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('multi.xlsx'));
    await user.click(screen.getByRole('button', { name: 'Agregar hoja' }));
    await user.click(screen.getAllByRole('button', { name: 'Hoja' })[0]);
    await user.click(screen.getByRole('option', { name: 'Marzo' }));

    await waitFor(() => expect(getVisibleSheetSelections()).toEqual(['Marzo', 'Febrero']));
  });

  it('removes one added sheet without removing the other and makes the removed sheet available again', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['E1'],
    ]), 'Enero');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['F1'],
    ]), 'Febrero');
    const { container } = render(<CombineWizard />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), excelFile('multi.xlsx', workbook));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('multi.xlsx'));
    await user.click(screen.getByRole('button', { name: 'Agregar hoja' }));
    await user.click(screen.getAllByRole('button', { name: 'Remover multi.xlsx' })[0]);

    expect(getVisibleSourceOrder(container)).toEqual(['multi.xlsx']);
    expect(getVisibleSheetSelections()).toEqual(['Febrero']);
    expect((screen.getByRole('button', { name: 'Agregar hoja' }) as HTMLButtonElement).disabled).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Agregar hoja' }));

    expect(getVisibleSheetSelections()).toEqual(['Febrero', 'Enero']);
  });

  it('previews and exports added sheets with distinct sheet metadata', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código', 'Nombre'],
      ['E1', 'Enero'],
    ]), 'Enero');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Nombre', 'Código'],
      ['Febrero', 'F1'],
    ]), 'Febrero');
    const { container } = render(<CombineWizard />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), excelFile('precios.xlsx', workbook));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('precios.xlsx'));
    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    await user.click(screen.getByRole('button', { name: 'Agregar hoja' }));
    await user.click(screen.getByLabelText('Incluir Archivo origen'));
    await user.click(screen.getByLabelText('Incluir Hoja origen'));

    await waitFor(() => expect(getPreviewDataRows(container)).toEqual([
      ['precios.xlsx', 'Enero', 'E1', 'Enero'],
      ['precios.xlsx', 'Febrero', 'F1', 'Febrero'],
    ]));

    await user.click(screen.getByRole('button', { name: 'Descargar Excel combinado' }));
    await waitFor(() => expect(exportCombinedXlsx).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(exportCombinedXlsx).mock.calls[0][0];
    expect(payload.outputColumns.map((column) => column.name)).toEqual(['Código', 'Nombre', 'Archivo origen', 'Hoja origen']);
    expect(payload.combinedRows.map((row) => payload.outputColumns.map((column) => row.values[column.id] ?? ''))).toEqual([
      ['E1', 'Enero', 'precios.xlsx', 'Enero'],
      ['F1', 'Febrero', 'precios.xlsx', 'Febrero'],
    ]);
  });

  it('does not repopulate output columns from an old draft when uploading new manual files', async () => {
    saveCombineDraft({
      ...restorableDraft(),
      outputColumns: [
        { id: 'old-name', name: 'Nombre' },
        { id: 'old-code', name: 'codigo' },
        { id: 'old-price', name: 'Precio' },
      ],
      mappings: [
        { sourceId: 'old-source', outputColumnId: 'old-name', sourceColumnId: 'old:name' },
        { sourceId: 'old-source', outputColumnId: 'old-code', sourceColumnId: 'old:code' },
        { sourceId: 'old-source', outputColumnId: 'old-price', sourceColumnId: 'old:price' },
      ],
      resultSort: { columnId: 'old-name', direction: 'asc' },
      sourceIds: ['old-source'],
      sourceOrder: ['old-source'],
    });
    const { container } = render(<CombineWizard />);

    await userEvent.setup().upload(getUploadInput(container), csvFile('nuevo.csv', 'Nombre,codigo,Precio\nA,1,10'));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('nuevo.csv'));

    expect((screen.getByRole('radio', { name: /Por nombre/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /Por posición/ }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText('Todavía no hay columnas de salida. Generá columnas automáticamente o agregá una columna manualmente.')).not.toBeNull();
    expect(screen.queryByRole('textbox', { name: /Nombre de columna de salida/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: '3. Asignar columnas' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Generar columnas' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Agregar columna' })).not.toBeNull();
  });

  it('does not auto-generate output columns after uploading files', async () => {
    const { container } = render(<CombineWizard />);

    await userEvent.setup().upload(getUploadInput(container), csvFile('datos.csv', 'Código\nA1'));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('datos.csv'));

    expect(screen.getByText('Todavía no hay columnas de salida. Generá columnas automáticamente o agregá una columna manualmente.')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Generar columnas' })).not.toBeNull();
    expect(screen.queryByRole('textbox', { name: /Nombre de columna de salida/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: '3. Asignar columnas' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '4. Vista previa' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '6. Descargar archivo' })).toBeNull();
  });

  it('does not overwrite manual columns when another uploaded file is added', async () => {
    const { container } = render(<CombineWizard />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), csvFile('uno.csv', 'Código\nA1'));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('uno.csv'));
    await user.click(screen.getByRole('button', { name: 'Agregar columna' }));
    const manualColumnInput = screen.getByRole('textbox', { name: 'Nombre de columna de salida 1' });
    await user.clear(manualColumnInput);
    await user.type(manualColumnInput, 'Manual');

    await user.upload(getUploadInput(container), csvFile('dos.csv', 'Producto\nB1'));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('dos.csv'));

    expect(screen.getAllByRole('textbox', { name: /Nombre de columna de salida/ })).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Nombre de columna de salida 1' })).toHaveProperty('value', 'Manual');
  });

  it('does not auto-generate output columns after changing an uploaded sheet', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Código'],
      ['A1'],
    ]), 'Primera');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Producto'],
      ['B1'],
    ]), 'Segunda');
    const { container } = render(<CombineWizard />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), excelFile('multi.xlsx', workbook));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('multi.xlsx'));
    await user.click(screen.getByRole('button', { name: 'Hoja' }));
    await user.click(screen.getByRole('option', { name: 'Segunda' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Hoja' }).textContent).toContain('Segunda'));
    expect(screen.getByText('Todavía no hay columnas de salida. Generá columnas automáticamente o agregá una columna manualmente.')).not.toBeNull();
    expect(screen.queryByRole('textbox', { name: /Nombre de columna de salida/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: '4. Vista previa' })).toBeNull();
  });

  it('reorders manual and sanitizer sources in the same list', async () => {
    const { container } = render(<CombineWizard basketSources={[orderedBasketSources[0]]} />);
    const user = userEvent.setup();

    await user.upload(getUploadInput(container), csvFile('manual.csv', 'Código\nU1'));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('manual.csv'));
    dragSource(container, 1, 0);

    expect(getVisibleSourceOrder(container)).toEqual(['manual.csv', 'enero.xlsx']);
    expect(screen.getByText('Manual')).not.toBeNull();
    expect(screen.getByText('Archivo preparado')).not.toBeNull();
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
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('multi.xlsx'));
    const multiSourceName = getSourceNameElement(container, 'multi.xlsx');
    expect(multiSourceName?.closest('.combineSourceMain')).toBe(
      screen.getByRole('button', { name: 'Hoja' }).closest('.combineSourceMain'),
    );
    expect(screen.getByText('Todavía no hay columnas de salida. Generá columnas automáticamente o agregá una columna manualmente.')).not.toBeNull();
    expect(screen.queryByRole('textbox', { name: /Nombre de columna de salida/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: '3. Asignar columnas' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '4. Vista previa' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '6. Descargar archivo' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Generar columnas' }));
    await waitFor(() => expect(screen.getAllByText('A1').length).toBeGreaterThan(0));
    await user.click(screen.getByLabelText('Incluir Hoja origen'));
    const firstSheetPreview = getPreviewDataRows(container)[0];
    expect(firstSheetPreview).toEqual([
      'multi.xlsx',
      'Primera',
      'A1',
      'Anterior',
    ]);

    await user.click(screen.getByRole('button', { name: 'Hoja' }));
    await user.click(screen.getByRole('option', { name: 'Segunda' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Hoja' }).textContent).toContain('Segunda'));
    await waitFor(() => expect(screen.getByText('3 columnas · 2 filas de datos')).not.toBeNull());
    expect(screen.getAllByText('A2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Actual').length).toBeGreaterThan(0);
    expect(getPreviewDataRows(container)).toEqual([
      ['multi.xlsx', 'Segunda', 'A2', 'Actual'],
      ['multi.xlsx', 'Segunda', 'A3', 'Otra'],
    ]);
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
    expect(screen.queryByRole('button', { name: 'Hoja' })).toBeNull();
  });

  it('does not show sheet controls for CSV', async () => {
    const { container } = render(<CombineWizard />);

    await userEvent.setup().upload(getUploadInput(container), csvFile('datos.csv', 'Código\nA1'));
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('datos.csv'));

    expect(screen.queryByText(/Hoja usada:/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hoja' })).toBeNull();
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
    await waitFor(() => expect(getVisibleSourceOrder(container)).toContain('fallo.xlsx'));
    await user.click(screen.getByRole('button', { name: 'Hoja' }));
    await user.click(screen.getByRole('option', { name: 'Vacía' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Hoja' }).textContent).toContain('Con datos'));
    expect(await screen.findByText(/No se pudo usar la hoja "Vacía"/)).not.toBeNull();
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
    id: 'assignment:short',
    fileName: 'estructura-corta.xlsx',
    sheetName: 'Datos',
    columns: [
      { id: 'short:code', name: 'Cod', index: 0 },
      { id: 'short:product', name: 'Producto', index: 1 },
    ],
    rows: [{ id: 'short:row', values: { 'short:code': 'C1', 'short:product': 'Producto 1' } }],
  },
  {
    id: 'assignment:long',
    fileName: 'estructura-larga.xlsx',
    sheetName: 'Datos',
    columns: [
      { id: 'long:code', name: 'Código', index: 0 },
      { id: 'long:description', name: 'Descripción', index: 1 },
      { id: 'long:price', name: 'Precio', index: 2 },
    ],
    rows: [{
      id: 'long:row',
      values: { 'long:code': 'C2', 'long:description': 'Descripción 2', 'long:price': '100' },
    }],
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

function getSourceNameElement(container: HTMLElement, fileName: string) {
  return Array.from(container.querySelectorAll<HTMLElement>('.combineSourceFileName .truncatedText'))
    .find((element) => element.textContent === fileName) ?? null;
}

function getPreviewSourceOrder(container: HTMLElement) {
  return Array.from(container.querySelectorAll('.combinePreviewTable tbody tr'))
    .map((row) => row.querySelector('td')?.textContent);
}

function getPreviewDataRows(container: HTMLElement) {
  return Array.from(container.querySelectorAll('.combinePreviewTable tbody tr')).map((row) => (
    Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent ?? '')
  ));
}

function getVisibleSheetSelections() {
  return screen.getAllByRole('button', { name: 'Hoja' }).map((button) => (
    button.textContent?.replace('▾', '').trim()
  ));
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

function restorableDraft(): CombineDraft {
  return {
    schemaVersion: 1,
    columnAssignmentMode: 'position',
    outputColumns: [{ id: 'restored-code', name: 'Código' }],
    mappings: [{ sourceId: 'basket:1', outputColumnId: 'restored-code', sourceColumnId: 'col:0' }],
    sourceMetadataOptions: { includeFileName: true, includeSheetName: false },
    resultSort: { columnId: 'restored-code', direction: 'desc' },
    outputFileName: 'Reporte restaurado',
    sourceOrder: ['basket:1'],
    sourceIds: ['basket:1'],
    sourceSheets: [{ sourceId: 'basket:1', sheetName: 'Productos' }],
  };
}
