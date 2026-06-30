// @vitest-environment jsdom

import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { InputColumn, InputRow, OutputColumn } from '../../../types/import';
import { OutputColumnRecipeEditor } from '../OutputColumnRecipeEditor';

const inputColumns: InputColumn[] = [{
  id: 'input-code',
  columnIndex: 0,
  columnLetter: 'A',
  label: 'Código',
  active: true,
  sampleValues: [],
  nonEmptyCount: 2,
}];

const manualRangeRows: InputRow[] = [
  { rowNumber: 8, values: { 'input-code': 'P-1' } },
  { rowNumber: 9, values: { 'input-code': 'P-2' } },
];

const manualRangeColumn: OutputColumn = {
  id: 'output-range',
  label: 'Rango',
  order: 0,
  enabled: true,
  recipe: { type: 'manualRange', ranges: [] },
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollTo = vi.fn();
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

function ControlledRecipeEditor({
  initialColumn,
  onPersist = () => undefined,
}: {
  initialColumn: OutputColumn;
  onPersist?: (column: OutputColumn) => void;
}) {
  const [column, setColumn] = useState(initialColumn);
  return (
    <>
      <OutputColumnRecipeEditor
        column={column}
        inputColumns={inputColumns}
        manualRangeRows={manualRangeRows}
        onChange={(nextColumn) => {
          setColumn(nextColumn);
          onPersist(nextColumn);
        }}
      />
      <output data-testid="persisted-recipe">{JSON.stringify(column.recipe)}</output>
    </>
  );
}

async function openRecipeEditor(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Editar valor personalizado' }));
}

describe('OutputColumnRecipeEditor interactive modal flow', () => {
  it('does not mount the spreadsheet while the modal is closed and mounts one after opening', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={manualRangeColumn} />);

    expect(screen.queryByText('Vista de filas para rangos')).toBeNull();
    await openRecipeEditor(user);
    expect(screen.getAllByText('Vista de filas para rangos')).toHaveLength(1);
    expect(document.querySelectorAll('.manualRangeSpreadsheet')).toHaveLength(1);
  });

  it('unmounts local row selection on cancel and reopens with Create range disabled', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={manualRangeColumn} />);

    await openRecipeEditor(user);
    await user.click(screen.getByRole('button', { name: 'Seleccionar fila 8' }));
    expect((screen.getByRole('button', { name: 'Crear rango' }) as HTMLButtonElement).disabled).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Vista de filas para rangos')).toBeNull();

    await openRecipeEditor(user);
    expect((screen.getByRole('button', { name: 'Crear rango' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('persisted-recipe').textContent).toBe(JSON.stringify(manualRangeColumn.recipe));
  });

  it('applies created ranges and discards them when cancelling', async () => {
    const user = userEvent.setup();
    const onPersist = vi.fn();
    render(<ControlledRecipeEditor initialColumn={manualRangeColumn} onPersist={onPersist} />);

    await openRecipeEditor(user);
    await user.click(screen.getByRole('button', { name: 'Seleccionar fila 8' }));
    await user.click(screen.getByRole('button', { name: 'Crear rango' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Hay cambios sin aplicar en esta receta. Si cerrás el editor, se perderán.')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(screen.getByTestId('persisted-recipe').textContent).toBe(JSON.stringify(manualRangeColumn.recipe));

    await openRecipeEditor(user);
    await user.click(screen.getByRole('button', { name: 'Seleccionar fila 9' }));
    await user.click(screen.getByRole('button', { name: 'Crear rango' }));
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.ranges).toHaveLength(1);
    expect(persistedRecipe.ranges[0]).toMatchObject({ startRowNumber: 9, endRowNumber: 9 });
    expect(onPersist).toHaveBeenCalledTimes(1);
  });

  it('opens discard confirmation on Escape when draft changed', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={manualRangeColumn} />);

    await openRecipeEditor(user);
    await user.click(screen.getByRole('button', { name: 'Seleccionar fila 8' }));
    await user.click(screen.getByRole('button', { name: 'Crear rango' }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('heading', { name: 'Descartar' })).not.toBeNull();
    expect(screen.getByText('Vista de filas para rangos')).not.toBeNull();
  });

  it('mounts the spreadsheet for a manualRange step', async () => {
    const user = userEvent.setup();
    const combineWithRangeStep: OutputColumn = {
      id: 'output-step-range',
      label: 'Paso rango',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [{ id: 'range-step', mode: 'manualRange', type: 'manualRange', ranges: [] }],
      },
    };
    render(<ControlledRecipeEditor initialColumn={combineWithRangeStep} />);

    expect(screen.queryByText('Vista de filas para rangos')).toBeNull();
    await openRecipeEditor(user);
    expect(document.querySelectorAll('.manualRangeSpreadsheet')).toHaveLength(1);
  });

  it('keeps concat builder free of accidental spreadsheets', async () => {
    const user = userEvent.setup();
    const concatColumn: OutputColumn = {
      id: 'output-concat',
      label: 'Combinado',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'concat',
        parts: [
          { id: 'code', type: 'input', inputColumnId: 'input-code' },
          { id: 'suffix', type: 'text', value: '-X' },
        ],
        separator: '',
      },
    };
    render(<ControlledRecipeEditor initialColumn={concatColumn} />);

    await openRecipeEditor(user);
    expect(screen.getByLabelText('Partes de combinación')).not.toBeNull();
    expect(document.querySelector('.manualRangeSpreadsheet')).toBeNull();
  });
});
