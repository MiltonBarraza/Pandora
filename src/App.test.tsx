// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { CombineSource } from './types/combine';
import type { ProcessedExportResult } from './types/processedExport';
import App from './App';

const { exportCombinedXlsx, showErrorToast, showSuccessToast } = vi.hoisted(() => ({
  exportCombinedXlsx: vi.fn(),
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

vi.mock('./services/toastService', () => ({ showErrorToast, showSuccessToast }));
vi.mock('./domain/combine/exportCombinedXlsx', () => ({ exportCombinedXlsx }));
vi.mock('./components/AppearanceToolbar/useAppearanceTheme', () => ({
  useAppearanceTheme: () => ({ preference: 'light', resolvedTheme: 'light', setPreference: vi.fn() }),
}));
vi.mock('./components/AppearanceToolbar/AppearanceToolbar', () => ({
  AppearanceToolbar: ({ extraActions }: { extraActions?: ReactNode }) => <div>{extraActions}</div>,
}));
vi.mock('./components/ImportWizard/ImportWizard', () => ({
  ImportWizard: ({
    appearanceToolbar,
    multiSheetBatchPanel,
    onSaveProcessedResult,
    onSaveToMultiSheetBatch,
    onStatePresenceChange,
  }: {
    appearanceToolbar?: ReactNode;
    multiSheetBatchPanel?: (props: {
      onSaveCurrentSheet: () => void;
      saveCurrentSheetDisabled: boolean;
      saveCurrentSheetDisabledReason: string;
    }) => ReactNode;
    onSaveProcessedResult?: (result: ProcessedExportResult) => void;
    onSaveToMultiSheetBatch?: (result: ProcessedExportResult) => void;
    onStatePresenceChange?: (hasState: boolean) => void;
  }) => (
    <div>
      {appearanceToolbar}
      {multiSheetBatchPanel?.({
        onSaveCurrentSheet: () => onSaveToMultiSheetBatch?.(processedResult),
        saveCurrentSheetDisabled: false,
        saveCurrentSheetDisabledReason: '',
      })}
      <button type="button" onClick={() => onSaveProcessedResult?.(processedResult)}>Emitir resultado</button>
      <button type="button" onClick={() => onSaveToMultiSheetBatch?.(processedResult)}>Guardar hoja válida</button>
      <button type="button" onClick={() => onSaveToMultiSheetBatch?.(compatibleSecondResult)}>Guardar segunda hoja</button>
      <button type="button" onClick={() => onSaveToMultiSheetBatch?.(incompatibleResult)}>Guardar hoja incompatible</button>
      <button type="button" onClick={() => onSaveToMultiSheetBatch?.(foreignFileResult)}>Guardar hoja de otro archivo</button>
      <button type="button" onClick={() => onStatePresenceChange?.(true)}>Marcar sanitizador con estado</button>
    </div>
  ),
}));
vi.mock('./components/CombineWizard/CombineWizard', () => ({
  CombineWizard: ({
    appearanceToolbar,
    basketSources,
    onLocalStatePresenceChange,
  }: {
    appearanceToolbar?: ReactNode;
    basketSources?: CombineSource[];
    onLocalStatePresenceChange?: (hasState: boolean) => void;
  }) => (
    <div>
      {appearanceToolbar}
      <button type="button" onClick={() => onLocalStatePresenceChange?.(true)}>Marcar estado local</button>
      {basketSources?.map((source) => <span key={source.id}>{source.fileName}</span>)}
    </div>
  ),
}));

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
  vi.restoreAllMocks();
  showSuccessToast.mockClear();
  showErrorToast.mockClear();
  exportCombinedXlsx.mockClear();
});

describe('App combine basket wiring', () => {
  it('shows two accessible tool cards with explanatory copy', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('button', { name: 'Sanitizar archivo' }).classList).toContain('toolChoiceCard');
    expect(screen.getByRole('button', { name: 'Combinar archivos' }).classList).toContain('toolChoiceCard');
    expect(screen.getByText('Limpiá una planilla, configurá columnas, aplicá transformaciones y exportá un archivo final.')).not.toBeNull();
    expect(screen.getByText('Uní archivos o resultados sanitizados en una única hoja de salida.')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Combinar archivos' }));
    expect(screen.getByRole('button', { name: 'Marcar estado local' })).not.toBeNull();
  });

  it('leaves an empty sanitizer without confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Marcar estado local' })).not.toBeNull();
  });

  it('stays in sanitizer when dirty-state confirmation is cancelled', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Marcar sanitizador con estado' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText(sanitizerExitConfirmationText)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Marcar sanitizador con estado' })).not.toBeNull();
  });

  it('leaves dirty sanitizer after confirmation and preserves basket sources', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    await user.click(screen.getByRole('button', { name: 'Marcar sanitizador con estado' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar (1 guardado)' }));

    expect(confirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('resultado.xlsx')).not.toBeNull();
  });

  it('connects sanitizer result callback and passes converted source to combine', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    expect(showSuccessToast).toHaveBeenCalledWith('Resultado guardado para combinar.');

    expect(screen.getByRole('button', { name: 'Ir a Combinar (1 guardado)' })).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar (1 guardado)' }));
    expect(screen.getByText('resultado.xlsx')).not.toBeNull();
  });

  it('keeps basket sources without confirmation when combine has no local state', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar (1 guardado)' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Sanitizar' }));

    expect(confirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar (1 guardado)' }));
    expect(screen.getByText('resultado.xlsx')).not.toBeNull();
  });

  it('confirms before leaving combine with local state', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Combinar archivos' }));
    await user.click(screen.getByRole('button', { name: 'Marcar estado local' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Sanitizar' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText(combineExitConfirmationText)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Marcar estado local' })).not.toBeNull();
  });

  it('leaves combine after accepting its internal guard', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Combinar archivos' }));
    await user.click(screen.getByRole('button', { name: 'Marcar estado local' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Sanitizar' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Marcar sanitizador con estado' })).not.toBeNull();
  });

  it('warns before unload when basket sources exist', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));

    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
  });

  it('warns before unload when combine has local state', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Combinar archivos' }));
    await user.click(screen.getByRole('button', { name: 'Marcar estado local' }));

    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
  });

  it('does not warn before unload when app is empty', () => {
    render(<App />);

    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it('stores repeated sanitizer results as independent basket sources', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));

    expect(screen.getByRole('button', { name: 'Ir a Combinar (2 guardados)' })).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar (2 guardados)' }));
    expect(screen.getAllByText('resultado.xlsx')).toHaveLength(2);
  });
});

