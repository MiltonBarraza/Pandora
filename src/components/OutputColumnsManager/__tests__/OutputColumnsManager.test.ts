// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OutputColumnsManager, shouldApplyGeneratedColumnsResult, shouldShowOutputColumnNameTooltip } from '../OutputColumnsManager';
import type { OutputColumn } from '../../../types/import';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('OutputColumnsManager helpers', () => {
  it('shows column name tooltips only when the label is long enough to help', () => {
    expect(shouldShowOutputColumnNameTooltip('Cliente')).toBe(false);
    expect(shouldShowOutputColumnNameTooltip('Nombre completo del cliente final')).toBe(true);
  });

  it('applies generated column results when obsolete generated columns were removed', () => {
    expect(shouldApplyGeneratedColumnsResult({ activeCount: 0, removedObsoleteCount: 0 })).toBe(false);
    expect(shouldApplyGeneratedColumnsResult({ activeCount: 0, removedObsoleteCount: 2 })).toBe(true);
    expect(shouldApplyGeneratedColumnsResult({ activeCount: 1, removedObsoleteCount: 0 })).toBe(true);
  });

  it('adds a default output column without rendering the new-column text input', async () => {
    const onChange = vi.fn();
    vi.stubGlobal('crypto', { randomUUID: () => 'output-new' });

    render(createElement(OutputColumnsManager, { outputColumns: [], onChange }));

    expect(screen.queryByRole('textbox', { name: /Nueva columna/i })).toBeNull();
    expect(screen.queryByPlaceholderText('Nueva columna')).toBeNull();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Agregar' }));

    expect(onChange).toHaveBeenCalledWith([{
      id: 'output-new',
      label: 'Nueva columna',
      order: 0,
      enabled: true,
      recipe: { type: 'fixedText', value: '' },
    }]);
  });

  it('keeps an existing column recipe unchanged until the operation type changes', () => {
    const onChange = vi.fn();

    render(createElement(OutputColumnsManager, {
      outputColumns: [{
        id: 'output-current',
        label: 'Cliente',
        order: 0,
        enabled: true,
        recipe: { type: 'fixedText', value: 'ACME' },
      }],
      onChange,
    }));

    expect(screen.queryByText(/Mantener configuraci/i)).toBeNull();
    expect(screen.getAllByText('Texto fijo').length).toBeGreaterThan(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders configured column actions as duplicate, drag, then delete', () => {
    const markup = renderToStaticMarkup(createElement(OutputColumnsManager, {
      outputColumns: [outputColumn('name', 'Nombre'), outputColumn('price', 'Precio')],
      onChange: () => undefined,
    }));
    const itemStart = markup.indexOf('outputColumnListItem selected');
    const duplicateIndex = markup.indexOf('aria-label="Duplicar columna"', itemStart);
    const dragIndex = markup.indexOf('aria-label="Reordenar"', itemStart);
    const deleteIndex = markup.indexOf('aria-label="Eliminar columna"', itemStart);

    expect(duplicateIndex).toBeGreaterThan(itemStart);
    expect(duplicateIndex).toBeLessThan(dragIndex);
    expect(dragIndex).toBeLessThan(deleteIndex);
  });
});

function outputColumn(id: string, label: string): OutputColumn {
  return {
    id,
    label,
    order: id === 'name' ? 0 : 1,
    enabled: true,
    recipe: { type: 'empty' },
  };
}
