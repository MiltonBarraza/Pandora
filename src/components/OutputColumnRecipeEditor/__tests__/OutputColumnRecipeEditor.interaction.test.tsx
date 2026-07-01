// @vitest-environment jsdom

import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { InputColumn, InputRow, OutputColumn } from '../../../types/import';
import { OutputColumnRecipeEditor } from '../OutputColumnRecipeEditor';
import { StepSourceFields, StepTypeSelect } from '../OutputColumnRecipeEditor.StepFields';

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

function createEmptyStepColumn(id = 'output-empty-step'): OutputColumn {
  return {
    id,
    label: 'Valor',
    order: 0,
    enabled: true,
    recipe: {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [{ id: 'step-1', mode: 'text', type: 'noop' }],
    },
  };
}

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

async function selectLastDropdownOption(user: ReturnType<typeof userEvent.setup>, buttonName: RegExp, optionName: string | RegExp) {
  const buttons = screen.getAllByRole('button', { name: buttonName });
  await user.click(buttons[buttons.length - 1]);
  await user.click(screen.getByRole('option', { name: optionName }));
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

  it('shows fixed text after date formatting and date-column selection are reset to text', async () => {
    const user = userEvent.setup();
    const textColumn: OutputColumn = {
      id: 'output-date-cleanup',
      label: 'Fecha limpia',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [{ id: 'step-1', mode: 'text', type: 'noop' }],
      },
    };
    render(<ControlledRecipeEditor initialColumn={textColumn} />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con fechas');
    await selectLastDropdownOption(user, /Qué quiero hacer/, 'Formatear fecha');
    await selectLastDropdownOption(user, /Qué fecha usar/, 'Elegir fecha desde columna');
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con texto');
    await selectLastDropdownOption(user, /Qué quiero hacer/, 'Usar texto fijo');

    expect(screen.getByLabelText('Texto fijo')).not.toBeNull();
    expect(screen.queryByText('Formato de entrada')).toBeNull();
    expect(screen.queryByText('Formato de salida')).toBeNull();
    expect(screen.queryByText('Si no es una fecha válida')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Qué fecha usar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fecha encontrada' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Buscar textos en' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Texto encontrado' })).toBeNull();
    expect(screen.getByText(/Paso 1/).textContent).toContain('Usar texto fijo');

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.steps[0]).toEqual({
      id: 'step-1',
      mode: 'text',
      type: 'noop',
      applyToEmptyValues: false,
      source: { type: 'fixedText', value: '' },
    });
  });

  it('does not render derived fields while text, date, or number mode has no action', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createEmptyStepColumn('output-no-action')} />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con número');
    expect(screen.getByText('Seleccionar acción')).not.toBeNull();
    expect(screen.getByText(/Paso 1/).textContent).toContain('Sin configurar');
    expect(screen.queryByText('Qué valor usar')).toBeNull();
    expect(screen.queryByText('Buscar valores en')).toBeNull();
    expect(screen.queryByText('Valor encontrado')).toBeNull();
    expect(screen.queryByText('Valor fijo')).toBeNull();

    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con texto');
    expect(screen.getByText('Seleccionar acción')).not.toBeNull();
    expect(screen.getByText(/Paso 1/).textContent).toContain('Sin configurar');
    expect(screen.queryByText('Qué valor usar')).toBeNull();
    expect(screen.queryByText('Qué fecha usar')).toBeNull();
    expect(screen.queryByText('Buscar valores en')).toBeNull();
    expect(screen.queryByText('Valor encontrado')).toBeNull();

    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con fechas');
    expect(screen.getByText('Seleccionar acción')).not.toBeNull();
    expect(screen.queryByText('Qué fecha usar')).toBeNull();
    expect(screen.queryByText('Fecha encontrada')).toBeNull();
    expect(screen.queryByText('Formato de salida')).toBeNull();

    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con número');
    expect(screen.getByText('Seleccionar acción')).not.toBeNull();
    expect(screen.getByText(/Paso 1/).textContent).toContain('Sin configurar');
    expect(screen.queryByText('Qué valor usar')).toBeNull();
    expect(screen.queryByText('Buscar valores en')).toBeNull();
    expect(screen.queryByText('Valor encontrado')).toBeNull();
    expect(screen.queryByText('Valor fijo')).toBeNull();
  });

  it('renders useful direct value fields for date and number noop actions', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createEmptyStepColumn('output-direct-values')} />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con fechas');
    await selectLastDropdownOption(user, /Qué quiero hacer/, 'Usar valor tal cual');
    expect(screen.getByText('Qué fecha usar')).not.toBeNull();
    expect(screen.getByLabelText('Fecha fija')).not.toBeNull();
    expect(screen.queryByText('Formato de salida')).toBeNull();

    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con número');
    expect(screen.queryByText('Qué valor usar')).toBeNull();
    await selectLastDropdownOption(user, /Qué quiero hacer/, 'Usar valor tal cual');
    expect(screen.getByText('Qué valor usar')).not.toBeNull();
    expect(screen.getByLabelText('Valor fijo')).not.toBeNull();
    expect(screen.queryByText('Formato de salida')).toBeNull();
  });

  it('can choose fixed text after several clean mode changes', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createEmptyStepColumn('output-multi-mode')} />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con fechas');
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con número');
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con texto');
    await selectLastDropdownOption(user, /Qué quiero hacer/, 'Usar texto fijo');

    expect(screen.getByLabelText('Texto fijo')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Qué fecha usar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Qué valor usar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Valor encontrado' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fecha encontrada' })).toBeNull();
  });

  it('renders useful fields when using value as-is in a second step', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={{
      id: 'output-second-direct',
      label: 'Directo segundo',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [
          { id: 'base-step', mode: 'text', type: 'noop', source: { type: 'input', inputColumnId: 'input-code' } },
        ],
      },
    }} />);

    await openRecipeEditor(user);
    await user.click(screen.getByRole('button', { name: 'Agregar paso' }));
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con fechas');
    await selectLastDropdownOption(user, /Qué quiero hacer/, 'Usar valor tal cual');

    expect(screen.getByText(/Paso 2/).textContent).toContain('Usar valor tal cual');
    expect(screen.getByRole('button', { name: 'Qué fecha usar' })).not.toBeNull();
    expect(screen.getByLabelText('Fecha fija')).not.toBeNull();
    expect(screen.queryByText('Sólo se agregan pasos cuando elegís una acción útil.')).toBeNull();
  });

  it('keeps previous result available for a useful second-step transformation', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={{
      id: 'output-previous-result',
      label: 'Resultado previo',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [
          { id: 'base-step', mode: 'text', type: 'noop', source: { type: 'input', inputColumnId: 'input-code' } },
          { id: 'upper-step', mode: 'text', type: 'uppercase', source: { type: 'previousResult' } },
        ],
      },
    }} />);

    await openRecipeEditor(user);
    expect(screen.getByText(/Paso 2/).textContent).toContain('Mayúsculas');
    expect(screen.getByText('Qué valor usar')).not.toBeNull();
    expect(screen.getByText('Usar resultado anterior')).not.toBeNull();
    expect(screen.getByText('Toma el valor que salió del paso anterior, no de la parte anterior.')).not.toBeNull();
  });

  it('keeps previous result selected and allows choosing a useful transformation', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onTextSourceAction = vi.fn();
    render(
      <>
        <StepTypeSelect
          step={{ id: 'previous-step', mode: 'text', type: 'noop', source: { type: 'previousResult' } }}
          mode="text"
          allowPreviousResultSource
          onTextSourceAction={onTextSourceAction}
          onChange={onChange}
        />
        <StepSourceFields
          source={{ type: 'previousResult' }}
          inputColumns={inputColumns}
          allowPreviousResult
          explicitTextValueSource
          onChange={() => undefined}
        />
      </>,
    );

    expect(screen.getByText('Usar resultado anterior')).not.toBeNull();
    expect(screen.getByText('Seleccionar acción')).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'Usar resultado anterior' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Qué quiero hacer' }));
    expect(screen.queryByRole('option', { name: 'Usar resultado anterior' })).toBeNull();
    await user.click(screen.getByRole('option', { name: 'Convertir a mayúsculas' }));

    expect(onChange).toHaveBeenCalledWith('uppercase');
    expect(onTextSourceAction).not.toHaveBeenCalled();
  });
});