describe('App multi-sheet batch wiring', () => {
  it('adds the current sheet through the upper batch action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Guardar hoja en lote' }));

    expect(screen.getByText(/1 hoja · 1 filas · 1 columnas/)).not.toBeNull();
    expect(showSuccessToast).toHaveBeenCalledWith('Hoja guardada en el lote multi-hoja.');
  });

  it('adds first and second compatible sheets and defines the summary', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    expect(screen.getByText(/Todavía no guardaste hojas/)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Guardar hoja válida' }));
    expect(screen.getByText(/1 hoja · 1 filas · 1 columnas/)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Guardar segunda hoja' }));

    expect(screen.getByText(/2 hojas · 2 filas · 1 columnas/)).not.toBeNull();
    expect(showSuccessToast).toHaveBeenCalledWith('Hoja guardada en el lote multi-hoja.');
  });

  it('rejects a duplicate sheet with a visible message and preserves the batch', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Guardar hoja válida' }));
    await user.click(screen.getByRole('button', { name: 'Guardar hoja válida' }));

    expect(showErrorToast).toHaveBeenCalledWith(
      'La hoja “Productos” ya está guardada en el lote. Si querés reemplazarla, remové la anterior y guardala de nuevo.',
    );
    expect(screen.getByText(/1 hoja · 1 filas · 1 columnas/)).not.toBeNull();
  });

  it('rejects incompatible columns and a different source without changing the batch', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Guardar hoja válida' }));
    await user.click(screen.getByRole('button', { name: 'Guardar hoja incompatible' }));
    expect(showErrorToast).toHaveBeenCalledWith(expect.stringContaining('Cantidad de columnas distinta'));
    expect(screen.getByText(/1 hoja · 1 filas · 1 columnas/)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Guardar hoja de otro archivo' }));
    expect(showErrorToast).toHaveBeenCalledWith(expect.stringContaining('Archivo fuente distinto'));
    expect(screen.getByText(/1 hoja · 1 filas · 1 columnas/)).not.toBeNull();
  });

  it('updates the summary when removing sheets and clears after the last one', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Guardar hoja válida' }));
    await user.click(screen.getByRole('button', { name: 'Guardar segunda hoja' }));
    await user.click(screen.getByRole('button', { name: 'Remover Productos' }));

    expect(screen.getByText(/1 hoja · 1 filas · 1 columnas/)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remover Febrero' }));

    expect(screen.getByText(/Todavía no guardaste hojas/)).not.toBeNull();
  });

  it('clears the batch after confirmation', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Guardar hoja válida' }));
    await user.click(screen.getByRole('button', { name: 'Limpiar lote' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Limpiar lote' }));

    expect(screen.getByText(/Todavía no guardaste hojas/)).not.toBeNull();
  });

  it('exports combined rows with a source-based file name', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Guardar hoja válida' }));
    await user.click(screen.getByRole('button', { name: 'Guardar segunda hoja' }));
    await user.click(screen.getByRole('button', { name: 'Exportar lote combinado' }));

    await waitFor(() => expect(exportCombinedXlsx).toHaveBeenCalledTimes(1));
    expect(exportCombinedXlsx).toHaveBeenCalledWith(expect.objectContaining({
      fileName: 'origen-multi-hoja',
      outputColumns: [expect.objectContaining({ id: 'output:0' })],
      combinedRows: [
        expect.objectContaining({ sourceSheetName: 'Productos', values: { 'output:0': 'A1' } }),
        expect.objectContaining({ sourceSheetName: 'Febrero', values: { 'output:0': 'B2' } }),
      ],
    }));
  });

  it('uses the app confirmation for F5 when the batch has sheets', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Guardar hoja válida' }));
    const event = new KeyboardEvent('keydown', { key: 'F5', cancelable: true, bubbles: true });
    fireEvent(document, event);

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole('heading', { name: 'Confirmar recarga' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Recargar página' })).not.toBeNull();
  });

  it('does not open the app reload confirmation when state is empty', () => {
    render(<App />);

    const event = new KeyboardEvent('keydown', { key: 'F5', cancelable: true, bubbles: true });
    fireEvent(document, event);

    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByRole('heading', { name: 'Confirmar recarga' })).toBeNull();
  });

  it('warns before unload only after a batch sheet is saved', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Guardar hoja válida' }));

    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
  });

  it('preserves the batch while switching between tools', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Guardar hoja válida' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Sanitizar' }));

    expect(screen.getByText(/1 hoja · 1 filas · 1 columnas/)).not.toBeNull();
  });
});

