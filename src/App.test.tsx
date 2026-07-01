// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CombineSource } from './types/combine';
import type { ProcessedExportResult } from './types/processedExport';
import App from './App';

const { showSuccessToast } = vi.hoisted(() => ({ showSuccessToast: vi.fn() }));

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
  }: {
    appearanceToolbar?: ReactNode;
    onSaveProcessedResult?: (result: ProcessedExportResult) => void;
  }) => (
    <div>
      {appearanceToolbar}
      <button type="button" onClick={() => onSaveProcessedResult?.(processedResult)}>Emitir resultado</button>
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  showSuccessToast.mockClear();
});

describe('App combine basket wiring', () => {
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
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Combinar archivos' }));
    await user.click(screen.getByRole('button', { name: 'Marcar estado local' }));
    await user.click(screen.getByRole('button', { name: 'Ir a Sanitizar' }));

    expect(confirm).toHaveBeenCalledWith(
      'Vas a salir de Combinar archivos. Las fuentes subidas manualmente y la configuración local se perderán. Los resultados guardados desde el sanitizador se conservarán hasta que recargues la página.',
    );
    expect(screen.getByRole('button', { name: 'Marcar estado local' })).not.toBeNull();
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

const processedResult: ProcessedExportResult = {
  id: 'saved:app',
  fileBaseName: 'resultado',
  columns: [{ id: 'code', label: 'Código', order: 0, enabled: true }],
  rows: [{ status: 'included', outputValues: { code: 'A1' } }],
};
