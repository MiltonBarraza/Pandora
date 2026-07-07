// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OutputColumnsManager, shouldApplyGeneratedColumnsResult, shouldShowOutputColumnNameTooltip } from '../OutputColumnsManager';

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

    render(React.createElement(OutputColumnsManager, { outputColumns: [], onChange }));

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

    render(React.createElement(OutputColumnsManager, {
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
});