const processedResult: ProcessedExportResult = {
  id: 'saved:app',
  fileBaseName: 'resultado',
  sourceFileName: 'origen.xlsx',
  sheetName: 'Productos',
  columns: [{ id: 'code', label: 'Código', order: 0, enabled: true }],
  rows: [{ status: 'included', outputValues: { code: 'A1' } }],
};

const incompatibleResult: ProcessedExportResult = {
  ...processedResult,
  id: 'saved:incompatible',
  sheetName: 'Incompatible',
  columns: [
    ...processedResult.columns,
    { id: 'name', label: 'Nombre', order: 1, enabled: true },
  ],
};

const compatibleSecondResult: ProcessedExportResult = {
  ...processedResult,
  id: 'saved:second',
  sheetName: 'Febrero',
  rows: [{ status: 'included', outputValues: { code: 'B2' } }],
};

const foreignFileResult: ProcessedExportResult = {
  ...processedResult,
  id: 'saved:foreign',
  sourceFileName: 'otro.xlsx',
};

const sanitizerExitConfirmationText = 'Vas a salir del sanitizador. El archivo cargado y la configuración actual se perderán. Los resultados ya guardados para combinar se conservarán hasta que recargues la página. ¿Querés continuar?';
const combineExitConfirmationText = 'Vas a salir de Combinar archivos. Los archivos subidos manualmente y la configuración local se perderán. Los resultados guardados desde el sanitizador se conservarán hasta que recargues la página. ¿Querés continuar?';

function dispatchBeforeUnload() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}
