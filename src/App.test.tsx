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
  }: {
    appearanceToolbar?: ReactNode;
    basketSources?: CombineSource[];
  }) => (
    <div>
      {appearanceToolbar}
      {basketSources?.map((source) => <span key={source.id}>{source.fileName}</span>)}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  showSuccessToast.mockClear();
});

describe('App combine basket wiring', () => {
  it('connects sanitizer result callback and passes converted source to combine', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Sanitizar archivo' }));
    await user.click(screen.getByRole('button', { name: 'Emitir resultado' }));
    expect(showSuccessToast).toHaveBeenCalledWith('Resultado guardado para combinar.');

    await user.click(screen.getByRole('button', { name: 'Cambiar herramienta' }));
    expect(screen.getByText('resultado.xlsx')).not.toBeNull();
  });
});

const processedResult: ProcessedExportResult = {
  id: 'saved:app',
  fileBaseName: 'resultado',
  columns: [{ id: 'code', label: 'Código', order: 0, enabled: true }],
  rows: [{ status: 'included', outputValues: { code: 'A1' } }],
};
