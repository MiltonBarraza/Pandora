// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    expect((screen.getByRole('radio', { name: /Por nombre/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /Por posición/ }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText('Todavía no hay columnas de salida. Generá columnas automáticamente o agregá una columna manualmente.')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Generar columnas' }).parentElement?.classList).toContain('infoTooltip');
    expect(screen.getByRole('button', { name: 'Agregar columna' }).parentElement?.classList).toContain('infoTooltip');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Generar columnas' }));
    expect(onChange).toHaveBeenCalledWith([{ id: expect.any(String), name: 'Código' }]);
  });

  it('generates columns using position mode when selected', async () => {
    const onChange = vi.fn();
    render(
      <CombineOutputColumns
        sources={positionSources}
        outputColumns={[]}
        onChange={onChange}
        assignmentMode="position"
      />,
    );

    await userEvent.setup().click(screen.getByRole('button', { name: 'Generar columnas' }));

    expect(onChange).toHaveBeenCalledWith([
      { id: expect.any(String), name: 'Cod' },
      { id: expect.any(String), name: 'Producto' },
      { id: expect.any(String), name: 'Precio' },
    ]);
  });

  it('keeps add, edit and remove behavior in compact rows', async () => {
    const user = userEvent.setup();
    const { container } = render(<OutputColumnsHarness />);

    expect(container.querySelectorAll('.combineOutputColumnItem')).toHaveLength(2);
    expect(screen.getByText('Columna 1').closest('label')?.querySelector('input')).not.toBeNull();

    await user.clear(screen.getByRole('textbox', { name: 'Nombre de columna de salida 1' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre de columna de salida 1' }), 'SKU');
    expect((screen.getByRole('textbox', { name: 'Nombre de columna de salida 1' }) as HTMLInputElement).value).toBe('SKU');

    const removeButton = screen.getByRole('button', { name: 'Remover columna SKU' });
    expect(removeButton.getAttribute('title')).toBeNull();
    await user.hover(removeButton);
    expect((await screen.findByRole('tooltip')).textContent).toBe('Remover');
    await user.unhover(removeButton);
    await user.click(removeButton);
    expect(container.querySelectorAll('.combineOutputColumnItem')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Agregar columna' }));
    expect(container.querySelectorAll('.combineOutputColumnItem')).toHaveLength(2);
    expect((screen.getByRole('textbox', { name: 'Nombre de columna de salida 2' }) as HTMLInputElement).value).toBe('Nueva columna');
  });

  it('requests position mode and explains both assignment strategies', async () => {
    const onAssignmentModeChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CombineOutputColumns
        sources={[source]}
        outputColumns={outputColumns}
        onChange={vi.fn()}
        assignmentMode="name"
        onAssignmentModeChange={onAssignmentModeChange}
      />,
    );

    expect(screen.queryByText('Une columnas que tengan el mismo nombre normalizado.')).toBeNull();
    expect(screen.getByText('Modo de asignación')).not.toBeNull();
    await user.hover(screen.getByRole('button', { name: 'Información sobre el modo de asignación' }));
    expect(await screen.findByText(/Por nombre compara encabezados equivalentes/)).not.toBeNull();
    await user.click(screen.getByRole('radio', { name: /Por posición/ }));

    expect(onAssignmentModeChange).toHaveBeenCalledWith('position');
  });

  it('shows duplicate column warnings as a compact title tooltip', async () => {
    const user = userEvent.setup();
    render(
      <CombineOutputColumns
        sources={[source]}
        outputColumns={[
          { id: 'output:1', name: 'Código' },
          { id: 'output:2', name: 'código' },
        ]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('Hay nombres de columnas de salida duplicados.')).toBeNull();

    const title = screen.getByText('2. Columnas de salida').closest('h2');
    const warningButton = screen.getByRole('button', { name: 'Advertencia: 2. Columnas de salida' });
    expect(title?.contains(warningButton)).toBe(true);

    await user.hover(warningButton);
    expect((await screen.findByRole('tooltip')).textContent).toBe('Hay nombres de columnas de salida duplicados.');
  });

  it('reorders output columns by dragging the right-side handle', () => {
    const { container } = render(<OutputColumnsHarness />);
    const items = Array.from(container.querySelectorAll<HTMLElement>('.combineOutputColumnItem'));
    const handles = Array.from(container.querySelectorAll<HTMLElement>('.combineOutputColumnDragHandle'));
    const dataTransfer = createDataTransfer();

    expect(items[0].lastElementChild?.classList).toContain('combineOutputColumnActions');
    expect(items[0].lastElementChild?.querySelector('.combineOutputColumnDragHandle')).not.toBeNull();
    fireEvent.dragStart(handles[0], { dataTransfer });
    fireEvent.dragOver(items[1], { dataTransfer });
    fireEvent.drop(items[1], { dataTransfer });

    expect(screen.getAllByRole('textbox').map((input) => (input as HTMLInputElement).value)).toEqual([
      'Nombre',
      'Código',
    ]);
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

const positionSources: CombineSource[] = [
  {
    id: 'source:short',
    fileName: 'corto.xlsx',
    columns: [
      { id: 'short:code', name: 'Cod', index: 0 },
      { id: 'short:product', name: 'Producto', index: 1 },
    ],
    rows: [],
  },
  {
    id: 'source:long',
    fileName: 'largo.xlsx',
    columns: [
      { id: 'long:code', name: 'Código', index: 0 },
      { id: 'long:description', name: 'Descripción', index: 1 },
      { id: 'long:price', name: 'Precio', index: 2 },
    ],
    rows: [],
  },
];

function createDataTransfer() {
  const values = new Map<string, string>();
  return {
    dropEffect: 'none',
    effectAllowed: 'none',
    getData: (format: string) => values.get(format) ?? '',
    setData: (format: string, value: string) => {
      values.set(format, value);
    },
  } as unknown as DataTransfer;
}
