// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CombineSource } from '../../types/combine';
import { CombineWizard } from './CombineWizard';

afterEach(cleanup);

describe('CombineWizard basket sources', () => {
  it('shows basket sources as loaded and identifies their temporary origin', () => {
    render(<CombineWizard basketSources={[basketSource]} />);

    expect(screen.getByText('guardado.xlsx')).not.toBeNull();
    expect(screen.getByText('Desde sanitizador')).not.toBeNull();
    expect(screen.getByText('Hoja usada: Productos · 1 columna · 1 fila de datos')).not.toBeNull();
    expect(screen.getByText(/son temporales y se pierden al recargar/)).not.toBeNull();
  });

  it('uses numbered sections, plural upload copy and file terminology', () => {
    const { container } = render(<CombineWizard basketSources={[basketSource]} />);

    expect(screen.getByRole('heading', { name: '1. Archivos' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '2. Configuración' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '3. Columnas de salida' })).not.toBeNull();
    expect(screen.getByText('Archivos cargados')).not.toBeNull();
    expect(screen.getByText('Elegir archivos')).not.toBeNull();
    expect(screen.getByText('Arrastrá archivos aquí de tipo .xlsx, .xls, .xlsm o .csv')).not.toBeNull();
    expect(screen.getByText('Hacé click para subir archivos desde tu computadora')).not.toBeNull();
    expect((container.querySelector('input[type="file"][multiple]') as HTMLInputElement | null)?.multiple).toBe(true);
    expect(screen.getByRole('button', { name: 'Información sobre los archivos para combinar' })).not.toBeNull();
    expect(screen.queryByText('Fuentes')).toBeNull();
    expect(screen.queryByText('Excel: primera hoja.')).toBeNull();
  });

  it('numbers mapping, preview and export after output columns are initialized', async () => {
    render(<CombineWizard basketSources={[basketSource]} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Usar columnas del primer archivo' }));

    expect(screen.getByRole('heading', { name: '4. Mapeo' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '5. Vista previa' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '6. Exportar' })).not.toBeNull();
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

const basketSource: CombineSource = {
  id: 'basket:1',
  fileName: 'guardado.xlsx',
  sheetName: 'Productos',
  columns: [{ id: 'col:0', name: 'Código', index: 0 }],
  rows: [{ id: 'row:0', values: { 'col:0': 'A1' } }],
};
