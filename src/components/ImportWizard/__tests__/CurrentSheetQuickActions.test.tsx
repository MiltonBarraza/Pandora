// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CurrentSheetQuickActions } from '../ImportWizard';

afterEach(cleanup);

describe('CurrentSheetQuickActions', () => {
  it('renders a discreet current-sheet save access and runs the shared handler', async () => {
    const onSave = vi.fn();
    render(<CurrentSheetQuickActions disabled={false} onSave={onSave} />);

    expect(screen.getByRole('complementary', { name: 'Acciones rápidas de la hoja actual' })).not.toBeNull();
    expect(screen.queryByText('Hoja actual')).toBeNull();
    expect(screen.getByText('Guardar esta hoja para combinar')).not.toBeNull();
    expect(screen.getByText('Guardá el resultado procesado de esta hoja para usarlo luego en Combinar archivos.')).not.toBeNull();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar para combinar' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Lote multi-hoja')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Guardar hoja en lote' })).toBeNull();
  });

  it('uses app tooltips for the title and save button', async () => {
    const user = userEvent.setup();
    render(<CurrentSheetQuickActions disabled={false} onSave={vi.fn()} />);

    const titleHelp = screen.getByRole('button', { name: 'Ayuda: Guardar esta hoja para combinar' });
    await user.hover(titleHelp);
    expect((await screen.findByRole('tooltip')).textContent).toBe(
      'Usá esta acción cuando estés preparando varias hojas. Guarda el resultado procesado de la hoja actual para usarlo luego en Combinar archivos.',
    );
    await user.unhover(titleHelp);

    const saveButton = screen.getByRole('button', { name: 'Guardar para combinar' });
    await user.hover(saveButton);
    expect((await screen.findByRole('tooltip')).textContent).toBe(
      'Guarda el resultado procesado de esta hoja como fuente “Desde sanitizador” en Combinar archivos. La combinación, el orden, la vista previa y la exportación se hacen desde esa pantalla.',
    );
  });

  it('uses the supplied disabled state and explains when it becomes available', async () => {
    const user = userEvent.setup();
    render(<CurrentSheetQuickActions disabled onSave={vi.fn()} />);

    const saveButton = screen.getByRole('button', { name: 'Guardar para combinar' }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    await user.hover(saveButton.parentElement!);
    expect((await screen.findByRole('tooltip')).textContent).toContain(
      'Disponible cuando haya un resultado válido para guardar.',
    );
  });
});
