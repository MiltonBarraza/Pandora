// @vitest-environment jsdom

import { useState } from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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

function createBlankCustomColumn(id = 'output-blank-custom'): OutputColumn {
  return {
    id,
    label: 'Valor',
    order: 0,
    enabled: true,
    recipe: {
      type: 'combine',
      parts: [],
      separator: '',
    },
  };
}

function createFixedTextStepColumn(id = 'output-fixed-step'): OutputColumn {
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
      steps: [{ id: 'step-1', mode: 'text', type: 'noop', source: { type: 'fixedText', value: 'abc' } }],
    },
  };
}

function createConversionStepColumn(type: 'toNumber' | 'extractNumber', id: string): OutputColumn {
  return {
    id,
    label: 'Conversión',
    order: 0,
    enabled: true,
    recipe: {
      type: 'combine',
      customMode: 'text',
      parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
      separator: '',
      steps: [{
        id: 'conversion-step',
        mode: 'conversion',
        type,
        source: { type: 'input', inputColumnId: 'input-code' },
      }],
    },
  };
}

function createMainConcatColumn(id = 'output-main-concat'): OutputColumn {
  return {
    id,
    label: 'Combinado',
    order: 0,
    enabled: true,
    recipe: {
      type: 'combine',
      customMode: 'concat',
      parts: [{ id: 'part-1', type: 'input', inputColumnId: '' }],
      separator: '',
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
  sampleInputValues,
  rows = manualRangeRows,
  onPersist = () => undefined,
}: {
  initialColumn: OutputColumn;
  sampleInputValues?: Record<string, string>;
  rows?: InputRow[];
  onPersist?: (column: OutputColumn) => void;
}) {
  const [column, setColumn] = useState(initialColumn);
  return (
    <>
      <OutputColumnRecipeEditor
        column={column}
        inputColumns={inputColumns}
        manualRangeRows={rows}
        sampleInputValues={sampleInputValues}
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
  await user.click(screen.getByRole('button', { name: 'Editar' }));
}

async function selectLastDropdownOption(user: ReturnType<typeof userEvent.setup>, buttonName: RegExp, optionName: string | RegExp) {
  const buttons = screen.getAllByRole('button', { name: buttonName });
  await user.click(buttons[buttons.length - 1]);
  await user.click(screen.getByRole('option', { name: optionName }));
}

async function selectDropdownOptionAt(user: ReturnType<typeof userEvent.setup>, buttonName: RegExp, optionName: string | RegExp, index: number) {
  const buttons = screen.getAllByRole('button', { name: buttonName });
  await user.click(buttons[index]);
  await user.click(screen.getByRole('option', { name: optionName }));
}

async function selectLastSearchableDropdownOption(user: ReturnType<typeof userEvent.setup>, buttonName: RegExp, optionName: string | RegExp) {
  const buttons = screen.getAllByRole('combobox', { name: buttonName });
  await user.click(buttons[buttons.length - 1]);
  await user.click(screen.getByRole('option', { name: optionName }));
}

function getComposePartEditor() {
  const editor = document.querySelector('.composePartTechnicalEditor') as HTMLElement | null;
  if (!editor) {
    throw new Error('Compose part editor not found');
  }

  return editor;
}

async function selectComposePartDropdownOption(user: ReturnType<typeof userEvent.setup>, buttonName: RegExp, optionName: string | RegExp) {
  const editor = getComposePartEditor();
  const buttons = within(editor).getAllByRole('button', { name: buttonName });
  await user.click(buttons[buttons.length - 1]);
  await user.click(screen.getByRole('option', { name: optionName }));
}

async function selectComposePartSearchableDropdownOption(user: ReturnType<typeof userEvent.setup>, buttonName: RegExp, optionName: string | RegExp) {
  const editor = getComposePartEditor();
  const buttons = within(editor).getAllByRole('combobox', { name: buttonName });
  await user.click(buttons[buttons.length - 1]);
  await user.click(screen.getByRole('option', { name: optionName }));
}

function getInputByLabelText(label: string) {
  const input = screen.getByText(label).closest('label')?.querySelector('input');
  if (!input) {
    throw new Error(`Input not found for label: ${label}`);
  }

  return input;
}

function getStepOneSummary(dialog: HTMLElement) {
  return within(dialog).getAllByText(/Paso 1/)
    .find((element) => element.textContent?.includes('·'))?.textContent ?? '';
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

  it('renders the spreadsheet on the first selection of manual ranges from an empty step', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createEmptyStepColumn('output-manual-first-selection')} />);

    await openRecipeEditor(user);
    expect(screen.queryByText('Vista de filas para rangos')).toBeNull();

    const dialog = screen.getByRole('dialog', { name: /Columna: "Valor"/ });
    const operationButtons = within(dialog).getAllByRole('button', { name: 'Tipo de operación' });
    const textOperationButton = operationButtons.find((button) => button.textContent?.includes('Trabajar con texto'));
    expect(textOperationButton).toBeDefined();
    await user.click(textOperationButton!);
    await user.click(screen.getByRole('option', { name: 'Trabajar con rangos' }));

    expect(screen.getAllByText('Vista de filas para rangos')).toHaveLength(1);
    expect(document.querySelectorAll('.manualRangeSpreadsheet')).toHaveLength(1);
    expect(within(dialog).queryByRole('button', { name: /Acci.n/ })).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Tipo de operación' }).textContent).toContain('Trabajar con rangos');
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

  it('lets users choose the first row shown in compose preview', async () => {
    const user = userEvent.setup();
    const previewRows: InputRow[] = Array.from({ length: 20 }, (_, index) => ({
      rowNumber: index + 1,
      values: { 'input-code': `Producto ${index + 1}` },
    }));
    render(<ControlledRecipeEditor
      initialColumn={{
        id: 'output-compose-preview-start',
        label: 'Preview',
        order: 0,
        enabled: true,
        recipe: {
          type: 'combine',
          customMode: 'concat',
          parts: [{ id: 'code', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
        },
      }}
      rows={previewRows}
    />);

    await openRecipeEditor(user);
    await user.click(screen.getByRole('button', { name: 'Vista previa' }));

    const previewDialog = screen.getByRole('dialog', { name: 'Vista previa del resultado' });
    expect(within(previewDialog).getByText('Mostrando 10 filas desde la fila 1 de 20 filas del archivo.')).not.toBeNull();
    expect(within(previewDialog).getByText('Producto 1')).not.toBeNull();
    expect(within(previewDialog).queryByText('Producto 11')).toBeNull();

    const startInput = within(previewDialog).getByRole('spinbutton', { name: 'Ver desde fila' });
    await user.clear(startInput);
    await user.type(startInput, '8');

    await waitFor(() => expect(within(previewDialog).getByText('Mostrando 10 filas desde la fila 8 de 20 filas del archivo.')).not.toBeNull());
    expect(within(previewDialog).queryByText('Producto 1')).toBeNull();
    expect(within(previewDialog).getByText('Producto 8')).not.toBeNull();
    expect(within(previewDialog).getByText('Producto 17')).not.toBeNull();
    expect(within(previewDialog).queryByText('Producto 18')).toBeNull();

    await user.clear(startInput);
    await user.type(startInput, '999');

    await waitFor(() => expect(within(previewDialog).queryByText('No hay filas disponibles desde la fila 999.')).toBeNull());
    expect(within(previewDialog).getByText('No se encontraron filas.')).not.toBeNull();
    expect(within(previewDialog).queryByText('Producto 20')).toBeNull();
  });

  it('renders the main concat part with the canonical step editor unconfigured', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createMainConcatColumn('output-compose-canonical')} />);

    await openRecipeEditor(user);

    const dialog = screen.getByRole('dialog', { name: /Columna: "Combinado"/ });
    const partEditor = document.querySelector('.composePartTechnicalEditor');
    expect(partEditor).not.toBeNull();
    expect(partEditor?.querySelector('.rangeValuePrimaryLayout')).not.toBeNull();
    expect(partEditor?.querySelector('.concatStepTopRow')).toBeNull();
    expect(within(dialog).getByText('Parte seleccionada')).not.toBeNull();
    expect(within(partEditor as HTMLElement).getByText(/Paso 1/).textContent).toContain('Sin configurar');
    expect(within(partEditor as HTMLElement).queryByText('Usar resultado anterior')).toBeNull();
    expect(within(partEditor as HTMLElement).queryByText(/Columna A/)).toBeNull();
    expect(within(partEditor as HTMLElement).queryByRole('button', { name: 'Columna de entrada' })).toBeNull();
  });

  it('edits fixed text in the main concat part on the first action click', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createMainConcatColumn('output-compose-fixed-text')} />);

    await openRecipeEditor(user);
    await selectComposePartDropdownOption(user, /Acción/, 'Usar texto fijo');

    await waitFor(() => expect(screen.getByLabelText('Texto fijo')).not.toBeNull());
    const partEditor = document.querySelector('.composePartTechnicalEditor') as HTMLElement;
    const textInput = within(partEditor).getByText('Texto fijo').closest('label')?.querySelector('input') as HTMLInputElement;
    expect(within(partEditor).getByText(/Paso 1/).textContent).toContain('Usar texto fijo');
    textInput.focus();
    await user.type(textInput, 'ABC', { skipClick: true });
    await waitFor(() => expect((within(getComposePartEditor()).getByText('Texto fijo').closest('label')?.querySelector('input') as HTMLInputElement).value).toBe('ABC'));
    expect(screen.getAllByText('ABC').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.parts[0]).toMatchObject({
      type: 'text',
      value: 'ABC',
      steps: [{ mode: 'text', type: 'noop' }],
    });
  });

  it('edits an input column in the main concat part', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createMainConcatColumn('output-compose-input-column')} />);

    await openRecipeEditor(user);
    await selectComposePartDropdownOption(user, /Acción/, 'Usar columna de entrada');
    await waitFor(() => expect(within(getComposePartEditor()).getByRole('button', { name: 'Columna de entrada' })).not.toBeNull());
    await selectComposePartDropdownOption(user, /Columna de entrada/, 'A');

    await waitFor(() => expect(within(getComposePartEditor()).getByRole('button', { name: 'Columna de entrada' }).textContent).toContain('A'));
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.parts[0]).toMatchObject({
      type: 'input',
      inputColumnId: 'input-code',
    });
  });

  it('keeps main concat column-text picker source while preserving the transform action', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createMainConcatColumn('output-compose-picker-transform')} />);

    await openRecipeEditor(user);
    await selectComposePartDropdownOption(user, /Acción/, 'Convertir a mayúsculas');
    await selectComposePartDropdownOption(user, /Valor base/, 'Elegir texto desde celda');
    await selectComposePartSearchableDropdownOption(user, /Texto encontrado/, 'P-1');

    const actionButtons = screen.getAllByRole('button', { name: /Acción/ });
    expect(actionButtons[actionButtons.length - 1].textContent).toContain('Convertir a mayúsculas');
    expect(actionButtons[actionButtons.length - 1].textContent).not.toContain('Usar texto fijo');
    const sourceButtons = screen.getAllByRole('button', { name: /Valor base/ });
    expect(sourceButtons[sourceButtons.length - 1].textContent).toContain('Elegir texto desde celda');
    await waitFor(() => expect((screen.getByRole('combobox', { name: /Texto encontrado/ }) as HTMLInputElement).value).toBe('P-1'));
    expect(screen.queryByLabelText('Texto fijo')).toBeNull();
    expect(screen.getAllByText('P-1').length).toBeGreaterThan(0);
  });

  it('keeps main concat direct column-text picker source on the first try and after changing actions', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createMainConcatColumn('output-compose-picker-direct')} />);

    await openRecipeEditor(user);
    await selectComposePartDropdownOption(user, /Acci.n/, 'Elegir texto desde celda');
    await selectComposePartSearchableDropdownOption(user, /Texto encontrado/, 'P-1');

    const firstActionButtons = screen.getAllByRole('button', { name: /Acci.n/ });
    expect(firstActionButtons[firstActionButtons.length - 1].textContent).toContain('Elegir texto desde celda');
    expect(firstActionButtons[firstActionButtons.length - 1].textContent).not.toContain('Usar texto fijo');
    await waitFor(() => expect((screen.getByRole('combobox', { name: /Texto encontrado/ }) as HTMLInputElement).value).toBe('P-1'));

    await selectComposePartDropdownOption(user, /Acci.n/, /Convertir a may.sculas/);
    await selectComposePartDropdownOption(user, /Valor base/, 'Elegir texto desde celda');
    await selectComposePartSearchableDropdownOption(user, /Texto encontrado/, 'P-2');

    const updatedActionButtons = screen.getAllByRole('button', { name: /Acci.n/ });
    expect(updatedActionButtons[updatedActionButtons.length - 1].textContent).toMatch(/Convertir a may.sculas/);
    expect(updatedActionButtons[updatedActionButtons.length - 1].textContent).not.toContain('Usar texto fijo');
    const sourceButtons = screen.getAllByRole('button', { name: /Valor base/ });
    expect(sourceButtons[sourceButtons.length - 1].textContent).toContain('Elegir texto desde celda');
    await waitFor(() => expect((screen.getByRole('combobox', { name: /Texto encontrado/ }) as HTMLInputElement).value).toBe('P-2'));
    expect(screen.queryByLabelText('Texto fijo')).toBeNull();
    expect(screen.getAllByText('P-2').length).toBeGreaterThan(0);
  });

  it('uses previous result only in additional main concat part steps', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={createMainConcatColumn('output-compose-previous-result')}
      sampleInputValues={{ 'input-code': 'ignored' }}
    />);

    await openRecipeEditor(user);
    await selectComposePartDropdownOption(user, /Acción/, 'Usar texto fijo');
    await waitFor(() => expect(screen.getByLabelText('Texto fijo')).not.toBeNull());
    const textInput = within(getComposePartEditor()).getByText('Texto fijo').closest('label')?.querySelector('input') as HTMLInputElement;
    textInput.focus();
    await user.type(textInput, 'asd', { skipClick: true });
    await waitFor(() => expect((within(getComposePartEditor()).getByText('Texto fijo').closest('label')?.querySelector('input') as HTMLInputElement).value).toBe('asd'));
    expect(screen.queryByText('Usar resultado anterior')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Agregar paso' }));
    await selectComposePartDropdownOption(user, /Acción/, 'Convertir a mayúsculas');

    const sourceButtons = screen.getAllByRole('button', { name: /Valor base/ });
    expect(sourceButtons[sourceButtons.length - 1].textContent).toContain('Usar resultado anterior');
    expect(getComposePartEditor().querySelector('.previousResultValueField input')?.getAttribute('value')).toBe('Resultado del paso anterior');
    expect(screen.getAllByText('ASD').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.parts[0].steps[1]).toMatchObject({
      mode: 'text',
      type: 'uppercase',
      source: { type: 'previousResult' },
    });
  });

  it('clears a normal multi-step preview when switching the first step to concat', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={createBlankCustomColumn('output-normal-multistep-to-concat')}
      sampleInputValues={{ 'input-code': 'ignored' }}
    />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    const firstTextInput = getInputByLabelText('Texto fijo') as HTMLInputElement;
    await user.click(firstTextInput);
    await user.type(firstTextInput, 'asd');
    await waitFor(() => expect((getInputByLabelText('Texto fijo') as HTMLInputElement).value).toBe('asd'));

    await user.click(screen.getByRole('button', { name: 'Agregar paso' }));
    await selectLastDropdownOption(user, /Acci.n/, /Convertir a may.sculas/);
    expect(screen.getAllByText('ASD').length).toBeGreaterThan(0);

    await selectDropdownOptionAt(user, /Acci.n/, 'Concatenar', 0);

    await waitFor(() => expect(screen.getByText('Editor de partes')).not.toBeNull());
    expect(screen.queryByText('ASD')).toBeNull();
    expect(screen.queryByText(/Paso 2/)).toBeNull();

    await selectComposePartDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    const concatTextInput = within(getComposePartEditor()).getByText('Texto fijo').closest('label')?.querySelector('input') as HTMLInputElement;
    await user.click(concatTextInput);
    await user.type(concatTextInput, 'xxx');

    await waitFor(() => expect(screen.getAllByText('xxx').length).toBeGreaterThan(0));
    expect(screen.queryByText('ASD')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.customMode).toBe('concat');
    expect(persistedRecipe.steps).toHaveLength(1);
    expect(persistedRecipe.steps[0].type).toBe('concat');
    expect(persistedRecipe.steps.some((step: { type: string }) => step.type === 'uppercase')).toBe(false);
  });

  it('keeps normal single-step to concat responsive after configuring a concat part', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={createBlankCustomColumn('output-normal-single-step-to-concat')}
      sampleInputValues={{ 'input-code': 'ignored' }}
    />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    const firstTextInput = getInputByLabelText('Texto fijo') as HTMLInputElement;
    await user.click(firstTextInput);
    await user.type(firstTextInput, 'asd');
    await waitFor(() => expect((getInputByLabelText('Texto fijo') as HTMLInputElement).value).toBe('asd'));

    await selectDropdownOptionAt(user, /Acci.n/, 'Concatenar', 0);
    await waitFor(() => expect(screen.getByText('Editor de partes')).not.toBeNull());

    await selectComposePartDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    const concatTextInput = within(getComposePartEditor()).getByText('Texto fijo').closest('label')?.querySelector('input') as HTMLInputElement;
    await user.click(concatTextInput);
    await user.type(concatTextInput, 'xxx');

    await waitFor(() => expect(screen.getAllByText('xxx').length).toBeGreaterThan(0));
    expect(screen.queryByText('ASD')).toBeNull();
  });

  it('does not offer previous result as a dead-end main concat action', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={createMainConcatColumn('output-compose-previous-result-action')}
      sampleInputValues={{ 'input-code': 'ignored' }}
    />);

    await openRecipeEditor(user);
    await selectComposePartDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    const textInput = within(getComposePartEditor()).getByText('Texto fijo').closest('label')?.querySelector('input') as HTMLInputElement;
    textInput.focus();
    await user.type(textInput, 'abc', { skipClick: true });

    await user.click(screen.getByRole('button', { name: 'Agregar paso' }));
    const actionButtons = within(getComposePartEditor()).getAllByRole('button', { name: /Acci.n/ });
    await user.click(actionButtons[actionButtons.length - 1]);
    expect(screen.queryByRole('option', { name: 'Usar resultado anterior' })).toBeNull();
    await user.click(screen.getByRole('option', { name: /Convertir a may.sculas/ }));

    const sourceButtons = screen.getAllByRole('button', { name: /Valor base/ });
    expect(sourceButtons[sourceButtons.length - 1].textContent).toContain('Usar resultado anterior');
    expect(within(getComposePartEditor()).getByText(/Paso 2/).textContent).not.toContain('Sin configurar');
    expect(screen.getAllByText('ABC').length).toBeGreaterThan(0);
  });

  it('keeps the additional-step delete button inside the main concat step card', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createMainConcatColumn('output-compose-delete-layout')} />);

    await openRecipeEditor(user);
    await selectComposePartDropdownOption(user, /Acci.n/, 'Usar texto fijo');
    await user.click(screen.getByRole('button', { name: 'Agregar paso' }));

    const partEditor = getComposePartEditor();
    const deleteButton = within(partEditor).getByRole('button', { name: 'Eliminar paso' });
    const stepPanel = deleteButton.closest('.stepDetailPanel');
    expect(stepPanel).not.toBeNull();
    expect(stepPanel?.closest('.concatPartStepDivider')).not.toBeNull();
    expect(deleteButton.closest('.stepCardHeader')).toBe(stepPanel?.querySelector('.stepCardHeader'));
  });

  it('uses canonical number and date fields in the main concat part', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createMainConcatColumn('output-compose-number-date')} />);

    await openRecipeEditor(user);
    await selectComposePartDropdownOption(user, /Tipo de operación/, /Trabajar con números/);
    const actionButtons = within(getComposePartEditor()).getAllByRole('button', { name: /Acción/ });
    await user.click(actionButtons[actionButtons.length - 1]);
    expect(screen.queryByRole('option', { name: 'Operación numérica' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Sumar valor' })).not.toBeNull();
    await user.click(screen.getByRole('option', { name: 'Sumar valor' }));
    expect(screen.getByRole('button', { name: 'Valor base' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Valor a sumar' })).not.toBeNull();
    expect(screen.queryByLabelText('Texto fijo')).toBeNull();

    await selectComposePartDropdownOption(user, /Tipo de operación/, 'Trabajar con fechas');
    await selectComposePartDropdownOption(user, /Acción/, 'Usar valor tal cual');
    expect(screen.getByText('Qué fecha usar')).not.toBeNull();
    await selectComposePartDropdownOption(user, /Qué fecha usar/, 'Fecha fija');
    expect(screen.getByLabelText('Fecha fija')).not.toBeNull();
    expect(screen.queryByText('Operación numérica')).toBeNull();
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
    await selectLastDropdownOption(user, /Acción/, 'Formatear fecha');
    await selectLastDropdownOption(user, /Qué fecha usar/, 'Elegir fecha desde celda');
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con texto');
    await selectLastDropdownOption(user, /Acción/, 'Usar texto fijo');

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

  it('clears a stale fixed date preview when opening the date picker for a column', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={{
        id: 'output-stale-fixed-date',
        label: 'Fecha',
        order: 0,
        enabled: true,
        recipe: {
          type: 'combine',
          customMode: 'text',
          parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
          separator: '',
          steps: [{
            id: 'format-date',
            mode: 'date',
            type: 'formatDate',
            source: { type: 'fixedText', value: '2026-07-01' },
            dateInputFormat: 'DD/MM/YYYY',
            dateOutputFormat: 'YYYY-MM-DD',
          }],
        },
      }}
      rows={[{ rowNumber: 1, values: { 'input-code': 'sin fecha' } }]}
      sampleInputValues={{ 'input-code': 'sin fecha' }}
    />);

    await openRecipeEditor(user);
    const headerPreview = document.querySelector('.constructorModalHeaderPreview span') as HTMLElement;
    expect(headerPreview.textContent).toBe('2026-07-01');

    await selectLastDropdownOption(user, /Qué fecha usar/, 'Elegir fecha desde celda');
    expect(headerPreview.textContent).not.toContain('2026-07-01');

    await selectLastDropdownOption(user, /Formato de salida/, 'DD/MM/AAAA');
    expect(headerPreview.textContent).not.toContain('01/07/2026');
    expect(headerPreview.textContent).not.toContain('2026-07-01');
  });

  it('applies the first normal text action selection immediately', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createBlankCustomColumn('output-normal-first-text')} />);

    await openRecipeEditor(user);
    const dialog = screen.getByRole('dialog', { name: /Columna: "Valor"/ });
    expect(getStepOneSummary(dialog)).toContain('Sin configurar');
    expect(within(dialog).getByRole('button', { name: /Tipo de operación/ }).textContent).toContain('Trabajar con texto');
    expect(within(dialog).getByText('Seleccionar acción')).not.toBeNull();

    await selectLastDropdownOption(user, /Acción/, 'Usar texto fijo');

    expect(screen.getByLabelText('Texto fijo')).not.toBeNull();
    expect(getStepOneSummary(dialog)).toContain('Usar texto fijo');
    expect(screen.queryByRole('button', { name: 'Qué fecha usar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Qué valor usar' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.steps[0]).toMatchObject({
      mode: 'text',
      type: 'noop',
      source: { type: 'fixedText', value: '' },
    });
  });

  it('keeps normal number mode unconfigured until a number action is selected', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createBlankCustomColumn('output-normal-first-number')} />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Tipo de operación/, /Trabajar con números/);

    const modeButtons = screen.getAllByRole('button', { name: /Tipo de operación/ });
    expect(modeButtons[modeButtons.length - 1].textContent).toContain('Trabajar con números');
    expect(screen.getByText('Seleccionar acción')).not.toBeNull();
    expect(screen.getByText(/Paso 1/).textContent).toContain('Sin configurar');
    expect(screen.queryByRole('button', { name: 'Qué valor usar' })).toBeNull();

    const actionButtons = screen.getAllByRole('button', { name: /Acción/ });
    await user.click(actionButtons[actionButtons.length - 1]);
    expect(screen.queryByRole('option', { name: 'Operación numérica' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Sumar valor' })).not.toBeNull();
    expect(screen.getByRole('option', { name: 'Restar valor' })).not.toBeNull();
    await user.click(screen.getByRole('option', { name: 'Sumar valor' }));

    expect(screen.getByRole('button', { name: 'Valor base' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Valor a sumar' })).not.toBeNull();
    expect((getInputByLabelText('Valor base: valor fijo') as HTMLInputElement).value).toBe('');
    expect((getInputByLabelText('Valor a sumar: valor fijo') as HTMLInputElement).value).toBe('');
    expect(screen.queryByText('Resultado anterior')).toBeNull();
    expect(screen.getByRole('button', { name: 'Decimales / redondeo' }).textContent).toContain('0 decimales');
  });

  it('defaults a new later numeric operation to the previous result', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={{
      id: 'output-later-number-default',
      label: 'Cálculo',
      order: 0,
      enabled: true,
      recipe: {
        type: 'combine',
        customMode: 'number',
        parts: [{ id: 'base', type: 'input', inputColumnId: 'input-code' }],
        separator: '',
        steps: [{ id: 'base-step', mode: 'number', type: 'noop', source: { type: 'fixedText', value: '100' } }],
      },
    }} />);

    await openRecipeEditor(user);
    await user.click(screen.getByRole('button', { name: 'Agregar paso' }));
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con números');
    await selectLastDropdownOption(user, /Acción/, 'Restar valor');

    expect(screen.getByRole('button', { name: 'Valor base' }).textContent).toContain('Resultado del paso anterior');
    expect((getInputByLabelText('Valor a restar: valor fijo') as HTMLInputElement).value).toBe('');

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.steps[1]).toMatchObject({
      type: 'numericOperation',
      operation: 'subtract',
      leftOperand: { type: 'previousResult' },
      rightOperand: { type: 'fixedText', value: '' },
    });
  });

  it('filters cell texts for number conversion and resets search when reopened', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={createConversionStepColumn('toNumber', 'output-convert-number-picker')}
      rows={[
        { rowNumber: 1, values: { 'input-code': 'ACCESORIOS' } },
        { rowNumber: 2, values: { 'input-code': '123' } },
        { rowNumber: 3, values: { 'input-code': '123,45' } },
        { rowNumber: 4, values: { 'input-code': '$ 1.234,56' } },
        { rowNumber: 5, values: { 'input-code': 'ABC123' } },
      ]}
    />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Qué valor usar/, 'Elegir texto desde celda');
    const foundText = screen.getByRole('combobox', { name: /Texto encontrado/ });
    await user.click(foundText);

    expect(screen.getByRole('option', { name: /^123$/ })).not.toBeNull();
    expect(screen.getByRole('option', { name: '123,45' })).not.toBeNull();
    expect(screen.getByRole('option', { name: /^\$ 1\.234,56$/ })).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'ACCESORIOS' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'ABC123' })).toBeNull();

    await user.click(screen.getByRole('option', { name: /^123$/ }));
    await user.click(foundText);

    expect(screen.getByRole('option', { name: /^123$/ })).not.toBeNull();
    expect(screen.getByRole('option', { name: '123,45' })).not.toBeNull();
    expect(screen.getByRole('option', { name: /^\$ 1\.234,56$/ })).not.toBeNull();
  });

  it('shows a clear empty state when no picked texts can convert to numbers', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={createConversionStepColumn('toNumber', 'output-convert-number-empty')}
      rows={[
        { rowNumber: 1, values: { 'input-code': 'ACCESORIOS' } },
        { rowNumber: 2, values: { 'input-code': 'PINCEL' } },
      ]}
    />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Qué valor usar/, 'Elegir texto desde celda');

    const foundText = screen.getByRole('combobox', { name: /Texto encontrado/ }) as HTMLInputElement;
    expect(foundText.disabled).toBe(true);
    expect(foundText.value).toBe('Sin valores numéricos encontrados');

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.steps[0]).toMatchObject({
      type: 'toNumber',
      source: { type: 'input', inputColumnId: 'input-code' },
    });
  });

  it('labels and filters number extraction while preserving extractNumber internally', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={createConversionStepColumn('extractNumber', 'output-extract-number-picker')}
      rows={[
        { rowNumber: 1, values: { 'input-code': 'ACCESORIOS' } },
        { rowNumber: 2, values: { 'input-code': 'ABC123' } },
        { rowNumber: 3, values: { 'input-code': '12 kg x 3' } },
        { rowNumber: 4, values: { 'input-code': 'PINCEL SERIE 304' } },
        { rowNumber: 5, values: { 'input-code': 'PINCEL' } },
      ]}
    />);

    await openRecipeEditor(user);
    const actionButtons = screen.getAllByRole('button', { name: /Acción/ });
    const actionButton = actionButtons[actionButtons.length - 1] as HTMLElement;
    expect(actionButton.textContent).toContain('Usar número del texto');
    const actionLabels = screen.getAllByText('Acción');
    const actionField = actionLabels[actionLabels.length - 1]?.closest('.dropdownField') as HTMLElement;
    await user.hover(within(actionField).getByRole('button', { name: 'Ver ayuda' }));
    await waitFor(() => expect(screen.getByRole('tooltip').textContent).toBe('Busca el primer número dentro del texto y usa ese número como resultado. Ejemplo: “Serie 304” → “304”.'));

    await selectLastDropdownOption(user, /Qué valor usar/, 'Elegir texto desde celda');
    await user.click(screen.getByRole('combobox', { name: /Texto encontrado/ }));
    expect(screen.getByRole('option', { name: 'ABC123' })).not.toBeNull();
    expect(screen.getByRole('option', { name: '12 kg x 3' })).not.toBeNull();
    expect(screen.getByRole('option', { name: 'PINCEL SERIE 304' })).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'ACCESORIOS' })).toBeNull();
    expect(screen.queryByRole('option', { name: /^PINCEL$/ })).toBeNull();
    await user.click(screen.getByRole('option', { name: 'ABC123' }));

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.steps[0]).toMatchObject({
      type: 'extractNumber',
      source: { type: 'fixedText', value: 'ABC123' },
    });
  });

  it('does not offer fixed text or cell text picker as a new normal text-transformer source', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createEmptyStepColumn('output-normal-picker-transform')} />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Acción/, 'Convertir a mayúsculas');

    const actionButtons = screen.getAllByRole('button', { name: /Acción/ });
    expect(actionButtons[actionButtons.length - 1].textContent).toContain('Convertir a mayúsculas');
    expect(actionButtons[actionButtons.length - 1].textContent).not.toContain('Usar texto fijo');
    const sourceButtons = screen.getAllByRole('button', { name: /Valor base/ });
    await user.click(sourceButtons[sourceButtons.length - 1]);
    expect(screen.queryByRole('option', { name: 'Texto fijo' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Elegir texto desde celda' })).toBeNull();
    expect(screen.getByRole('option', { name: 'A' })).not.toBeNull();
  });

  it('does not render derived fields while text, date, or number mode has no action', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createEmptyStepColumn('output-no-action')} />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con números');
    expect(screen.getByText('Seleccionar acción')).not.toBeNull();
    expect(screen.getByText(/Paso 1/).textContent).toContain('Sin configurar');
    expect(screen.queryByText('Qué valor usar')).toBeNull();
    expect(screen.queryByText('Buscar valores en')).toBeNull();
    expect(screen.queryByText('Valor encontrado')).toBeNull();
    expect(screen.queryByText('Valor fijo')).toBeNull();
    expect(document.querySelector('.stepEditorBlock .stepExtraFieldsRow')).toBeNull();

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

    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con números');
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
    await selectLastDropdownOption(user, /Acción/, 'Usar valor tal cual');
    expect(screen.getByText('Qué fecha usar')).not.toBeNull();
    await selectLastDropdownOption(user, /Qué fecha usar/, 'Fecha fija');
    expect(screen.getByLabelText('Fecha fija')).not.toBeNull();
    expect(screen.queryByText('Formato de salida')).toBeNull();

    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con números');
    expect(screen.queryByText('Qué valor usar')).toBeNull();
    await selectLastDropdownOption(user, /Acción/, 'Usar valor tal cual');
    expect(screen.getByText('Qué valor usar')).not.toBeNull();
    await selectLastDropdownOption(user, /Qué valor usar/, 'Valor fijo');
    expect(screen.getByLabelText('Valor fijo')).not.toBeNull();
    expect(screen.queryByText('Formato de salida')).toBeNull();
  });

  it('can choose fixed text after several clean mode changes', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={createEmptyStepColumn('output-multi-mode')} />);

    await openRecipeEditor(user);
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con fechas');
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con números');
    await selectLastDropdownOption(user, /Tipo de operación/, 'Trabajar con texto');
    await selectLastDropdownOption(user, /Acción/, 'Usar texto fijo');

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
    await selectLastDropdownOption(user, /Acción/, 'Usar valor tal cual');

    expect(screen.getByText(/Paso 2/).textContent).toContain('Usar valor tal cual');
    expect(screen.getByRole('button', { name: 'Qué fecha usar' })).not.toBeNull();
    await selectLastDropdownOption(user, /Qué fecha usar/, 'Fecha fija');
    expect(screen.getByLabelText('Fecha fija')).not.toBeNull();
    expect(screen.queryByText('Sólo se agregan pasos cuando elegís una acción útil.')).toBeNull();
  });

  it('applies input-column action on the first click in a normal second step', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor initialColumn={{
      ...createFixedTextStepColumn('output-second-input-column'),
      recipe: {
        type: 'combine',
        customMode: 'text',
        parts: [{ id: 'base', type: 'input', inputColumnId: '' }],
        separator: '',
        steps: [{ id: 'step-1', mode: 'text', type: 'noop', source: { type: 'fixedText', value: 'asd' } }],
      },
    }} />);

    await openRecipeEditor(user);
    await user.click(screen.getByRole('button', { name: 'Agregar paso' }));
    await selectLastDropdownOption(user, /Acci.n/, 'Usar columna de entrada');

    const actionButtons = screen.getAllByRole('button', { name: /Acci.n/ });
    expect(actionButtons[actionButtons.length - 1].textContent).toContain('Usar columna de entrada');
    expect(screen.getByText(/Paso 2/).textContent).toContain('Usar columna de entrada');
    expect(screen.getByText(/Paso 2/).textContent).not.toContain('Sin configurar');
    expect(screen.getByRole('button', { name: 'Columna de entrada' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.steps[1]).toMatchObject({
      mode: 'text',
      type: 'noop',
      source: { type: 'input', inputColumnId: '' },
    });
  });

  it('keeps previous result available for a useful second-step transformation', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={{
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
      }}
      sampleInputValues={{ 'input-code': 'ACCESORIOS' }}
    />);

    await openRecipeEditor(user);
    expect(screen.getByText(/Paso 2/).textContent).toContain('Mayúsculas');
    expect(screen.getByText('Valor base')).not.toBeNull();
    expect(screen.getByText('Usar resultado anterior')).not.toBeNull();
    expect(screen.getByDisplayValue('Valor dinámico')).not.toBeNull();
    expect(screen.queryByDisplayValue('ACCESORIOS')).toBeNull();
    expect(screen.queryByText('Este valor se calcula para cada fila según los pasos anteriores.')).toBeNull();

    const previousResultField = screen.getByText('Resultado anterior').closest('.previousResultValueField') as HTMLElement;
    await user.hover(within(previousResultField).getByRole('button', { name: 'Ver ayuda' }));
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.textContent).toContain('Este valor cambia según la fila. Ejemplos:');
      expect(tooltip.textContent).toContain('- P-1');
      expect(tooltip.textContent).toContain('- P-2');
      expect(tooltip.querySelectorAll('br')).toHaveLength(3);
    });
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
    await user.click(screen.getByRole('button', { name: 'Acción' }));
    expect(screen.queryByRole('option', { name: 'Usar resultado anterior' })).toBeNull();
    await user.click(screen.getByRole('option', { name: 'Convertir a mayúsculas' }));

    expect(onChange).toHaveBeenCalledWith('uppercase');
    expect(onTextSourceAction).not.toHaveBeenCalled();
  });

  it('uses previous result by default when adding a suffix in a second step', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={createFixedTextStepColumn('output-second-suffix')}
      sampleInputValues={{ 'input-code': 'ignored' }}
    />);

    await openRecipeEditor(user);
    await user.click(screen.getByRole('button', { name: 'Agregar paso' }));
    await selectLastDropdownOption(user, /Acción/, 'Agregar sufijo');

    expect(screen.getByText('Usar resultado anterior')).not.toBeNull();
    expect(document.querySelector('.previousResultValueField input')?.getAttribute('value')).toBe('abc');
    expect(screen.getByLabelText('Sufijo')).not.toBeNull();
    expect(screen.queryByLabelText('Valor fijo')).toBeNull();

    const previousResultField = screen.getByText('Resultado anterior').closest('.previousResultValueField') as HTMLElement;
    await user.hover(within(previousResultField).getByRole('button', { name: 'Ver ayuda' }));
    await waitFor(() => expect(screen.getByRole('tooltip').textContent).toBe('Este valor viene del paso anterior.'));

    await user.type(screen.getByLabelText('Sufijo'), '-x');
    expect(screen.getByText('abc-x')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.steps[1]).toMatchObject({
      mode: 'text',
      type: 'addSuffix',
      source: { type: 'previousResult' },
      value: '-x',
    });
  });

  it('does not offer fixed text as a new second-step suffix base', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={createFixedTextStepColumn('output-second-suffix-fixed-base')}
      sampleInputValues={{ 'input-code': 'ignored' }}
    />);

    await openRecipeEditor(user);
    await user.click(screen.getByRole('button', { name: 'Agregar paso' }));
    await selectLastDropdownOption(user, /Acción/, 'Agregar sufijo');

    const sourceButtons = screen.getAllByRole('button', { name: /Valor base/ });
    await user.click(sourceButtons[sourceButtons.length - 1]);
    expect(screen.queryByRole('option', { name: 'Texto fijo' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Usar resultado anterior' })).not.toBeNull();
    await user.keyboard('{Escape}');
    await user.type(screen.getByLabelText('Sufijo'), '-x');
    expect(screen.getAllByText('abc-x').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    const persistedRecipe = JSON.parse(screen.getByTestId('persisted-recipe').textContent ?? '{}');
    expect(persistedRecipe.steps[1]).toMatchObject({
      type: 'addSuffix',
      source: { type: 'previousResult' },
      value: '-x',
    });
    expect(screen.getAllByText('abc-x').length).toBeGreaterThan(0);
  });

  it('keeps the suffix to the right of its source selector before previous-result value field', async () => {
    const user = userEvent.setup();
    render(<ControlledRecipeEditor
      initialColumn={createFixedTextStepColumn('output-second-suffix-layout')}
      sampleInputValues={{ 'input-code': 'ignored' }}
    />);

    await openRecipeEditor(user);
    await user.click(screen.getByRole('button', { name: 'Agregar paso' }));
    await selectLastDropdownOption(user, /Acción/, 'Agregar sufijo');

    const suffixField = screen.getByLabelText('Sufijo').closest('.recipeField');
    const sourceButtons = screen.getAllByRole('button', { name: 'Valor base' });
    const sourceField = sourceButtons[sourceButtons.length - 1]?.closest('.recipeField');
    const previousResultField = screen.getByText('Resultado anterior').closest('.previousResultValueField');

    expect(suffixField?.parentElement).toBe(sourceField?.parentElement);
    expect(sourceField?.parentElement).toBe(previousResultField?.parentElement);
    expect(suffixField && sourceField ? sourceField.compareDocumentPosition(suffixField) & Node.DOCUMENT_POSITION_FOLLOWING : 0).not.toBe(0);
    expect(previousResultField && suffixField ? suffixField.compareDocumentPosition(previousResultField) & Node.DOCUMENT_POSITION_FOLLOWING : 0).not.toBe(0);
  });
});
