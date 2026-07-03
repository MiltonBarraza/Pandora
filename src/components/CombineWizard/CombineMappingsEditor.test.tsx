// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CombineSource } from '../../types/combine';
import { CombineMappingsEditor } from './CombineMappingsEditor';

afterEach(cleanup);

describe('CombineMappingsEditor accordion', () => {
  it('shows mapping progress and keeps one source expanded at a time', async () => {
    const user = userEvent.setup();
    render(
      <CombineMappingsEditor
        sources={sources}
        outputColumns={outputColumns}
        mappings={[{
          sourceId: 'source-a',
          outputColumnId: 'output-a',
          sourceColumnId: 'col:0',
        }]}
        columnAssignmentMode="byName"
        onMappingChange={vi.fn()}
        onReapplyMappings={vi.fn()}
      />,
    );

    const firstToggle = screen.getByRole('button', { name: /a\.xlsx/ });
    const secondToggle = screen.getByRole('button', { name: /b\.csv/ });
    await waitFor(() => expect(firstToggle.getAttribute('aria-expanded')).toBe('true'));
    expect(screen.getByRole('heading', { name: '4. Asignar columnas' })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: '4. Mapeo' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Recalcular asignación automática' }).parentElement?.classList).toContain('infoTooltip');
    expect(screen.getByText('1/2 columnas asignadas')).not.toBeNull();
    expect(screen.getByText('Las columnas sin asignar generarán celdas vacías.')).not.toBeNull();
    expect(screen.getAllByText('Sin asignar').length).toBeGreaterThan(0);
    expect(screen.getByText('Origen A (columna 1)')).not.toBeNull();

    await user.click(secondToggle);
    expect(firstToggle.getAttribute('aria-expanded')).toBe('false');
    expect(secondToggle.getAttribute('aria-expanded')).toBe('true');

    await user.click(firstToggle);
    expect(screen.getByText('Origen A (columna 1)')).not.toBeNull();
  });
});

const outputColumns = [
  { id: 'output-a', name: 'Salida A' },
  { id: 'output-b', name: 'Salida B' },
];

const sources: CombineSource[] = [
  {
    id: 'source-a',
    fileName: 'a.xlsx',
    columns: [{ id: 'col:0', name: 'Origen A', index: 0 }],
    rows: [{ id: 'row:0', values: { 'col:0': 'A' } }],
  },
  {
    id: 'source-b',
    fileName: 'b.csv',
    columns: [{ id: 'col:0', name: 'Origen B', index: 0 }],
    rows: [{ id: 'row:0', values: { 'col:0': 'B' } }],
  },
];
