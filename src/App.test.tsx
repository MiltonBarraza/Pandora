// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { CombineSource } from './types/combine';
import type { ProcessedExportResult } from './types/processedExport';
import App, { ToolLoadingFallback } from './App';

const { showSuccessToast } = vi.hoisted(() => ({
  showSuccessToast: vi.fn(),
}));

vi.mock('./services/toastService', () => ({ showSuccessToast }));
vi.mock('./components/AppearanceToolbar/useAppearanceTheme', () => ({
  useAppearanceTheme: () => ({ preference: 'light', resolvedTheme: 'light', setPreference: vi.fn() }),
}));
vi.mock('./components/AppearanceToolbar/AppearanceToolbar', () => ({
  AppearanceToolbar: ({ extraActions }: { extraActions?: ReactNode }) => <div>{extraActions}</div>,
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

  it('leaves an empty sanitizer without confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Marcar estado local' })).not.toBeNull();
  });

  it('stays in sanitizer when dirty-state confirmation is cancelled', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
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

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
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

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    expect(showSuccessToast).toHaveBeenCalledWith('Resultado guardado para combinar.');

    expect(screen.getByRole('button', { name: 'Ir a Combinar (1 guardado)' })).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar (1 guardado)' }));
    expect(screen.getByText('resultado.xlsx')).not.toBeNull();
  });

  it('does not wire the removed multi-sheet batch UI into sanitizer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));

    expect(screen.queryByText('Lote multi-hoja')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Guardar hoja en lote' })).toBeNull();
  });

  it('keeps basket sources without confirmation when combine has no local state', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar (1 guardado)' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Preparar archivo' }));

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
    await user.click(screen.getByRole('button', { name: 'Ir a Preparar archivo' }));

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
    await user.click(screen.getByRole('button', { name: 'Ir a Preparar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Marcar sanitizador con estado' })).not.toBeNull();
  });

  it('warns before unload when basket sources exist', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
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

    await user.click(screen.getByRole('button', { name: 'Preparar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));

    expect(screen.getByRole('button', { name: 'Ir a Combinar (2 guardados)' })).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ir a Combinar (2 guardados)' }));
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
