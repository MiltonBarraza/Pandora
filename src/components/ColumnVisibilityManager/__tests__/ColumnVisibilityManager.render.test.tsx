import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import type { ColumnAnalysis, VirtualInputColumn } from '../../../types/import';
import { ColumnVisibilityManager } from '../ColumnVisibilityManager';

vi.mock('../../ui/InfoTooltip/InfoTooltip', () => ({
  InfoTooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

describe('ColumnVisibilityManager virtual columns', () => {
  it('renders real detected columns as before', () => {
    const html = renderToStaticMarkup(
      <ColumnVisibilityManager
        columns={[createColumn(0, 'A', 'Codigo')]}
        onChange={vi.fn()}
      />,
    );

    expect(html).toContain('Codigo');
    expect(html).toContain('A');
  });

  it('does not render the Pandora-created columns block without virtual columns', () => {
    const html = renderToStaticMarkup(
      <ColumnVisibilityManager
        columns={[createColumn(0, 'A', 'Codigo')]}
        onChange={vi.fn()}
      />,
    );

    expect(html).not.toContain('Columnas creadas por Pandora');
  });

  it('renders virtual columns in a separate read-only block', () => {
    const html = renderToStaticMarkup(
      <ColumnVisibilityManager
        columns={[createColumn(0, 'A', 'Codigo')]}
        virtualInputColumns={[virtualColumn('virtual:dato-adicional', 'Dato adicional')]}
        onChange={vi.fn()}
      />,
    );

    expect(html).toContain('Columnas creadas por Pandora');
    expect(html).toContain('Dato adicional');
    expect(html).toContain('Virtual');
    expect(html).not.toContain('virtual:dato-adicional');
  });
});

function createColumn(columnIndex: number, columnLetter: string, header: string): ColumnAnalysis {
  return {
    columnIndex,
    columnLetter,
    header,
    sampleValues: ['001'],
    nonEmptyCount: 1,
    isEmpty: false,
    ignored: false,
    autoIgnored: false,
  };
}

function virtualColumn(id: string, label: string): VirtualInputColumn {
  return {
    id,
    kind: 'virtual',
    label,
    active: true,
  };
}
