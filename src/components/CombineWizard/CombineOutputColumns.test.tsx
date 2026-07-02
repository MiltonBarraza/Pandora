// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CombineOutputColumn, CombineSource } from '../../types/combine';
import { CombineOutputColumns } from './CombineOutputColumns';

afterEach(cleanup);

describe('CombineOutputColumns', () => {
  it('renders a compact empty layout with contextual actions', async () => {
    const onChange = vi.fn();
    render(<CombineOutputColumns sources={[source]} outputColumns={[]} onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Información sobre las columnas de salida' })).not.toBeNull();
    expect(screen.queryByText('Todavía no definiste columnas de salida.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Usar columnas del primer archivo' }).parentElement?.classList).toContain('infoTooltip');
    expect(screen.getByRole('button', { name: 'Agregar columna' }).parentElement?.classList).toContain('infoTooltip');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Usar columnas del primer archivo' }));
    expect(onChange).toHaveBeenCalledWith([{ id: expect.any(String), name: 'Código' }]);
  });

  it('keeps add, edit and remove behavior in compact rows', async () => {
    const user = userEvent.setup();
    const { container } = render(<OutputColumnsHarness />);

    expect(container.querySelectorAll('.combineOutputColumnItem')).toHaveLength(2);
    expect(screen.getByText('Columna 1').closest('label')?.querySelector('input')).not.toBeNull();

    await user.clear(screen.getByRole('textbox', { name: 'Nombre de columna de salida 1' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre de columna de salida 1' }), 'SKU');
    expect((screen.getByRole('textbox', { name: 'Nombre de columna de salida 1' }) as HTMLInputElement).value).toBe('SKU');

    await user.click(screen.getByRole('button', { name: 'Eliminar columna SKU' }));
    expect(container.querySelectorAll('.combineOutputColumnItem')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Agregar columna' }));
    expect(container.querySelectorAll('.combineOutputColumnItem')).toHaveLength(2);
    expect((screen.getByRole('textbox', { name: 'Nombre de columna de salida 2' }) as HTMLInputElement).value).toBe('Nueva columna');
  });
});

function OutputColumnsHarness() {
  const [columns, setColumns] = useState(outputColumns);
  return <CombineOutputColumns sources={[source]} outputColumns={columns} onChange={setColumns} />;
}

const source: CombineSource = {
  id: 'source:1',
  fileName: 'origen.xlsx',
  columns: [{ id: 'column:1', name: 'Código', index: 0 }],
  rows: [],
};

const outputColumns: CombineOutputColumn[] = [
  { id: 'output:1', name: 'Código' },
  { id: 'output:2', name: 'Nombre' },
];
