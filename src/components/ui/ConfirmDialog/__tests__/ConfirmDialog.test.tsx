import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders accessible confirmation copy and actions', () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Hay cambios sin aplicar"
        message="Si continuás, se perderá la configuración actual."
        cancelLabel="Cancelar"
        confirmLabel="Descartar"
        variant="danger"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(html).toContain('Hay cambios sin aplicar');
    expect(html).toContain('Si continuás, se perderá la configuración actual.');
    expect(html).toContain('Cancelar');
    expect(html).toContain('Descartar');
    expect(html).toContain('aria-label="Cerrar"');
  });
});
