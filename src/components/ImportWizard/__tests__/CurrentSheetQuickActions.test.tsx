// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CurrentSheetQuickActions, getSheetRangeWarning, Step } from '../ImportWizard';

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

describe('ImportWizard section warning', () => {
  it('renders a compact warning trigger beside the preview title', () => {
    const warning = getSheetRangeWarning({
      originalRef: 'A1:XET109',
      effectiveRef: 'A1:M109',
      wasTrimmed: true,
      shouldShowTrimWarning: true,
      ignoredTrailingColumns: 16361,
      ignoredTrailingRows: 0,
    });

    render(
      <Step
        title="4. Vista previa de datos"
        warning={warning}
      >
        <div>Vista</div>
      </Step>,
    );

    expect(screen.getByRole('button', { name: 'Advertencia: 4. Vista previa de datos' })).not.toBeNull();
    expect(document.querySelector('.sheetRangeWarning')).toBeNull();
  });

  it('does not render the preview warning for a minor trim', () => {
    const warning = getSheetRangeWarning({
      originalRef: 'A1:P100',
      effectiveRef: 'A1:M100',
      wasTrimmed: true,
      shouldShowTrimWarning: false,
      ignoredTrailingColumns: 3,
      ignoredTrailingRows: 0,
    });

    render(
      <Step title="4. Vista previa de datos" warning={warning}>
        <div>Vista</div>
      </Step>,
    );

    expect(screen.queryByRole('button', { name: 'Advertencia: 4. Vista previa de datos' })).toBeNull();
  });
});
