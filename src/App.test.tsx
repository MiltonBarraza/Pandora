// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { CombineSource } from './types/combine';
import type { ProcessedExportResult } from './types/processedExport';
import App, { ToolLoadingFallback } from './App';
import { SavedCombineSourcesModal } from './components/AppearanceToolbar/AppearanceToolbar';

const { showSuccessToast } = vi.hoisted(() => ({
  showSuccessToast: vi.fn(),
}));
const { setAppearancePreference } = vi.hoisted(() => ({
  setAppearancePreference: vi.fn(),
}));

vi.mock('./services/toastService', () => ({ showSuccessToast }));
vi.mock('./components/AppearanceToolbar/useAppearanceTheme', () => ({
  useAppearanceTheme: () => ({ preference: 'light', resolvedTheme: 'light', setPreference: setAppearancePreference }),
}));
vi.mock('./components/ImportWizard/ImportWizard', () => ({
  ImportWizard: ({
    appearanceToolbar,
    onSaveProcessedResult,
    onStatePresenceChange,
  }: {
    appearanceToolbar?: ReactNode;
    onSaveProcessedResult?: (result: ProcessedExportResult) => void;
    onStatePresenceChange?: (hasState: boolean) => void;
  }) => (
    <div>
      {appearanceToolbar}
      <button type="button" onClick={() => onSaveProcessedResult?.(processedResult)}>Emitir resultado</button>
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
  setAppearancePreference.mockClear();
});

describe('App combine basket wiring', () => {
  it('renders the tool loading fallback inside the tool content area', () => {
    const { container } = render(<ToolLoadingFallback appearanceToolbar={<div>Toolbar</div>} />);

    expect(screen.getByRole('status').textContent).toContain('Cargando herramienta');
    expect(container.querySelector('.toolLoadingWizard')).not.toBeNull();
    expect(container.querySelector('.toolLoadingPanel')).not.toBeNull();
    expect(screen.getByText('Toolbar')).not.toBeNull();
  });

  it('shows two accessible tool cards with explanatory copy', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('button', { name: 'Preparar archivo' }).classList).toContain('toolChoiceCard');
    expect(screen.getByRole('button', { name: 'Combinar archivos' }).classList).toContain('toolChoiceCard');
    expect(screen.getByText('Limpiá una planilla, configurá columnas, aplicá transformaciones y descargá un archivo final.')).not.toBeNull();
    expect(screen.getByText('Uní archivos o resultados preparados en una única hoja de salida.')).not.toBeNull();
    expect(screen.getByRole('heading', { name: '¿Qué querés hacer?' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Combinar archivos' }));
    expect(await screen.findByRole('button', { name: 'Marcar estado local' })).not.toBeNull();
  });

  it('renders the compact toolbar with tools menu and icon-only appearance controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('button', { name: 'Herramientas' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: /Ir a Combinar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Ir a Preparar archivo/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Sistema/ })).toBeNull();
    expect(screen.queryByLabelText('1 archivo disponible para combinar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ver archivos disponibles para combinar' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Herramientas' }));
    const menu = screen.getByRole('menu', { name: 'Herramientas' });
    expect(within(menu).getByRole('menuitem', { name: 'Preparar archivo' })).not.toBeNull();
    expect(within(menu).getByRole('menuitem', { name: 'Combinar archivos' })).not.toBeNull();

    expect(screen.getByRole('button', { name: 'Activar modo claro' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Activar modo oscuro' })).not.toBeNull();
  });

  it('shows available combine files in the toolbar badge, menu, and detail modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await screen.findByRole('button', { name: 'Emitir resultado' });
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));

    expect(screen.getByLabelText('1 archivo disponible para combinar').textContent).toBe('1');
    expect(screen.getByRole('button', { name: 'Ver archivos disponibles para combinar' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Herramientas' }));
    expect(within(screen.getByRole('menu', { name: 'Herramientas' })).getByRole('menuitem', { name: /Combinar archivos.*1 disponible/ })).not.toBeNull();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Ver archivos disponibles para combinar' }));
    const dialog = screen.getByRole('dialog', { name: 'Archivos disponibles para combinar' });
    expect(within(dialog).getByText('resultado.xlsx')).not.toBeNull();
    expect(within(dialog).getByText('Productos')).not.toBeNull();
    expect(within(dialog).getByText('1 fila')).not.toBeNull();
    expect(within(dialog).getByText('1 columna')).not.toBeNull();

    await user.click(within(dialog).getAllByRole('button', { name: 'Cerrar' })[0]);
    expect(screen.queryByRole('dialog', { name: 'Archivos disponibles para combinar' })).toBeNull();
  });

  it('closes the combine files modal with Escape', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await screen.findByRole('button', { name: 'Emitir resultado' });
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    await user.click(screen.getByRole('button', { name: 'Ver archivos disponibles para combinar' }));
    expect(screen.getByRole('dialog', { name: 'Archivos disponibles para combinar' })).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Archivos disponibles para combinar' })).toBeNull();
  });

  it('renders empty and long-name states in the combine files modal', () => {
    const onClose = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(80);
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(160);
    const longSource: CombineSource = {
      id: 'long-source',
      fileName: 'archivo-preparado-con-un-nombre-muy-largo-para-validar-truncado.xlsx',
      sheetName: 'Hoja con nombre muy largo para validar truncado visual',
      columns: [
        { id: 'code', name: 'Código', index: 0 },
        { id: 'price', name: 'Precio', index: 1 },
      ],
      rows: [
        { id: 'row-1', values: { code: 'A1', price: '10' } },
        { id: 'row-2', values: { code: 'A2', price: '20' } },
      ],
    };
    const { container, rerender } = render(<SavedCombineSourcesModal open sources={[]} onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Archivos disponibles para combinar' })).not.toBeNull();
    expect(screen.getByText('No hay archivos disponibles para combinar.')).not.toBeNull();

    rerender(<SavedCombineSourcesModal open sources={[longSource]} onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Archivos disponibles para combinar' });
    expect(within(dialog).getByText(longSource.fileName)).not.toBeNull();
    expect(within(dialog).getByText(longSource.sheetName!)).not.toBeNull();
    expect(within(dialog).getByText('2 filas')).not.toBeNull();
    expect(within(dialog).getByText('2 columnas')).not.toBeNull();
    return waitFor(() => {
      expect(container.querySelectorAll('.truncatedTextTooltip')).toHaveLength(2);
    });
  });

  it('changes tool from the toolbar menu', async () => {
    const user = userEvent.setup();
    render(<App />);

    await selectToolbarTool(user, 'Combinar archivos');
    expect(await screen.findByRole('button', { name: 'Marcar estado local' })).not.toBeNull();
  });

  it('changes appearance from icon-only toolbar buttons', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Activar modo oscuro' }));
    expect(setAppearancePreference).toHaveBeenCalledWith('dark');

    await user.click(screen.getByRole('button', { name: 'Activar modo claro' }));
    expect(setAppearancePreference).toHaveBeenCalledWith('light');
  });

  it('leaves an empty sanitizer without confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await screen.findByRole('button', { name: 'Marcar sanitizador con estado' });
    await selectToolbarTool(user, 'Combinar archivos');

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Marcar estado local' })).not.toBeNull();
  });

  it('stays in sanitizer when dirty-state confirmation is cancelled', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await screen.findByRole('button', { name: 'Marcar sanitizador con estado' });
    await user.click(screen.getByRole('button', { name: 'Marcar sanitizador con estado' }));
    await selectToolbarTool(user, 'Combinar archivos');

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText(sanitizerExitConfirmationText)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Marcar sanitizador con estado' })).not.toBeNull();
  });

  it('leaves dirty sanitizer after confirmation and preserves basket sources', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await screen.findByRole('button', { name: 'Marcar sanitizador con estado' });
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    await user.click(screen.getByRole('button', { name: 'Marcar sanitizador con estado' }));
    await selectToolbarTool(user, 'Combinar archivos');

    expect(confirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('resultado.xlsx')).not.toBeNull();
  });

  it('connects sanitizer result callback and passes converted source to combine', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await screen.findByRole('button', { name: 'Emitir resultado' });
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    expect(showSuccessToast).toHaveBeenCalledWith('Resultado guardado para combinar.');

    await selectToolbarTool(user, 'Combinar archivos');
    expect(screen.getByText('resultado.xlsx')).not.toBeNull();
  });

  it('does not wire the removed multi-sheet batch UI into sanitizer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await screen.findByRole('button', { name: 'Marcar sanitizador con estado' });

    expect(screen.queryByText('Lote multi-hoja')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Guardar hoja en lote' })).toBeNull();
  });

  it('keeps basket sources without confirmation when combine has no local state', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await screen.findByRole('button', { name: 'Emitir resultado' });
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    await selectToolbarTool(user, 'Combinar archivos');
    await selectToolbarTool(user, 'Preparar archivo');

    expect(confirm).not.toHaveBeenCalled();
    await selectToolbarTool(user, 'Combinar archivos');
    expect(screen.getByText('resultado.xlsx')).not.toBeNull();
  });

  it('confirms before leaving combine with local state', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Combinar archivos' }));
    await screen.findByRole('button', { name: 'Marcar estado local' });
    await user.click(screen.getByRole('button', { name: 'Marcar estado local' }));
    await selectToolbarTool(user, 'Preparar archivo');

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
    await screen.findByRole('button', { name: 'Marcar estado local' });
    await user.click(screen.getByRole('button', { name: 'Marcar estado local' }));
    await selectToolbarTool(user, 'Preparar archivo');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Marcar sanitizador con estado' })).not.toBeNull();
  });

  it('warns before unload when basket sources exist', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await screen.findByRole('button', { name: 'Emitir resultado' });
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));

    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
  });

  it('warns before unload when combine has local state', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Combinar archivos' }));
    await screen.findByRole('button', { name: 'Marcar estado local' });
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

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await screen.findByRole('button', { name: 'Emitir resultado' });
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));

    await selectToolbarTool(user, 'Combinar archivos');
    expect(screen.getAllByText('resultado.xlsx')).toHaveLength(2);
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

const sanitizerExitConfirmationText = 'Vas a salir de Preparar archivo. El archivo cargado y la configuración actual se perderán. Los resultados ya guardados para combinar se conservarán hasta que recargues la página. ¿Querés continuar?';
const combineExitConfirmationText = 'Vas a salir de Combinar archivos. Los archivos subidos manualmente y la configuración local se perderán. Los resultados guardados desde Preparar archivo se conservarán hasta que recargues la página. ¿Querés continuar?';

function dispatchBeforeUnload() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

async function selectToolbarTool(user: ReturnType<typeof userEvent.setup>, label: 'Preparar archivo' | 'Combinar archivos') {
  await user.click(screen.getByRole('button', { name: 'Herramientas' }));
  const menu = within(await screen.findByRole('menu', { name: 'Herramientas' }));
  const option = menu.getAllByRole('menuitem').find((item) => item.textContent?.includes(label));

  if (!option) {
    throw new Error(`No toolbar tool option found for ${label}`);
  }

  await user.click(option);
}
