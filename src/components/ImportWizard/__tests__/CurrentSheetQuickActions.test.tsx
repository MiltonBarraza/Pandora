// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CurrentSheetQuickActions } from '../ImportWizard';

afterEach(cleanup);

describe('CurrentSheetQuickActions', () => {
  it('saves current processed sheet for Combine', async () => {
    const onSave = vi.fn();
    render(<CurrentSheetQuickActions disabled={false} onSave={onSave} />);

    expect(screen.getByText('Guardar esta hoja para combinar')).not.toBeNull();
    expect(screen.getByText('Guardá el resultado procesado de esta hoja para usarlo luego en Combinar archivos.')).not.toBeNull();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar para combinar' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('keeps existing availability state', () => {
    render(<CurrentSheetQuickActions disabled onSave={vi.fn()} />);

    expect((screen.getByRole('button', { name: 'Guardar para combinar' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
