import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OutputColumnsManager, shouldApplyGeneratedColumnsResult, shouldShowOutputColumnNameTooltip } from '../OutputColumnsManager';
import type { OutputColumn } from '../../../types/import';

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

  it('renders configured column actions as duplicate, drag, then delete', () => {
    const originalDocument = globalThis.document;
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { body: {} },
    });
    let markup = '';
    try {
      markup = renderToStaticMarkup(createElement(OutputColumnsManager, {
        outputColumns: [outputColumn('name', 'Nombre'), outputColumn('price', 'Precio')],
        onChange: () => undefined,
      }));
    } finally {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      });
    }
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
